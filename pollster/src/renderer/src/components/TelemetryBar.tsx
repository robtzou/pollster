import { QRCodeSVG } from 'qrcode.react'

const CLOUD_RELAY_URL = 'https://pollster-relay-7smaydwp3q-uc.a.run.app'

interface TelemetryBarProps {
  roomCode: string | null
  serverUrl: string | null
  studentCount: number
  pollActive: boolean
  onToggleRadar?: () => void
}

export default function TelemetryBar({
  roomCode,
  serverUrl,
  studentCount,
  pollActive,
  onToggleRadar
}: TelemetryBarProps) {
  const qrSize = 90
  const joinUrl = CLOUD_RELAY_URL
    ? `${CLOUD_RELAY_URL}/join?room=${roomCode}`
    : serverUrl

  return (
    <div className="relative flex items-center h-full gap-6 px-6 py-2 bg-[#141720] flex-1">
      {/* QR Code — points to cloud relay for universal access */}
      {joinUrl && roomCode && (
        <div className="relative shrink-0 group">
          <div className="bg-white rounded-xl p-2 transition-all duration-200">
            <QRCodeSVG value={joinUrl || ''} size={qrSize} />
          </div>
        </div>
      )}

      {/* Room Code — readable from distance */}
      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase tracking-[2px] text-white/40 font-semibold">
            Join at
          </span>
          <span className="text-[10px] font-mono text-white/70 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-[1px] truncate max-w-[150px]" title={CLOUD_RELAY_URL ? CLOUD_RELAY_URL.replace(/^https?:\/\//, '') : (serverUrl || undefined)}>
            {CLOUD_RELAY_URL ? CLOUD_RELAY_URL.replace(/^https?:\/\//, '') : serverUrl}
          </span>
        </div>
        <span className="text-5xl font-black font-mono tracking-[10px] text-[#5b8def] drop-shadow-[0_0_12px_rgba(91,141,239,0.35)] leading-none">
          {roomCode || '----'}
        </span>
      </div>

      {/* Right side info */}
      <div className="flex flex-col items-end justify-center gap-2 shrink-0">
        {/* Student Count - Clickable Radar Toggle */}
        <button 
          onClick={onToggleRadar}
          className={`flex items-center gap-2 text-sm border-none bg-transparent cursor-pointer hover:bg-white/[0.04] p-1.5 -ml-1.5 rounded-lg transition-colors`}
          title="Open Engagement Radar"
        >
          <span>👥</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded-full ${
              studentCount > 0
                ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-white/[0.06] text-white/40'
            }`}
          >
            {studentCount}
          </span>
        </button>

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
  )
}
