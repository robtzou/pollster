import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import path from 'path';
import fs from 'fs';
import os from 'os';
import fastifyStatic from '@fastify/static';
import { app as electronApp } from 'electron';
import { initDatabase, upsertStudent, createSession, insertResponse, saveSessionEngagement } from './database';

// ═══ EPICS 9: RADAR TELEMETRY ═══
export const globalRadar = new Map<string, { name: string, lastSeen: Date, joinedAt: Date, pulsesAnswered: number }>();
export let globalTotalPulsesLaunched = 0;
export let endSessionCSVHandler: () => Promise<string | null>;

export function getRadarState() {
    return {
        totalPulsesLaunched: globalTotalPulsesLaunched,
        students: Array.from(globalRadar.entries()).map(([uuid, data]) => ({
            uuid,
            name: data.name,
            lastSeen: data.lastSeen.getTime(),
            pulsesAnswered: data.pulsesAnswered
        }))
    };
}

// ═══ CLOUD RELAY CONFIG ═══
// Set this to your deployed Cloud Run URL (e.g. 'https://pollster-relay-xyz.a.run.app')
// Leave empty to disable cloud relay bridging
const CLOUD_RELAY_URL = 'https://pollster-relay-7smaydwp3q-uc.a.run.app';

// Generate a 4-char alphanumeric room code (no confusable chars)
function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// HELPER: Find the resources folder in both Dev and Prod
const getResourcesPath = () => {
    return electronApp.isPackaged
        ? path.join(process.resourcesPath, 'resources') // Production path
        : path.join(__dirname, '../../resources');      // Dev path (relative to src/main)
};

// HELPER: Get the machine's local network IP address
function getLocalIp(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] ?? []) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

export async function startServer(userDataPath: string) {
    // Initialize the database
    initDatabase(userDataPath);

    // Generate room code for this session
    const roomCode = generateRoomCode();
    // DIAGNOSTIC DUMP: 
    fs.writeFileSync('/tmp/pollster_room_code.txt', roomCode);

    const app = Fastify();
    // Enable CORS for all HTTP routes (needed for Vite dev server)
    await app.register(cors, { origin: '*' });

    // Serve local images extracted from loaded .sig files
    const mediaDir = path.join(userDataPath, 'active_lesson', 'images');
    if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
    }
    
    await app.register(fastifyStatic, {
        root: mediaDir,
        prefix: '/media/', // http://localhost:3000/media/image.jpg
        decorateReply: false
    });

    // Allow CORS so the React frontend (Teacher) can talk to this local server
    const io = new Server(app.server, {
        cors: { origin: "*" }
    });

    // GAME STATE
    let currentPoll = {
        active: false,
        question: "Is this working?",
        results: { A: 0, B: 0, C: 0, D: 0 },
        correctAnswer: '' as string
    };
    const votedStudents = new Set<string>(); // tracks UUIDs
    let currentSessionId: number | null = null;
    let resultsDirty = false; // for debounced broadcasting
    const connectedStudents = new Map<string, { uuid: string; name: string }>(); // socketId → student
    const questions: { id: number; text: string; timestamp: number }[] = [];
    let questionIdCounter = 0;
    let resourceContent = '';

    // PDF PRESENTATION STATE
    let currentPdfPath: string | null = null;
    let currentPdfPage = 1;
    let totalPdfPages = 0;
    let pdfActive = false;

    // 1. Serve Student File
    app.get('/', (_req, reply) => {
        const studentHtml = path.join(getResourcesPath(), 'student-view', 'index.html');
        const stream = fs.createReadStream(studentHtml);
        reply.type('text/html').send(stream);
    });

    // Room info endpoint for student code validation
    app.get('/api/room-info', (_req, reply) => {
        reply.send({ roomCode });
    });

    // 2. Serve the current PDF file
    app.get('/pdf', (_req, reply) => {
        if (!currentPdfPath || !fs.existsSync(currentPdfPath)) {
            reply.code(404).send({ error: 'No PDF loaded' });
            return;
        }
        const stream = fs.createReadStream(currentPdfPath);
        reply.type('application/pdf').send(stream);
    });

    // 3. Return PDF metadata (page count)
    app.get('/pdf-info', (_req, reply) => {
        if (!currentPdfPath) {
            reply.code(404).send({ error: 'No PDF loaded' });
            return;
        }
        reply.send({ totalPages: totalPdfPages });
    });

    // 3. The Socket Logic
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Broadcast updated player count
        io.emit('player-count', io.engine.clientsCount);

        // If a student joins mid-poll, send them the current state immediately
        if (currentPoll.active) {
            socket.emit('start-poll', currentPoll.question);
        }

        // If a student joins mid-presentation, send them the current PDF state
        if (pdfActive) {
            socket.emit('pdf-start', { totalPages: 0 });
            socket.emit('pdf-page', { page: currentPdfPage });
        }

        // If a student joins mid-resource broadcast, send current resources
        if (resourceContent) {
            socket.emit('show-resources', { content: resourceContent });
        }

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            connectedStudents.delete(socket.id);
            io.emit('player-count', io.engine.clientsCount);
            io.emit('student-roster', Array.from(connectedStudents.values()));
        });

        // --- STUDENT IDENTITY ---
        socket.on('student-register', (data: { uuid: string; name: string }) => {
            if (data.uuid && data.name) {
                upsertStudent(data.uuid, data.name);
                connectedStudents.set(socket.id, { uuid: data.uuid, name: data.name });
                
                // Epic 9: Radar Registration
                if (!globalRadar.has(data.uuid)) {
                    globalRadar.set(data.uuid, { name: data.name, lastSeen: new Date(), joinedAt: new Date(), pulsesAnswered: 0 });
                } else {
                    const radar = globalRadar.get(data.uuid)!;
                    radar.lastSeen = new Date();
                    radar.name = data.name;
                }

                console.log('Student registered:', data.name, data.uuid.slice(0, 8));
                io.emit('student-roster', Array.from(connectedStudents.values()));
            }
        });

        // Epic 9: Heartbeat Loop
        socket.on('radar-pong', (data: { uuid: string }) => {
            const radar = globalRadar.get(data.uuid);
            if (radar) radar.lastSeen = new Date();
        });

        // --- TEACHER COMMANDS ---
        socket.on('teacher-start-poll', (data: { question: string; correct: string; questionCount?: number }) => {
            // Reset State
            currentPoll.active = true;
            currentPoll.question = data.question;
            currentPoll.correctAnswer = data.correct;
            currentPoll.results = { A: 0, B: 0, C: 0, D: 0 };
            votedStudents.clear();
            
            // Epic 9: Active Engagement Tracker
            globalTotalPulsesLaunched++;

            // Create a session on the first question
            if (data.questionCount && !currentSessionId) {
                currentSessionId = createSession(data.questionCount);
                console.log('Session created:', currentSessionId);
            }

            console.log('Starting poll:', data.question);

            // Blast to everyone
            io.emit('start-poll', data.question);
            io.emit('update-results', currentPoll.results);
        });

        socket.on('teacher-stop-poll', () => {
            currentPoll.active = false;
            io.emit('stop-poll');
        });

        socket.on('teacher-end-session', () => {
            currentSessionId = null;
        });

        // --- PDF PRESENTATION COMMANDS ---
        socket.on('pdf-start', (data: { totalPages: number }) => {
            pdfActive = true;
            currentPdfPage = 1;
            console.log('PDF presentation started, total pages:', data.totalPages);
            io.emit('pdf-start', { totalPages: data.totalPages });
        });

        socket.on('pdf-page', (data: { page: number }) => {
            if (!pdfActive) return;
            currentPdfPage = data.page;
            io.emit('pdf-page', { page: data.page });
        });

        socket.on('pdf-stop', () => {
            pdfActive = false;
            currentPdfPage = 1;
            io.emit('pdf-stop');
        });

        // --- STUDENT COMMANDS ---
        socket.on('student-answer', (data: { uuid: string; answer: string }) => {
            if (!currentPoll.active) return;

            const studentUuid = data.uuid;
            const answerKey = data.answer;
            if (!studentUuid || !answerKey) return;

            // Only allow one answer per student per question
            if (votedStudents.has(studentUuid)) {
                socket.emit('already-answered');
                return;
            }

            // Increment count
            if (currentPoll.results[answerKey] !== undefined) {
                votedStudents.add(studentUuid);
                currentPoll.results[answerKey]++;

                // Epic 9: Active Engagement Tracker
                const radar = globalRadar.get(studentUuid);
                if (radar) radar.pulsesAnswered++;

                // Record to database
                if (currentSessionId) {
                    insertResponse(
                        currentSessionId,
                        studentUuid,
                        currentPoll.question,
                        answerKey,
                        currentPoll.correctAnswer
                    );
                }

                resultsDirty = true;
            }
        });

        // --- STUDENT QUESTIONS (anonymous) ---
        socket.on('student-question', (data: { text: string }) => {
            if (!data.text || data.text.trim().length === 0) return;
            questions.push({ id: ++questionIdCounter, text: data.text.trim(), timestamp: Date.now() });
            io.emit('questions-updated', questions);
        });

        // --- TEACHER DISMISS QUESTION ---
        socket.on('teacher-dismiss-question', (data: { id: number }) => {
            const idx = questions.findIndex(q => q.id === data.id);
            if (idx !== -1) {
                questions.splice(idx, 1);
                io.emit('questions-updated', questions);
            }
        });

        // --- TEACHER RESOURCE BROADCASTING ---
        socket.on('teacher-broadcast-resources', (data: { content: string }) => {
            if (!data.content) return;
            resourceContent = data.content;
            io.emit('show-resources', { content: data.content });
        });

        socket.on('teacher-hide-resources', () => {
            resourceContent = '';
            io.emit('hide-resources');
        });
    });

    // ═══ DEBOUNCED RESULT BROADCASTING ═══
    // Emit batched results 4x per second instead of per-vote
    setInterval(() => {
        if (resultsDirty) {
            resultsDirty = false;
            // Local teacher dashboard
            io.emit('batched-results', currentPoll.results);
            // Cloud-connected students via relay
            if (relaySocket?.connected) {
                relaySocket.emit('teacher-to-students', {
                    roomId: roomCode,
                    payload: { type: 'update-results', results: currentPoll.results }
                });
            }
        }
    }, 250);

    // Epic 9: Heartbeat Ping
    setInterval(() => {
        io.emit('radar-ping');
        if (relaySocket?.connected && roomCode) {
            relaySocket.emit('teacher-to-students', {
                roomId: roomCode,
                payload: { type: 'radar-ping' }
            });
        }
    }, 30000);

    // Epic 9: End Session Exporter Bridge
    endSessionCSVHandler = async () => {
        if (!currentSessionId) return null;
        
        const engagements = Array.from(globalRadar.entries()).map(([uuid, data]) => {
            const minutes = (Date.now() - data.joinedAt.getTime()) / 60000;
            const ratio = globalTotalPulsesLaunched > 0 ? data.pulsesAnswered / globalTotalPulsesLaunched : 1;
            return { uuid, name: data.name, minutes, ratio, pulsesAnswered: data.pulsesAnswered };
        });

        saveSessionEngagement(currentSessionId, engagements);

        const rows = [['Student Name', 'Device ID', 'Active Minutes', 'Pulses Answered', 'Final Grade (%)'].join(',')];
        for (const e of engagements) {
            rows.push(`"${e.name}",${e.uuid},${e.minutes.toFixed(1)},${e.pulsesAnswered},${(e.ratio * 100).toFixed(1)}%`);
        }

        currentSessionId = null;
        globalTotalPulsesLaunched = 0;
        globalRadar.clear(); // Reset radar for next class
        
        return rows.join('\n');
    };

    // Expose a function to set the PDF path from the main process
    const setPdfPath = (filePath: string) => {
        currentPdfPath = filePath;
        // Count pages by parsing the PDF /Count field
        try {
            const content = fs.readFileSync(filePath, 'latin1');
            const countMatch = content.match(/\/Count\s+(\d+)/);
            totalPdfPages = countMatch ? parseInt(countMatch[1], 10) : 0;
        } catch {
            totalPdfPages = 0;
        }
        console.log('PDF loaded:', filePath, '— pages:', totalPdfPages);

        // Upload PDF to cloud relay so cloud students can access it
        if (CLOUD_RELAY_URL) {
            try {
                const pdfBuffer = fs.readFileSync(filePath);
                const base64 = pdfBuffer.toString('base64');
                fetch(`${CLOUD_RELAY_URL}/pdf`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId: roomCode, data: base64 })
                }).then(() => {
                    console.log('☁️ PDF uploaded to cloud relay');
                }).catch((err: Error) => {
                    console.warn('☁️ Failed to upload PDF to relay:', err.message);
                });
            } catch (err) {
                console.warn('☁️ Failed to read PDF for relay upload');
            }
        }
    };

    const PORT = 3000;
    await app.listen({ port: PORT, host: '0.0.0.0' });
    const ip = getLocalIp();

    // ═══ CLOUD RELAY BRIDGE ═══
    // Connect to the cloud relay so students on external networks can reach us
    let relaySocket: ClientSocket | null = null;
    if (CLOUD_RELAY_URL) {
        relaySocket = ioClient(CLOUD_RELAY_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 2000
        });

        relaySocket.on('connect', () => {
            console.log('☁️ Connected to Cloud Relay:', CLOUD_RELAY_URL);
            relaySocket!.emit('host-room', roomCode);
        });

        relaySocket.on('connect_error', (err) => {
            console.warn('☁️ Cloud Relay connection error:', err.message);
        });

        // Bridge inbound: relay → local server handlers
        // Student answers arriving via cloud relay
        relaySocket.on('relay-to-teacher', (payload: Record<string, unknown>) => {
            const type = payload.type as string;

            if (type === 'student-answer') {
                const data = payload as { type: string; uuid: string; answer: string };
                if (!currentPoll.active) return;
                if (!data.uuid || !data.answer) return;
                if (votedStudents.has(data.uuid)) return;

                if (currentPoll.results[data.answer] !== undefined) {
                    votedStudents.add(data.uuid);
                    currentPoll.results[data.answer]++;

                    // Epic 9: Active Engagement Tracker
                    const radar = globalRadar.get(data.uuid);
                    if (radar) radar.pulsesAnswered++;

                    if (currentSessionId) {
                        insertResponse(
                            currentSessionId,
                            data.uuid,
                            currentPoll.question,
                            data.answer,
                            currentPoll.correctAnswer
                        );
                    }

                    resultsDirty = true;
                }
            } else if (type === 'student-join' || type === 'student-register') {
                // FIX [3]: Cloud student joining should register them and notify teacher
                const data = payload as { type: string; uuid: string; name: string };
                if (data.uuid && data.name) {
                    upsertStudent(data.uuid, data.name);
                    connectedStudents.set('cloud-' + data.uuid, { uuid: data.uuid, name: data.name });

                    // Epic 9: Radar Registration for cloud students
                    if (!globalRadar.has(data.uuid)) {
                        globalRadar.set(data.uuid, { name: data.name, lastSeen: new Date(), joinedAt: new Date(), pulsesAnswered: 0 });
                    } else {
                        const radar = globalRadar.get(data.uuid)!;
                        radar.lastSeen = new Date();
                        radar.name = data.name;
                    }

                    console.log('☁️ Cloud student joined:', data.name, data.uuid.slice(0, 8));
                    io.emit('student-joined', { uuid: data.uuid, name: data.name });
                    io.emit('student-roster', Array.from(connectedStudents.values()));

                    // If a poll is active, immediately send it to the cloud student
                    if (currentPoll.active) {
                        relaySocket!.emit('teacher-to-students', {
                            roomId: roomCode,
                            payload: { type: 'start-poll', question: currentPoll.question }
                        });
                    }
                }
            } else if (type === 'radar-pong') {
                // FIX [5]: Update lastSeen for cloud students via relay heartbeat
                const data = payload as { type: string; uuid: string };
                const radar = globalRadar.get(data.uuid);
                if (radar) {
                    radar.lastSeen = new Date();
                    console.log('☁️ radar-pong from cloud student:', data.uuid.slice(0, 8));
                }
            } else if (type === 'student-question') {
                const data = payload as { type: string; text: string };
                if (data.text && data.text.trim().length > 0) {
                    questions.push({ id: ++questionIdCounter, text: data.text.trim(), timestamp: Date.now() });
                    io.emit('questions-updated', questions);
                    console.log('☁️ Cloud student question received');
                }
            }
        });
    }

    // Helper to bridge teacher events to relay
    const emitToRelay = (eventType: string, eventData?: Record<string, unknown>) => {
        if (!relaySocket?.connected) return;
        relaySocket.emit('teacher-to-students', {
            roomId: roomCode,
            payload: { type: eventType, ...eventData }
        });
    };

    // ═══ Hook teacher events to also broadcast to relay ═══
    // We re-listen to the local io for teacher commands to bridge them
    io.on('connection', (socket) => {
        socket.on('teacher-start-poll', (data: { question: string; correct: string }) => {
            emitToRelay('start-poll', { question: data.question });
        });
        socket.on('teacher-stop-poll', () => {
            emitToRelay('stop-poll');
        });
        socket.on('pdf-start', (data: { totalPages: number }) => {
            emitToRelay('pdf-start', { totalPages: data.totalPages });
        });
        socket.on('pdf-page', (data: { page: number }) => {
            emitToRelay('pdf-page', { page: data.page });
        });
        socket.on('pdf-stop', () => {
            emitToRelay('pdf-stop');
        });
        socket.on('teacher-broadcast-resources', (data: { content: string }) => {
            emitToRelay('show-resources', { content: data.content });
        });
        socket.on('teacher-hide-resources', () => {
            emitToRelay('hide-resources');
        });
    });

    return { port: PORT, ip, roomCode, setPdfPath, getCurrentSessionId: () => currentSessionId };
}

