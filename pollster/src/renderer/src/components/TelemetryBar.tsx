import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

const PUBLIC_JOIN_URL = 'https://handout.live/room'

interface TelemetryBarProps {
  roomCode: string | null
  serverUrl: string | null
  studentCount: number
  connectedStudents?: { uuid: string; name: string }[]
  pollActive: boolean
  onToggleRadar?: () => void
}

export default function TelemetryBar({
  roomCode,
  serverUrl,
  studentCount,
  connectedStudents,
  pollActive,
  onToggleRadar
}: TelemetryBarProps) {
  const [expanded, setExpanded] = useState(false)

  const qrSize = 90
  const joinUrl = PUBLIC_JOIN_URL
    ? `${PUBLIC_JOIN_URL}?room=${roomCode}`
    : serverUrl

  return (
    <>
      <div className="relative flex items-center h-full gap-6 px-6 py-2 bg-[#141720] flex-1">
        {/* Enlarge overlay background click area (left half) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="absolute inset-y-0 left-0 w-2/3 bg-transparent border-0 cursor-pointer z-0 hover:bg-white/[0.02]"
          title={expanded ? "Close join details" : "Click to enlarge join details"}
        />
        {/* QR Code — points to cloud relay for universal access */}
        {joinUrl && roomCode && (
          <div className="relative shrink-0 group z-10 pointer-events-none">
            <div className="bg-white rounded-xl p-2 transition-all duration-200">
              <QRCodeSVG value={joinUrl || ''} size={qrSize} />
            </div>
          </div>
        )}

        {/* Room Code — readable from distance */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px] z-10 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[2px] text-white/40 font-semibold">
              Join at
            </span>
            <span className="text-[10px] font-mono text-white/70 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-[1px] truncate max-w-[150px]" title="handout.live/room">
              handout.live/room
            </span>
          </div>
          <span className="text-5xl font-black font-mono tracking-[10px] text-[#5b8def] drop-shadow-[0_0_12px_rgba(91,141,239,0.35)] leading-none">
            {roomCode || '----'}
          </span>
        </div>

        {/* Right side info */}
        <div className="flex flex-col items-end justify-center gap-2 shrink-0 z-10">
          <div className="flex items-center gap-2">
            {/* Enlarge Button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg ${expanded ? 'bg-white/[0.1] text-white' : 'bg-white/[0.04] text-white/40'} hover:bg-white/[0.08] hover:text-white border-0 cursor-pointer transition-colors`}
              title={expanded ? "Close Join Information" : "Enlarge Join Information"}
            >
              {expanded ? '✕' : '⤢'}
            </button>

            {/* Student Count - Clickable Radar Toggle */}
            <button
              onClick={onToggleRadar}
              className={`flex items-center gap-2 text-sm border-none bg-transparent cursor-pointer hover:bg-white/[0.04] p-1.5 rounded-lg transition-colors`}
              title="Open Engagement Radar"
            >
              <span>👥</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full ${studentCount > 0
                  ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-white/[0.06] text-white/40'
                  }`}
              >
                {studentCount}
              </span>
            </button>
          </div>

          {/* Poll Status */}
          {pollActive && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="font-bold text-red-400">LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* EXPANED MODAL VIEW */}
      {expanded && (
        <div
          className="fixed top-0 left-0 right-0 bottom-[120px] z-[999] bg-[#0c0e14]/95 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer p-8 animate-fade-in border-b border-white/[0.05]"
          onClick={() => setExpanded(false)}
        >
          <div className="absolute top-6 right-6 text-white/30 text-lg font-bold uppercase tracking-widest pointer-events-none">
            ✕ Click anywhere to close
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20 w-full max-w-6xl mx-auto h-[calc(100%-2rem)]">
            {/* Huge QR Code */}
            {joinUrl && roomCode && (
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl shadow-blue-500/10 shrink-0">
                <QRCodeSVG value={joinUrl || ''} size={240} />
              </div>
            )}

            {/* Huge Text Information & Students */}
            <div className="flex flex-col items-center md:items-start flex-1 text-center md:text-left h-full w-full min-h-0 pt-4 pb-2">
              <span className="text-2xl md:text-3xl text-white/50 font-black uppercase tracking-[5px] mb-3">
                Join at
              </span>
              <span className="text-4xl md:text-6xl text-white font-mono font-bold leading-tight break-all mb-2">
                handout.live/room
              </span>
              <div className="flex flex-col md:flex-row items-center md:items-baseline gap-4 mb-6">
                <span className="text-xl md:text-2xl text-white/30 uppercase tracking-[4px] font-bold">Code:</span>
                <span className="text-[5rem] md:text-[7rem] font-black font-mono tracking-[15px] md:tracking-[20px] text-[#5b8def] drop-shadow-[0_0_30px_rgba(91,141,239,0.3)] leading-none ml-2 md:-ml-2">
                  {roomCode || '----'}
                </span>
              </div>

              {/* Joined Students */}
              {connectedStudents && connectedStudents.length > 0 && (
                <div className="w-full flex-1 flex flex-col min-h-0 mt-2">
                  <div className="text-white/40 text-sm font-bold uppercase tracking-[3px] mb-4 flex items-center md:justify-start justify-center gap-3 w-full shrink-0">
                    <span>Joined Students ({connectedStudents.length})</span>
                    <div className="h-px flex-1 bg-white/10 max-w-[200px]" />
                  </div>
                  <div className="flex flex-wrap items-start content-start justify-center md:justify-start gap-3 overflow-y-auto flex-1 pb-4 custom-scrollbar w-full">
                    {connectedStudents.map(s => (
                      <div key={s.uuid} className="bg-white/[0.05] border border-white/[0.08] text-white/90 font-bold px-4 py-2 rounded-xl text-lg shadow-sm">
                        {s.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

