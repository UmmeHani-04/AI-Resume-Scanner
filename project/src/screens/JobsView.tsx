import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useJobs } from '../lib/hooks'
import { useToast } from '../lib/toast'
import { useAuth } from '../lib/auth'
import { JobCard } from '../components/JobCard'
import { Modal } from '../components/Modal'
import { SearchBar } from '../components/SearchBar'

interface JobsViewProps {
  isRecruiter: boolean
  onViewApplicants: (jobId: string) => void
  onApply: (jobId: string) => void
}

export function JobsView({ isRecruiter, onViewApplicants, onApply }: JobsViewProps) {
  const { profile } = useAuth()
  const { jobs, createJob } = useJobs()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [showModal, setShowModal] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [role, setRole] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!profile) return null

  const myJobs = isRecruiter ? jobs.filter((j) => j.recruiter_id === profile.id) : jobs.filter((j) => j.is_open)
  const filtered = myJobs.filter((job) => {
    const matchesSearch =
      !search ||
      job.role.toLowerCase().includes(search.toLowerCase()) ||
      job.company_name.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'open' && job.is_open) ||
      (filter === 'closed' && !job.is_open)
    return matchesSearch && matchesFilter
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim().length < 20) {
      toast('Description must be at least 20 characters.', 'error')
      return
    }
    setSubmitting(true)
    try {
      await createJob(companyName, role, description)
      setShowModal(false)
      setCompanyName('')
      setRole('')
      setDescription('')
      toast('Role published. Candidates can apply now.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create job.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="jobs-view stagger">
      <header className="topbar">
        <div>
          <h1>{isRecruiter ? 'Your open roles' : 'Find your next role'}</h1>
          <p>
            {isRecruiter
              ? 'Keep the brief clear. Talent Radar will keep the review clear too.'
              : 'Browse the roles recruiters are actively hiring for.'}
          </p>
        </div>
        {isRecruiter && (
          <div className="top-actions">
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Post a job
            </button>
          </div>
        )}
      </header>

      {/* Search + Filters */}
      <div className="filter-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by role, company, or keyword..." />
        <div className="filter-tabs">
          {(['all', 'open', 'closed'] as const).map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Closed'}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs grid */}
      {filtered.length > 0 ? (
        <div className="card-grid">
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isRecruiter={isRecruiter}
              onViewApplicants={onViewApplicants}
              onApply={() => onApply(job.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <strong>{isRecruiter ? 'No jobs posted yet' : 'No open jobs'}</strong>
          <p>
            {isRecruiter
              ? 'Create your first role to start receiving applications.'
              : 'Check back soon for new opportunities.'}
          </p>
        </div>
      )}

      {/* Post Job Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
                title="Post a job"
        subtitle="Give candidates enough context to see themselves in the role."
      >
        <form onSubmit={handleCreate} className="modal-form">
          <div className="field">
            <label>Company name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="e.g. Northstar Labs"
            />
          </div>
          <div className="field">
            <label>Job role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              placeholder="e.g. Product Designer"
            />
          </div>
          <div className="field">
            <label>Job description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={20}
              placeholder="What will this person own? Mention the skills and experience that matter."
            />
            <span className="field-hint">{description.length} / 20 min</span>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Publishing...' : 'Publish role →'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
