import { useState } from 'react'
import ResourceViewer from './ResourceViewer'

interface ResourceEditorProps {
  content: string
  onSave: (content: string) => void
  onClose: () => void
}

export default function ResourceEditor({ content, onSave, onClose }: ResourceEditorProps) {
  const [draft, setDraft] = useState(content)
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#141720] rounded-2xl border border-white/[0.08] shadow-2xl w-[90%] max-w-4xl h-[85%] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            ✏️ Edit Resources
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white/[0.06] text-white/60
                hover:bg-white/[0.1] hover:text-white border-0 cursor-pointer transition-all"
            >
              {showPreview ? '📝 Edit' : '👁 Preview'}
            </button>
            <button
              onClick={() => onSave(draft)}
              className="px-5 py-2 text-sm font-bold rounded-lg border-0 cursor-pointer
                bg-gradient-to-br from-emerald-500 to-emerald-700 text-white
                shadow-[0_4px_16px_rgba(16,185,129,0.3)]
                hover:shadow-[0_6px_24px_rgba(16,185,129,0.45)] hover:scale-[1.02]
                active:scale-[0.98] transition-all duration-150"
            >
              💾 Save & Broadcast
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.06]
                text-white/40 hover:text-white hover:bg-white/[0.12]
                border-0 cursor-pointer text-lg transition-all"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {showPreview ? (
            <ResourceViewer content={draft} />
          ) : (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={"# Course Resources\n\n## Syllabus\n- [Read Here](https://example.com)\n\n## Important Links\n- [Assignment 1](https://example.com)\n- [Course Notes](https://example.com)"}
              className="w-full h-full bg-[#0c0e14] text-white/90 p-6 border-0 outline-none resize-none
                font-mono text-sm leading-relaxed placeholder:text-white/20"
              autoFocus
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>
  )
}
