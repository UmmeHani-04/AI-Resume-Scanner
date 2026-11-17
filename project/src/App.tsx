import { useAuth } from './lib/auth'
import { LandingPage } from './screens/LandingPage'
import { AppShell } from './screens/AppShell'

export function App() {
  const { session, profile, loading } = useAuth()

  return (
    <>
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      {loading ? (
        <div className="app-loader"><div className="loader-pulse" /><p>TalentRadar</p></div>
      ) : !session || !profile ? <LandingPage /> : <AppShell />}
    </>
  )
}
