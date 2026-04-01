import type { TimelineBlock } from '../types'
import { useState, useEffect } from 'react'

interface ActionSidebarProps {
  connectedStudents: { uuid: string; name: string }[]
  questions: { id: number; text: string; timestamp: number }[]
  resourceMode: boolean
  onToggleResourceMode: () => void
  onEditResources: () => void
  onToggleForge: () => void
  onDismissQuestion: (id: number) => void
  activeTimeline: TimelineBlock[]
  currentIndex: number
  isProcessingPdf: boolean
  onPrevBlock: () => void
  onNextBlock: () => void
  onLoadLesson: () => void
  onLoadRawPdf: () => void
  onClearLesson: () => void
  onToggleRadar: () => void
}

type PanelId = 'students' | 'questions' | 'resources' | null

export default function ActionSidebar({
  connectedStudents,
  questions,
  resourceMode,
  onToggleResourceMode,
  onEditResources,
  onToggleForge,
  onDismissQuestion,
  activeTimeline,
  currentIndex,
  isProcessingPdf,
  onPrevBlock,
  onNextBlock,
  onLoadLesson,
  onLoadRawPdf,
  onClearLesson,
  onToggleRadar
}: ActionSidebarProps) {
  const [openPanel, setOpenPanel] = useState<PanelId>(null)
  const [radar, setRadar] = useState<any>(null)
  const [questionsExpanded, setQuestionsExpanded] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchRadar = async () => {
      const state = await window.api.getRadarState()
      if (mounted) setRadar(state)
    }
    fetchRadar()
    const intv = setInterval(fetchRadar, 2000)
    return () => {
      mounted = false
      clearInterval(intv)
    }
  }, [])

  const getStatusColor = (student: any) => {
    if (!radar) return 'bg-emerald-400'
    const isDisconnected = Date.now() - student.lastSeen > 60000
    if (isDisconnected) return 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]'
    if (radar.totalPulsesLaunched < 2) return 'bg-emerald-500'
    const ratio = student.pulsesAnswered / radar.totalPulsesLaunched
    if (ratio === 0) return 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]'
    if (ratio < 0.75) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const togglePanel = (id: PanelId) => {
    setOpenPanel(prev => (prev === id ? null : id))
  }

  return (
    <div className="relative flex flex-row items-stretch h-full bg-[#141720] overflow-visible">
      {/* ── OVERLAY PANELS ── */}
      {openPanel && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-px">
          <div className="bg-[#1a1d2e] border border-white/[0.08] rounded-t-xl shadow-[0_-8px_32px_rgba(0,0,0,0.5)] max-h-[50vh] overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
              <span className="text-xs font-bold uppercase tracking-[2px] text-white/50">
                {openPanel === 'students' && `Students (${connectedStudents.length})`}
                {openPanel === 'questions' && `Questions (${questions.length})`}
                {openPanel === 'resources' && 'Resources'}
              </span>
              <div className="flex items-center gap-3">
                {openPanel === 'questions' && (
                  <button
                    onClick={() => setQuestionsExpanded(true)}
                    className="flex items-center justify-center w-6 h-6 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white border-0 cursor-pointer transition-colors"
                    title="Enlarge Questions"
                  >
                    ⤢
                  </button>
                )}
                <button
                  onClick={() => setOpenPanel(null)}
                  className="text-white/30 hover:text-white/70 bg-transparent border-0 cursor-pointer text-lg leading-none p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* ── STUDENTS PANEL ── */}
              {openPanel === 'students' && (
                <div className="flex flex-col gap-1.5">
                  {connectedStudents.length === 0 ? (
                    <p className="text-sm text-white/25 text-center py-4">No students connected yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                      {connectedStudents.map((s) => {
                        const rStudent = radar?.students.find((rs: any) => rs.uuid === s.uuid)
                        const dotClass = rStudent ? getStatusColor(rStudent) : 'bg-emerald-400'
                        return (
                          <div key={s.uuid} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                            <span className="text-xs font-medium text-white truncate">{s.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <button
                    onClick={() => { setOpenPanel(null); onToggleRadar() }}
                    className="mt-2 w-full py-2 text-xs font-bold rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white cursor-pointer transition-colors"
                  >
                    Open Full Radar →
                  </button>
                </div>
              )}

              {/* ── QUESTIONS PANEL ── */}
              {openPanel === 'questions' && (
                <div className="flex flex-col gap-2">
                  {questions.length === 0 ? (
                    <p className="text-sm text-white/25 text-center py-4">No student questions yet.</p>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        <span className="flex-1 text-sm text-white leading-snug">{q.text}</span>
                        <button
                          onClick={() => onDismissQuestion(q.id)}
                          className="text-white/20 hover:text-red-400 bg-transparent border-0 cursor-pointer text-base leading-none shrink-0 mt-0.5"
                          title="Dismiss"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── RESOURCES PANEL ── */}
              {openPanel === 'resources' && (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { onToggleResourceMode(); setOpenPanel(null) }}
                    className={`w-full py-3 px-4 text-sm font-bold rounded-xl border-0 cursor-pointer transition-all flex items-center justify-center gap-2
                      ${resourceMode
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)]'
                        : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.10] hover:text-white'}`}
                  >
                    {resourceMode ? '📊 Switch to Slides' : '📋 Show Resources'}
                  </button>
                  <button
                    onClick={() => { onEditResources(); setOpenPanel(null) }}
                    className="w-full py-2 px-4 text-xs font-semibold rounded-lg border border-white/[0.08] bg-transparent text-white/50 hover:bg-white/[0.04] hover:text-white cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    ✏️ Edit Resources
                  </button>
                </div>
              )}


            </div>
          </div>
        </div>
      )}

      {/* ── COMMAND BAR ── */}
      <div className="flex flex-row items-stretch h-full w-full p-3 gap-4">



        {/* ══ LESSON CONTROLS ══ */}
        <section className="flex flex-col justify-center min-w-[180px] shrink-0">
          <h3 className="text-[10px] uppercase tracking-[1.5px] text-white/30 font-semibold mb-2">
            Lesson
          </h3>
          {!activeTimeline.length ? (
            <div className="flex gap-2">
              <button
                onClick={onLoadLesson}
                disabled={isProcessingPdf}
                className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg border-0 cursor-pointer
                  bg-gradient-to-br from-indigo-500 to-purple-600 text-white
                  shadow-[0_4px_16px_rgba(99,102,241,0.3)]
                  hover:scale-[1.02] active:scale-[0.98] transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📁 .sig
              </button>
              <button
                onClick={onLoadRawPdf}
                disabled={isProcessingPdf}
                className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg border border-indigo-500/30 cursor-pointer
                  bg-transparent text-indigo-300
                  hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:text-white
                  active:scale-[0.98] transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingPdf ? '⏳...' : '📄 PDF'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-lg font-black tabular-nums text-white leading-none">
                  {currentIndex + 1}
                  <span className="text-white/30 text-xs font-medium mx-1">/</span>
                  <span className="text-white/40 text-xs font-medium tabular-nums">{activeTimeline.length}</span>
                </span>
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest bg-white/5 py-0.5 px-1.5 rounded flex-1 text-center truncate">
                  {activeTimeline[currentIndex]?.type || ''}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={onLoadLesson}
                    title="Reload Lesson"
                    className="text-[10px] text-white/30 hover:text-white/60 bg-transparent border-0 cursor-pointer p-0"
                  >
                    ⟲
                  </button>
                  <button
                    onClick={onClearLesson}
                    title="Clear Lesson"
                    className="text-[13px] text-white/30 hover:text-red-400 bg-transparent border-0 cursor-pointer leading-none p-0 ml-0.5"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={onPrevBlock}
                  disabled={currentIndex <= 0}
                  className="flex-[0.4] py-1.5 text-sm font-bold rounded-lg border-0 cursor-pointer
                    bg-white/[0.08] text-white hover:bg-white/[0.14] active:scale-[0.97]
                    disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150"
                >
                  ‹
                </button>
                <button
                  onClick={onNextBlock}
                  disabled={currentIndex >= activeTimeline.length - 1}
                  className="flex-1 py-1.5 text-sm font-bold rounded-lg border-0 cursor-pointer
                    bg-gradient-to-br from-blue-500 to-blue-700 text-white
                    shadow-[0_4px_16px_rgba(59,130,246,0.3)]
                    hover:scale-[1.02] active:scale-[0.97]
                    disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-150"
                >
                  {(currentIndex < activeTimeline.length - 1 && activeTimeline[currentIndex + 1]?.type === 'pulse') ? 'Poll ›' : 'Next ›'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Divider */}
        <div className="w-px bg-white/[0.06] shrink-0 my-1" />

        {/* ══ PANEL TOGGLE ICONS ══ */}
        <section className="flex items-center gap-1 ml-auto shrink-0">
          {/* Forge */}
          <button
            onClick={onToggleForge}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-lg border-0 cursor-pointer transition-all"
            title="Handout Forge"
          >
            🛠
          </button>

          {/* Resources */}
          <button
            onClick={() => togglePanel('resources')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg border-0 cursor-pointer transition-all
              ${openPanel === 'resources' ? 'bg-indigo-500/30 ring-1 ring-indigo-400/50' : 'bg-white/[0.04] hover:bg-white/[0.08]'}
              ${resourceMode ? 'ring-1 ring-indigo-400/40' : ''}`}
            title="Resources"
          >
            📋
          </button>

          {/* Students */}
          <button
            onClick={() => togglePanel('students')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg border-0 cursor-pointer transition-all relative
              ${openPanel === 'students' ? 'bg-emerald-500/20 ring-1 ring-emerald-400/50' : 'bg-white/[0.04] hover:bg-white/[0.08]'}`}
            title="Connected Students"
          >
            👥
            {connectedStudents.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-[9px] text-white font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {connectedStudents.length}
              </span>
            )}
          </button>

          {/* Questions */}
          <button
            onClick={() => togglePanel('questions')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg border-0 cursor-pointer transition-all relative
              ${openPanel === 'questions' ? 'bg-amber-500/20 ring-1 ring-amber-400/50' : 'bg-white/[0.04] hover:bg-white/[0.08]'}`}
            title="Student Questions"
          >
            ❓
            {questions.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-[9px] text-white font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {questions.length}
              </span>
            )}
          </button>


        </section>
      </div>

      {/* EXPANDED QUESTIONS MODAL VIEW */}
      {questionsExpanded && (
        <div
          className="fixed top-0 left-0 right-0 bottom-[120px] z-[999] bg-[#0c0e14]/95 backdrop-blur-md flex flex-col cursor-pointer p-8 animate-fade-in border-b border-white/[0.05]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuestionsExpanded(false);
          }}
        >
          <div className="absolute top-6 right-6 text-white/30 text-lg font-bold uppercase tracking-widest pointer-events-none">
            ✕ Click background to close
          </div>
          <div className="flex flex-col w-full max-w-5xl mx-auto h-full overflow-hidden pt-4">
            <h2 className="text-3xl md:text-4xl text-white/50 font-black uppercase tracking-[5px] mb-8 shrink-0">
              Student Questions
            </h2>
            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar flex flex-col gap-4">
              {questions.length === 0 ? (
                <p className="text-xl text-white/30">No student questions.</p>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="flex items-start gap-4 p-6 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] shadow-lg cursor-default transition-all hover:bg-white/[0.05]">
                    <span className="flex-1 text-2xl md:text-3xl text-white leading-relaxed font-medium">{q.text}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDismissQuestion(q.id); }}
                      className="text-white/20 hover:text-red-400 bg-transparent border-0 cursor-pointer text-5xl leading-none shrink-0 -mt-2 transition-colors"
                      title="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
