import { useEffect, useRef } from 'react'

export default function BouncingBall() {
  const containerRef = useRef<HTMLDivElement>(null)
  const ballRef = useRef<HTMLDivElement>(null)
  
  // Starting position and velocity
  const pos = useRef({ x: Math.random() * 200, y: Math.random() * 200 })
  const vel = useRef({ x: 2, y: 1.5 })

  useEffect(() => {
    let animationFrameId: number

    const update = () => {
      const container = containerRef.current
      const ball = ballRef.current

      if (container && ball) {
        const containerRect = container.getBoundingClientRect()
        const ballRect = ball.getBoundingClientRect()

        pos.current.x += vel.current.x
        pos.current.y += vel.current.y

        // Bounce horizontally
        if (pos.current.x <= 0) {
          pos.current.x = 0
          vel.current.x *= -1
        } else if (pos.current.x + ballRect.width >= containerRect.width) {
          pos.current.x = containerRect.width - ballRect.width
          vel.current.x *= -1
        }

        // Bounce vertically
        if (pos.current.y <= 0) {
          pos.current.y = 0
          vel.current.y *= -1
        } else if (pos.current.y + ballRect.height >= containerRect.height) {
          pos.current.y = containerRect.height - ballRect.height
          vel.current.y *= -1
        }

        ball.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
      }

      animationFrameId = requestAnimationFrame(update)
    }

    animationFrameId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div 
        ref={ballRef}
        className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full border border-white/5 flex items-center justify-center backdrop-blur-sm"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 blur-xl opacity-40 absolute inset-0 m-auto mix-blend-screen" />
        <span className="text-white/40 font-black text-[10px] tracking-[3px] z-10 select-none">HANDOUT</span>
      </div>
    </div>
  )
}
