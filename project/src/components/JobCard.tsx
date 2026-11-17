import { useMemo } from 'react'
import { Users, Calendar, ArrowRight } from 'lucide-react'
import type { Job } from '../lib/types'
import { extractKeywords } from '../lib/ai'

interface JobCardProps {
  job: Job
  isRecruiter: boolean
  onViewApplicants?: (jobId: string) => void
  onApply?: (job: Job) => void
}

const HUES = ['#6c47ff', '#ff5d8f', '#1fcf9f', '#3dbdf5', '#ffbe3d', '#b05bff']
const hueFor = (s: string) => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]

export function JobCard({ job, isRecruiter, onViewApplicants, onApply }: JobCardProps) {
  const dateStr = new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const skills = useMemo(() => [...extractKeywords(`${job.role} ${job.description}`)].slice(0, 4), [job])
  const hue = hueFor(job.company_name)

  return (
    <article className="card job-card lift">
      <div className="job-card-header">
        <div className="job-card-title-row">
          <div className="company-tile" style={{ background: `linear-gradient(135deg, ${hue}, ${hue}aa)` }}>
            {job.company_name.trim()[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h3>{job.role}</h3>
            <div className="company">{job.company_name}</div>
          </div>
        </div>
        <span className={`pill ${job.is_open ? 'tone-mint' : 'tone-pink'}`}>{job.is_open ? 'Open' : 'Closed'}</span>
      </div>

      <p className="job-description">{job.description}</p>

      {skills.length > 0 && <div className="chips">{skills.map((s) => <span key={s} className="chip chip-violet">{s}</span>)}</div>}

      <div className="job-footer">
        <span className="muted small job-meta">
          {isRecruiter
            ? <><Users size={13} />{job.application_count ?? 0} applicant{(job.application_count ?? 0) === 1 ? '' : 's'}</>
            : <><Calendar size={13} />Posted {dateStr}</>}
        </span>
        {isRecruiter ? (
          <button className="btn btn-soft" onClick={() => onViewApplicants?.(job.id)}>View applicants <ArrowRight size={14} className="nudge" /></button>
        ) : (
          <button className="btn btn-primary" onClick={() => onApply?.(job)} disabled={!job.is_open}>
            {job.is_open ? 'Apply for role' : 'Closed'}{job.is_open && <ArrowRight size={14} className="nudge" />}
          </button>
        )}
      </div>
    </article>
  )
}
