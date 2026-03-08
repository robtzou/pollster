import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app as electronApp } from 'electron';
import { initDatabase, upsertStudent, createSession, insertResponse } from './database';

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
    return { port: PORT, ip, setPdfPath, getCurrentSessionId: () => currentSessionId };
}

