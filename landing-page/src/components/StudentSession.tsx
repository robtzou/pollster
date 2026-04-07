import { useState, useEffect, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { marked } from 'marked'
import { RELAY_URL } from '../lib/relay'
import './StudentSession.css'

interface StudentSessionProps {
  socket: Socket
  roomCode: string
  studentName: string
}

type SessionView = 'waiting' | 'poll' | 'results' | 'resources' | 'pdf'

export default function StudentSession({ socket, roomCode, studentName }: StudentSessionProps) {
  const [view, setView] = useState<SessionView>('waiting')
  const [question, setQuestion] = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [resourceContent, setResourceContent] = useState('')
  const [questionInput, setQuestionInput] = useState('')
  const [questionSent, setQuestionSent] = useState(false)
  const [pdfPage, setPdfPage] = useState(1)
  const [pdfTotalPages, setPdfTotalPages] = useState(1)
  const [followTeacher, setFollowTeacher] = useState(true)
  
  const uuidRef = useRef(crypto.randomUUID())
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<any>(null)
  const followTeacherRef = useRef(true)

  // Keep ref in sync with state for socket callbacks
  useEffect(() => {
    followTeacherRef.current = followTeacher
  }, [followTeacher])

  const renderPdfPage = useCallback(async (pageNum: number) => {
    const pdfDoc = pdfDocRef.current
    if (!pdfDoc) return
    setPdfPage(pageNum)
    
    try {
      const page = await pdfDoc.getPage(pageNum)
      const canvas = pdfCanvasRef.current
      if (!canvas) return
      
      const maxWidth = Math.min(window.innerWidth - 24, 800)
      const unscaledViewport = page.getViewport({ scale: 1 })
      const scale = maxWidth / unscaledViewport.width
      const dpr = window.devicePixelRatio || 1
      const viewport = page.getViewport({ scale: scale * dpr })
      
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${viewport.width / dpr}px`
      canvas.style.height = `${viewport.height / dpr}px`
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      await page.render({ canvasContext: ctx, viewport }).promise
    } catch (err) {
      console.error('Failed to render PDF page:', err)
    }
  }, [])

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
    const handleShowResources = async (data: { content: string }) => {
      try {
        const html = await marked.parse(data.content, { async: true })
        setResourceContent(html as string)
        setView('resources')
      } catch (err) {
        console.error('Markdown parse error:', err)
      }
    }

    const handleHideResources = () => {
      if (view === 'resources') setView('waiting')
    }

    // ── PDF Events ──
    const handlePdfStart = async () => {
      setView('pdf')
      setPdfPage(1)
      setPdfTotalPages(1) // Placeholder until metadata loads
      
      try {
        const globalWindow = window as any
        if (!globalWindow.pdfjsLib) {
          const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs' as any)
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
          globalWindow.pdfjsLib = pdfjsLib
        }
        
        const pdfFetchUrl = `${RELAY_URL}/pdf?room=${encodeURIComponent(roomCode)}`
        const resp = await fetch(pdfFetchUrl)
        const blob = await resp.blob()
        const arrayBuffer = await blob.arrayBuffer()
        
        const pdfDoc = await globalWindow.pdfjsLib.getDocument({ data: arrayBuffer }).promise
        pdfDocRef.current = pdfDoc
        setPdfTotalPages(pdfDoc.numPages)
        
        // Wait a tick for canvas to render in DOM
        setTimeout(() => renderPdfPage(1), 50)
      } catch (err) {
        console.error('Failed to load PDF via relay:', err)
      }
    }

    const handlePdfPage = (data: { page: number }) => {
      if (pdfDocRef.current && followTeacherRef.current) {
        renderPdfPage(data.page)
      }
    }

    const handlePdfStop = () => {
      pdfDocRef.current = null
      setView('waiting')
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
        case 'pdf-start': handlePdfStart(); break
        case 'pdf-page': handlePdfPage(payload); break
        case 'pdf-stop': handlePdfStop(); break
        case 'radar-ping': handleRadarPing(); break
      }
    })

    // Also listen for direct events (local connection fallback)
    socket.on('start-poll', handleStartPoll)
    socket.on('stop-poll', handleStopPoll)
    socket.on('show-resources', handleShowResources)
    socket.on('hide-resources', handleHideResources)
    socket.on('pdf-start', handlePdfStart)
    socket.on('pdf-page', handlePdfPage)
    socket.on('pdf-stop', handlePdfStop)
    socket.on('radar-ping', handleRadarPing)

    return () => {
      socket.off('relay-to-students')
      socket.off('start-poll', handleStartPoll)
      socket.off('stop-poll', handleStopPoll)
      socket.off('show-resources', handleShowResources)
      socket.off('hide-resources', handleHideResources)
      socket.off('pdf-start', handlePdfStart)
      socket.off('pdf-page', handlePdfPage)
      socket.off('pdf-stop', handlePdfStop)
      socket.off('radar-ping', handleRadarPing)
    }
  }, [socket, roomCode, renderPdfPage])

  const submitAnswer = (answer: string) => {
    if (hasAnswered) return
    setSelectedAnswer(answer)
    setHasAnswered(true)

    socket.emit('student-to-teacher', {
      roomId: roomCode,
      payload: { type: 'student-answer', uuid: uuidRef.current, answer }
    })
  }

  const submitQuestion = () => {
    const text = questionInput.trim()
    if (!text) return
    
    socket.emit('student-to-teacher', {
      roomId: roomCode,
      payload: { type: 'student-question', text }
    })
    
    setQuestionInput('')
    setQuestionSent(true)
    setTimeout(() => setQuestionSent(false), 2000)
  }

  const pdfPrev = () => {
    if (!pdfDocRef.current || pdfPage <= 1) return
    setFollowTeacher(false)
    renderPdfPage(pdfPage - 1)
  }

  const pdfNext = () => {
    if (!pdfDocRef.current || pdfPage >= pdfTotalPages) return
    setFollowTeacher(false)
    renderPdfPage(pdfPage + 1)
  }

  const downloadPdf = () => {
    const a = document.createElement('a')
    a.href = `${RELAY_URL}/pdf?room=${encodeURIComponent(roomCode)}`
    a.download = 'presentation.pdf'
    a.click()
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
          
          <div className="question-form">
            <p className="question-prompt">Have a question? Ask anonymously:</p>
            <div className="question-input-row">
              <input
                type="text"
                value={questionInput}
                onChange={e => setQuestionInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitQuestion()}
                placeholder="Type your question..."
                maxLength={200}
                className="question-input"
              />
              <button className="question-send-btn" onClick={submitQuestion}>Send</button>
            </div>
            {questionSent && <div className="question-sent-msg">✓ Question sent!</div>}
          </div>
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
          <div className="resource-content markdown-body" dangerouslySetInnerHTML={{ __html: resourceContent }} />
        </div>
      )}

      {/* PDF Viewer State */}
      {view === 'pdf' && (
        <div className="session-pdf animate-in">
          <div className="pdf-canvas-wrap">
            <canvas ref={pdfCanvasRef} className="pdf-canvas" />
          </div>
          <div className="pdf-controls">
            <button className="pdf-btn" onClick={pdfPrev} disabled={!pdfDocRef.current || pdfPage <= 1}>
              ‹ Prev
            </button>
            <span className="pdf-page-num">{pdfPage} / {pdfTotalPages}</span>
            <button className="pdf-btn" onClick={pdfNext} disabled={!pdfDocRef.current || pdfPage >= pdfTotalPages}>
              Next ›
            </button>
            
            <label className={`pdf-follow-toggle ${followTeacher ? 'active' : 'inactive'}`}>
              <input 
                type="checkbox" 
                checked={followTeacher} 
                onChange={e => setFollowTeacher(e.target.checked)} 
              />
              <span>Follow Prof</span>
            </label>
            
            <button className="pdf-btn download-btn" onClick={downloadPdf}>
              ⬇ Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
