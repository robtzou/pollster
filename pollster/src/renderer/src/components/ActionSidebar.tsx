import type { TimelineBlock } from '../types'
import { useState, useEffect } from 'react'

interface ActionSidebarProps {
  pollActive: boolean
  connectedStudents: { uuid: string; name: string }[]
  questions: { id: number; text: string; timestamp: number }[]
  resourceMode: boolean
  onToggleResourceMode: () => void
  onEditResources: () => void
  onToggleForge: () => void
  onDismissQuestion: (id: number) => void
  onStartQuickPoll: () => void
  onStopPoll: () => void
  activeTimeline: TimelineBlock[]
  currentIndex: number
  isProcessingPdf: boolean
  onPrevBlock: () => void
  onNextBlock: () => void
  onLoadLesson: () => void
  onLoadRawPdf: () => void
  onToggleRadar: () => void
}

export default function ActionSidebar({
  pollActive,
  connectedStudents,
  questions,
  resourceMode,
  onToggleResourceMode,
  onEditResources,
  onToggleForge,
  onDismissQuestion,
  onStartQuickPoll,
  onStopPoll,
  activeTimeline,
  currentIndex,
  isProcessingPdf,
  onPrevBlock,
  onNextBlock,
  onLoadLesson,
  onLoadRawPdf,
  onToggleRadar
}: ActionSidebarProps) {
  const [radar, setRadar] = useState<any>(null)

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

  return (
    <div className="flex flex-row items-stretch h-full p-3 gap-6 bg-[#141720] overflow-x-auto min-w-max pr-8">
      {/* ══ POLL CONTROLS ══ */}
      <section className="flex flex-col justify-center min-w-[200px] shrink-0">
        <h3 className="text-[10px] uppercase tracking-[1.5px] text-white/30 font-semibold mb-2">
          Poll Controls
        </h3>

        {!pollActive ? (
          <button
            onClick={onStartQuickPoll}
            className="w-full py-3 px-4 text-base font-bold rounded-xl border-0 cursor-pointer
              bg-gradient-to-br from-red-500 to-red-700 text-white
              shadow-[0_4px_20px_rgba(239,68,68,0.3)]
              hover:shadow-[0_6px_28px_rgba(239,68,68,0.45)] hover:scale-[1.02]
              active:scale-[0.98] transition-all duration-150"
          >
            🚀 Launch
          </button>
        ) : (
          <button
            onClick={onStopPoll}
            className="w-full py-3 px-4 text-base font-bold rounded-xl border-0 cursor-pointer
              bg-gradient-to-br from-gray-600 to-gray-800 text-white
              ring-2 ring-red-500/50 animate-pulse
              hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
          >
            ⏹ Stop Poll
          </button>
        )}
      </section>

      {/* Divider */}
      <div className="w-px bg-white/[0.06] shrink-0 my-1" />

      {/* ══ VIEW MODE TOGGLE ══ */}
      <section className="flex flex-col justify-center min-w-[160px] shrink-0">
        <h3 className="text-[10px] uppercase tracking-[1.5px] text-white/30 font-semibold mb-2">
          View Mode
        </h3>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={onToggleResourceMode}
            className={`w-full py-2 px-3 text-sm font-bold rounded-lg border-0 cursor-pointer transition-all duration-150 flex items-center justify-center gap-2
              ${
  resourceMode
    ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)]'
    : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white'
} `}
          >
            {resourceMode ? '📊 Slides' : '📋 Resources'}
          </button>
          
          <button
            onClick={onEditResources}
            className="w-full py-1.5 px-3 text-xs font-semibold rounded-md border border-white/[0.06]
              bg-transparent text-white/50 hover:bg-white/[0.04] hover:text-white cursor-pointer
              flex items-center justify-center gap-2 transition-colors"
          >
            ✏️ Edit
          </button>
        </div>
      </section>

      {/* Divider */}
      <div className="w-px bg-white/[0.06] shrink-0 my-1" />

      {/* ══ TOOLS ══ */}
      <section className="flex flex-col justify-center min-w-[160px] shrink-0">
        <h3 className="text-[10px] uppercase tracking-[1.5px] text-white/30 font-semibold mb-2">
           Tools
        </h3>
        <button
           onClick={onToggleForge}
           className="w-full py-2.5 px-3 text-sm font-bold rounded-lg border-none cursor-pointer
             bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]
             hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
           🛠 The Forge
        </button>
      </section>

      {/* Divider */}
      <div className="w-px bg-white/[0.06] shrink-0 my-1" />

      {/* ══ LESSON CONTROLS ══ */}
      <section className="flex flex-col justify-center min-w-[200px] shrink-0">
        <h3 className="text-[10px] uppercase tracking-[1.5px] text-white/30 font-semibold mb-2">
          Lesson Controls
        </h3>

        {!activeTimeline.length ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={onLoadLesson}
              disabled={isProcessingPdf}
              className="w-full py-2.5 px-3 text-sm font-semibold rounded-xl border-0 cursor-pointer
                bg-gradient-to-br from-indigo-500 to-purple-600 text-white
                shadow-[0_4px_16px_rgba(99,102,241,0.3)]
                hover:shadow-[0_6px_24px_rgba(99,102,241,0.45)] hover:scale-[1.02]
                active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📁 Load .sig Pack
            </button>
            <button
              onClick={onLoadRawPdf}
              disabled={isProcessingPdf}
              className="w-full py-2.5 px-3 text-sm font-semibold rounded-xl border border-indigo-500/30 cursor-pointer
                bg-transparent text-indigo-300
                hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:text-white
                active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingPdf ? '⏳ Slicing PDF...' : '📄 Load Raw PDF'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl font-black tabular-nums text-white leading-none">
                {currentIndex + 1}
                <span className="text-white/30 text-sm font-medium mx-1">/</span>
                <span className="text-white/40 text-sm font-medium tabular-nums">{activeTimeline.length}</span>
              </span>
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest bg-white/5 py-1 px-1.5 rounded flex-1 text-center">
                {activeTimeline[currentIndex]?.type || ''}
              </span>
              <button
                onClick={onLoadLesson}
                className="text-[10px] text-white/30 hover:text-white/60 bg-transparent border-0 cursor-pointer flex-shrink-0"
              >
                Change...
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onPrevBlock}
                disabled={currentIndex <= 0}
                className="flex-[0.6] py-2 text-sm font-bold rounded-lg border-0 cursor-pointer
                  bg-white/[0.08] text-white hover:bg-white/[0.14] active:scale-[0.97]
                  disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150"
              >
                ‹
              </button>
              <button
                onClick={onNextBlock}
                disabled={currentIndex >= activeTimeline.length - 1}
                className="flex-1 py-2 text-sm font-bold rounded-lg border-0 cursor-pointer
                  bg-gradient-to-br from-blue-500 to-blue-700 text-white
                  shadow-[0_4px_16px_rgba(59,130,246,0.3)]
                  hover:scale-[1.02] active:scale-[0.97]
                  disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-150"
              >
                {(currentIndex < activeTimeline.length - 1 && activeTimeline[currentIndex + 1]?.type === 'pulse') ? 'Run Poll ›' : 'Next ›'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="w-px bg-white/[0.06] shrink-0 my-1" />

      {/* ══ CONNECTED STUDENTS ══ */}
      <section className="flex flex-col justify-start min-w-[140px] shrink-0 h-full">
        <h3 
          className="text-[10px] uppercase tracking-[1.5px] text-white/30 font-semibold mb-2 cursor-pointer hover:text-white transition-colors"
          onClick={onToggleRadar}
          title="Open Engagement Radar"
        >
          Students ({connectedStudents.length})
        </h3>
        <div className="flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">
          {connectedStudents.length === 0 ? (
            <p className="text-[11px] text-white/25">None connected.</p>
          ) : (
            connectedStudents.map((s) => {
              const rStudent = radar?.students.find((rs: any) => rs.uuid === s.uuid)
              const dotClass = rStudent ? getStatusColor(rStudent) : 'bg-emerald-400'
              return (
                <div key={s.uuid} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06] truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                  <span className="text-xs font-medium text-white truncate">{s.name}</span>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="w-px bg-white/[0.06] shrink-0 my-1" />

      {/* ══ STUDENT QUESTIONS ══ */}
      <section className="flex flex-col justify-start min-w-[200px] max-w-[300px] shrink-0 h-full">
        <h3 className="text-[10px] uppercase tracking-[1.5px] text-white/30 font-semibold mb-2">
          Questions ({questions.length})
        </h3>
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
          {questions.length === 0 ? (
            <p className="text-[11px] text-white/25">No questions yet.</p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="flex items-start gap-2 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.06]">
                <span className="flex-1 text-[11px] text-white leading-snug">{q.text}</span>
                <button
                  onClick={() => onDismissQuestion(q.id)}
                  className="text-white/20 hover:text-red-400 bg-transparent border-0 cursor-pointer text-sm leading-none shrink-0"
                  title="Dismiss"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="w-px bg-white/[0.06] shrink-0 my-1" />

      {/* ══ END CLASS ══ */}
      <section className="flex flex-col justify-center min-w-[140px] shrink-0 h-full ml-auto">
        <button 
          onClick={async () => {
            if (confirm("Are you sure you want to end the session? This will finalize all radar metrics and export the class gradebook.")) {
              const exportPath = await window.api.endSessionExport();
              if (exportPath) {
                alert(`Engagement Radar successfully exported to:\n${exportPath}`);
              }
            }
          }}
          className="w-[140px] h-12 bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] rounded-xl text-white font-black uppercase tracking-[1px] shadow-[0_4px_20px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
        >
          <span>🛑</span> END CLASS
        </button>
      </section>
    </div>
  )
}
