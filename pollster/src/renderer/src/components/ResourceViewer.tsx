import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface ResourceViewerProps {
  content: string
}

// Force all links to open in new tab (prevents socket disconnect)
const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export default function ResourceViewer({ content }: ResourceViewerProps) {
  if (!content || content.trim().length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0c0e14]">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-30">📋</div>
          <p className="text-white/30 text-lg font-medium">No resources yet</p>
          <p className="text-white/15 text-sm mt-2">
            Use the sidebar to edit and broadcast resources
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0c0e14] p-8">
      <div className="max-w-3xl mx-auto prose prose-invert
        prose-headings:text-white prose-headings:font-bold
        prose-h1:text-3xl prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-3 prose-h1:mb-6
        prose-h2:text-2xl prose-h2:mt-8
        prose-h3:text-xl prose-h3:mt-6
        prose-p:text-white/80 prose-p:leading-relaxed
        prose-a:text-[#5b8def] prose-a:no-underline hover:prose-a:underline
        prose-strong:text-white
        prose-code:text-[#e8a0bf] prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-[#1a1d28] prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-xl
        prose-ul:text-white/70 prose-ol:text-white/70
        prose-li:marker:text-[#5b8def]
        prose-table:border-collapse
        prose-th:bg-white/[0.06] prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:text-white/80
        prose-td:px-4 prose-td:py-2 prose-td:border-t prose-td:border-white/[0.06] prose-td:text-white/60
        prose-hr:border-white/10
        prose-blockquote:border-l-[#5b8def] prose-blockquote:text-white/50
      ">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
