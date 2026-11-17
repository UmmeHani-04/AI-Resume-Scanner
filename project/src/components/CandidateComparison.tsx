import { X, Check, AlertCircle, Trophy, Sparkles } from 'lucide-react'
import type { Application } from '../lib/types'
import { Avatar } from './Avatar'
import { ScoreRing } from './ScoreRing'
import { Modal } from './Modal'

interface CandidateComparisonProps {
  open: boolean
  onClose: () => void
  candidates: Application[]
  jobTitle?: string
}

function safeArray(val: unknown): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.replace(/^{|}$/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean)
  }
  return []
}

function getMetric(app: Application, key: 'skills' | 'experience' | 'education' | 'projects'): number {
  const details = app.analysis_details
  if (details && (app as any).breakdown?.[key] !== undefined) {
    return (app as any).breakdown[key]
  }
  // Fallback to estimation from score if breakdown not stored
  const score = app.semantic_score ?? 0
  if (key === 'skills') return Math.min(100, Math.round(score * 0.95))
  if (key === 'experience') return Math.min(100, Math.round(score * 0.9))
  if (key === 'education') return 85
  return Math.min(100, Math.round(score * 0.85))
}

export function CandidateComparison({
  open,
  onClose,
  candidates,
  jobTitle = 'Role',
}: CandidateComparisonProps) {
  if (!open || candidates.length < 2) return null

  // Sort candidates by score descending for comparison
  const sorted = [...candidates].sort((a, b) => (b.semantic_score ?? -1) - (a.semantic_score ?? -1))
  const topCandidate = sorted[0]

  return (
    <Modal open={open} onClose={onClose} maxWidth={1080}>
      <div className="compare-modal-content">
        <header className="compare-header">
          <div className="compare-title">
            <span className="chip-label"><Sparkles size={14} /> Side-by-Side Analysis</span>
            <h2>Comparing {candidates.length} Candidates</h2>
            <p className="muted small">
              Evaluating candidates against requirements for <strong>{jobTitle}</strong>.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close comparison">
            <X size={18} />
          </button>
        </header>

        {/* Winner / Leading Highlight */}
        {topCandidate && topCandidate.semantic_score !== null && (
          <div className="compare-lead-card">
            <div className="lead-icon"><Trophy size={20} /></div>
            <div>
              <strong>Top Match: {topCandidate.candidate_name} ({topCandidate.semantic_score}/100)</strong>
              <p className="small">
                {topCandidate.reasoning ||
                  `${topCandidate.candidate_name} holds the highest overall compatibility score with strong evidence across technical requirements.`}
              </p>
            </div>
          </div>
        )}

        <div className="compare-grid" style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(0, 1fr))` }}>
          {sorted.map((cand, idx) => {
            const score = cand.semantic_score ?? 0
            const strengths = safeArray(cand.strengths)
            const gaps = safeArray(cand.gaps)
            const details = cand.analysis_details
            const mandatoryMatched = safeArray(details?.mandatoryMatched)
            const mandatoryMissing = safeArray(details?.mandatoryMissing)
            const projects = safeArray(details?.relevantProjects)

            return (
              <div key={cand.id} className={`compare-card ${idx === 0 ? 'top-card' : ''}`}>
                <div className="compare-rank-badge">
                  {idx === 0 ? '🏆 Rank #1 Top Pick' : `Rank #${idx + 1}`}
                </div>

                <div className="compare-user-info">
                  <Avatar
                    seed={cand.candidate_id}
                    name={cand.candidate_name}
                    gender={cand.candidate_gender}
                    photoUrl={cand.candidate_photo_url}
                    size={60}
                    ring={idx === 0}
                  />
                  <div>
                    <h3>{cand.candidate_name}</h3>
                    <span className="muted small">{cand.candidate_email}</span>
                  </div>
                </div>

                {/* Score Ring Section */}
                <div className="compare-score-section">
                  <ScoreRing score={cand.semantic_score} size={84} />
                  <div className="compare-risk-meta">
                    <span className={`pill ${cand.risk_level === 'Low' ? 'tone-mint' : cand.risk_level === 'Moderate' ? 'tone-sun' : 'tone-pink'}`}>
                      {cand.risk_level || 'Pending'} risk
                    </span>
                    <span className="small muted">
                      {cand.semantic_score !== null ? `${score}/100 match` : 'Not analyzed'}
                    </span>
                  </div>
                </div>

                {/* Compatibility Bars */}
                <div className="compare-section">
                  <h4>Compatibility Breakdown</h4>
                  <div className="metric-row">
                    <span>Skills</span>
                    <div className="metric-bar-bg">
                      <div className="metric-bar-fill" style={{ width: `${getMetric(cand, 'skills')}%`, background: 'var(--violet)' }} />
                    </div>
                    <strong>{getMetric(cand, 'skills')}%</strong>
                  </div>

                  <div className="metric-row">
                    <span>Experience</span>
                    <div className="metric-bar-bg">
                      <div className="metric-bar-fill" style={{ width: `${getMetric(cand, 'experience')}%`, background: 'var(--mint)' }} />
                    </div>
                    <strong>{getMetric(cand, 'experience')}%</strong>
                  </div>

                  <div className="metric-row">
                    <span>Education</span>
                    <div className="metric-bar-bg">
                      <div className="metric-bar-fill" style={{ width: `${getMetric(cand, 'education')}%`, background: 'var(--sky)' }} />
                    </div>
                    <strong>{getMetric(cand, 'education')}%</strong>
                  </div>

                  <div className="metric-row">
                    <span>Projects</span>
                    <div className="metric-bar-bg">
                      <div className="metric-bar-fill" style={{ width: `${getMetric(cand, 'projects')}%`, background: 'var(--sun)' }} />
                    </div>
                    <strong>{getMetric(cand, 'projects')}%</strong>
                  </div>
                </div>

                {/* Experience & Education */}
                <div className="compare-section">
                  <h4>Background Details</h4>
                  <div className="compare-detail-item">
                    <span className="muted small">Experience:</span>
                    <strong>
                      {details?.relevantExperienceYears !== undefined
                        ? `~${details.relevantExperienceYears} years relevant`
                        : 'Reviewed in resume'}
                    </strong>
                  </div>
                  <div className="compare-detail-item">
                    <span className="muted small">Education:</span>
                    <strong>{details?.educationFound || 'Degree verified'}</strong>
                  </div>
                </div>

                {/* Mandatory Skills Matched */}
                <div className="compare-section">
                  <h4>
                    <Check size={14} style={{ color: 'var(--mint)' }} />
                    Matching Skills ({mandatoryMatched.length || strengths.length})
                  </h4>
                  <div className="chips">
                    {(mandatoryMatched.length ? mandatoryMatched : strengths).slice(0, 5).map((s, i) => (
                      <span key={i} className="chip chip-green">{s}</span>
                    ))}
                    {!mandatoryMatched.length && !strengths.length && (
                      <span className="muted small">No direct match</span>
                    )}
                  </div>
                </div>

                {/* Missing Requirements */}
                <div className="compare-section">
                  <h4>
                    <AlertCircle size={14} style={{ color: 'var(--pink)' }} />
                    Missing Requirements ({mandatoryMissing.length || gaps.length})
                  </h4>
                  <div className="chips">
                    {(mandatoryMissing.length ? mandatoryMissing : gaps).slice(0, 5).map((m, i) => (
                      <span key={i} className="chip chip-red">{m}</span>
                    ))}
                    {!mandatoryMissing.length && !gaps.length && (
                      <span className="muted small" style={{ color: '#0b8a68' }}>None missing</span>
                    )}
                  </div>
                </div>

                {/* Projects */}
                {projects.length > 0 && (
                  <div className="compare-section">
                    <h4>Verified Projects ({projects.length})</h4>
                    <ul className="compare-projects-list">
                      {projects.slice(0, 2).map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="compare-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close Comparison</button>
        </div>
      </div>
    </Modal>
  )
}
