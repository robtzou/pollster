import { useEffect, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Socket } from 'socket.io-client'

const BAR_COLORS: Record<string, string> = {
    A: '#e74c3c',
    B: '#3498db',
    C: '#f1c40f',
    D: '#2ecc71'
}

interface QuizQuestion {
    question: string
    answers: { A: string; B: string; C: string; D: string }
    correct: 'A' | 'B' | 'C' | 'D'
}

const QUIZ: QuizQuestion[] = [
    {
        question: 'What is the capital of Maryland?',
        answers: { A: 'Baltimore', B: 'Annapolis', C: 'Rockville', D: 'Frederick' },
        correct: 'B'
    },
    {
        question: 'What is the official state bird of Maryland?',
        answers: { A: 'Blue Jay', B: 'Cardinal', C: 'Baltimore Oriole', D: 'Bald Eagle' },
        correct: 'C'
    },
    {
        question: 'Which body of water is Maryland most famous for?',
        answers: { A: 'Lake Erie', B: 'Delaware Bay', C: 'Chesapeake Bay', D: 'Potomac River' },
        correct: 'C'
    },
    {
        question: 'What year was Maryland founded as a colony?',
        answers: { A: '1607', B: '1634', C: '1776', D: '1652' },
        correct: 'B'
    },
    {
        question: 'Which Maryland city is known as "Charm City"?',
        answers: { A: 'Annapolis', B: 'Frederick', C: 'Columbia', D: 'Baltimore' },
        correct: 'D'
    },
    {
        question: 'What is the official state sport of Maryland?',
        answers: { A: 'Lacrosse', B: 'Football', C: 'Jousting', D: 'Sailing' },
        correct: 'C'
    },
    {
        question: 'Which famous national anthem was written in Maryland?',
        answers: {
            A: 'America the Beautiful',
            B: 'The Star-Spangled Banner',
            C: 'God Bless America',
            D: "My Country, 'Tis of Thee"
        },
        correct: 'B'
    },
    {
        question: 'What is the official state crustacean of Maryland?',
        answers: { A: 'Lobster', B: 'Shrimp', C: 'Blue Crab', D: 'Crawfish' },
        correct: 'C'
    },
    {
        question: 'Which prestigious military academy is located in Annapolis?',
        answers: {
            A: 'West Point',
            B: 'Air Force Academy',
            C: 'Coast Guard Academy',
            D: 'U.S. Naval Academy'
        },
        correct: 'D'
    },
    {
        question: 'Maryland is nicknamed "The Old Line State." What does this refer to?',
        answers: {
            A: 'The Mason-Dixon Line',
            B: 'Maryland troops in the Revolutionary War',
            C: 'The state border shape',
            D: 'A historic railroad'
        },
        correct: 'B'
    }
]

interface StartSessionProps {
    socket: Socket
    serverUrl: string
}

export default function StartSession({ socket, serverUrl }: StartSessionProps) {
    const [results, setResults] = useState({ A: 0, B: 0, C: 0, D: 0 })
    const [status, setStatus] = useState<'idle' | 'active' | 'stopped' | 'finished'>('idle')
    const [playerCount, setPlayerCount] = useState(0)
    const [fullScreen, setFullScreen] = useState(false)
    const [questionIndex, setQuestionIndex] = useState(0)
    const [quizStarted, setQuizStarted] = useState(false)
    const [showAnswer, setShowAnswer] = useState(false)

    const currentQ = QUIZ[questionIndex]

    const exitFullScreen = useCallback(() => setFullScreen(false), [])

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') exitFullScreen()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [exitFullScreen])

    useEffect(() => {
        socket.on('update-results', (newResults) => {
            setResults(newResults)
        })

        socket.on('player-count', (count) => {
            setPlayerCount(count)
        })

        return () => {
            socket.off('update-results')
            socket.off('player-count')
        }
    }, [socket])

    const startQuiz = () => {
        setQuizStarted(true)
        setQuestionIndex(0)
        setShowAnswer(false)
        setStatus('active')
        socket.emit('teacher-start-poll', QUIZ[0].question)
    }

    const revealAnswer = () => {
        setShowAnswer(true)
        setStatus('stopped')
        socket.emit('teacher-stop-poll')
    }

    const nextQuestion = () => {
        const next = questionIndex + 1
        if (next >= QUIZ.length) {
            setStatus('finished')
            setQuizStarted(false)
            setShowAnswer(false)
            return
        }
        setQuestionIndex(next)
        setShowAnswer(false)
        setStatus('active')
        socket.emit('teacher-start-poll', QUIZ[next].question)
    }

    const resetQuiz = () => {
        setQuestionIndex(0)
        setQuizStarted(false)
        setShowAnswer(false)
        setStatus('idle')
        setResults({ A: 0, B: 0, C: 0, D: 0 })
        socket.emit('teacher-stop-poll')
    }

    // --- Full Screen Presentation Mode ---
    if (fullScreen) {
        const totalVotes = Object.values(results).reduce((s, v) => s + v, 0)
        const maxVotes = Math.max(...Object.values(results), 1)

        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'linear-gradient(145deg, #0f1923 0%, #1a1a2e 50%, #16213e 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    color: '#fff',
                    overflow: 'hidden'
                }}
            >
                {/* Top bar */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 32px',
                        background: 'rgba(255,255,255,0.04)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                    }}
                >
                    <span style={{ fontSize: 14, opacity: 0.5 }}>
                        👥 {playerCount} player{playerCount !== 1 ? 's' : ''} connected
                    </span>
                    {quizStarted && (
                        <span
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                background: 'rgba(91,141,239,0.2)',
                                padding: '4px 16px',
                                borderRadius: 6,
                                color: '#5b8def'
                            }}
                        >
                            Question {questionIndex + 1} / {QUIZ.length}
                        </span>
                    )}
                    <span
                        style={{
                            fontSize: 13,
                            opacity: 0.5,
                            background: 'rgba(255,255,255,0.06)',
                            padding: '4px 14px',
                            borderRadius: 6
                        }}
                    >
                        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {quizStarted && status === 'active' && (
                            <button
                                onClick={revealAnswer}
                                style={{
                                    background: '#e67e22',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 16px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                🔍 Reveal Answer
                            </button>
                        )}
                        {quizStarted && status === 'stopped' && (
                            <button
                                onClick={nextQuestion}
                                style={{
                                    background: '#3498db',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 16px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                {questionIndex + 1 < QUIZ.length ? '➡ Next Question' : '🏁 Finish Quiz'}
                            </button>
                        )}
                        {status === 'finished' && (
                            <button
                                onClick={resetQuiz}
                                style={{
                                    background: '#2ecc71',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 16px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                🔄 Reset Quiz
                            </button>
                        )}
                        <button
                            onClick={exitFullScreen}
                            style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: 'none',
                                color: '#fff',
                                padding: '6px 16px',
                                borderRadius: 6,
                                fontSize: 13,
                                cursor: 'pointer',
                                opacity: 0.6
                            }}
                        >
                            ESC to exit
                        </button>
                    </div>
                </div>

                {status === 'finished' ? (
                    /* Quiz Complete Screen */
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 24
                        }}
                    >
                        <div style={{ fontSize: 64 }}>🎉</div>
                        <h1 style={{ fontSize: 48, fontWeight: 800, margin: 0 }}>Quiz Complete!</h1>
                        <p style={{ fontSize: 20, opacity: 0.5, margin: 0 }}>
                            All {QUIZ.length} questions answered
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Question */}
                        <div
                            style={{
                                flex: '0 0 auto',
                                padding: '40px 64px 24px',
                                textAlign: 'center'
                            }}
                        >
                            {quizStarted && currentQ ? (
                                <h1
                                    style={{
                                        fontSize: 42,
                                        fontWeight: 700,
                                        margin: 0,
                                        lineHeight: 1.3,
                                        letterSpacing: '-0.5px'
                                    }}
                                >
                                    {currentQ.question}
                                </h1>
                            ) : (
                                <h1 style={{ fontSize: 36, fontWeight: 600, margin: 0, opacity: 0.3 }}>
                                    Waiting for quiz to start…
                                </h1>
                            )}
                        </div>

                        {/* Answer bars */}
                        <div
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: 20,
                                padding: '0 64px 48px'
                            }}
                        >
                            {Object.entries(results).map(([key, count]) => {
                                const pct = maxVotes > 0 ? (count / maxVotes) * 100 : 0
                                const isCorrect = showAnswer && currentQ && key === currentQ.correct
                                const isWrong = showAnswer && currentQ && key !== currentQ.correct
                                return (
                                    <div
                                        key={key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 20,
                                            opacity: isWrong ? 0.35 : 1,
                                            transition: 'opacity 0.4s ease'
                                        }}
                                    >
                                        {/* Label */}
                                        <div
                                            style={{
                                                width: 56,
                                                height: 56,
                                                background: BAR_COLORS[key] || '#888',
                                                borderRadius: 12,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 24,
                                                fontWeight: 800,
                                                flexShrink: 0,
                                                boxShadow: isCorrect ? '0 0 20px rgba(46,204,113,0.6)' : 'none',
                                                border: isCorrect ? '3px solid #2ecc71' : '3px solid transparent'
                                            }}
                                        >
                                            {key}
                                        </div>
                                        {/* Answer text */}
                                        <div
                                            style={{
                                                width: 180,
                                                fontSize: 16,
                                                fontWeight: 500,
                                                flexShrink: 0,
                                                color: isCorrect ? '#2ecc71' : '#fff'
                                            }}
                                        >
                                            {currentQ?.answers[key as 'A' | 'B' | 'C' | 'D'] || ''}
                                        </div>
                                        {/* Bar */}
                                        <div
                                            style={{
                                                flex: 1,
                                                height: 56,
                                                background: 'rgba(255,255,255,0.06)',
                                                borderRadius: 12,
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${pct}%`,
                                                    background: isCorrect
                                                        ? 'linear-gradient(90deg, #2ecc71, #27ae60)'
                                                        : `linear-gradient(90deg, ${BAR_COLORS[key] || '#888'}, ${BAR_COLORS[key] || '#888'}cc)`,
                                                    borderRadius: 12,
                                                    transition: 'width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                                    minWidth: count > 0 ? 24 : 0
                                                }}
                                            />
                                        </div>
                                        {/* Count */}
                                        <div
                                            style={{
                                                width: 60,
                                                textAlign: 'right',
                                                fontSize: 28,
                                                fontWeight: 700,
                                                fontVariantNumeric: 'tabular-nums'
                                            }}
                                        >
                                            {count}
                                        </div>
                                        {/* Correct indicator */}
                                        {isCorrect && <div style={{ fontSize: 28, flexShrink: 0 }}>✅</div>}
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        )
    }

    // --- Normal Dashboard Mode ---
    return (
        <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
            <h1>Start Session</h1>

            <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
                {/* Left column: Controls & Results */}
                <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                        <span>
                            Status: <strong>{status}</strong>
                        </span>
                        <span
                            style={{
                                background: '#2a3a5c',
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontSize: 14,
                                fontWeight: 600
                            }}
                        >
                            👥 {playerCount} player{playerCount !== 1 ? 's' : ''} connected
                        </span>
                        {quizStarted && (
                            <span
                                style={{
                                    background: '#5b8def22',
                                    color: '#5b8def',
                                    padding: '4px 12px',
                                    borderRadius: 20,
                                    fontSize: 14,
                                    fontWeight: 700
                                }}
                            >
                                Question {questionIndex + 1} / {QUIZ.length}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                        {!quizStarted && status !== 'finished' && (
                            <button
                                onClick={startQuiz}
                                style={{
                                    padding: '10px 20px',
                                    background: '#2ecc71',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                ▶ Start Quiz
                            </button>
                        )}

                        {quizStarted && status === 'active' && (
                            <button
                                onClick={revealAnswer}
                                style={{
                                    padding: '10px 20px',
                                    background: '#e67e22',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                🔍 Reveal Answer
                            </button>
                        )}

                        {quizStarted && status === 'stopped' && (
                            <button
                                onClick={nextQuestion}
                                style={{
                                    padding: '10px 20px',
                                    background: '#3498db',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                {questionIndex + 1 < QUIZ.length ? '➡ Next Question' : '🏁 Finish Quiz'}
                            </button>
                        )}

                        {status === 'finished' && (
                            <button
                                onClick={resetQuiz}
                                style={{
                                    padding: '10px 20px',
                                    background: '#2ecc71',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                🔄 Reset Quiz
                            </button>
                        )}

                        <button
                            onClick={() => setFullScreen(true)}
                            style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            🖥 Present
                        </button>

                        {quizStarted && (
                            <button
                                onClick={resetQuiz}
                                style={{
                                    padding: '10px 20px',
                                    background: '#e74c3c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                ⏹ Stop Session
                            </button>
                        )}
                    </div>

                    {/* Current Question Display */}
                    {quizStarted && currentQ && (
                        <div
                            style={{
                                marginTop: 4,
                                padding: '16px 20px',
                                background: '#2a3a5c',
                                borderLeft: '4px solid #5b8def',
                                borderRadius: 8,
                                fontSize: 18,
                                fontWeight: 500
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    textTransform: 'uppercase',
                                    opacity: 0.5,
                                    marginBottom: 6,
                                    letterSpacing: 1
                                }}
                            >
                                Question {questionIndex + 1} of {QUIZ.length}
                            </div>
                            {currentQ.question}

                            {/* Answer options */}
                            <div
                                style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
                            >
                                {Object.entries(currentQ.answers).map(([key, text]) => {
                                    const isCorrect = showAnswer && key === currentQ.correct
                                    const isWrong = showAnswer && key !== currentQ.correct
                                    return (
                                        <div
                                            key={key}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: 6,
                                                fontSize: 14,
                                                background: isCorrect
                                                    ? 'rgba(46,204,113,0.25)'
                                                    : isWrong
                                                        ? 'rgba(255,255,255,0.04)'
                                                        : 'rgba(255,255,255,0.08)',
                                                border: isCorrect ? '1px solid #2ecc71' : '1px solid transparent',
                                                opacity: isWrong ? 0.5 : 1,
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <strong>{key}.</strong> {text}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {status === 'finished' && (
                        <div
                            style={{
                                marginTop: 4,
                                padding: '24px',
                                background: '#1a3a2a',
                                borderLeft: '4px solid #2ecc71',
                                borderRadius: 8,
                                fontSize: 18,
                                fontWeight: 500
                            }}
                        >
                            🎉 Quiz Complete! All {QUIZ.length} questions answered.
                        </div>
                    )}

                    <div style={{ marginTop: 40, display: 'flex', gap: 20 }}>
                        {Object.keys(results).map((key) => (
                            <div
                                key={key}
                                style={{
                                    background: '#252a37ff',
                                    padding: 20,
                                    borderRadius: 8,
                                    textAlign: 'center',
                                    width: 60
                                }}
                            >
                                <h2>{key}</h2>
                                <div style={{ fontSize: 40, fontWeight: 'bold' }}>{results[key]}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right column: QR Code */}
                {serverUrl && (
                    <div
                        style={{
                            background: '#1e2230',
                            padding: 24,
                            borderRadius: 12,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12
                        }}
                    >
                        <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>Scan to join</div>
                        <div style={{ background: 'white', padding: 12, borderRadius: 8 }}>
                            <QRCodeSVG value={serverUrl} size={160} />
                        </div>
                        <div
                            style={{ fontSize: 12, opacity: 0.5, wordBreak: 'break-all', maxWidth: 180 }}
                        >
                            {serverUrl}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
