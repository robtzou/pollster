const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// In-memory PDF storage (per room)
const roomPdfs = new Map(); // roomId -> Buffer

// Health check (Cloud Run uses this)
app.get('/', (_req, res) => res.send('Sovereign Cloud Relay is active.'));

// Teacher uploads PDF for cloud students
app.post('/pdf', (req, res) => {
  const { roomId, data } = req.body;
  if (!roomId || !data) return res.status(400).send('Missing roomId or data');
  const buffer = Buffer.from(data, 'base64');
  roomPdfs.set(roomId, buffer);
  console.log(`📄 PDF uploaded for room ${roomId} (${(buffer.length / 1024).toFixed(0)} KB)`);
  res.send('OK');
});

// Cloud students fetch PDF
app.get('/pdf', (req, res) => {
  const roomId = req.query.room;
  if (!roomId || !roomPdfs.has(roomId)) return res.status(404).send('PDF not found');
  res.type('application/pdf').send(roomPdfs.get(roomId));
});

// Serve student-view at /join?room=XXXX
app.get('/join', (req, res) => {
  const studentHtmlPath = path.join(__dirname, 'student-view.html');
  if (!fs.existsSync(studentHtmlPath)) {
    return res.status(404).send('Student view not found. Redeploy with student-view.html.');
  }
  let html = fs.readFileSync(studentHtmlPath, 'utf-8');
  // Inject the relay URL — use x-forwarded-proto for Cloud Run (TLS terminated at LB)
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const relayUrl = `${proto}://${req.get('host')}`;
  html = html.replace(
    /const CLOUD_RELAY_URL = '[^']*'/,
    `const CLOUD_RELAY_URL = '${relayUrl}'`
  );
  // If room code is in the URL, inject auto-join
  const room = req.query.room;
  if (room) {
    const autoJoinScript = `<script>window.__AUTO_ROOM_CODE = '${room}';<\/script>`;
    html = html.replace('</head>', autoJoinScript + '</head>');
  }
  res.type('html').send(html);
});

// Track active rooms for observability
let activeRooms = 0;

io.on('connection', (socket) => {
  console.log(`🔗 Connected: ${socket.id} (total: ${io.engine.clientsCount})`);

  // 1. Teacher hosts a room
  socket.on('host-room', (roomId) => {
    socket.join(roomId);
    activeRooms++;
    console.log(`🏫 Teacher hosted room: ${roomId} (active rooms: ${activeRooms})`);
  });

  // 2. Student joins a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`📱 Student joined room: ${roomId}`);
  });

  // 3. Forward: Student -> Teacher (Answers, registrations)
  socket.on('student-to-teacher', (data) => {
    // data = { roomId: 'ABCD', payload: { ... } }
    socket.to(data.roomId).emit('relay-to-teacher', data.payload);
  });

  // 4. Forward: Teacher -> Students (Poll start/stop, PDF, etc.)
  socket.on('teacher-to-students', (data) => {
    socket.to(data.roomId).emit('relay-to-students', data.payload);
  });

  socket.on('disconnect', () => {
    console.log(`Device disconnected: ${socket.id} (total: ${io.engine.clientsCount})`);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`☁️ Relay running on port ${PORT}`);
});
