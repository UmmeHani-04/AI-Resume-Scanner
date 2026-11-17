import { useEffect, useState } from 'react'

export interface Segment { label: string; value: number; color: string }

/** Interactive donut: hover a slice or legend row to focus it. */
export function DonutChart({ segments, centerLabel = 'total' }: { segments: Segment[]; centerLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t) }, [])
  const total = segments.reduce((a, s) => a + s.value, 0)
  const r = 54, c = 2 * Math.PI * r
  let acc = 0
  const active = hover !== null ? segments[hover] : null

  return (
    <div className="donut">
      <div className="donut-svg">
        <svg viewBox="0 0 140 140" role="img" aria-label="Status breakdown">
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(108,71,255,.10)" strokeWidth="16" />
          {total > 0 && segments.map((s, i) => {
            const len = (s.value / total) * c
            const off = -acc
            acc += len
            if (!s.value) return null
            return (
              <circle
                key={s.label} cx="70" cy="70" r={r} fill="none" stroke={s.color}
                strokeWidth={hover === i ? 21 : 16} strokeLinecap="butt"
                strokeDasharray={`${ready ? Math.max(len - 3, 0) : 0} ${c}`} strokeDashoffset={off}
                transform="rotate(-90 70 70)"
                opacity={hover !== null && hover !== i ? 0.35 : 1}
                style={{ transition: 'stroke-dasharray 1s cubic-bezier(.2,.8,.2,1), stroke-width .2s, opacity .2s', cursor: 'pointer' }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              />
            )
          })}
        </svg>
        <div className="donut-center">
          <strong>{active ? active.value : total}</strong>
          <span>{active ? active.label : centerLabel}</span>
        </div>
      </div>
      <ul className="legend">
        {segments.map((s, i) => (
          <li key={s.label} className={hover === i ? 'on' : ''} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <i style={{ background: s.color }} />{s.label}<b>{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Score distribution bars with hover tooltips. */
export function ScoreBars({ scores }: { scores: number[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t) }, [])
  const buckets = [0, 0, 0, 0, 0]
  scores.forEach((s) => { buckets[Math.min(4, Math.floor(s / 20))]++ })
  const max = Math.max(1, ...buckets)
  const colors = ['#ff5d8f', '#ff8f5d', '#ffbe3d', '#3dbdf5', '#1fcf9f']
  return (
    <div className="bars">
      {buckets.map((b, i) => (
        <div key={i} className={`bar-col ${hover === i ? 'on' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <span className="bar-tip">{b} candidate{b === 1 ? '' : 's'}</span>
          <div className="bar-track">
            <div className="bar" style={{ height: ready ? `${Math.max(6, (b / max) * 100)}%` : '0%', background: `linear-gradient(180deg, ${colors[i]}, ${colors[i]}99)`, transitionDelay: `${i * 70}ms` }} />
          </div>
          <span className="bar-label">{i * 20}–{i === 4 ? 100 : i * 20 + 19}</span>
        </div>
      ))}
    </div>
  )
}
