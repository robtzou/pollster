import { useEffect, useRef } from 'react'
import logo from '../assets/logos/ball.svg'

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
        className="absolute top-0 left-0 w-40 h-40 flex items-center justify-center drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] opacity-50"
      >
        <img src={logo} alt="Logo" className="w-full h-full object-contain" />
      </div>
    </div>
  )
}
