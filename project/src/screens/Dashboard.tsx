import { Briefcase, Users, Eye, CheckCircle2, ArrowRight, Sparkles, type LucideIcon } from 'lucide-react'
import { useJobs, useApplications } from '../lib/hooks'
import { useAuth } from '../lib/auth'
import { useCountUp } from '../components/useCountUp'
import { Avatar } from '../components/Avatar'
import { JobCard } from '../components/JobCard'
import { ApplicationCard } from '../components/ApplicationCard'
import { DonutChart, ScoreBars } from '../components/Charts'
import type { Application, Job } from '../lib/types'

type View = 'overview' | 'jobs' | 'applications'
interface DashboardProps { isRecruiter: boolean; onNavigate: (view: View) => void; onViewApplicants: (jobId: string) => void; onApply: (jobId: string) => void }

function StatCard({ label, value, icon: Icon, tone, index }: { label: string; value: number; icon: LucideIcon; tone: string; index: number }) {
  const shown = useCountUp(value, 900, index * 90)
  return (
    <div className={`stat-card lift tone-card-${tone}`}>
      <div className="stat-icon"><Icon size={20} /></div>
      <span className="stat-label">{label}</span>
      <strong>{shown}</strong>
      <div className="stat-decoration" />
    </div>
  )
}

export function Dashboard({ isRecruiter, onNavigate, onViewApplicants, onApply }: DashboardProps) {
  const { profile } = useAuth()
  const { jobs } = useJobs()
  const { applications } = useApplications(null)
  if (!profile) return null

  const openJobs = jobs.filter((j) => j.is_open)
  const count = (s: string) => applications.filter((a) => a.status === s).length
  const reviewing = count('reviewing')
  const selected = count('selected')
  const decisions = selected + count('rejected')
  const stats = isRecruiter
    ? [{ label: 'Open roles', value: openJobs.length, icon: Briefcase, tone: 'violet' }, { label: 'Total applicants', value: applications.length, icon: Users, tone: 'sky' }, { label: 'In review', value: reviewing, icon: Eye, tone: 'sun' }, { label: 'Selected', value: selected, icon: CheckCircle2, tone: 'mint' }]
    : [{ label: 'Open roles', value: openJobs.length, icon: Briefcase, tone: 'violet' }, { label: 'Applications', value: applications.length, icon: Users, tone: 'sky' }, { label: 'In review', value: reviewing, icon: Eye, tone: 'sun' }, { label: 'Decisions', value: decisions, icon: CheckCircle2, tone: 'mint' }]
  const recent = isRecruiter ? applications.slice(0, 3) : openJobs.slice(0, 2)
  const segments = [
    { label: 'New', value: count('new'), color: '#3dbdf5' },
    { label: 'AI reviewed', value: reviewing, color: '#ffbe3d' },
    { label: 'Selected', value: selected, color: '#1fcf9f' },
    { label: 'Not selected', value: count('rejected'), color: '#ff5d8f' },
  ]
  const scores = applications
    .filter((a) => Number.isFinite(a.semantic_score))
    .map((a) => Math.round(Number(a.semantic_score)))
  const firstName = profile.full_name.split(' ')[0]

  return (
    <div className="dashboard stagger">
      <header className="topbar">
        <div className="greeting">
          <Avatar seed={profile.id} name={profile.full_name} size={64} ring />
          <div>
            <h1>{isRecruiter ? `Hi ${firstName}, here's your hiring pulse` : `Hi ${firstName}, ready for your next move?`}</h1>
            <p>{isRecruiter ? 'Everything important about your open roles, in one place.' : 'Find a role that fits, then let your application do the talking.'}</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn btn-primary" onClick={() => onNavigate('jobs')}>{isRecruiter ? '+ Post a job' : <>Browse open roles <ArrowRight size={15} className="nudge" /></>}</button>
        </div>
      </header>

      <div className="stat-grid">{stats.map((s, i) => <StatCard key={s.label} index={i} {...s} />)}</div>

      <div className="dash-grid">
        <section>
          <div className="section-heading">
            <div><h2>{isRecruiter ? 'Latest candidates' : 'Roles worth a look'}</h2><p>{isRecruiter ? 'Review resumes and close the loop quickly.' : 'A short list of the roles currently accepting applications.'}</p></div>
            <button className="btn btn-ghost" onClick={() => onNavigate(isRecruiter ? 'applications' : 'jobs')}>View all <ArrowRight size={14} className="nudge" /></button>
          </div>
          {isRecruiter ? (
            <div className="applications">
              {recent.length > 0
                ? (recent as Application[]).map((app) => <ApplicationCard key={app.id} application={app} isRecruiter showRole />)
                : <div className="empty"><strong>No applications yet</strong><p>Post a role and candidates will appear here.</p></div>}
            </div>
          ) : (
            <div className="card-grid one-col">
              {recent.length > 0
                ? (recent as Job[]).map((job) => <JobCard key={job.id} job={job} isRecruiter={false} onViewApplicants={onViewApplicants} onApply={() => onApply(job.id)} />)
                : <div className="empty"><strong>No open roles yet</strong><p>Check back soon for new opportunities.</p></div>}
            </div>
          )}
        </section>

        <aside className="dash-side">
          <div className="card chart-card">
            <h3>{isRecruiter ? 'Pipeline' : 'Your applications'}</h3>
            <p className="muted small">Hover a slice to focus it.</p>
            {applications.length > 0
              ? <DonutChart segments={segments} centerLabel={isRecruiter ? 'candidates' : 'applied'} />
              : <div className="mini-empty">{isRecruiter ? 'Candidates will show up here once they apply.' : 'Apply to a role to start tracking progress.'}</div>}
          </div>
          {isRecruiter && (
            <div className="card chart-card">
              <h3>Match scores</h3>
              <p className="muted small">How analyzed candidates spread across score bands.</p>
              {scores.length > 0 ? <ScoreBars scores={scores} /> : <div className="mini-empty">Run AI analysis on a candidate to see the spread.</div>}
            </div>
          )}
        </aside>
      </div>

      {isRecruiter && applications.length > 0 && (
        <div className="ai-banner">
          <div className="ai-banner-icon"><Sparkles size={22} /></div>
          <div><strong>Talent Radar AI is ready</strong><p>Run AI analysis on any candidate to get a match score, strengths, gaps, and a clear recommendation — all scoped to the role.</p></div>
          <button className="btn btn-light" onClick={() => onNavigate('applications')}>Review candidates <ArrowRight size={14} className="nudge" /></button>
        </div>
      )}
    </div>
  )
}
