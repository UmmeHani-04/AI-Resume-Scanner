import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'

const COLORS = ['#6c47ff', '#ff5d8f', '#1fcf9f', '#ffbe3d', '#3dbdf5', '#b05bff']

interface ConfettiProps {
  /** Increment (or set truthy key) to fire a burst. 0 = idle. */
  fire: number
  pieces?: number
  originY?: number
}

/** Lightweight canvas confetti. No dependency, respects reduced-motion. */
export function Confetti({ fire, pieces = 110, originY = 0.35 }: ConfettiProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!fire || prefersReducedMotion()) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = (canvas.width = window.innerWidth * dpr)
    const h = (canvas.height = window.innerHeight * dpr)
    const parts = Array.from({ length: pieces }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
      const speed = (7 + Math.random() * 9) * dpr
      return {
        x: w / 2, y: h * originY,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: (5 + Math.random() * 6) * dpr, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        color: COLORS[(Math.random() * COLORS.length) | 0], round: Math.random() > 0.6,
      }
    })
    let frame = 0
    const t0 = performance.now()
    let last = t0
    const step = (now: number) => {
      const life = (now - t0) / 2600
      const dt = Math.min((now - last) / 16.67, 4) // time-based: same look at any frame rate
      last = now
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        p.vy += 0.32 * dpr * dt; p.vx *= Math.pow(0.99, dt); p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt
        ctx.save()
        ctx.globalAlpha = Math.max(0, 1 - life * life)
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 7); ctx.fill() }
        else ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6)
        ctx.restore()
      }
      if (life < 1) frame = requestAnimationFrame(step)
      else ctx.clearRect(0, 0, w, h)
    }
    frame = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, w, h) }
  }, [fire, pieces, originY])

  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}
