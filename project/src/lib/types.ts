export type UserRole = 'candidate' | 'recruiter'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  created_at: string
}

export interface Job {
  id: string
  recruiter_id: string
  company_name: string
  role: string
  description: string
  is_open: boolean
  created_at: string
  application_count?: number
}

export type ApplicationStatus = 'new' | 'reviewing' | 'selected' | 'rejected'

export interface Application {
  id: string
  job_id: string
  candidate_id: string
  candidate_name: string
  candidate_email: string
  resume_name: string | null
  resume_data: string | null
  resume_text: string | null
  status: ApplicationStatus
  semantic_score: number | null
  risk_level: string | null
  reasoning: string | null
  recommendation: string | null
  strengths: string[] | null
  gaps: string[] | null
  decision_message: string | null
  applied_at: string
  company_name?: string
  job_role?: string
  job_description?: string
  is_open?: boolean
}
