import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, FileText, Loader2, Sparkles, ShieldAlert } from 'lucide-react'
import { extractKeywords, type AnalysisResult } from '../lib/ai'
import { Avatar } from './Avatar'
import { Confetti } from './Confetti'
import { Modal } from './Modal'
import { ScoreRing } from './ScoreRing'

interface AnalysisStudioProps {
  variant: 'review' | 'submit'
  stages: string[]
  candidateSeed?: string
  candidateName?: string
  fileName?: string | null
  fileSize?: number | null
  resumeText?: string | null
  doneTitle: string
  doneText?: string
  doneCta: string
  /** Real work. Runs once; the animation waits for it before finishing. */
  run: () => Promise<AnalysisResult | void>
  onClose: () => void
  onDone: () => void
}

const STAGE_MS = 1000
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

function highlight(line: string, re: RegExp | null, on: boolean): ReactNode {
  if (!re || !on) return line
  return line.split(re).map((part, i) => (i % 2 ? <mark key={i} className="hit">{part}</mark> : part))
}

export function AnalysisStudio(p: AnalysisStudioProps) {
  const n = p.stages.length
  const [stage, setStage] = useState(0)
  const [settled, setSettled] = useState<'pending' | 'ok' | 'err'>('pending')
  const [phase, setPhase] = useState<'running' | 'done' | 'error'>('running')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [burst, setBurst] = useState(0)
  const started = useRef(false)

  // Kick off the real work exactly once (StrictMode-safe).
  useEffect(() => {
    if (started.current) return
    started.current = true
    p.run().then(
      (r) => { setResult(r || null); setSettled('ok') },
      (e) => { setError(e instanceof Error ? e.message : 'Something went wrong.'); setSettled('err'); setPhase('error') },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stage choreography: min time per stage, last stage waits for the real work.
  useEffect(() => {
    if (settled === 'err') return
    let t: ReturnType<typeof setTimeout> | undefined
    if (stage < n - 1) t = setTimeout(() => setStage(stage + 1), STAGE_MS)
    else if (stage === n - 1 && settled === 'ok') t = setTimeout(() => setStage(n), STAGE_MS)
    else if (stage === n) t = setTimeout(() => { setPhase('done'); setBurst((b) => b + 1) }, 450)
    return () => clearTimeout(t)
  }, [stage, settled, n])

  const found = useMemo(() => [...extractKeywords(p.resumeText || '')], [p.resumeText])
  const re = useMemo(
    () => found.length ? new RegExp(`(?<![a-z0-9])(${[...found].sort((a, b) => b.length - a.length).map(esc).join('|')})(?![a-z0-9])`, 'gi') : null,
    [found],
  )
  const lines = useMemo(
    () => (p.resumeText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 14).map((l) => (l.length > 74 ? l.slice(0, 72) + '…' : l)),
    [p.resumeText],
  )
  const skeleton = [82, 56, 92, 70, 38, 88, 64, 78, 46, 90, 60, 72]

  const running = phase === 'running'
  const skillStage = Math.max(0, p.stages.findIndex((s) => /skill/i.test(s)))
  const pct = phase === 'done' ? 100 : Math.min(96, Math.round(((stage + 0.55) / n) * 100))
  const size = p.fileSize ? (p.fileSize < 1024 ? '<1 KB' : `${Math.round(p.fileSize / 1024)} KB`) : ''
  const orbLabel = phase === 'error' ? 'Something went wrong' : phase === 'done' ? p.doneTitle : p.stages[Math.min(stage, n - 1)]

  return (
    <>
    <Confetti fire={burst} pieces={result && result.semanticScore < 45 ? 50 : 130} />
    <Modal open onClose={p.onClose} locked={running} maxWidth={940}>
      <div className={`studio ${phase}`}>
        {/* Resume preview with scanning line */}
        <div className="studio-paper-wrap">
          <div className={`paper ${running ? 'scanning' : ''} ${stage >= skillStage ? 'extracted' : ''}`}>
            <div className="paper-head">
              <Avatar seed={p.candidateSeed} name={p.candidateName} size={38} />
              <div>
                <strong>{p.candidateName || 'Candidate'}</strong>
                <span><FileText size={11} /> {p.fileName || 'Resume'}{size && ` · ${size}`}</span>
              </div>
            </div>
            <div className="paper-body">
              {lines.length >= 3
                ? lines.map((l, i) => <p key={i} className="paper-line">{highlight(l, re, stage >= skillStage)}</p>)
                : skeleton.map((w, i) => <span key={i} className="skel-line" style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }} />)}
            </div>
            {running && <div className="scanner" aria-hidden="true" />}
            {phase === 'done' && <div className="paper-stamp"><Check size={26} strokeWidth={3} /></div>}
          </div>
        </div>

        {/* Progress + results */}
        <div className="studio-side">
          <div className="studio-title">
            <div className={`orb ${running ? 'pulsing' : ''}`}><Sparkles size={20} /></div>
            <div>
              <h2 aria-live="polite">{orbLabel}</h2>
              <p className="muted small">
                {phase === 'error' ? 'Nothing was changed.' : phase === 'done' ? (p.doneText || '') : 'Talent Radar AI is working on this resume.'}
              </p>
            </div>
          </div>

          {phase !== 'error' && (
            <>
              <ul className="steps">
                {p.stages.map((s, i) => {
                  const st = i < stage ? 'done' : i === stage && running ? 'active' : 'todo'
                  return (
                    <li key={s} className={`step ${st}`}>
                      <span className="step-ico">{st === 'done' ? <Check size={13} strokeWidth={3} /> : st === 'active' ? <Loader2 size={14} className="spin" /> : <i />}</span>
                      {s}
                    </li>
                  )
                })}
              </ul>
              <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="progress-meta"><span>{phase === 'done' ? 'Complete' : 'Processing'}</span><strong>{pct}%</strong></div>
            </>
          )}

          {phase === 'error' && (
            <div className="studio-error"><AlertTriangle size={18} /><p>{error}</p></div>
          )}

          {phase === 'done' && result && <ReviewResult result={result} />}

          {phase === 'done' && !result && (
            <div className="skills-found">
              <h4><Sparkles size={13} /> Skills we spotted</h4>
              {found.length > 0 ? (
                <div className="chips">{found.slice(0, 12).map((k, i) => <span key={k} className="chip chip-violet pop" style={{ animationDelay: `${i * 70}ms` }}>{k}</span>)}</div>
              ) : (
                <p className="muted small">No skills detected yet. Pasting your resume text next time helps recruiters match you faster.</p>
              )}
            </div>
          )}

          <div className="studio-actions">
            {phase === 'error' && <button className="btn btn-primary" onClick={p.onClose}>Close</button>}
            {phase === 'done' && <button className="btn btn-primary" onClick={p.onDone}>{p.doneCta}</button>}
          </div>
        </div>
      </div>
    </Modal>
    </>
  )
}

function ReviewResult({ result }: { result: AnalysisResult }) {
  const [slide, setSlide] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSlide(true), 120); return () => clearTimeout(t) }, [])
  const riskTone = result.riskLevel === 'Low' ? 'mint' : result.riskLevel === 'Moderate' ? 'sun' : 'pink'
  return (
    <div className="result">
      <div className="result-top">
        <ScoreRing score={result.semanticScore} size={112} />
        <div className="result-copy">
          <span className={`pill tone-${riskTone}`}>{result.riskLevel} risk</span>
          <p>{result.recommendation}</p>
        </div>
      </div>
      <div className="meter" aria-hidden="true">
        <div className="meter-track"><div className="meter-fill" style={{ width: slide ? `${result.semanticScore}%` : '0%' }} /></div>
        <div className="meter-ticks"><span>Weak</span><span>Fair</span><span>Strong</span></div>
      </div>
      <div className="result-cols">
        <div>
          <h4><Sparkles size={13} /> Strengths</h4>
          <div className="chips">
            {result.strengths.length ? result.strengths.map((s, i) => <span key={s} className="chip chip-green pop" style={{ animationDelay: `${300 + i * 80}ms` }}>{s}</span>) : <span className="muted small">No strong keyword overlap</span>}
          </div>
        </div>
        <div>
          <h4><ShieldAlert size={13} /> Gaps</h4>
          <div className="chips">
            {result.gaps.length ? result.gaps.map((s, i) => <span key={s} className="chip chip-red pop" style={{ animationDelay: `${300 + i * 80}ms` }}>{s}</span>) : <span className="muted small">No major gaps</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
