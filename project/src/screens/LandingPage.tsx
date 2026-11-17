import { useState } from 'react'
import { Radar, ArrowRight, ArrowUpRight, Briefcase, Users, Brain, Target, Zap, ShieldCheck, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import type { UserRole } from '../lib/types'
import { Avatar } from '../components/Avatar'
import { HeroDemo } from '../components/HeroDemo'
import { Reveal } from '../components/Reveal'
import { NEW_SIGNUP_KEY } from './AppShell'

const SHOWCASE = ['ada-lovelace', 'grace-h', 'linus-t', 'margaret-h', 'tim-bl', 'radia-p', 'ken-t']

export function LandingPage() {
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<UserRole>('candidate')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pick, setPick] = useState(2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        toast('Welcome back to your workspace.')
      } else {
        if (!fullName.trim()) throw new Error('Please enter your full name.')
        sessionStorage.setItem(NEW_SIGNUP_KEY, '1')
        await signUp(email, password, fullName, role)
        toast('Account created. Welcome to TalentRadar.')
      }
    } catch (err) {
      sessionStorage.removeItem(NEW_SIGNUP_KEY)
      toast(err instanceof Error ? err.message : 'Something went wrong.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const scrollToAuth = () => document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <div className="landing">
      <header className="landing-header glass">
        <div className="brand"><div className="brand-mark"><Radar size={18} strokeWidth={2.5} /></div>TalentRadar</div>
        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#about">About</a>
        </nav>
        <button className="btn btn-primary landing-cta" onClick={scrollToAuth}>Get started <ArrowUpRight size={15} /></button>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="hero-badge"><Sparkles size={14} /> Talent Radar AI reads every resume</span>
          <h1>Discover talent <span className="hero-accent">beyond keywords.</span></h1>
          <p>One focused workspace for roles, resumes, and decisions that feel human, with a sharper signal from Talent Radar AI.</p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={scrollToAuth}>Get started <ArrowRight size={16} className="nudge" /></button>
            <a className="btn btn-glass btn-lg" href="#workflow">See how it works</a>
          </div>
          <div className="proof-row">
            <div className="avatar-stack">{SHOWCASE.slice(0, 5).map((s) => <Avatar key={s} seed={s} size={38} />)}</div>
            <span>Every candidate gets their own avatar,<br />so profiles are easy to recognise.</span>
          </div>
        </div>
        <HeroDemo />
      </section>

      <section id="auth" className="auth-section">
        <Reveal className="auth-showcase">
          <h2>Pick your side of the hiring table.</h2>
          <p>Sign up and we generate a one-of-a-kind avatar for you. It shows up on your dashboard, in applications, and in every recruiter list.</p>
          <div className="picker">
            {SHOWCASE.map((s, i) => (
              <button key={s} type="button" className={`picker-item ${pick === i ? 'on' : ''}`} onMouseEnter={() => setPick(i)} onFocus={() => setPick(i)} aria-label={`Sample avatar ${i + 1}`}>
                <Avatar seed={s} size={pick === i ? 96 : 64} />
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120} className="auth-panel glass-strong">
          <h2>{mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}</h2>
          <p className="auth-subtitle">{mode === 'login' ? 'Welcome back. Pick up where you left off.' : 'Set up a candidate or recruiter workspace in seconds.'}</p>

          <div className="auth-tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
            <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
            {mode === 'register' && (
              <div className="field">
                <label>Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Your name" />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input type="email" name="login-email" autoComplete="off" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" name="login-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
            </div>
            {mode === 'register' && (
              <div className="field">
                <label>I am joining as</label>
                <div className="role-switch">
                  <button type="button" className={`role-choice ${role === 'candidate' ? 'active' : ''}`} onClick={() => setRole('candidate')}><Users size={18} /><strong>Candidate</strong><span>Find your next role</span></button>
                  <button type="button" className={`role-choice ${role === 'recruiter' ? 'active' : ''}`} onClick={() => setRole('recruiter')}><Briefcase size={18} /><strong>Recruiter</strong><span>Build your shortlist</span></button>
                </div>
              </div>
            )}
            <button className="btn btn-primary btn-lg full" type="submit" disabled={submitting}>
              {submitting ? 'Please wait...' : mode === 'login' ? 'Enter workspace →' : 'Create workspace →'}
            </button>
          </form>
        </Reveal>
      </section>

      <section id="features" className="marketing-section">
        <Reveal><h2>Everything important, in one focused workspace.</h2></Reveal>
        <div className="marketing-grid">
          {[
            { icon: Target, tone: 'violet', title: 'Smart job discovery', text: 'Open roles are separated from roles you have already applied to, so the candidate view stays actionable.' },
            { icon: Users, tone: 'pink', title: 'Job-scoped applicant review', text: 'Recruiters can open applicants for a specific role without mixing candidates from other jobs.' },
            { icon: Brain, tone: 'mint', title: 'Talent Radar AI', text: 'Review resume evidence, matching signals, gaps, and risk in one place, with a clear recommendation.' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 110}>
              <article className="feature-card lift">
                <div className={`feature-icon tone-card-${f.tone}`}><f.icon size={22} /></div>
                <strong>{f.title}</strong>
                <p>{f.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="workflow" className="marketing-section">
        <Reveal><h2>From role to decision, without the clutter.</h2></Reveal>
        <div className="workflow-row">
          {[
            { icon: Briefcase, title: 'Post a role', text: 'Recruiters create an open position with the context candidates need.' },
            { icon: CheckCircle2, title: 'Apply once', text: 'Candidates see only roles they can still apply to, with resume text for AI analysis.' },
            { icon: TrendingUp, title: 'Review by role', text: 'Recruiters open the applicant list for the selected job only, run AI, and decide.' },
          ].map((s, i) => (
            <Reveal key={s.title} delay={i * 110}>
              <div className="workflow-step lift">
                <span className="workflow-num">{i + 1}</span>
                <div className="workflow-icon"><s.icon size={20} /></div>
                <strong>{s.title}</strong>
                <p>{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="about" className="marketing-section about">
        <Reveal>
          <h2>Hiring signals that stay connected to the actual role.</h2>
          <p className="marketing-about">TalentRadar Connect brings job discovery, applications, resume review, and recruiter decisions into one workflow, keeping the candidate and recruiter experiences scoped to the work that matters. With Talent Radar AI, every application gets a structured read on fit, strengths, gaps, and risk, so decisions feel less like guesswork.</p>
        </Reveal>
        <div className="about-stats">
          <Reveal><div className="about-stat lift"><Zap size={20} /><strong>Instant AI analysis</strong><span>Score, strengths, gaps, and recommendation in one read.</span></div></Reveal>
          <Reveal delay={110}><div className="about-stat lift"><ShieldCheck size={20} /><strong>Scoped by role</strong><span>Applicants stay organized by job, never mixed across roles.</span></div></Reveal>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="brand"><div className="brand-mark"><Radar size={16} strokeWidth={2.5} /></div>TalentRadar</div>
        <p>Discover talent beyond keywords.</p>
      </footer>
    </div>
  )
}
