import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth'
import type { Application, Job } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function getToken() { return localStorage.getItem('talentradar_token') }

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getToken()
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.message || `Request failed with status ${response.status}`)
  return data
}

export function useJobs() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    if (!profile) { setJobs([]); setLoading(false); return }
    try {
      setLoading(true)
      const data = await apiRequest('/api/jobs')
      setJobs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
    } finally { setLoading(false) }
  }, [profile])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const createJob = useCallback(async (companyName: string, role: string, description: string) => {
    const data = await apiRequest('/api/jobs', { method: 'POST', body: JSON.stringify({ company_name: companyName, role, description }) })
    const newJob = { ...data, application_count: 0 } as Job
    setJobs(prev => [newJob, ...prev])
    return newJob
  }, [])

  const toggleJobStatus = useCallback(async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return
    const data = await apiRequest(`/api/jobs/${jobId}/status`, { method: 'PATCH', body: JSON.stringify({ is_open: !job.is_open }) })
    const updated = data.job || data
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updated } : j))
  }, [jobs])

  const deleteJob = useCallback(async (jobId: string) => {
    await apiRequest(`/api/jobs/${jobId}`, { method: 'DELETE' })
    setJobs(prev => prev.filter(j => j.id !== jobId))
  }, [])

  return { jobs, loading, fetchJobs, createJob, toggleJobStatus, deleteJob }
}

export function useApplications(selectedJobId: string | null) {
  const { profile } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  const fetchApplications = useCallback(async () => {
    if (!profile) { setApplications([]); setLoading(false); return }
    try {
      setLoading(true)
      let endpoint = '/api/applications'
      if (profile.role === 'recruiter' && selectedJobId) endpoint += `?jobId=${encodeURIComponent(selectedJobId)}`
      const data = await apiRequest(endpoint)
      setApplications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching applications:', error)
      setApplications([])
    } finally { setLoading(false) }
  }, [profile, selectedJobId])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  const submitApplication = useCallback(async (jobId: string, candidateName: string, candidateEmail: string, resumeName: string, resumeData: string, resumeText: string, job?: Job) => {
    if (!profile) throw new Error('Not authenticated')
    const data = await apiRequest('/api/applications', { method: 'POST', body: JSON.stringify({ job_id: jobId, candidate_name: candidateName, candidate_email: candidateEmail, resume_name: resumeName, resume_data: resumeData, resume_text: resumeText }) })
    // The INSERT response has no joined job columns; add them so the new card shows role + company immediately.
    const application = { ...(data.application || data), ...(job ? { company_name: job.company_name, job_role: job.role, job_description: job.description, is_open: job.is_open } : {}) }
    setApplications(prev => [application, ...prev])
    return application as Application
  }, [profile])

  // Server-side AI analysis (sentence-transformer service). Score is computed on the backend.
  const analyzeOnServer = useCallback(async (applicationId: string) => {
    const data = await apiRequest(`/api/applications/${applicationId}/analyze`, { method: 'POST' })
    setApplications(prev => prev.map(a => a.id === applicationId ? { ...a, ...data.application } : a))
    return data.result as {
      semanticScore: number; riskLevel: 'Low' | 'Moderate' | 'High'
      reasoning: string; recommendation: string; strengths: string[]; gaps: string[]
    }
  }, [])

  const decideApplication = useCallback(async (applicationId: string, status: 'selected' | 'rejected', message: string) => {
    const data = await apiRequest(`/api/applications/${applicationId}/decision`, { method: 'PATCH', body: JSON.stringify({ status, message }) })
    const updated = data.application || data
    setApplications(prev => prev.map(a => a.id === applicationId ? { ...a, ...updated } : a))
    return updated as Application
  }, [])

  return { applications, loading, fetchApplications, submitApplication, analyzeOnServer, decideApplication }
}
