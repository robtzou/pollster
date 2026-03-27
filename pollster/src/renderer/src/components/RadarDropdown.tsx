import { useEffect, useState } from 'react'

interface StudentRadar {
  uuid: string
  name: string
  lastSeen: number
  pulsesAnswered: number
}

interface RadarState {
  totalPulsesLaunched: number
  students: StudentRadar[]
}

interface RadarDropdownProps {
  onClose: () => void
}

export default function RadarDropdown({ onClose }: RadarDropdownProps) {
  const [radar, setRadar] = useState<RadarState | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchRadar = async () => {
      const state = await window.api.getRadarState()
      if (mounted) setRadar(state)
    }

    fetchRadar()
    // Poll every 2 seconds to keep the UI perfectly synced while hovering
    const interval = setInterval(fetchRadar, 2000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (!radar) return null

  const calculateStatus = (student: StudentRadar) => {
    const isDisconnected = Date.now() - student.lastSeen > 60000 // 60s
    if (isDisconnected) return 'red'

    if (radar.totalPulsesLaunched < 2) return 'green' // Grace period

    const ratio = student.pulsesAnswered / radar.totalPulsesLaunched

    if (ratio === 0) return 'red' // Ghosting
    if (ratio < 0.75) return 'yellow' // Slipping
    return 'green' // Active
  }

  // Sort by severity (Red -> Yellow -> Green)
  const sortedStudents = [...radar.students].map(s => {
    const status = calculateStatus(s)
    const severityMap = { red: 0, yellow: 1, green: 2 }
    return { ...s, status, severity: severityMap[status] }
  }).sort((a, b) => a.severity - b.severity)

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[480px] bg-gradient-to-br from-[#1a1d28] to-[#12151e] rounded-xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.8)] flex flex-col max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/[0.05] bg-white/[0.03]">
          <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <span className="text-indigo-400 text-sm">📡</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-white/90 tracking-widest uppercase m-0 leading-tight">
              Engagement Radar
            </h3>
            <p className="text-[10px] text-white/40 font-mono m-0 mt-0.5 uppercase tracking-wider">
              {radar.totalPulsesLaunched} Total Pulses
            </p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border-none cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin custom-scrollbar space-y-2">
        {sortedStudents.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-lg bg-white/[0.02] mt-2">
            <p className="text-white/40 text-sm mb-1">Radar is empty.</p>
            <p className="text-[10px] text-white/20 uppercase tracking-widest">Students will appear upon joining.</p>
          </div>
        ) : (
          sortedStudents.map(student => {
            const bgClass =
              student.status === 'red' ? 'bg-red-500/[0.08] border-red-500/20' :
              student.status === 'yellow' ? 'bg-amber-500/[0.08] border-amber-500/20' :
              'bg-emerald-500/[0.08] border-emerald-500/20'

            const textClass =
              student.status === 'red' ? 'text-red-400' :
              student.status === 'yellow' ? 'text-amber-400' :
              'text-emerald-400'
            
            const ratioDisplay = radar.totalPulsesLaunched > 0 ? `${student.pulsesAnswered}/${radar.totalPulsesLaunched}` : '0/0'

            return (
              <div key={student.uuid} className={`p-3 rounded-lg flex items-center justify-between border ${bgClass} transition-all`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${student.status === 'red' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse' : student.status === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className="font-bold text-white/90 truncate max-w-[140px] text-[13px]">{student.name}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-[10px] font-black tracking-[1.5px] uppercase ${textClass}`}>
                    {student.status === 'red' ? 'DISCONNECTED' : student.status === 'yellow' ? 'ZONING OUT' : 'ENGAGED'}
                  </span>
                  <span className="text-[10px] text-white/30 font-mono tracking-widest">
                    {ratioDisplay} TICK
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
      </div>
    </div>
  )
}
