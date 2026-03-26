import { useEffect, useState, useCallback } from 'react'
import io from 'socket.io-client'
import DashboardLayout from './components/DashboardLayout'
import TelemetryBar from './components/TelemetryBar'
import SlideViewer from './components/SlideViewer'
import LiveResultsGraph from './components/LiveResultsGraph'
import ActionSidebar from './components/ActionSidebar'
import ResourceViewer from './components/ResourceViewer'
import ResourceEditor from './components/ResourceEditor'
import SequencerLayout from './components/SequencerLayout'

const socket = io('http://localhost:3000')

function App() {
  // ── Core state ──
  const [serverUrl, setServerUrl] = useState('')
  const [roomCode, setRoomCode] = useState('')

  // ── Poll state ──
  const [pollActive, setPollActive] = useState(false)
  const [results, setResults] = useState({ A: 0, B: 0, C: 0, D: 0 })
  const [studentCount, setStudentCount] = useState(0)
  const [connectedStudents, setConnectedStudents] = useState<{ uuid: string; name: string }[]>([])
  const [questions, setQuestions] = useState<{ id: number; text: string; timestamp: number }[]>([])

  // ── PDF state ──
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(1)
  const [totalSlides, setTotalSlides] = useState(0)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // ── Resources state ──
  const [resourceMode, setResourceMode] = useState(false)
  const [resourceContent, setResourceContent] = useState('')
  const [editingResources, setEditingResources] = useState(false)

  // ── Mode state ──
  const [appMode, setAppMode] = useState<'dashboard' | 'forge'>('dashboard')

  // ── Init ──
  useEffect(() => {
    window.api.getServerUrl().then(setServerUrl)
    window.api.getRoomCode().then(setRoomCode)
    window.api.loadResource().then(setResourceContent)
  }, [])

  // ── Socket listeners ──
  useEffect(() => {
    socket.on('batched-results', (newResults: { A: number; B: number; C: number; D: number }) => {
      setResults(newResults)
    })

    socket.on('player-count', (count: number) => {
      setStudentCount(count)
    })

    socket.on('student-roster', (roster: { uuid: string; name: string }[]) => {
      setConnectedStudents(roster)
    })

    socket.on('questions-updated', (q: { id: number; text: string; timestamp: number }[]) => {
      setQuestions(q)
    })

    return () => {
      socket.off('batched-results')
      socket.off('player-count')
      socket.off('student-roster')
      socket.off('questions-updated')
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

  const handleToggleResourceMode = useCallback(() => {
    const newMode = !resourceMode
    setResourceMode(newMode)
    if (newMode) {
      // Starting resource mode
      socket.emit('teacher-broadcast-resources', { content: resourceContent })
      if (pdfLoaded) socket.emit('pdf-stop')
    } else {
      // Stopping resource mode
      socket.emit('teacher-hide-resources')
      if (pdfLoaded) {
        socket.emit('pdf-start', { totalPages: totalSlides })
        socket.emit('pdf-page', { page: currentSlide })
      }
    }
  }, [resourceMode, resourceContent, pdfLoaded, totalSlides, currentSlide])

  const handleSaveResource = useCallback((content: string) => {
    setResourceContent(content)
    setEditingResources(false)
    window.api.saveResource(content)
    if (resourceMode) {
      socket.emit('teacher-broadcast-resources', { content })
    }
  }, [resourceMode])

  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (appMode === 'forge') {
    return <SequencerLayout onExit={() => setAppMode('dashboard')} />
  }

  return (
    <div className="app-layout !flex-col">
      {editingResources && (
        <ResourceEditor
          content={resourceContent}
          onSave={handleSaveResource}
          onClose={() => setEditingResources(false)}
        />
      )}
      {/* Main Cockpit - Top flex area taking up remaining height */}
      <main className="flex-1 min-h-0 relative bg-[#0f1117]">
        <DashboardLayout
          mainStage={
            <>
              {resourceMode ? (
                <ResourceViewer content={resourceContent} />
              ) : (
                <SlideViewer
                  pdfUrl={pdfUrl}
                  currentSlide={currentSlide}
                  pollActive={pollActive}
                />
              )}
              <LiveResultsGraph results={results} visible={pollActive} />
            </>
          }
        />
      </main>

      {/* Bottom Control Bar - max 20% height */}
      <footer className="flex shrink-0 h-[20vh] min-h-[140px] max-h-[180px] bg-[#141720] border-t border-white/[0.06] overflow-hidden w-full">
        {/* Nav Sidebar - minimized horizontal mode */}
        <nav 
          className="flex flex-col items-center justify-center min-w-[80px] w-[80px] border-r border-white/[0.06] bg-[rgba(18,22,33,0.95)] transition-all cursor-pointer hover:bg-white/[0.05]"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Toggle Navigation"
        >
          <span className="text-3xl mb-1 drop-shadow-md">📊</span>
          <span className="text-[10px] font-bold text-white/50 tracking-wider">APP</span>
        </nav>

        {/* Telemetry Bar */}
        <div className="flex-shrink-0 border-r border-white/[0.06] h-full flex flex-col justify-center">
          <TelemetryBar
            roomCode={roomCode}
            serverUrl={serverUrl}
            studentCount={studentCount}
            pollActive={pollActive}
          />
        </div>

        {/* Action Sidebar / Controls */}
        <div className="flex-1 flex min-w-0 overflow-x-auto overflow-y-hidden custom-scrollbar">
          <ActionSidebar
            socket={socket}
            pollActive={pollActive}
            currentSlide={currentSlide}
            totalSlides={totalSlides}
            pdfLoaded={pdfLoaded}
            connectedStudents={connectedStudents}
            questions={questions}
            resourceMode={resourceMode}
            onToggleResourceMode={handleToggleResourceMode}
            onEditResources={() => setEditingResources(true)}
            onToggleForge={() => setAppMode('forge')}
            onDismissQuestion={(id) => socket.emit('teacher-dismiss-question', { id })}
            onStartQuickPoll={startQuickPoll}
            onStopPoll={stopPoll}
            onPrevSlide={prevSlide}
            onNextSlide={nextSlide}
            onLoadPdf={loadPdf}
          />
        </div>
      </footer>
    </div>
  )
}

export default App