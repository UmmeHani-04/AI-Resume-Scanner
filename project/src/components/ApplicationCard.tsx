import { useEffect, useState } from 'react'
import { Mail, FileText, Brain, CheckCircle2, XCircle, Download, ChevronDown, Sparkles, ShieldAlert, Building2 } from 'lucide-react'
import type { Application } from '../lib/types'
import { Avatar } from './Avatar'
import { ScoreRing } from './ScoreRing'

interface ApplicationCardProps {
  application: Application
  isRecruiter: boolean
  /** Show which role the applicant applied for (recruiter, unscoped lists). */
  showRole?: boolean
  autoOpen?: boolean
  onAnalyze?: (application: Application) => void
  onDecide?: (applicationId: string, status: 'selected' | 'rejected') => void
  onDownload?: (application: Application) => void
}

// Older applications stored a placeholder address (<user-id>@talentradar.app); don't show that to recruiters.
const displayEmail = (e: string) => (/^[0-9a-f-]{36}@talentradar\.app$/i.test(e) ? 'Applied via TalentRadar' : e)

const statusLabels: Record<string, string> = { new: 'New', reviewing: 'AI reviewed', selected: 'Selected', rejected: 'Not selected' }
const statusTone: Record<string, string> = { new: 'tone-sky', reviewing: 'tone-sun', selected: 'tone-mint', rejected: 'tone-pink' }

/** Candidate-side tracker: Applied → In review → Decision */
function Journey({ status }: { status: string }) {
  const at = status === 'new' ? 0 : status === 'reviewing' ? 1 : 2
  const labels = ['Applied', 'In review', status === 'rejected' ? 'Decision' : status === 'selected' ? 'Selected' : 'Decision']
  return (
    <div className="journey" aria-label={`Progress: ${labels[at]}`}>
      <div className="journey-bar"><div className={`journey-fill ${status}`} style={{ width: `${at * 50}%` }} /></div>
      <div className="journey-dots">
        {labels.map((l, i) => <span key={l} className={i <= at ? 'on' : ''}><i />{l}</span>)}
      </div>
    </div>
  )
}

export function ApplicationCard({ application, isRecruiter, showRole, autoOpen, onAnalyze, onDecide, onDownload }: ApplicationCardProps) {
  const [expanded, setExpanded] = useState(false)
  useEffect(() => { if (autoOpen) setExpanded(true) }, [autoOpen])

  const analysis = application.semantic_score !== null ? {
    semanticScore: application.semantic_score,
    riskLevel: application.risk_level,
    reasoning: application.reasoning,
    recommendation: application.recommendation,
    strengths: application.strengths || [],
    gaps: application.gaps || [],
  } : null

  const status = application.status
  const decided = status === 'selected' || status === 'rejected'
  const dateStr = new Date(application.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <article className={`card application-card lift ${status}`}>
      <div className="app-card-main">
        <div className="app-identity">
          <Avatar seed={application.candidate_id} name={application.candidate_name} size={52} ring />
          <div>
            <div className="candidate-name">{isRecruiter ? application.candidate_name : (application.job_role || 'Application')}</div>
            <div className="candidate-email">
              {isRecruiter
                ? <><Mail size={12} /><span>{displayEmail(application.candidate_email)}</span></>
                : <><Building2 size={12} /><span>{application.company_name || 'Company'}</span></>}
            </div>
          </div>
        </div>

        <div className="app-meta">
          <strong>{isRecruiter ? (showRole && application.job_role ? application.job_role : 'Applicant') : 'Applied'}</strong>
          <span>{isRecruiter ? `Applied ${dateStr}` : dateStr}</span>
        </div>

        <div className="app-meta">
          {isRecruiter && analysis ? (
            <>
              <ScoreRing score={analysis.semanticScore} size={58} />
              <span>{analysis.riskLevel} risk</span>
            </>
          ) : isRecruiter ? (
            <><strong className="muted-strong">Not analyzed</strong><span>Run Talent Radar AI</span></>
          ) : (
            <>
              <span className={`pill ${statusTone[status]}`}>{statusLabels[status]}</span>
              <span className="muted small clip"><FileText size={11} /> {application.resume_name || 'Resume'}</span>
            </>
          )}
        </div>

        <div className="app-actions">
          {isRecruiter ? (
            <>
              {application.resume_data && (
                <button className="btn btn-ghost btn-sm" onClick={() => onDownload?.(application)}><Download size={14} /> Resume</button>
              )}
              <button className="btn btn-soft btn-sm" onClick={() => onAnalyze?.(application)}>
                <Brain size={14} />{analysis ? 'Re-analyze' : 'Analyze with AI'}
              </button>
              {!decided && (
                <>
                  <button className="btn btn-green btn-sm" onClick={() => onDecide?.(application.id, 'selected')}><CheckCircle2 size={14} /> Select</button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDecide?.(application.id, 'rejected')}><XCircle size={14} /> Decline</button>
                </>
              )}
              {decided && <span className={`pill ${statusTone[status]}`}>{statusLabels[status]}</span>}
              {analysis && (
                <button className={`btn btn-ghost btn-sm expand-btn ${expanded ? 'open' : ''}`} onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
                  <ChevronDown size={14} />{expanded ? 'Hide' : 'Details'}
                </button>
              )}
            </>
          ) : (
            <Journey status={status} />
          )}
        </div>
      </div>

      {isRecruiter && analysis && (
        <div className={`analysis-wrap ${expanded ? 'open' : ''}`}>
          <div className="analysis-inner">
            <div className="analysis-box">
              <div className="analysis-score"><ScoreRing score={analysis.semanticScore} size={92} /></div>
              <div className="analysis-content">
                <h4><Sparkles size={13} /> Talent Radar read</h4>
                <p>{analysis.reasoning}</p>
                <div className="chips">
                  {analysis.strengths.length > 0
                    ? analysis.strengths.map((item, i) => <span key={i} className="chip chip-green">{item}</span>)
                    : <span className="muted small">No strong keyword overlap found</span>}
                </div>
              </div>
              <div className="analysis-content">
                <h4><ShieldAlert size={13} /> Risk & gaps</h4>
                <p><strong>{analysis.riskLevel} risk</strong> · {analysis.recommendation}</p>
                <div className="chips">
                  {analysis.gaps.length > 0
                    ? analysis.gaps.map((item, i) => <span key={i} className="chip chip-red">{item}</span>)
                    : <span className="muted small">No major gaps surfaced</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isRecruiter && application.decision_message && (
        <div className={`notice ${status}`}><FileText size={15} /><p>{application.decision_message}</p></div>
      )}
    </article>
  )
}
