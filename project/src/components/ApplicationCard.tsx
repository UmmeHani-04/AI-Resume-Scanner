import { useEffect, useState } from 'react'
import {
  Mail,
  FileText,
  Brain,
  CheckCircle2,
  XCircle,
  Download,
  ChevronDown,
  Sparkles,
  ShieldAlert,
  Building2,
  Check,
  AlertCircle,
  Lightbulb,
  CheckSquare,
  Square,
} from 'lucide-react'
import type { Application } from '../lib/types'
import { Avatar } from './Avatar'
import { ScoreRing } from './ScoreRing'

interface ApplicationCardProps {
  application: Application
  isRecruiter: boolean
  rank?: number
  showRole?: boolean
  autoOpen?: boolean
  isSelectedForCompare?: boolean
  onToggleCompare?: (application: Application) => void
  onAnalyze?: (application: Application) => void
  onDecide?: (applicationId: string, status: 'selected' | 'rejected') => void
  onDownload?: (application: Application) => void
}

function safeArray(val: unknown): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val.trim().length > 0) {
    return val
      .replace(/^{|}$/g, '')
      .split(',')
      .map((s) => s.trim().replace(/^"|"$/g, ''))
      .filter(Boolean)
  }
  return []
}

const displayEmail = (e?: string | null) => {
  if (!e) return 'No email provided'
  return /^[0-9a-f-]{36}@talentradar\.app$/i.test(e) ? 'Applied via TalentRadar' : e
}

const statusLabels: Record<string, string> = {
  new: 'New',
  reviewing: 'AI reviewed',
  selected: 'Selected',
  rejected: 'Not selected',
}

const statusTone: Record<string, string> = {
  new: 'tone-sky',
  reviewing: 'tone-sun',
  selected: 'tone-mint',
  rejected: 'tone-pink',
}

/** Candidate-side tracker: Applied → In review → Decision */
function Journey({ status }: { status: string }) {
  const at = status === 'new' ? 0 : status === 'reviewing' ? 1 : 2
  const labels = [
    'Applied',
    'In review',
    status === 'rejected' ? 'Decision' : status === 'selected' ? 'Selected' : 'Decision',
  ]
  return (
    <div className="journey" aria-label={`Progress: ${labels[at]}`}>
      <div className="journey-bar">
        <div className={`journey-fill ${status}`} style={{ width: `${at * 50}%` }} />
      </div>
      <div className="journey-dots">
        {labels.map((l, i) => (
          <span key={l} className={i <= at ? 'on' : ''}>
            <i />
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ApplicationCard({
  application,
  isRecruiter,
  rank,
  showRole,
  autoOpen,
  isSelectedForCompare,
  onToggleCompare,
  onAnalyze,
  onDecide,
  onDownload,
}: ApplicationCardProps) {
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (autoOpen) setExpanded(true)
  }, [autoOpen])

  // Safe parsing of analysis details
  let details: any = null
  if (application.analysis_details) {
    if (typeof application.analysis_details === 'string') {
      try {
        details = JSON.parse(application.analysis_details)
      } catch {
        details = null
      }
    } else {
      details = application.analysis_details
    }
  }

  const hasScore = application.semantic_score !== null && application.semantic_score !== undefined
  const scoreVal = hasScore ? Math.max(0, Math.min(100, Math.round(Number(application.semantic_score)))) : 0

  const strengths = safeArray(application.strengths)
  const gaps = safeArray(application.gaps)
  const mandatoryMatched = safeArray(details?.mandatoryMatched)
  const mandatoryMissing = safeArray(details?.mandatoryMissing)
  const weaknesses = safeArray(details?.weaknesses)
  const concerns = safeArray(details?.concerns)
  const improvements = safeArray(details?.improvements)
  const projects = safeArray(details?.relevantProjects)

  // Dynamic breakdown metrics (normalized 0-100)
  const breakdown = {
    skills: details?.mandatoryMatched?.length
      ? Math.round(
          (details.mandatoryMatched.length /
            Math.max(1, details.mandatoryMatched.length + (details.mandatoryMissing?.length || 0))) *
            100
        )
      : Math.min(100, Math.round(scoreVal * 0.95)),
    experience: details?.relevantExperienceYears !== undefined
      ? Math.min(100, Math.round(Math.min(details.relevantExperienceYears, 3) * 33))
      : Math.min(100, Math.round(scoreVal * 0.9)),
    education: details?.educationStatus?.includes('Meets') ? 95 : 75,
    projects: projects.length >= 2 ? 95 : projects.length === 1 ? 75 : 50,
  }

  const status = application.status || 'new'
  const decided = status === 'selected' || status === 'rejected'

  let dateStr = 'Recently'
  try {
    if (application.applied_at) {
      const d = new Date(application.applied_at)
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      }
    }
  } catch {
    dateStr = 'Recently'
  }

  return (
    <article className={`card application-card lift ${status} ${rank === 1 ? 'rank-first' : ''}`}>
      <div className="app-card-main">
        {/* Candidate Identity */}
        <div className="app-identity">
          {isRecruiter && onToggleCompare && (
            <button
              type="button"
              className={`compare-select-btn ${isSelectedForCompare ? 'selected' : ''}`}
              onClick={() => onToggleCompare(application)}
              title={isSelectedForCompare ? 'Deselect candidate' : 'Select to compare'}
              aria-label="Select to compare"
            >
              {isSelectedForCompare ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
          )}

          <div className="avatar-wrapper">
            <Avatar
              seed={application.candidate_id}
              name={application.candidate_name}
              gender={application.candidate_gender}
              photoUrl={application.candidate_photo_url}
              size={52}
              ring={rank === 1}
            />
            {isRecruiter && rank && rank <= 3 && hasScore && (
              <span className={`badge-rank rank-${rank}`} title={`Rank #${rank}`}>
                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
              </span>
            )}
          </div>

          <div>
            <div className="candidate-name-row">
              <span className="candidate-name">
                {isRecruiter ? application.candidate_name || 'Candidate' : application.job_role || 'Application'}
              </span>
              {isRecruiter && rank && hasScore && (
                <span className={`pill-rank ${rank === 1 ? 'top' : ''}`}>
                  {rank === 1 ? 'Top Pick · #1' : `#${rank}`}
                </span>
              )}
            </div>
            <div className="candidate-email">
              {isRecruiter ? (
                <>
                  <Mail size={12} />
                  <span>{displayEmail(application.candidate_email)}</span>
                </>
              ) : (
                <>
                  <Building2 size={12} />
                  <span>{application.company_name || 'Company'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Role and Date Meta */}
        <div className="app-meta">
          <strong>
            {isRecruiter
              ? showRole && application.job_role
                ? application.job_role
                : 'Applicant'
              : 'Applied'}
          </strong>
          <span>{isRecruiter ? `Applied ${dateStr}` : dateStr}</span>
        </div>

        {/* ATS Score / Status */}
        <div className="app-meta">
          {isRecruiter && hasScore ? (
            <div className="score-summary-cell">
              <ScoreRing score={scoreVal} size={58} />
              <div className="risk-text-stack">
                <span className={`pill ${application.risk_level === 'Low' ? 'tone-mint' : application.risk_level === 'Moderate' ? 'tone-sun' : 'tone-pink'}`}>
                  {application.risk_level || 'Evaluated'} risk
                </span>
                <span className="small muted">{scoreVal}/100 match</span>
              </div>
            </div>
          ) : isRecruiter ? (
            <>
              <strong className="muted-strong">Not analyzed</strong>
              <span className="small muted">Ready for AI review</span>
            </>
          ) : (
            <>
              <span className={`pill ${statusTone[status]}`}>{statusLabels[status]}</span>
              <span className="muted small clip">
                <FileText size={11} /> {application.resume_name || 'Resume'}
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="app-actions">
          {isRecruiter ? (
            <>
              {application.resume_data && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onDownload?.(application)}
                >
                  <Download size={14} /> Resume
                </button>
              )}
              <button
                className="btn btn-soft btn-sm"
                onClick={() => onAnalyze?.(application)}
              >
                <Brain size={14} />
                {hasScore ? 'Re-analyze' : 'Analyze with AI'}
              </button>
              {!decided && (
                <>
                  <button
                    className="btn btn-green btn-sm"
                    onClick={() => onDecide?.(application.id, 'selected')}
                  >
                    <CheckCircle2 size={14} /> Select
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDecide?.(application.id, 'rejected')}
                  >
                    <XCircle size={14} /> Decline
                  </button>
                </>
              )}
              {decided && <span className={`pill ${statusTone[status]}`}>{statusLabels[status]}</span>}
              {hasScore && (
                <button
                  className={`btn btn-ghost btn-sm expand-btn ${expanded ? 'open' : ''}`}
                  onClick={() => setExpanded(!expanded)}
                  aria-expanded={expanded}
                >
                  <ChevronDown size={14} />
                  {expanded ? 'Hide Details' : 'Score Breakdown'}
                </button>
              )}
            </>
          ) : (
            <Journey status={status} />
          )}
        </div>
      </div>

      {/* FEATURE 1: Professional Explainable Score Breakdown */}
      {isRecruiter && hasScore && (
        <div className={`analysis-wrap ${expanded ? 'open' : ''}`}>
          <div className="analysis-inner">
            <div className="analysis-box">
              {/* Left Score Column */}
              <div className="analysis-score-col">
                <ScoreRing score={scoreVal} size={96} />
                <div className="score-col-meta">
                  <span className={`pill ${application.risk_level === 'Low' ? 'tone-mint' : application.risk_level === 'Moderate' ? 'tone-sun' : 'tone-pink'}`}>
                    {application.risk_level || 'Low'} risk
                  </span>
                  <span className="small muted">Rank Score: {scoreVal}/100</span>
                </div>
              </div>

              {/* Middle Breakdown Column */}
              <div className="analysis-content">
                <h4>
                  <Sparkles size={14} /> ATS Compatibility Breakdown
                </h4>
                <div className="breakdown-bars">
                  <div className="breakdown-row">
                    <span className="breakdown-label">Skills Match</span>
                    <div className="breakdown-track">
                      <div className="breakdown-fill fill-violet" style={{ width: `${breakdown.skills}%` }} />
                    </div>
                    <strong>{breakdown.skills}%</strong>
                  </div>

                  <div className="breakdown-row">
                    <span className="breakdown-label">Experience</span>
                    <div className="breakdown-track">
                      <div className="breakdown-fill fill-mint" style={{ width: `${breakdown.experience}%` }} />
                    </div>
                    <strong>{breakdown.experience}%</strong>
                  </div>

                  <div className="breakdown-row">
                    <span className="breakdown-label">Education</span>
                    <div className="breakdown-track">
                      <div className="breakdown-fill fill-sky" style={{ width: `${breakdown.education}%` }} />
                    </div>
                    <strong>{breakdown.education}%</strong>
                  </div>

                  <div className="breakdown-row">
                    <span className="breakdown-label">Project Relevance</span>
                    <div className="breakdown-track">
                      <div className="breakdown-fill fill-sun" style={{ width: `${breakdown.projects}%` }} />
                    </div>
                    <strong>{breakdown.projects}%</strong>
                  </div>
                </div>

                {/* Score Explanation */}
                <p className="analysis-explanation">
                  {details?.scoreExplanation || application.reasoning}
                </p>

                {/* Matched Skills */}
                <div className="skill-section">
                  <span className="sub-heading">
                    <Check size={12} style={{ color: 'var(--mint)' }} /> Matched Requirements:
                  </span>
                  <div className="chips">
                    {(mandatoryMatched.length ? mandatoryMatched : strengths).slice(0, 6).map((item, i) => (
                      <span key={i} className="chip chip-green">
                        {item}
                      </span>
                    ))}
                    {!mandatoryMatched.length && !strengths.length && (
                      <span className="muted small">No direct keyword overlap</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Missing Requirements & Risks */}
              <div className="analysis-content">
                <h4>
                  <ShieldAlert size={14} /> Missing Skills & Risk Analysis
                </h4>
                <p className="analysis-rec">
                  <strong>Recommendation:</strong> {application.recommendation}
                </p>

                {/* Missing Skills */}
                <div className="skill-section">
                  <span className="sub-heading">
                    <AlertCircle size={12} style={{ color: 'var(--pink)' }} /> Missing Mandatory Skills:
                  </span>
                  <div className="chips">
                    {(mandatoryMissing.length ? mandatoryMissing : gaps).slice(0, 5).map((item, i) => (
                      <span key={i} className="chip chip-red">
                        {item}
                      </span>
                    ))}
                    {!mandatoryMissing.length && !gaps.length && (
                      <span className="muted small" style={{ color: '#0b8a68' }}>
                        All core requirements met
                      </span>
                    )}
                  </div>
                </div>

                {/* Weaknesses / Concerns */}
                {(weaknesses.length > 0 || concerns.length > 0) && (
                  <div className="analysis-bullets">
                    <span className="sub-heading">Recruiter Notes:</span>
                    <ul>
                      {weaknesses.slice(0, 2).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {concerns.slice(0, 1).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvement suggestions */}
                {improvements.length > 0 && (
                  <div className="analysis-improvements">
                    <Lightbulb size={12} style={{ color: 'var(--sun)' }} />
                    <span className="small muted">{improvements[0]}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate-side decision message */}
      {!isRecruiter && application.decision_message && (
        <div className={`notice ${status}`}>
          <FileText size={15} />
          <p>{application.decision_message}</p>
        </div>
      )}
    </article>
  )
}
