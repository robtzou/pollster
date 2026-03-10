import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app as electronApp } from 'electron';
import { initDatabase, upsertStudent, createSession, insertResponse } from './database';

// ═══ CLOUD RELAY CONFIG ═══
// Set this to your deployed Cloud Run URL (e.g. 'https://pollster-relay-xyz.a.run.app')
// Leave empty to disable cloud relay bridging
const CLOUD_RELAY_URL = '';

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

    const app = Fastify();
    // Enable CORS for all HTTP routes (needed for Vite dev server)
    await app.register(cors, { origin: '*' });
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

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            io.emit('player-count', io.engine.clientsCount);
        });

        // --- STUDENT IDENTITY ---
        socket.on('student-register', (data: { uuid: string; name: string }) => {
            if (data.uuid && data.name) {
                upsertStudent(data.uuid, data.name);
                console.log('Student registered:', data.name, data.uuid.slice(0, 8));
            }
        });

        // --- TEACHER COMMANDS ---
        socket.on('teacher-start-poll', (data: { question: string; correct: string; questionCount?: number }) => {
            // Reset State
            currentPoll.active = true;
            currentPoll.question = data.question;
            currentPoll.correctAnswer = data.correct;
            currentPoll.results = { A: 0, B: 0, C: 0, D: 0 };
            votedStudents.clear();

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

                io.emit('update-results', currentPoll.results);
            }
        });
    });

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

                    if (currentSessionId) {
                        insertResponse(
                            currentSessionId,
                            data.uuid,
                            currentPoll.question,
                            data.answer,
                            currentPoll.correctAnswer
                        );
                    }

                    // Update all local + relay students
                    io.emit('update-results', currentPoll.results);
                    relaySocket!.emit('teacher-to-students', {
                        roomId: roomCode,
                        payload: { type: 'update-results', results: currentPoll.results }
                    });
                }
            } else if (type === 'student-register') {
                const data = payload as { type: string; uuid: string; name: string };
                if (data.uuid && data.name) {
                    upsertStudent(data.uuid, data.name);
                    console.log('☁️ Cloud student registered:', data.name, data.uuid.slice(0, 8));
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
    });

    return { port: PORT, ip, roomCode, setPdfPath, getCurrentSessionId: () => currentSessionId };
}

