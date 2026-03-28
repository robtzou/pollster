import type { TimelineBlock } from '../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import BouncingBall from './BouncingBall'

interface StageRendererProps {
  block: TimelineBlock | undefined
  serverUrl: string
  pollActive: boolean
  pollQuestion: string
  pollResults: Record<string, number>
}

export default function StageRenderer({
  block,
  serverUrl,
  pollActive,
  pollQuestion,
  pollResults
}: StageRendererProps) {
  if (!block) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center border-l border-white/[0.05] relative bg-[#0c0e14]">
        <BouncingBall />
        <h3 className="text-white/30 text-2xl font-bold mt-4 tracking-widest relative z-10 mx-12 text-center drop-shadow-md">
          WAITING FOR LESSON
        </h3>
        <p className="text-white/20 mt-2 text-sm max-w-sm text-center relative z-10 drop-shadow">
          Load a lesson from your tools to begin the Handout presentation.
        </p>
      </div>
    )
  }

  // A common animated container to visually transition block changes
  const BlockWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div key={block.id} className={`w-full h-full flex items-center justify-center animate-[fadeIn_0.3s_ease-out] ${className}`}>
      {children}
    </div>
  )

  switch (block.type) {
    case 'slide':
      // The image is locally served by Fastify at /media/{filename}
      // block.localPath is the full absolute path from the builder, but here it's running from extract directory.
      // Wait, the builder sets `localPath` to absolute path.
      // When exported to sig, `manifest.json` contains `localPath` which was exactly the path on the author's machine!
      // To reliably load the image locally across different machines, we just need the basename!
      const filename = block.localPath.split('/').pop()?.split('\\').pop()
      const mediaUrl = `${serverUrl}/media/${filename}`
      
      return (
        <BlockWrapper>
          <img 
            src={mediaUrl} 
            alt="Slide"
            className="w-full h-full object-contain p-4"
          />
        </BlockWrapper>
      )

    case 'markdown':
      return (
        <BlockWrapper className="p-8 lg:p-12 overflow-y-auto w-full max-w-4xl mx-auto flex items-start justify-start pt-16">
          <div className="prose prose-invert prose-lg w-full max-w-none prose-a:text-blue-400 prose-headings:text-white prose-p:text-white/90">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {block.content}
            </ReactMarkdown>
          </div>
        </BlockWrapper>
      )

    case 'pulse':
      const totalVotes = Object.values(pollResults).reduce((a, b) => a + b, 0)
      
      return (
        <div className="flex-1 w-full bg-[#05070a] border-l border-white/[0.05] p-10 flex flex-col items-center justify-center overflow-y-auto">
          {!pollActive ? (
            <div className="text-center w-full max-w-md mx-auto">
               <div className="w-16 h-16 mx-auto mb-6 opacity-20 bg-white rounded-full flex items-center justify-center shadow-lg animate-pulse" />
               <h3 className="text-white/30 text-2xl font-bold tracking-widest uppercase mb-4">
                 Poll Waiting
               </h3>
               <p className="text-white/20 text-sm">
                 The pulse block was encountered, but the poll has been stopped.
               </p>
            </div>
          ) : (
            <div className="w-full max-w-3xl flex flex-col items-center">
              <h2 className="text-4xl font-black text-white mb-16 text-center tracking-tight drop-shadow-md">
                {pollQuestion}
              </h2>
              
              <div className="w-full grid gap-4">
                {block.options.filter(opt => opt.trim() !== '').map((opt, index) => {
                  const letter = String.fromCharCode(65 + index) // A, B, C...
                  const count = pollResults[letter] || 0
                  const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)
                  
                  return (
                    <div key={index} className="w-full relative bg-white/[0.03] backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden h-20 shadow-lg transition-transform hover:scale-[1.01] hover:bg-white/[0.05]">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600/60 to-purple-600/60 transition-all duration-700 ease-out"
                        style={{ width: `${percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-white/10 w-full h-full" />
                      </div>
                      
                      <div className="relative z-10 flex items-center justify-between h-full px-8">
                        <div className="flex items-center gap-6">
                          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 text-white/50 font-bold text-sm shadow-inner">
                            {letter}
                          </span>
                          <span className="text-xl font-medium text-white/90">
                            {opt}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-white/70">
                          <span className="text-2xl font-bold ml-auto min-w-[3rem] text-right">
                            {count}
                          </span>
                          <span className="text-sm uppercase tracking-wider font-semibold opacity-50 w-8">
                            votes
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )
  }

  return null
}
