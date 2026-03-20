import type { ReactNode } from 'react'

interface DashboardLayoutProps {
  telemetry: ReactNode
  mainStage: ReactNode
  sidebar: ReactNode
}

export default function DashboardLayout({ telemetry, mainStage, sidebar }: DashboardLayoutProps) {
  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-[#0f1117]">
      {/* Telemetry Bar — full width top */}
      <div className="flex-shrink-0">{telemetry}</div>

      {/* Main Content: Stage (60%) + Sidebar (40%) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main Stage */}
        <div className="flex-[3] min-w-0 relative overflow-hidden">{mainStage}</div>

        {/* Action Sidebar */}
        <div className="w-[20%] flex-shrink-0 border-l border-white/[0.06] overflow-y-auto">
          {sidebar}
        </div>
      </div>
    </div>
  )
}
