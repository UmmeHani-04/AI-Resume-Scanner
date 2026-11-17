import { useEffect, useId, useState } from 'react'
import { useCountUp } from './useCountUp'

interface ScoreRingProps { score: number; size?: number; delay?: number }

const tone = (s: number): [string, string] =>
  s >= 70 ? ['#1fcf9f', '#3dbdf5'] : s >= 45 ? ['#ffbe3d', '#ff8f5d'] : ['#ff5d8f', '#e2384f']

/** SVG ring that draws itself while the number counts up. */
export function ScoreRing({ score, size = 88, delay = 0 }: ScoreRingProps) {
  const id = useId()
  const [drawn, setDrawn] = useState(false)
  const value = useCountUp(score, 1200, delay)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 60 + delay); return () => clearTimeout(t) }, [delay])
  const stroke = Math.max(7, size * 0.11)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [a, b] = tone(score)
  return (
    <div className="score-ring" style={{ width: size, height: size }} role="img" aria-label={`${score} percent match`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(108,71,255,.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={drawn ? c * (1 - score / 100) : c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="score-ring-inner">
        <span className="score-ring-value" style={{ color: a, fontSize: size * 0.3 }}>{value}</span>
        {size >= 80 && <span className="score-ring-label">match</span>}
      </div>
    </div>
  )
}
