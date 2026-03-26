import { useRef, useEffect } from 'react'

interface SlideViewerProps {
  pdfUrl: string | null
  currentSlide: number
  pollActive: boolean
}

function BouncingBall() {
  const containerRef = useRef<HTMLDivElement>(null)
  const ballRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const ball = ballRef.current
    if (!container || !ball) return

    let x = Math.random() * (container.clientWidth - 64)
    let y = Math.random() * (container.clientHeight - 64)
    let vx = 3.5
    let vy = 2.5
    const ballSize = 64
    let animationFrameId: number

    const update = () => {
      const { clientWidth, clientHeight } = container
      
      x += vx
      y += vy
      
      if (x <= 0) { x = 0; vx = Math.abs(vx); }
      else if (x + ballSize >= clientWidth) { x = clientWidth - ballSize; vx = -Math.abs(vx); }
      
      if (y <= 0) { y = 0; vy = Math.abs(vy); }
      else if (y + ballSize >= clientHeight) { y = clientHeight - ballSize; vy = -Math.abs(vy); }
      
      ball.style.transform = `translate(${x}px, ${y}px)`
      animationFrameId = requestAnimationFrame(update)
    }

    animationFrameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#0c0e14]">
      {/* Background static text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 select-none pointer-events-none">
        <div className="text-5xl mb-4">📄</div>
        <p className="text-white text-lg font-medium">No presentation loaded</p>
        <p className="text-white/50 text-sm mt-2">
          Load a PDF from the sidebar to begin presenting
        </p>
      </div>

      {/* Bouncing Element */}
      <div 
        ref={ballRef}
        className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center pointer-events-none will-change-transform"
      >
        <span className="text-xl drop-shadow-md">✨</span>
      </div>
    </div>
  )
}

export default function SlideViewer({ pdfUrl, currentSlide, pollActive }: SlideViewerProps) {
  if (!pdfUrl) {
    return (
      <div className="relative w-full h-full">
        <BouncingBall />
      </div>
    )
  }

  const iframeSrc = `http://localhost:3000/pdf#page=${currentSlide}&view=FitH&toolbar=0`

  return (
    <div className="relative w-full h-full bg-[#0c0e14] flex items-center justify-center p-4">
      <div className="relative w-full max-h-full" style={{ aspectRatio: '16 / 9', maxWidth: '100%' }}>
        <iframe
          key={currentSlide}
          src={iframeSrc}
          className={`absolute inset-0 w-full h-full border-0 rounded-lg shadow-2xl ${pollActive ? 'pointer-events-none' : ''}`}
          title="Slide Viewer"
        />
      </div>
    </div>
  )
}
