import { useEffect, useState, useCallback } from 'react'
import io from 'socket.io-client'
import DashboardLayout from './components/DashboardLayout'
import TelemetryBar from './components/TelemetryBar'
import SlideViewer from './components/SlideViewer'
import LiveResultsGraph from './components/LiveResultsGraph'
import ActionSidebar from './components/ActionSidebar'

const socket = io('http://localhost:3000')

function App() {
  // ── Core state ──
  const [serverUrl, setServerUrl] = useState('')
  const [roomCode, setRoomCode] = useState('')

  // ── Poll state ──
  const [pollActive, setPollActive] = useState(false)
  const [results, setResults] = useState({ A: 0, B: 0, C: 0, D: 0 })
  const [studentCount, setStudentCount] = useState(0)

  // ── PDF state ──
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(1)
  const [totalSlides, setTotalSlides] = useState(0)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // ── Init ──
  useEffect(() => {
    window.api.getServerUrl().then(setServerUrl)
    window.api.getRoomCode().then(setRoomCode)
  }, [])

  // ── Socket listeners ──
  useEffect(() => {
    socket.on('batched-results', (newResults: { A: number; B: number; C: number; D: number }) => {
      setResults(newResults)
    })

    socket.on('player-count', (count: number) => {
      setStudentCount(count)
    })

    return () => {
      socket.off('batched-results')
      socket.off('player-count')
    }
  }, [])

  // ── Poll Controls ──
  const startQuickPoll = useCallback(() => {
    setPollActive(true)
    setResults({ A: 0, B: 0, C: 0, D: 0 })
    socket.emit('teacher-start-poll', {
      question: 'Quick Poll',
      correct: ''
    })
  }, [])

  const stopPoll = useCallback(() => {
    setPollActive(false)
    socket.emit('teacher-stop-poll')
  }, [])

  // ── Slide Controls ──
  const prevSlide = useCallback(() => {
    if (currentSlide <= 1) return
    const next = currentSlide - 1
    setCurrentSlide(next)
    socket.emit('pdf-page', { page: next })
  }, [currentSlide])

  const nextSlide = useCallback(() => {
    if (currentSlide >= totalSlides) return
    const next = currentSlide + 1
    setCurrentSlide(next)
    socket.emit('pdf-page', { page: next })
  }, [currentSlide, totalSlides])

  const loadPdf = useCallback(async () => {
    const filePath = await window.api.selectPdf()
    if (!filePath) return

    await window.api.uploadPdf(filePath)
    setPdfLoaded(true)
    setCurrentSlide(1)
    setPdfUrl('http://localhost:3000/pdf')

    try {
      const resp = await fetch('http://localhost:3000/pdf-info')
      const info = await resp.json()
      setTotalSlides(info.totalPages || 0)
    } catch {
      setTotalSlides(0)
    }

    // Broadcast to students
    socket.emit('pdf-start', { totalPages: 0 })
  }, [])

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">📊</span>
          <span className="sidebar-brand-text">Pollster</span>
        </div>
      </nav>

      {/* Main Cockpit */}
      <main className="page-content">
        <DashboardLayout
          telemetry={
            <TelemetryBar
              roomCode={roomCode}
              serverUrl={serverUrl}
              studentCount={studentCount}
              pollActive={pollActive}
            />
          }
          mainStage={
            <>
              <SlideViewer
                pdfUrl={pdfUrl}
                currentSlide={currentSlide}
                pollActive={pollActive}
              />
              <LiveResultsGraph results={results} visible={pollActive} />
            </>
          }
          sidebar={
            <ActionSidebar
              socket={socket}
              pollActive={pollActive}
              currentSlide={currentSlide}
              totalSlides={totalSlides}
              pdfLoaded={pdfLoaded}
              onStartQuickPoll={startQuickPoll}
              onStopPoll={stopPoll}
              onPrevSlide={prevSlide}
              onNextSlide={nextSlide}
              onLoadPdf={loadPdf}
            />
          }
        />
      </main>
    </div>
  )
}

export default App