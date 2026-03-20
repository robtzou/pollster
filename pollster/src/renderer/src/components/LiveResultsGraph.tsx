const BAR_COLORS: Record<string, string> = {
  A: '#e74c3c',
  B: '#3498db',
  C: '#f39c12',
  D: '#2ecc71'
}

interface LiveResultsGraphProps {
  results: { A: number; B: number; C: number; D: number }
  visible: boolean
}

export default function LiveResultsGraph({ results, visible }: LiveResultsGraphProps) {
  if (!visible) return null

  const totalVotes = Object.values(results).reduce((s, v) => s + v, 0)
  const maxVotes = Math.max(...Object.values(results), 1)

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl px-8">
        {/* Vote counter */}
        <div className="text-center mb-8">
          <span className="text-white/40 text-sm font-semibold uppercase tracking-wider">
            Live Results
          </span>
          <div className="text-white/60 text-sm mt-1">
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Bars */}
        <div className="flex flex-col gap-5">
          {Object.entries(results).map(([key, count]) => {
            const pct = maxVotes > 0 ? (count / maxVotes) * 100 : 0
            return (
              <div key={key} className="flex items-center gap-4">
                {/* Letter badge */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black text-white shrink-0"
                  style={{ background: BAR_COLORS[key] }}
                >
                  {key}
                </div>

                {/* Bar track */}
                <div className="flex-1 h-14 rounded-xl bg-white/[0.06] overflow-hidden relative">
                  <div
                    className="h-full rounded-xl transition-[width] duration-300 ease-out"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${BAR_COLORS[key]}, ${BAR_COLORS[key]}cc)`,
                      minWidth: count > 0 ? 24 : 0
                    }}
                  />
                </div>

                {/* Count */}
                <div className="w-14 text-right text-2xl font-bold tabular-nums text-white">
                  {count}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
