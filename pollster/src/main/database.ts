import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

// Prepared statements (initialized once)
let stmtUpsertStudent: Database.Statement;
let stmtCreateSession: Database.Statement;
let stmtInsertResponse: Database.Statement;
let stmtGetLeaderboard: Database.Statement;
let stmtGetSessionHistory: Database.Statement;

export function initDatabase(userDataPath: string) {
    const dbPath = path.join(userDataPath, 'pollster.db');
    db = new Database(dbPath);

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');

    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS students (
            uuid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            last_seen TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TEXT DEFAULT (datetime('now')),
            question_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            student_uuid TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            correct_answer TEXT NOT NULL,
            is_correct INTEGER NOT NULL,
            answered_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (session_id) REFERENCES sessions(id),
            FOREIGN KEY (student_uuid) REFERENCES students(uuid)
        );
    `);

    // Prepare statements
    stmtUpsertStudent = db.prepare(`
        INSERT INTO students (uuid, name, last_seen) VALUES (?, ?, datetime('now'))
        ON CONFLICT(uuid) DO UPDATE SET name = excluded.name, last_seen = datetime('now')
    `);

    stmtCreateSession = db.prepare(`
        INSERT INTO sessions (question_count) VALUES (?)
    `);

    stmtInsertResponse = db.prepare(`
        INSERT INTO responses (session_id, student_uuid, question, answer, correct_answer, is_correct)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmtGetLeaderboard = db.prepare(`
        SELECT
            s.uuid,
            s.name,
            COUNT(r.id) AS total_answers,
            SUM(r.is_correct) AS correct_answers
        FROM responses r
        JOIN students s ON s.uuid = r.student_uuid
        WHERE r.session_id = ?
        GROUP BY s.uuid
        ORDER BY correct_answers DESC, total_answers ASC
    `);

    stmtGetSessionHistory = db.prepare(`
        SELECT
            s.id,
            s.started_at,
            s.question_count,
            COUNT(DISTINCT r.student_uuid) AS student_count,
            COUNT(r.id) AS response_count
        FROM sessions s
        LEFT JOIN responses r ON r.session_id = s.id
        GROUP BY s.id
        ORDER BY s.id DESC
        LIMIT 50
    `);

    console.log('Database initialized at:', dbPath);
}

export function upsertStudent(uuid: string, name: string): void {
    stmtUpsertStudent.run(uuid, name);
}

export function createSession(questionCount: number): number {
    const result = stmtCreateSession.run(questionCount);
    return Number(result.lastInsertRowid);
}

export function insertResponse(
    sessionId: number,
    studentUuid: string,
    question: string,
    answer: string,
    correctAnswer: string
): void {
    const isCorrect = answer === correctAnswer ? 1 : 0;
    stmtInsertResponse.run(sessionId, studentUuid, question, answer, correctAnswer, isCorrect);
}

export interface LeaderboardEntry {
    uuid: string;
    name: string;
    total_answers: number;
    correct_answers: number;
}

export function getLeaderboard(sessionId: number): LeaderboardEntry[] {
    return stmtGetLeaderboard.all(sessionId) as LeaderboardEntry[];
}

export interface SessionEntry {
    id: number;
    started_at: string;
    question_count: number;
    student_count: number;
    response_count: number;
}

export function getSessionHistory(): SessionEntry[] {
    return stmtGetSessionHistory.all() as SessionEntry[];
}
