import { useEffect, useState, useCallback } from 'react'
import io from 'socket.io-client'
import RadarDropdown from './components/RadarDropdown'
import DashboardLayout from './components/DashboardLayout'
import TelemetryBar from './components/TelemetryBar'
import LiveResultsGraph from './components/LiveResultsGraph'
import ActionSidebar from './components/ActionSidebar'
import ResourceViewer from './components/ResourceViewer'
import ResourceEditor from './components/ResourceEditor'
import SequencerLayout from './components/SequencerLayout'
import StageRenderer from './components/StageRenderer'
import type { TimelineBlock } from './types'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.js?url'

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

  // ── Teleprompter State (Epic 7 & 8) ──
  const [activeTimeline, setActiveTimeline] = useState<TimelineBlock[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isProcessingPdf, setIsProcessingPdf] = useState(false)

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

  // ── Auto-fire Polls Rule ──
  useEffect(() => {
    if (activeTimeline.length === 0) return
    const block = activeTimeline[currentIndex]
    
    if (block && block.type === 'pulse') {
       setPollActive(true)
       setResults({ A: 0, B: 0, C: 0, D: 0 })
       socket.emit('teacher-start-poll', {
         question: block.question,
         correct: '',
         questionCount: block.options.filter(opt => opt.trim() !== '').length
       })
    } else {
       setPollActive(false)
       socket.emit('teacher-stop-poll')
    }
  }, [currentIndex, activeTimeline])

  // ── Teleprompter Controls ──
  const prevBlock = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(curr => curr - 1)
  }, [currentIndex])

  const nextBlock = useCallback(() => {
    if (currentIndex < activeTimeline.length - 1) setCurrentIndex(curr => curr + 1)
  }, [currentIndex, activeTimeline.length])

  const loadLesson = useCallback(async () => {
    const timeline = await window.api.importLesson()
    if (timeline && timeline.length > 0) {
      setActiveTimeline(timeline)
      setCurrentIndex(0)
      setAppMode('dashboard')
    }
  }, [])

  const loadRawPdf = useCallback(async () => {
    try {
      const pdfPath = await window.api.selectPdf()
      if (!pdfPath) return

      setIsProcessingPdf(true)
      
      await window.api.clearActiveLesson()

      let rawBuffer = await window.api.readFileBuffer(pdfPath)
      if (!rawBuffer) throw new Error("Could not read file buffer")

      let pdfData: Uint8Array
      if ((rawBuffer as any).type === 'Buffer' && Array.isArray((rawBuffer as any).data)) {
        pdfData = new Uint8Array((rawBuffer as any).data)
      } else if (rawBuffer instanceof Uint8Array) {
        pdfData = rawBuffer
      } else {
        pdfData = new Uint8Array(rawBuffer as unknown as Iterable<number>)
      }

      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

      const loadingTask = pdfjsLib.getDocument({ data: pdfData })
      const pdf = await loadingTask.promise

      const newBlocks: TimelineBlock[] = []
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 })
        
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) continue

        canvas.height = viewport.height
        canvas.width = viewport.width

        await page.render({ canvasContext: context, viewport } as any).promise

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        const localPath = await window.api.saveActiveImage(dataUrl)

        if (localPath) {
          newBlocks.push({
            id: crypto.randomUUID(),
            type: 'slide',
            localPath
          })
        }
      }

      setActiveTimeline(newBlocks)
      setCurrentIndex(0)
      setAppMode('dashboard')
    } catch (error) {
      console.error("Raw PDF Import Failed", error)
      alert("Failed to import PDF slides. Check console for details.")
    } finally {
      setIsProcessingPdf(false)
    }
  }, [])

  const handleToggleResourceMode = useCallback(() => {
    const newMode = !resourceMode
    setResourceMode(newMode)
    if (newMode) {
      socket.emit('teacher-broadcast-resources', { content: resourceContent })
    } else {
      socket.emit('teacher-hide-resources')
    }
  }, [resourceMode, resourceContent])

  const handleSaveResource = useCallback((content: string) => {
    setResourceContent(content)
    setEditingResources(false)
    window.api.saveResource(content)
    if (resourceMode) {
      socket.emit('teacher-broadcast-resources', { content })
    }
  }, [resourceMode])

  const [radarOpen, setRadarOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (appMode === 'forge') {
    return <SequencerLayout onExit={() => setAppMode('dashboard')} />
  }

  return (
    <div className="app-layout !flex-col relative">
      {radarOpen && <RadarDropdown onClose={() => setRadarOpen(false)} />}
      
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
                <StageRenderer
                  block={activeTimeline[currentIndex]}
                  serverUrl={serverUrl}
                  pollActive={pollActive}
                  pollQuestion={activeTimeline[currentIndex]?.type === 'pulse' ? (activeTimeline[currentIndex] as Extract<TimelineBlock, { type: 'pulse' }>).question : 'Quick Poll'}
                  pollResults={results}
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
            onToggleRadar={() => setRadarOpen(prev => !prev)}
          />
        </div>

        {/* Action Sidebar / Controls */}
        <div className="flex-1 flex min-w-0 overflow-x-auto overflow-y-hidden custom-scrollbar">
          <ActionSidebar
            pollActive={pollActive}
            connectedStudents={connectedStudents}
            questions={questions}
            resourceMode={resourceMode}
            onToggleResourceMode={handleToggleResourceMode}
            onEditResources={() => setEditingResources(true)}
            onToggleForge={() => setAppMode('forge')}
            onDismissQuestion={(id) => socket.emit('teacher-dismiss-question', { id })}
            onStartQuickPoll={startQuickPoll}
            onStopPoll={stopPoll}
            activeTimeline={activeTimeline}
            currentIndex={currentIndex}
            isProcessingPdf={isProcessingPdf}
            onPrevBlock={prevBlock}
            onNextBlock={nextBlock}
            onLoadLesson={loadLesson}
            onLoadRawPdf={loadRawPdf}
            onToggleRadar={() => setRadarOpen(true)}
          />
        </div>
      </footer>
    </div>
  )
}

export default App