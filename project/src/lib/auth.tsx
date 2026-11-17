import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Profile, UserRole } from './types'

export interface Session {
  access_token: string
  user: { id: string; email: string }
}

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function clearStoredAuth() {
  localStorage.removeItem('talentradar_token')
  localStorage.removeItem('talentradar_user')
  localStorage.removeItem('talentradar_profile')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('talentradar_token')
    const rawUser = localStorage.getItem('talentradar_user')
    const rawProfile = localStorage.getItem('talentradar_profile')
    if (token && rawUser && rawProfile) {
      try {
        const user = JSON.parse(rawUser)
        const savedProfile = JSON.parse(rawProfile) as Profile
        setSession({ access_token: token, user: { id: user.id, email: user.email } })
        setProfile(savedProfile)
      } catch {
        clearStoredAuth()
      }
    }
    setLoading(false)
  }, [])

  const saveAuth = (token: string, user: { id: string; email: string; full_name: string; role: UserRole; created_at?: string }) => {
    const userProfile: Profile = {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at || new Date().toISOString(),
    }
    localStorage.setItem('talentradar_token', token)
    localStorage.setItem('talentradar_user', JSON.stringify(user))
    localStorage.setItem('talentradar_profile', JSON.stringify(userProfile))
    setSession({ access_token: token, user: { id: user.id, email: user.email } })
    setProfile(userProfile)
  }

  const signIn = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.message || 'Login failed')
    if (!data?.token || !data?.user) throw new Error('Invalid login response from server')
    saveAuth(data.token, data.user)
  }

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, full_name: fullName.trim(), role }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.message || 'Sign-up failed')
    if (!data?.token || !data?.user) throw new Error('Invalid signup response from server')
    saveAuth(data.token, data.user)
  }

  const signOut = async () => {
    clearStoredAuth()
    setSession(null)
    setProfile(null)
  }

  return <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
