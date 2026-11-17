import { useEffect, useState } from 'react'
import { Radar, LayoutDashboard, Briefcase, Users, LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { Avatar } from '../components/Avatar'
import { Confetti } from '../components/Confetti'
import { Modal } from '../components/Modal'
import { Dashboard } from './Dashboard'
import { JobsView } from './JobsView'
import { ApplicationsView } from './ApplicationsView'

type View = 'overview' | 'jobs' | 'applications'
export const NEW_SIGNUP_KEY = 'talentradar_new_signup'

export function AppShell() {
  const { profile, signOut } = useAuth()
  const { toast } = useToast()
  const [view, setView] = useState<View>('overview')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [applyJobId, setApplyJobId] = useState<string | null>(null)
  // One-time "meet your avatar" moment right after registration.
  // (Read in the initializer, clear in an effect: StrictMode double-invokes initializers.)
  const [welcome, setWelcome] = useState(() => sessionStorage.getItem(NEW_SIGNUP_KEY) === '1')
  useEffect(() => { sessionStorage.removeItem(NEW_SIGNUP_KEY) }, [])
  if (!profile) return null
  const isRecruiter = profile.role === 'recruiter'

  const navItems: { id: View; icon: typeof LayoutDashboard; label: string }[] = isRecruiter
    ? [{ id: 'overview', icon: LayoutDashboard, label: 'Overview' }, { id: 'jobs', icon: Briefcase, label: 'My jobs' }, { id: 'applications', icon: Users, label: 'Candidates' }]
    : [{ id: 'overview', icon: LayoutDashboard, label: 'Overview' }, { id: 'jobs', icon: Briefcase, label: 'Browse jobs' }, { id: 'applications', icon: Users, label: 'My applications' }]

  const handleNav = (next: View) => {
    setView(next)
    if (next !== 'applications') { setSelectedJobId(null); setApplyJobId(null) }
  }
  const handleViewApplicants = (jobId: string) => { setSelectedJobId(jobId); setApplyJobId(null); setView('applications') }
  const handleApply = (jobId: string) => { setApplyJobId(jobId); setSelectedJobId(null); setView('applications') }
  const handleClearJobFilter = () => {
    setSelectedJobId(null)
    if (!isRecruiter) { setApplyJobId(null); setView('jobs') }
  }
  // After a successful application, stay on the tracker so the new card is visible.
  const handleApplied = () => { setApplyJobId(null); setSelectedJobId(null); setView('applications') }
  const handleSignOut = async () => { await signOut(); toast('Signed out.') }
  const firstName = profile.full_name.split(' ')[0]

  return (
    <div className="app-shell">
      <aside className="sidebar glass">
        <div className="brand"><div className="brand-mark"><Radar size={18} strokeWidth={2.5} /></div><span>TalentRadar</span></div>
        <nav className="side-nav" aria-label="Workspace">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button type="button" key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => handleNav(item.id)} aria-current={view === item.id ? 'page' : undefined}>
                <Icon size={18} /><span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="side-foot">
          <div className="workspace-status"><span className="status-pulse" />{isRecruiter ? 'Recruiter workspace' : 'Candidate workspace'}</div>
          <div className="user-card">
            <Avatar seed={profile.id} name={profile.full_name} gender={profile.gender} size={42} ring />
            <div className="user-copy"><strong>{profile.full_name}</strong><span>{isRecruiter ? 'Recruiter' : 'Candidate'}</span></div>
            <button type="button" className="logout-btn" onClick={handleSignOut} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="mobile-top glass">
        <div className="brand"><div className="brand-mark"><Radar size={16} strokeWidth={2.5} /></div>TalentRadar</div>
        <div className="mobile-user"><Avatar seed={profile.id} name={profile.full_name} gender={profile.gender} size={34} ring /><button type="button" className="logout-btn" onClick={handleSignOut} aria-label="Sign out"><LogOut size={16} /></button></div>
      </div>

      <main className="main" key={view}>
        <div className="view-enter">
          {view === 'overview' && <Dashboard isRecruiter={isRecruiter} onNavigate={handleNav} onViewApplicants={handleViewApplicants} onApply={handleApply} />}
          {view === 'jobs' && <JobsView isRecruiter={isRecruiter} onViewApplicants={handleViewApplicants} onApply={handleApply} />}
          {view === 'applications' && <ApplicationsView isRecruiter={isRecruiter} selectedJobId={isRecruiter ? selectedJobId : null} applyJobId={!isRecruiter ? applyJobId : null} onClearJobFilter={handleClearJobFilter} onApplied={handleApplied} />}
        </div>
      </main>

      <Confetti fire={welcome ? 1 : 0} pieces={140} originY={0.3} />
      <Modal open={welcome} onClose={() => setWelcome(false)} maxWidth={440}>
        <div className="welcome">
          <div className="welcome-avatar"><Avatar seed={profile.id} name={profile.full_name} gender={profile.gender} size={132} ring /></div>
          <h2>Welcome, {firstName}</h2>
          <p>We generated a unique avatar for you. {isRecruiter ? 'Candidates will see it next to your roles.' : 'Recruiters will see it next to your applications.'}</p>
          <button className="btn btn-primary" onClick={() => setWelcome(false)}>Let's go</button>
        </div>
      </Modal>

      <nav className="tabbar glass" aria-label="Workspace">
        {navItems.map((item) => {
          const Icon = item.icon
          return <button type="button" key={item.id} className={view === item.id ? 'active' : ''} onClick={() => handleNav(item.id)}><Icon size={20} /><span>{item.label}</span></button>
        })}
      </nav>
    </div>
  )
}
