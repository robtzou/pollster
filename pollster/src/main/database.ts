import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

// Prepared statements (initialized once)
let stmtUpsertStudent: Database.Statement;
let stmtCreateSession: Database.Statement;
let stmtInsertResponse: Database.Statement;
let stmtGetSessionHistory: Database.Statement;
let stmtSaveResource: Database.Statement;
let stmtLoadResource: Database.Statement;
let stmtSaveEngagement: Database.Statement;

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

        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            content TEXT NOT NULL DEFAULT '',
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS session_engagement (
            session_id INTEGER NOT NULL,
            student_uuid TEXT NOT NULL,
            total_active_minutes REAL DEFAULT 0,
            final_engagement_ratio REAL DEFAULT 0,
            PRIMARY KEY (session_id, student_uuid),
            FOREIGN KEY (session_id) REFERENCES sessions(id),
            FOREIGN KEY (student_uuid) REFERENCES students(uuid)
        );

        INSERT OR IGNORE INTO resources (id, content) VALUES (1, '');
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

    stmtSaveResource = db.prepare(`
        UPDATE resources SET content = ?, updated_at = datetime('now') WHERE id = 1
    `);

    stmtLoadResource = db.prepare(`
        SELECT content FROM resources WHERE id = 1
    `);

    stmtSaveEngagement = db.prepare(`
        INSERT INTO session_engagement (session_id, student_uuid, total_active_minutes, final_engagement_ratio)
        VALUES (?, ?, ?, ?)
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

export function saveResource(content: string): void {
    stmtSaveResource.run(content);
}

export function loadResource(): string {
    const row = stmtLoadResource.get() as { content: string } | undefined;
    return row?.content ?? '';
}

export function saveSessionEngagement(
    sessionId: number,
    engagements: { uuid: string; minutes: number; ratio: number }[]
): void {
    const insertMany = db.transaction((rows: any[]) => {
        for (const row of rows) {
            stmtSaveEngagement.run(row.sessionId, row.uuid, row.minutes, row.ratio);
        }
    });

    const mapped = engagements.map(e => ({
        sessionId,
        uuid: e.uuid,
        minutes: e.minutes,
        ratio: e.ratio
    }));

    insertMany(mapped);
}
