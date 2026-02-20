import Fastify from 'fastify';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app as electronApp } from 'electron'; // Import Electron to check if packaged

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

export async function startServer() {
    const app = Fastify();
    // Allow CORS so the React frontend (Teacher) can talk to this local server
    const io = new Server(app.server, {
        cors: { origin: "*" }
    });

    // GAME STATE
    let currentPoll = {
        active: false,
        question: "Is this working?",
        results: { A: 0, B: 0, C: 0, D: 0 }
    };
    const votedStudents = new Set<string>();

    // 1. Serve Student File
    app.get('/', (_req, reply) => {
        const studentHtml = path.join(getResourcesPath(), 'student-view', 'index.html');
        const stream = fs.createReadStream(studentHtml);
        reply.type('text/html').send(stream);
    });

    // 2. The Socket Logic
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Broadcast updated player count
        io.emit('player-count', io.engine.clientsCount);

        // If a student joins mid-poll, send them the current state immediately
        if (currentPoll.active) {
            socket.emit('start-poll', currentPoll.question);
        }

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            io.emit('player-count', io.engine.clientsCount);
        });

        // --- TEACHER COMMANDS ---
        socket.on('teacher-start-poll', (questionText) => {
            // Reset State
            currentPoll.active = true;
            currentPoll.question = questionText;
            currentPoll.results = { A: 0, B: 0, C: 0, D: 0 };
            votedStudents.clear();

            console.log('Starting poll:', questionText);

            // Blast to everyone (Students see buttons, Teacher sees reset graph)
            io.emit('start-poll', questionText);
            io.emit('update-results', currentPoll.results);
        });

        socket.on('teacher-stop-poll', () => {
            currentPoll.active = false;
            io.emit('stop-poll');
        });

        // --- STUDENT COMMANDS ---
        socket.on('student-answer', (answerKey) => { // answerKey = 'A', 'B', etc.
            if (!currentPoll.active) return; // Ignore if poll is closed

            // Only allow one answer per student per question
            if (votedStudents.has(socket.id)) {
                socket.emit('already-answered');
                return;
            }

            // Increment count
            if (currentPoll.results[answerKey] !== undefined) {
                votedStudents.add(socket.id);
                currentPoll.results[answerKey]++;

                io.emit('update-results', currentPoll.results);
            }
        });
    });

    const PORT = 3000;
    await app.listen({ port: PORT, host: '0.0.0.0' });
    const ip = getLocalIp();
    return { port: PORT, ip };
}

