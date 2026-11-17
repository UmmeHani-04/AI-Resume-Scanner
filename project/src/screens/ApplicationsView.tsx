import { useState, useRef, useEffect, type DragEvent } from 'react'
import { UploadCloud, FileText, X, Inbox } from 'lucide-react'
import { useApplications, useJobs } from '../lib/hooks'
import { useToast } from '../lib/toast'
import { useAuth } from '../lib/auth'
import type { Application, Job } from '../lib/types'
import { ApplicationCard } from '../components/ApplicationCard'
import { AnalysisStudio } from '../components/AnalysisStudio'
import { Avatar } from '../components/Avatar'
import { Modal } from '../components/Modal'
import { SearchBar } from '../components/SearchBar'

interface ApplicationsViewProps {
  isRecruiter: boolean
  selectedJobId: string | null
  applyJobId: string | null
  onClearJobFilter: () => void
  /** Called after a candidate's application is submitted successfully. */
  onApplied?: () => void
}

type Studio =
  | { kind: 'review'; id: string; application: Application }
  | { kind: 'submit'; id: string; job: Job; file: File; text: string }

const REVIEW_STAGES = ['Parsing document…', 'Extracting skills…', 'Matching against the role…', 'Generating candidate score…']
const SUBMIT_STAGES = ['Uploading resume…', 'Parsing document…', 'Extracting skills…', 'Sending to the recruiter…']

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export function ApplicationsView({ isRecruiter, selectedJobId, applyJobId, onClearJobFilter, onApplied }: ApplicationsViewProps) {
  const { profile, session } = useAuth()
  const { jobs } = useJobs()
  const { applications, submitApplication, analyzeOnServer, decideApplication } = useApplications(selectedJobId)
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [studio, setStudio] = useState<Studio | null>(null)
  const [lastAnalyzedId, setLastAnalyzedId] = useState<string | null>(null)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applyJob, setApplyJob] = useState<Job | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [decisionModal, setDecisionModal] = useState<{ applicationId: string; status: 'selected' | 'rejected' } | null>(null)
  const [decisionMessage, setDecisionMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isRecruiter && applyJobId) {
      const job = jobs.find((j) => j.id === applyJobId) || null
      if (job && job.is_open) { setApplyJob(job); setShowApplyModal(true) }
    }
  }, [applyJobId, isRecruiter, jobs])

  if (!profile) return null

  const selectedJob = isRecruiter && selectedJobId ? jobs.find((j) => j.id === selectedJobId) : null

  const filtered = applications.filter((app) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      app.candidate_name.toLowerCase().includes(q) ||
      app.candidate_email.toLowerCase().includes(q) ||
      (app.resume_name || '').toLowerCase().includes(q) ||
      (app.job_role || '').toLowerCase().includes(q) ||
      (app.company_name || '').toLowerCase().includes(q)
    )
  })

  const closeApply = () => { setShowApplyModal(false); setApplyJob(null); onClearJobFilter() }

  const handleAnalyze = (application: Application) => {
    if (!jobs.find((j) => j.id === application.job_id)) {
      toast('Could not find the job for this application.', 'error')
      return
    }
    setStudio({ kind: 'review', id: `${application.id}-${Date.now()}`, application })
  }

  const runReview = (application: Application) => async () => {
    return await analyzeOnServer(application.id)
  }

  const runSubmit = (s: Extract<Studio, { kind: 'submit' }>) => async () => {
    const resumeData = await fileToDataUrl(s.file)
    await submitApplication(s.job.id, profile.full_name, session?.user.email || profile.id + '@talentradar.app', s.file.name, resumeData, s.text, s.job)
  }

  const handleDecide = async () => {
    if (!decisionModal) return
    const { applicationId, status } = decisionModal
    const message = decisionMessage.trim() || (status === 'selected'
      ? 'Congratulations! We would love to move forward with your application. We will be in touch shortly with next steps.'
      : 'Thank you for your interest and the time you invested in applying. While your background is impressive, we have decided to move forward with other candidates whose experience more closely matches the current needs of this role. We wish you the very best in your search.')
    try {
      await decideApplication(applicationId, status, message)
      setDecisionModal(null)
      setDecisionMessage('')
      toast(status === 'selected' ? 'Selection message sent to the candidate.' : 'Warm decline message sent to the candidate.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update decision.', 'error')
    }
  }

  const pickFile = (file: File | null | undefined) => {
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { toast('Please choose a file under 4 MB.', 'error'); return }
    if (!/\.(pdf|docx?)$/i.test(file.name)) { toast('Please choose a PDF, DOC, or DOCX file.', 'error'); return }
    setResumeFile(file)
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]) }

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!applyJob) return
    if (!resumeFile) { toast('Choose a resume file first.', 'error'); return }
    setShowApplyModal(false)
    setStudio({ kind: 'submit', id: `${applyJob.id}-${Date.now()}`, job: applyJob, file: resumeFile, text: resumeText })
  }

  const handleDownload = (application: Application) => {
    if (!application.resume_data) { toast('Resume file is not available.', 'error'); return }
    const link = document.createElement('a')
    link.href = application.resume_data
    link.download = application.resume_name || 'resume'
    link.click()
  }

  const heading = selectedJob ? `Applicants · ${selectedJob.role}` : isRecruiter ? 'Candidate review' : 'Your applications'
  const subtitle = selectedJob
    ? `Showing applicants for ${selectedJob.company_name} only.`
    : isRecruiter ? 'Choose "View applicants" on a role to review candidates for that job.'
      : 'Track your applications and read every decision message here.'

  return (
    <div className="applications-view stagger">
      <header className="topbar">
        <div>
          <h1>{heading}</h1>
          <p>{subtitle}</p>
        </div>
        {selectedJob && <div className="top-actions"><button className="btn btn-ghost" onClick={onClearJobFilter}>View all candidates</button></div>}
      </header>

      {selectedJob && (
        <div className="notice">
          <strong>{selectedJob.role}</strong>
          <span className="muted small">{selectedJob.company_name} · Applicants are scoped to this role.</span>
        </div>
      )}

      {applications.length > 0 && (
        <div className="filter-bar">
          <SearchBar value={search} onChange={setSearch} placeholder={isRecruiter ? 'Search by candidate name, email or role...' : 'Search your applications...'} />
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="applications">
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              isRecruiter={isRecruiter}
              showRole={isRecruiter && !selectedJob}
              autoOpen={lastAnalyzedId === app.id}
              onAnalyze={handleAnalyze}
              onDecide={(id, status) => setDecisionModal({ applicationId: id, status })}
              onDownload={handleDownload}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-ico"><Inbox size={26} /></div>
          <strong>{isRecruiter ? 'No candidates for this role yet' : 'Nothing submitted yet'}</strong>
          <p>{isRecruiter ? 'Applicants for the selected role will show up here.' : 'Choose an open role and submit your resume.'}</p>
        </div>
      )}

      {/* Apply modal */}
      <Modal
        open={showApplyModal}
        onClose={closeApply}
        title={applyJob ? `Apply for ${applyJob.role}` : 'Apply for role'}
        subtitle={applyJob ? `${applyJob.company_name} · Submit your resume for this role.` : 'Submit your resume for this role.'}
      >
        <form onSubmit={handleApply} className="modal-form">
          <div className="apply-as"><Avatar seed={profile.id} name={profile.full_name} size={36} /><span>Applying as <strong>{profile.full_name}</strong></span></div>
          <div className="field">
            <label>Resume</label>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            {resumeFile ? (
              <div className="file-card">
                <div className="file-ico"><FileText size={20} /></div>
                <div><strong>{resumeFile.name}</strong><span>{resumeFile.size < 1024 ? '<1 KB' : `${Math.round(resumeFile.size / 1024)} KB`} · ready to upload</span></div>
                <button type="button" className="icon-btn" onClick={() => { setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} aria-label="Remove file"><X size={16} /></button>
              </div>
            ) : (
              <button
                type="button"
                className={`dropzone ${dragging ? 'over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <UploadCloud size={26} />
                <strong>Drop your resume here or browse</strong>
                <span>PDF, DOC, or DOCX · max 4 MB</span>
              </button>
            )}
          </div>
          <div className="field">
            <label>Resume text / notes</label>
            <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows={6} placeholder="Paste your resume text here for better AI matching." />
            <span className="field-hint">Recruiters' AI reads this text, so pasting it improves your match.</span>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={closeApply}>Cancel</button>
            <button type="submit" className="btn btn-primary">Submit application →</button>
          </div>
        </form>
      </Modal>

      {/* Analysis / submission studio */}
      {studio?.kind === 'review' && (
        <AnalysisStudio
          key={studio.id}
          variant="review"
          stages={REVIEW_STAGES}
          candidateSeed={studio.application.candidate_id}
          candidateName={studio.application.candidate_name}
          fileName={studio.application.resume_name}
          resumeText={studio.application.resume_text}
          doneTitle="Analysis complete"
          doneText={`Read for ${studio.application.job_role || 'this role'}.`}
          doneCta="See full details"
          run={runReview(studio.application)}
          onClose={() => setStudio(null)}
          onDone={() => { setLastAnalyzedId(studio.application.id); setStudio(null) }}
        />
      )}
      {studio?.kind === 'submit' && (
        <AnalysisStudio
          key={studio.id}
          variant="submit"
          stages={SUBMIT_STAGES}
          candidateSeed={profile.id}
          candidateName={profile.full_name}
          fileName={studio.file.name}
          fileSize={studio.file.size}
          resumeText={studio.text}
          doneTitle="Application submitted"
          doneText={`You're now in the review queue for ${studio.job.role} at ${studio.job.company_name}.`}
          doneCta="Track my applications"
          run={runSubmit(studio)}
          onClose={() => { setStudio(null); setShowApplyModal(true) }}
          onDone={() => { setStudio(null); setApplyJob(null); setResumeFile(null); setResumeText(''); onApplied ? onApplied() : onClearJobFilter() }}
        />
      )}

      {/* Decision modal */}
      <Modal
        open={!!decisionModal}
        onClose={() => { setDecisionModal(null); setDecisionMessage('') }}
        title={decisionModal?.status === 'selected' ? 'Send a selection message' : 'Send a decline message'}
        subtitle="The candidate will see this message in their application tracker."
      >
        <div className="modal-form">
          <div className="field">
            <label>Message to candidate</label>
            <textarea
              value={decisionMessage}
              onChange={(e) => setDecisionMessage(e.target.value)}
              placeholder={decisionModal?.status === 'selected' ? 'Congratulations! We would love to move forward...' : 'Thank you for your interest...'}
              rows={5}
            />
            <span className="field-hint">Leave blank to use a default message.</span>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => { setDecisionModal(null); setDecisionMessage('') }}>Cancel</button>
            <button className={`btn ${decisionModal?.status === 'selected' ? 'btn-green' : 'btn-danger'}`} onClick={handleDecide}>
              {decisionModal?.status === 'selected' ? 'Send selection →' : 'Send decline →'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
