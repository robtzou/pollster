import type { TimelineBlock } from '../types'

interface CardProps {
  block: TimelineBlock
  index: number
  onChange: (id: string, updates: Partial<TimelineBlock>) => void
  onDelete: (id: string) => void
  dragHandleProps?: any
}

export default function Card({ block, onChange, onDelete, dragHandleProps }: CardProps) {
  // Common header
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase font-bold tracking-wider text-white/50">
          {block.type}
        </span>
      </div>
      <button
        onClick={() => onDelete(block.id)}
        className="text-white/30 hover:text-red-400 bg-transparent border-none cursor-pointer p-1"
        title="Delete Block"
      >
        ×
      </button>
    </div>
  )

  const renderContent = () => {
    switch (block.type) {
      case 'markdown':
        return (
          <textarea
            className="w-full h-32 bg-black/20 border border-white/10 rounded-md p-3 text-sm text-white resize-y font-mono"
            placeholder="Type markdown here..."
            value={block.content}
            onChange={(e) => onChange(block.id, { content: e.target.value })}
          />
        )
      case 'slide':
        return (
          <div className="flex flex-col gap-3">
            {block.localPath ? (
              <div className="relative rounded-md overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center p-2 min-h-[100px]">
                <img src={`file://${block.localPath}`} alt="Slide preview" className="max-h-[200px] object-contain" />
              </div>
            ) : (
              <div className="h-24 rounded-md bg-black/20 border border-white/10 border-dashed flex items-center justify-center text-white/40 text-sm">
                No image attached
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  const path = await window.api.importImage()
                  if (path) {
                    onChange(block.id, { localPath: path })
                  }
                } catch (e) {
                  console.error("IPC importImage error:", e)
                  alert("Failed to open file manager. Please try restarting the app (Ctrl+C then npm run dev).")
                }
              }}
              className="py-2 px-4 rounded-md bg-white/10 hover:bg-white/20 text-sm font-medium text-white transition-colors cursor-pointer border border-white/10"
            >
              📎 Attach Image
            </button>
          </div>
        )
      case 'pulse':
        return (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Question..."
              className="w-full bg-black/20 border border-white/10 rounded-md p-3 text-sm text-white"
              value={block.question}
              onChange={(e) => onChange(block.id, { question: e.target.value })}
            />
            <div className="flex flex-col gap-2 pl-4 border-l-2 border-white/10">
              {block.options.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  className="w-full bg-black/20 border border-white/10 rounded-md p-2 text-sm text-white"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...block.options]
                    newOpts[i] = e.target.value
                    onChange(block.id, { options: newOpts })
                  }}
                />
              ))}
            </div>
            {block.options.length < 4 && (
              <button
                onClick={() => {
                  const newOpts = [...block.options, '']
                  onChange(block.id, { options: newOpts })
                }}
                className="self-start text-xs text-emerald-400 hover:text-emerald-300 bg-transparent border-none cursor-pointer"
              >
                + Add Option
              </button>
            )}
          </div>
        )
    }
  }

  return (
    <div className="bg-[#1c212e] border border-white/[0.08] rounded-xl mb-4 shadow-lg overflow-hidden flex">
      {/* Drag Handle Area */}
      <div
        {...dragHandleProps}
        className="draggable-handle w-10 flex flex-col items-center justify-center bg-black/20 border-r border-white-[0.05] cursor-grab active:cursor-grabbing hover:bg-white/[0.05] transition-colors"
      >
        <span className="text-white/30 truncate text-xl select-none">⋮⋮</span>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 p-4">
        {renderHeader()}
        {renderContent()}
      </div>
    </div>
  )
}
