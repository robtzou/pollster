import type { Socket } from 'socket.io-client'

interface ActionSidebarProps {
  socket: Socket
  pollActive: boolean
  currentSlide: number
  totalSlides: number
  pdfLoaded: boolean
  connectedStudents: { uuid: string; name: string }[]
  questions: { id: number; text: string; timestamp: number }[]
  resourceMode: boolean
  onToggleResourceMode: () => void
  onEditResources: () => void
  onToggleForge: () => void
  onDismissQuestion: (id: number) => void
  onStartQuickPoll: () => void
  onStopPoll: () => void
  onPrevSlide: () => void
  onNextSlide: () => void
  onLoadPdf: () => void
}

export default function ActionSidebar({
  pollActive,
  currentSlide,
  totalSlides,
  pdfLoaded,
  connectedStudents,
  questions,
  resourceMode,
  onToggleResourceMode,
  onEditResources,
  onToggleForge,
  onDismissQuestion,
  onStartQuickPoll,
  onStopPoll,
  onPrevSlide,
  onNextSlide,
  onLoadPdf
}: ActionSidebarProps) {
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
            className={`w-full py-2 px-3 text-sm font-bold rounded-lg border-0 cursor-pointer
              transition-all duration-150 flex items-center justify-center gap-2
              ${resourceMode
                ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)]'
                : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white'
              }`}
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

      {/* ══ SLIDE CONTROLS ══ */}
      <section className="flex flex-col justify-center min-w-[200px] shrink-0">
        <h3 className="text-[10px] uppercase tracking-[1.5px] text-white/30 font-semibold mb-2">
          Slide Controls
        </h3>

        {!pdfLoaded ? (
          <button
            onClick={onLoadPdf}
            className="w-full py-3 px-4 text-sm font-semibold rounded-xl border-0 cursor-pointer
              bg-gradient-to-br from-indigo-500 to-purple-600 text-white
              shadow-[0_4px_16px_rgba(99,102,241,0.3)]
              hover:shadow-[0_6px_24px_rgba(99,102,241,0.45)] hover:scale-[1.02]
              active:scale-[0.98] transition-all duration-150"
          >
            📁 Load PDF
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl font-black tabular-nums text-white leading-none">
                {currentSlide}
                <span className="text-white/30 text-sm font-medium mx-1">/</span>
                <span className="text-white/40 text-sm font-medium tabular-nums">{totalSlides}</span>
              </span>
              <button
                onClick={onLoadPdf}
                className="text-[10px] text-white/30 hover:text-white/60 bg-transparent border-0 cursor-pointer"
              >
                Change...
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onPrevSlide}
                disabled={currentSlide <= 1}
                className="flex-[0.6] py-2 text-sm font-bold rounded-lg border-0 cursor-pointer
                  bg-white/[0.08] text-white hover:bg-white/[0.14] active:scale-[0.97]
                  disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150"
              >
                ‹
              </button>
              <button
                onClick={onNextSlide}
                disabled={currentSlide >= totalSlides}
                className="flex-1 py-2 text-sm font-bold rounded-lg border-0 cursor-pointer
                  bg-gradient-to-br from-blue-500 to-blue-700 text-white
                  shadow-[0_4px_16px_rgba(59,130,246,0.3)]
                  hover:scale-[1.02] active:scale-[0.97]
                  disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-150"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="w-px bg-white/[0.06] shrink-0 my-1" />

      {/* ══ CONNECTED STUDENTS ══ */}
      <section className="flex flex-col justify-start min-w-[140px] shrink-0 h-full">
        <h3 className="text-[10px] uppercase tracking-[1.5px] text-white/30 font-semibold mb-2">
          Students ({connectedStudents.length})
        </h3>
        <div className="flex flex-col gap-1 overflow-y-auto pr-1">
          {connectedStudents.length === 0 ? (
            <p className="text-[11px] text-white/25">None connected.</p>
          ) : (
            connectedStudents.map((s) => (
              <div key={s.uuid} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06] truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-white truncate">{s.name}</span>
              </div>
            ))
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
    </div>
  )
}
