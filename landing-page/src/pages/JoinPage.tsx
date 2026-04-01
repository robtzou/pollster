import { useState, useEffect, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { connectToRelay } from '../lib/relay'
import StudentSession from '../components/StudentSession'
import { useSearchParams, Link } from 'react-router-dom'
import './JoinPage.css'

type Phase = 'code' | 'name' | 'connecting' | 'connected'

export default function JoinPage() {
  const [searchParams] = useSearchParams()
  const [phase, setPhase] = useState<Phase>('code')
  const [code, setCode] = useState(['', '', '', ''])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-fill from ?room= query param
  useEffect(() => {
    const room = searchParams.get('room')
    if (room && room.length === 4) {
      const chars = room.toUpperCase().split('')
      setCode(chars)
    }
  }, [searchParams])

  // Focus first input on mount
  useEffect(() => {
    if (phase === 'code' && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [phase])

  const handleCodeInput = useCallback((index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1]
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    
    setCode(prev => {
      const next = [...prev]
      next[index] = upper
      return next
    })

    if (upper && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [])

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      const full = code.join('')
      if (full.length === 4) {
        setRoomCode(full)
        setPhase('name')
      }
    }
  }, [code])

  // Auto-advance to name phase when 4 chars entered
  useEffect(() => {
    const full = code.join('')
    if (full.length === 4 && phase === 'code') {
      setRoomCode(full)
      setTimeout(() => setPhase('name'), 150)
    }
  }, [code, phase])

  const handleJoin = useCallback(() => {
    if (!name.trim()) {
      setError('Enter your name to join.')
      return
    }
    setError('')
    setPhase('connecting')

    const sock = connectToRelay(roomCode)
    
    sock.on('connect', () => {
      // Register with the teacher
      sock.emit('student-to-teacher', {
        roomId: roomCode,
        payload: { type: 'student-join', uuid: crypto.randomUUID(), name: name.trim() }
      })
      setSocket(sock)
      setPhase('connected')
    })

    sock.on('connect_error', () => {
      setError('Could not connect. Check the room code and try again.')
      setPhase('name')
    })

    // Timeout fallback
    setTimeout(() => {
      if (!sock.connected) {
        sock.disconnect()
        setError('Connection timed out. Please try again.')
        setPhase('name')
      }
    }, 8000)
  }, [name, roomCode])

  // Already in a session
  if (phase === 'connected' && socket) {
    return <StudentSession socket={socket} roomCode={roomCode} studentName={name} />
  }

  return (
    <div className="join-page">
      <div className="join-container">
        {/* Brand */}
        <div className="join-brand">HANDOUT</div>

        {phase === 'code' && (
          <div className="join-card animate-in">
            <h1 className="join-title">Enter Room Code</h1>
            <p className="join-subtitle">Ask your instructor for the 4-character code</p>

            <div className="code-inputs">
              {code.map((char, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="text"
                  maxLength={2}
                  value={char}
                  onChange={e => handleCodeInput(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="code-box"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                />
              ))}
            </div>

            {error && <p className="join-error">{error}</p>}
          </div>
        )}

        {phase === 'name' && (
          <div className="join-card animate-in">
            <h1 className="join-title">What's your name?</h1>
            <p className="join-subtitle">Joining room <strong>{roomCode}</strong></p>

            <input
              type="text"
              className="name-input"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              autoFocus
              maxLength={30}
            />

            <button className="join-btn" onClick={handleJoin}>
              Join Class
            </button>

            <button className="back-btn" onClick={() => { setPhase('code'); setError('') }}>
              ← Change Code
            </button>

            {error && <p className="join-error">{error}</p>}
          </div>
        )}

        {phase === 'connecting' && (
          <div className="join-card animate-in">
            <div className="connecting-spinner" />
            <p className="join-subtitle" style={{ marginTop: '1.5rem' }}>Connecting...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="join-footer">
        <Link to="/" className="footer-link">For Teachers →</Link>
      </footer>
    </div>
  )
}
