const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Basic health check route
app.get('/', (req, res) => res.send('Sovereign Cloud Relay is active.'));

io.on('connection', (socket) => {
  console.log('🔗 Device connected:', socket.id);

  // 1. Teacher creates a room
  socket.on('host-room', (roomId) => {
    socket.join(roomId);
    console.log(`🏫 Teacher hosted room: ${roomId}`);
  });

  // 2. Student joins a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`📱 Student joined room: ${roomId}`);
  });

  // 3. Forward: Student -> Teacher (Answers)
  socket.on('student-to-teacher', (data) => {
    // data = { roomId: 'ABCD', payload: { answer: 'A' } }
    socket.to(data.roomId).emit('relay-to-teacher', data.payload);
  });

  // 4. Forward: Teacher -> Students (Slide changes, Poll start)
  socket.on('teacher-to-students', (data) => {
    socket.to(data.roomId).emit('relay-to-students', data.payload);
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`☁️ Relay running on port ${PORT}`);
});
