import type { ReactNode } from 'react'

interface DashboardLayoutProps {
  mainStage: ReactNode
}

export default function DashboardLayout({ mainStage }: DashboardLayoutProps) {
  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-[#0f1117]">
      {/* Main Content: Stage (100%) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main Stage */}
        <div className="flex-1 min-w-0 relative overflow-hidden">{mainStage}</div>
      </div>
    </div>
  )
}

