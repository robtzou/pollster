import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const CLOUD_RELAY_URL = 'https://pollster-relay-7smaydwp3q-uc.a.run.app'

interface TelemetryBarProps {
  roomCode: string
  serverUrl: string
  studentCount: number
  pollActive: boolean
}

export default function TelemetryBar({
  roomCode,
  serverUrl,
  studentCount,
  pollActive
}: TelemetryBarProps) {
  const [qrLarge, setQrLarge] = useState(true)
  const qrSize = qrLarge ? 160 : 64
  const joinUrl = CLOUD_RELAY_URL
    ? `${CLOUD_RELAY_URL}/join?room=${roomCode}`
    : serverUrl

  return (
    <div className="flex items-center gap-10 px-10 py-6 bg-[#141720] border-b border-white/[0.06] flex-1">
      {/* QR Code — points to cloud relay for universal access */}
      {joinUrl && roomCode && (
        <div className="relative shrink-0 group">
          <div className="bg-white rounded-xl p-3 transition-all duration-200">
            <QRCodeSVG value={joinUrl} size={qrSize} />
          </div>
          <button
            onClick={() => setQrLarge(!qrLarge)}
            className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-[#1e2230] border border-white/10
              text-white/50 hover:text-white hover:bg-[#2a3040] text-xs font-bold
              flex items-center justify-center cursor-pointer transition-all
              opacity-0 group-hover:opacity-100"
            title={qrLarge ? 'Shrink QR' : 'Enlarge QR'}
          >
            {qrLarge ? '−' : '+'}
          </button>
        </div>
      )}

      {/* Room Code — readable from distance */}
      <div className="flex flex-col gap-1 flex-1">
        <span className="text-xs uppercase tracking-[3px] text-white/40 font-semibold">
          Room Code
        </span>
        <span className="text-7xl font-black font-mono tracking-[14px] text-[#5b8def] drop-shadow-[0_0_24px_rgba(91,141,239,0.35)]">
          {roomCode || '----'}
        </span>
      </div>

      {/* Right side info */}
      <div className="flex flex-col items-end gap-3 shrink-0">
        {/* Student Count */}
        <div className="flex items-center gap-2.5">
          <span className="text-xl">👥</span>
          <span
            className={`text-lg font-semibold px-4 py-1.5 rounded-full ${
              studentCount > 0
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-white/[0.06] text-white/40'
            }`}
          >
            {studentCount} connected
          </span>
        </div>

        {/* Poll Status */}
        {pollActive && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-base font-bold text-red-400">POLL LIVE</span>
          </div>
        )}

        {/* Server URL */}
        {serverUrl && (
          <span className="text-xs text-white/25 font-mono truncate max-w-[220px]">
            {serverUrl}
          </span>
        )}
      </div>
    </div>
  )
}
