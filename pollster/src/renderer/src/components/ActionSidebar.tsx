import { useState } from 'react'
import type { Socket } from 'socket.io-client'

interface ActionSidebarProps {
  socket: Socket
  pollActive: boolean
  currentSlide: number
  totalSlides: number
  pdfLoaded: boolean
  connectedStudents: { uuid: string; name: string }[]
  questions: { id: number; text: string; timestamp: number }[]
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
  onDismissQuestion,
  onStartQuickPoll,
  onStopPoll,
  onPrevSlide,
  onNextSlide,
  onLoadPdf
}: ActionSidebarProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState<
    { uuid: string; name: string; total_answers: number; correct_answers: number }[]
  >([])

  const fetchLeaderboard = () => {
    window.api.getLeaderboard().then(setLeaderboard)
    setShowLeaderboard(!showLeaderboard)
  }

  return (
    <div className="flex flex-col h-full p-5 gap-5 bg-[#141720]">
      {/* ══ POLL CONTROLS ══ */}
      <section>
        <h3 className="text-[11px] uppercase tracking-[2px] text-white/30 font-semibold mb-3">
          Poll Controls
        </h3>

        {!pollActive ? (
          <button
            onClick={onStartQuickPoll}
            className="w-full py-4 px-6 text-lg font-bold rounded-xl border-0 cursor-pointer
              bg-gradient-to-br from-red-500 to-red-700 text-white
              shadow-[0_4px_20px_rgba(239,68,68,0.3)]
              hover:shadow-[0_6px_28px_rgba(239,68,68,0.45)] hover:scale-[1.02]
              active:scale-[0.98] transition-all duration-150"
          >
            🚀 Launch Quick Poll
          </button>
        ) : (
          <button
            onClick={onStopPoll}
            className="w-full py-4 px-6 text-lg font-bold rounded-xl border-0 cursor-pointer
              bg-gradient-to-br from-gray-600 to-gray-800 text-white
              ring-2 ring-red-500/50 animate-pulse
              hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
          >
            ⏹ Stop Poll
          </button>
        )}
      </section>

      {/* Divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* ══ SLIDE CONTROLS ══ */}
      <section>
        <h3 className="text-[11px] uppercase tracking-[2px] text-white/30 font-semibold mb-3">
          Slide Controls
        </h3>

        {!pdfLoaded ? (
          <button
            onClick={onLoadPdf}
            className="w-full py-3.5 px-6 text-base font-semibold rounded-xl border-0 cursor-pointer
              bg-gradient-to-br from-indigo-500 to-purple-600 text-white
              shadow-[0_4px_16px_rgba(99,102,241,0.3)]
              hover:shadow-[0_6px_24px_rgba(99,102,241,0.45)] hover:scale-[1.02]
              active:scale-[0.98] transition-all duration-150"
          >
            📁 Load Presentation
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Page indicator */}
            <div className="text-center">
              <span className="text-3xl font-black tabular-nums text-white">
                {currentSlide}
              </span>
              <span className="text-white/30 text-lg font-medium mx-1">/</span>
              <span className="text-white/40 text-lg font-medium tabular-nums">
                {totalSlides}
              </span>
            </div>

            {/* Nav buttons */}
            <div className="flex gap-3">
              <button
                onClick={onPrevSlide}
                disabled={currentSlide <= 1}
                className="flex-1 py-3.5 text-xl font-bold rounded-xl border-0 cursor-pointer
                  bg-white/[0.08] text-white
                  hover:bg-white/[0.14] active:scale-[0.97]
                  disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-white/[0.08]
                  transition-all duration-150"
              >
                ‹ Prev
              </button>
              <button
                onClick={onNextSlide}
                disabled={currentSlide >= totalSlides}
                className="flex-1 py-3.5 text-xl font-bold rounded-xl border-0 cursor-pointer
                  bg-gradient-to-br from-blue-500 to-blue-700 text-white
                  shadow-[0_4px_16px_rgba(59,130,246,0.3)]
                  hover:shadow-[0_6px_24px_rgba(59,130,246,0.45)] hover:scale-[1.02]
                  active:scale-[0.97]
                  disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100
                  transition-all duration-150"
              >
                Next ›
              </button>
            </div>

            {/* Change PDF */}
            <button
              onClick={onLoadPdf}
              className="text-xs text-white/30 hover:text-white/60 bg-transparent border-0
                cursor-pointer py-1 transition-colors"
            >
              Change presentation...
            </button>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* ══ CONNECTED STUDENTS ══ */}
      <section>
        <h3 className="text-[11px] uppercase tracking-[2px] text-white/30 font-semibold mb-3 flex items-center gap-2">
          <span className="text-base">👥</span> Students ({connectedStudents.length})
        </h3>
        {connectedStudents.length === 0 ? (
          <p className="text-sm text-white/25 text-center py-3">
            No students connected yet.
          </p>
        ) : (
          <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
            {connectedStudents.map((s) => (
              <div
                key={s.uuid}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-sm font-medium text-white truncate">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* ══ STUDENT QUESTIONS ══ */}
      <section>
        <h3 className="text-[11px] uppercase tracking-[2px] text-white/30 font-semibold mb-3 flex items-center gap-2">
          <span className="text-base">❓</span> Questions ({questions.length})
        </h3>
        {questions.length === 0 ? (
          <p className="text-sm text-white/25 text-center py-3">
            No questions yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
            {questions.map((q) => (
              <div
                key={q.id}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
              >
                <span className="flex-1 text-sm text-white leading-snug">{q.text}</span>
                <button
                  onClick={() => onDismissQuestion(q.id)}
                  className="text-white/20 hover:text-red-400 bg-transparent border-0 cursor-pointer text-base leading-none shrink-0 transition-colors"
                  title="Dismiss"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* ══ LEADERBOARD ══ */}
      <section className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] uppercase tracking-[2px] text-white/30 font-semibold flex items-center gap-2">
            <span className="text-base">🏆</span> Leaderboard
          </h3>
          <button
            onClick={fetchLeaderboard}
            className="text-xs font-semibold px-3 py-1 rounded-md bg-white/[0.06]
              text-white/50 hover:text-white/80 hover:bg-white/[0.1]
              border-0 cursor-pointer transition-all"
          >
            {showLeaderboard ? 'Hide' : 'Show'}
          </button>
        </div>

        {showLeaderboard && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-white/25 text-center py-6">
                No responses yet.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {leaderboard.map((entry, i) => {
                  const pct =
                    entry.total_answers > 0
                      ? Math.round((entry.correct_answers / entry.total_answers) * 100)
                      : 0
                  return (
                    <div
                      key={entry.uuid}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                    >
                      {/* Rank */}
                      <span className="w-6 text-sm font-bold text-white/30 tabular-nums">
                        {i + 1}
                      </span>
                      {/* Name */}
                      <span className="flex-1 text-sm font-semibold text-white truncate">
                        {entry.name}
                      </span>
                      {/* Score */}
                      <span className="text-sm">
                        <span className="text-emerald-400 font-bold">{entry.correct_answers}</span>
                        <span className="text-white/25">/{entry.total_answers}</span>
                      </span>
                      {/* Accuracy */}
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          pct >= 70
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : pct >= 40
                              ? 'bg-yellow-500/15 text-yellow-400'
                              : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
