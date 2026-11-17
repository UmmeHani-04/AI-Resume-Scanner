import type { Application, Job } from './types'

export interface AnalysisResult {
  semanticScore: number
  riskLevel: 'Low' | 'Moderate' | 'High'
  reasoning: string
  recommendation: string
  strengths: string[]
  gaps: string[]
}

const SKILL_KEYWORDS: Record<string, string[]> = {
  technical: ['javascript', 'typescript', 'python', 'react', 'node', 'java', 'c++', 'go', 'rust', 'sql', 'postgres', 'mongodb', 'aws', 'docker', 'kubernetes', 'graphql', 'rest', 'api', 'git', 'ci/cd', 'jenkins', 'terraform', 'linux', 'bash', 'shell', 'html', 'css', 'tailwind', 'sass', 'vue', 'angular', 'svelte', 'next.js', 'express', 'django', 'flask', 'spring', 'rails', 'laravel', 'php', 'swift', 'kotlin', 'flutter', 'react native', 'elasticsearch', 'redis', 'kafka', 'rabbitmq', 'microservices', 'serverless', 'lambda'],
  design: ['figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'xd', 'prototyping', 'wireframing', 'user research', 'ux', 'ui', 'design system', 'accessibility', 'responsive', 'motion design', 'after effects', 'indesign', 'branding', 'typography', 'color theory'],
  product: ['product management', 'roadmap', 'agile', 'scrum', 'kanban', 'jira', 'stakeholder', 'user stories', 'backlog', 'sprint', 'okrs', 'kpis', 'analytics', 'a/b testing', 'conversion', 'funnel', 'retention', 'churn', 'growth', 'go-to-market', 'positioning'],
  data: ['data analysis', 'machine learning', 'ai', 'nlp', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn', 'tableau', 'power bi', 'looker', 'data warehouse', 'etl', 'spark', 'hadoop', 'airflow', 'dbt', 'snowflake', 'bigquery'],
  marketing: ['seo', 'sem', 'content marketing', 'social media', 'email marketing', 'marketing automation', 'hubspot', 'salesforce', 'google analytics', 'google ads', 'facebook ads', 'copywriting', 'brand strategy', 'campaign management', 'lead generation'],
  soft: ['leadership', 'communication', 'collaboration', 'problem solving', 'critical thinking', 'project management', 'team lead', 'mentorship', 'presentation', 'negotiation', 'stakeholder management', 'cross-functional', 'remote work', 'agile coaching'],
}

export function extractKeywords(text: string): Set<string> {
  const lower = text.toLowerCase()
  const found = new Set<string>()
  for (const skills of Object.values(SKILL_KEYWORDS)) {
    for (const skill of skills) {
      if (lower.includes(skill)) found.add(skill)
    }
  }
  return found
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[\s,;:|•\-\n\r()]+/).filter((w) => w.length > 2)
}

export function analyzeApplication(job: Job, application: Application): AnalysisResult {
  const jobText = `${job.role} ${job.description}`.toLowerCase()
  const resumeText = (application.resume_text || application.resume_name || '').toLowerCase()

  const jobKeywords = extractKeywords(jobText)
  const resumeKeywords = extractKeywords(resumeText)

  const matched = [...jobKeywords].filter((k) => resumeKeywords.has(k))
  const missing = [...jobKeywords].filter((k) => !resumeKeywords.has(k))

  const jobTokens = new Set(tokenize(jobText))
  const resumeTokens = new Set(tokenize(resumeText))
  const sharedTokens = [...jobTokens].filter((t) => resumeTokens.has(t))
  const tokenOverlap = jobTokens.size > 0 ? sharedTokens.length / jobTokens.size : 0

  const keywordRatio = jobKeywords.size > 0 ? matched.length / jobKeywords.size : 0
  const semanticScore = Math.round(Math.min(100, (tokenOverlap * 0.55 + keywordRatio * 0.45) * 100))

  let riskLevel: AnalysisResult['riskLevel'] = 'Low'
  if (semanticScore < 35) riskLevel = 'High'
  else if (semanticScore < 60) riskLevel = 'Moderate'

  const strengths = matched.slice(0, 6)
  const gaps = missing.slice(0, 5)

  let reasoning: string
  if (semanticScore >= 75) {
    reasoning = `Strong overall alignment with the ${job.role} role. The candidate's resume demonstrates direct experience with ${matched.slice(0, 3).join(', ')}, which are central to this position. Their background maps well to the core responsibilities described in the job brief.`
  } else if (semanticScore >= 50) {
    reasoning = `Moderate fit for the ${job.role} role. The candidate shows relevant experience in ${matched.slice(0, 2).join(', ') || 'related areas'}, but there are meaningful gaps that may require ramp-up time. The foundation is solid, though not a turnkey match.`
  } else if (semanticScore >= 25) {
    reasoning = `Limited keyword overlap with the ${job.role} requirements. The resume surfaces some transferable skills, but the specific experience this role demands is not clearly evidenced. Consider whether adjacent strengths compensate.`
  } else {
    reasoning = `Minimal detectable alignment with the ${job.role} role. The resume does not surface the core skills or domain experience described in the job brief. This may indicate a career pivot or a mismatch in the application.`
  }

  let recommendation: string
  if (riskLevel === 'Low') {
    recommendation = 'Advance to interview — the profile aligns well with the role requirements.'
  } else if (riskLevel === 'Moderate') {
    recommendation = 'Consider a screening call to probe depth in the gap areas before committing to a full loop.'
  } else {
    recommendation = 'Deprioritize unless other signals (portfolio, referrals, cover letter) materially change the picture.'
  }

  return { semanticScore, riskLevel, reasoning, recommendation, strengths, gaps }
}
