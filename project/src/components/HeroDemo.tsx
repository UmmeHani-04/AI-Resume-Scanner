import { useEffect, useState } from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { Avatar } from './Avatar'
import { useCountUp } from './useCountUp'

const STEPS = ['Parsing document…', 'Extracting skills…', 'Generating candidate score…']
const LINES = [
  ['Maya Chen — Product Designer', false],
  ['6 yrs shipping B2B products', false],
  ['Figma, prototyping, design system', true],
  ['Led user research for 3 launches', true],
  ['Comfortable with React, CSS, accessibility', true],
  ['Mentorship and cross-functional work', true],
] as const

/** Looping, self-playing preview of the analysis experience for the landing hero. */
export function HeroDemo() {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick((v) => (v + 1) % 8), 1200); return () => clearInterval(t) }, [])
  const done = tick >= 3 && tick <= 6
  const stage = done ? 3 : Math.min(tick, 2)
  const score = useCountUp(done ? 91 : 0, 1100)

  return (
    <div className="hero-demo">
      <div className="float-av a1"><Avatar seed="hero-a" size={54} ring /></div>
      <div className="float-av a2"><Avatar seed="hero-b" size={46} ring /></div>
      <div className="float-av a3"><Avatar seed="hero-c" size={50} ring /></div>

      <div className="demo-card glass">
        <div className={`paper ${!done ? 'scanning' : ''} ${stage >= 1 ? 'extracted' : ''}`}>
          <div className="paper-head">
            <Avatar seed="maya-chen-demo" name="Maya Chen" size={38} />
            <div><strong>Maya Chen</strong><span>maya-chen-resume.pdf</span></div>
          </div>
          <div className="paper-body">
            {LINES.map(([t, hit], i) => (
              <p key={i} className="paper-line">{hit && stage >= 1 ? <mark className="hit">{t}</mark> : t}</p>
            ))}
          </div>
          {!done && <div className="scanner" aria-hidden="true" />}
        </div>

        <ul className="steps compact">
          {STEPS.map((s, i) => {
            const st = i < stage ? 'done' : i === stage ? 'active' : 'todo'
            return (
              <li key={s} className={`step ${st}`}>
                <span className="step-ico">{st === 'done' ? <Check size={12} strokeWidth={3} /> : st === 'active' ? <Loader2 size={13} className="spin" /> : <i />}</span>{s}
              </li>
            )
          })}
        </ul>

        <div className={`demo-score ${done ? 'show' : ''}`}>
          <Sparkles size={16} />
          <span>Match score</span>
          <strong>{score}</strong>
          <div className="meter-track"><div className="meter-fill" style={{ width: done ? '91%' : '0%' }} /></div>
        </div>
      </div>
    </div>
  )
}
