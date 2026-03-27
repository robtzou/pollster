import { useState, useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import './StudentSession.css'

interface StudentSessionProps {
  socket: Socket
  roomCode: string
  studentName: string
}

type SessionView = 'waiting' | 'poll' | 'results' | 'resources'

export default function StudentSession({ socket, roomCode, studentName }: StudentSessionProps) {
  const [view, setView] = useState<SessionView>('waiting')
  const [question, setQuestion] = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [resourceContent, setResourceContent] = useState('')
  const uuidRef = useRef(crypto.randomUUID())

  useEffect(() => {
    // ── Poll Events ──
    const handleStartPoll = (q: string) => {
      setQuestion(typeof q === 'string' ? q : (q as any)?.question || 'Quick Poll')
      setSelectedAnswer(null)
      setHasAnswered(false)
      setView('poll')
    }

    const handleStopPoll = () => {
      setView('waiting')
    }

    // ── Resource Events ──
    const handleShowResources = (data: { content: string }) => {
      setResourceContent(data.content)
      setView('resources')
    }

    const handleHideResources = () => {
      if (view === 'resources') setView('waiting')
    }

    // ── Radar Heartbeat ──
    const handleRadarPing = () => {
      socket.emit('student-to-teacher', {
        roomId: roomCode,
        payload: { type: 'radar-pong', uuid: uuidRef.current }
      })
    }

    // Cloud relay wraps events in relay-to-students
    socket.on('relay-to-students', (payload: any) => {
      if (!payload?.type) return
      switch (payload.type) {
        case 'start-poll': handleStartPoll(payload.question); break
        case 'stop-poll': handleStopPoll(); break
        case 'show-resources': handleShowResources(payload); break
        case 'hide-resources': handleHideResources(); break
        case 'radar-ping': handleRadarPing(); break
      }
    })

    // Also listen for direct events (local connection fallback)
    socket.on('start-poll', handleStartPoll)
    socket.on('stop-poll', handleStopPoll)
    socket.on('show-resources', handleShowResources)
    socket.on('hide-resources', handleHideResources)
    socket.on('radar-ping', handleRadarPing)

    return () => {
      socket.off('relay-to-students')
      socket.off('start-poll', handleStartPoll)
      socket.off('stop-poll', handleStopPoll)
      socket.off('show-resources', handleShowResources)
      socket.off('hide-resources', handleHideResources)
      socket.off('radar-ping', handleRadarPing)
    }
  }, [socket, roomCode, view])

  const submitAnswer = (answer: string) => {
    if (hasAnswered) return
    setSelectedAnswer(answer)
    setHasAnswered(true)

    socket.emit('student-to-teacher', {
      roomId: roomCode,
      payload: { type: 'student-answer', uuid: uuidRef.current, answer }
    })
  }

  return (
    <div className="session-page">
      {/* Status Bar */}
      <div className="session-status-bar">
        <span className="status-dot" />
        <span className="status-room">{roomCode}</span>
        <span className="status-name">{studentName}</span>
      </div>

      {/* Waiting State */}
      {view === 'waiting' && (
        <div className="session-center animate-in">
          <div className="waiting-pulse" />
          <h2 className="session-heading">You're In</h2>
          <p className="session-sub">Waiting for your instructor to start an activity...</p>
        </div>
      )}

      {/* Poll State */}
      {view === 'poll' && (
        <div className="session-center animate-in">
          <p className="poll-question">{question}</p>
          <div className="poll-grid">
            {['A', 'B', 'C', 'D'].map(opt => (
              <button
                key={opt}
                className={`poll-option ${selectedAnswer === opt ? 'selected' : ''} ${hasAnswered && selectedAnswer !== opt ? 'dimmed' : ''}`}
                onClick={() => submitAnswer(opt)}
                disabled={hasAnswered}
              >
                {opt}
              </button>
            ))}
          </div>
          {hasAnswered && (
            <p className="poll-confirmed">✓ Answer submitted</p>
          )}
        </div>
      )}

      {/* Resources State */}
      {view === 'resources' && (
        <div className="session-resources animate-in">
          <div className="resource-content" dangerouslySetInnerHTML={{ __html: resourceContent }} />
        </div>
      )}
    </div>
  )
}
