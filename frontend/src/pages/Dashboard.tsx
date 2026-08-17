// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Job {
  id: string
  repo_url: string
  status: string
  pr_url: string | null
  pr_status: string | null
  created_at: string
}

interface Step {
  step: number
  step_name: string
  status: string
}

interface GithubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  language: string | null
  pushed_at: string
  private: boolean
}

interface RepoInsight {
  vendors: string[]
  risk_level: 'low' | 'medium' | 'high'
  risk_reason: string
  suggested_action: string
  files_scanned: string[]
}

const PIPELINE_STEPS = ['detect', 'search', 'crawl', 'patch', 'pr']

const STATUS_CLASSES: Record<string, string> = {
  completed: 'bg-emerald-950 text-emerald-400 border border-emerald-900',
  running: 'bg-yellow-950 text-yellow-400 border border-yellow-900',
  queued: 'bg-zinc-900 text-zinc-500 border border-zinc-800',
  failed: 'bg-red-950 text-red-400 border border-red-900',
}

const PR_CLASSES: Record<string, string> = {
  merged: 'bg-purple-950 text-purple-400 border border-purple-900',
  open: 'bg-emerald-950 text-emerald-400 border border-emerald-900',
  closed: 'bg-zinc-900 text-zinc-500 border border-zinc-800',
}

const RISK_CLASSES: Record<string, string> = {
  low: 'bg-emerald-950 text-emerald-400 border border-emerald-900',
  medium: 'bg-yellow-950 text-yellow-400 border border-yellow-900',
  high: 'bg-red-950 text-red-400 border border-red-900',
}

const VENDOR_HEALTH: Record<string, { risk: string; color: string; breakingPerYear: number; lastChange: string; note: string }> = {
  stripe: { risk: 'medium', color: 'yellow', breakingPerYear: 2, lastChange: '3 months ago', note: 'Stripe releases breaking changes ~2x/year. Payment APIs are most affected.' },
  twilio: { risk: 'low', color: 'green', breakingPerYear: 1, lastChange: '8 months ago', note: 'Twilio is relatively stable. Voice and SMS APIs occasionally deprecate parameters.' },
  shopify: { risk: 'high', color: 'red', breakingPerYear: 4, lastChange: '2 weeks ago', note: 'Shopify Admin API versions deprecate every 12 months. High churn.' },
  plaid: { risk: 'medium', color: 'yellow', breakingPerYear: 2, lastChange: '5 months ago', note: 'Plaid migrated to versioned endpoints. Link token flow changes frequently.' },
  sendgrid: { risk: 'low', color: 'green', breakingPerYear: 1, lastChange: '1 year ago', note: 'SendGrid v3 API is stable. Occasional template and suppression list changes.' },
}

function StatusBadge({ status }: { status: string }) {
  const cls = `inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${STATUS_CLASSES[status] || 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`
  return <span className={cls}>{status}</span>
}

function PRBadge({ prStatus, prUrl }: { prStatus: string | null; prUrl: string | null }) {
  if (!prUrl) return <span className="text-zinc-700 text-xs font-mono">—</span>
  const label = (!prStatus || prStatus === 'unknown') ? 'open' : prStatus
  const cls = `inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${PR_CLASSES[label] || 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`
  return <a href={prUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className={cls}>{label}</a>
}

function StepChip({ name, status }: { name: string; status: string }) {
  const cls = status === 'done' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : status === 'running' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900 animate-pulse' : status === 'error' ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
  return <span className={`px-2 py-0.5 rounded text-xs font-mono ${cls}`}>{name}</span>
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

function buildChartData(jobs: Job[]) {
  const days: { label: string; date: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.toISOString().slice(0, 10) })
  }
  return days.map(({ label, date }) => ({ day: label, jobs: jobs.filter(j => j.created_at.slice(0, 10) === date).length }))
}

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const user = searchParams.get('user')
  const token = searchParams.get('token')

  const [authed, setAuthed] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [repoFilter, setRepoFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [runningSteps, setRunningSteps] = useState<Step[]>([])
  const [activeTab, setActiveTab] = useState<'jobs' | 'repos'>('jobs')

  // Repos tab state
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [reposError, setReposError] = useState('')
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null)
  const [insights, setInsights] = useState<Record<string, RepoInsight>>({})

  useEffect(() => {
    if (token) {
      localStorage.setItem('gh_token', token)
      localStorage.setItem('gh_user', user || '')
      setAuthed(true)
    } else if (localStorage.getItem('gh_token')) {
      setAuthed(true)
    }
  }, [token, user])

  const displayUser = user || localStorage.getItem('gh_user')
  const storedToken = token || localStorage.getItem('gh_token')
  const storedUser = user || localStorage.getItem('gh_user')

  useEffect(() => {
    if (!authed || !storedToken) return
    const fetchJobs = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/jobs`, { headers: { Authorization: `Bearer ${storedToken}:${storedUser}` } })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Failed to load jobs')
        setJobs(data.jobs || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [authed, storedToken, storedUser])

  const runningJob = jobs.find(j => j.status === 'running' || j.status === 'queued')

  useEffect(() => {
    if (!runningJob) { setRunningSteps([]); return }
    const pollSteps = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/jobs/${runningJob.id}`)
        const data = await res.json()
        if (res.ok) setRunningSteps(data.steps || [])
      } catch {}
    }
    pollSteps()
    const interval = setInterval(pollSteps, 2000)
    return () => clearInterval(interval)
  }, [runningJob?.id])

  // Fetch GitHub repos when Repos tab is opened
  useEffect(() => {
    if (activeTab !== 'repos' || !storedToken || githubRepos.length > 0) return
    const fetchRepos = async () => {
      setReposLoading(true)
      setReposError('')
      try {
        const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=pushed', { headers: { Authorization: `Bearer ${storedToken}` } })
        if (!res.ok) throw new Error('Failed to fetch repos from GitHub')
        const data = await res.json()
        setGithubRepos(data)
      } catch (e: any) {
        setReposError(e.message)
      } finally {
        setReposLoading(false)
      }
    }
    fetchRepos()
  }, [activeTab, storedToken])

  const analyzeRepo = async (repoUrl: string) => {
    if (!storedToken) return
    setAnalyzingRepo(repoUrl)
    try {
      const res = await fetch(`${API_URL}/api/v1/repos/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo_url: repoUrl, github_token: storedToken }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Analysis failed')
      setInsights(prev => ({ ...prev, [repoUrl]: data.analysis }))
    } catch (e: any) {
      setReposError(e.message)
    } finally {
      setAnalyzingRepo(null)
    }
  }

  const completedJobs = jobs.filter(j => j.status === 'completed')
  const mergedPRs = jobs.filter(j => j.pr_status === 'merged').length
  const successRate = jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0
  const timeSaved = `~${Math.round(completedJobs.length * 0.5)}h`
  const repos = Array.from(new Set(jobs.map(j => j.repo_url.replace('https://github.com/', ''))))
  const chartData = buildChartData(jobs)

  const filtered = jobs.filter(j => {
    const repoMatch = repoFilter === 'all' || j.repo_url.includes(repoFilter)
    const statusMatch = statusFilter === 'all' || j.status === statusFilter
    return repoMatch && statusMatch
  })

  const getStepStatus = (name: string) => runningSteps.find(s => s.step_name === name)?.status || 'pending'

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">You are not logged in</h1>
        <a href="/" className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-3 rounded-lg transition">Go to Home</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-3 border-b border-zinc-900 bg-zinc-950 sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <span className="text-sm font-semibold text-emerald-400 tracking-wide">SelfHeal-API</span>
          <div className="flex items-center gap-1">
            <a href="/dashboard" className="text-xs px-3 py-1.5 rounded-md bg-zinc-900 text-white">Dashboard</a>
            <a href="/jobs/new" className="text-xs px-3 py-1.5 rounded-md text-zinc-500 hover:text-zinc-300 transition">New job</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {runningJob && <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs text-emerald-400 font-mono">agent running</span></div>}
          <span className="text-xs text-zinc-500"><span className="text-zinc-400 font-medium">{displayUser}</span></span>
          <button onClick={() => { localStorage.removeItem('gh_token'); localStorage.removeItem('gh_user'); window.location.href = '/' }} className="text-xs text-zinc-600 hover:text-red-400 transition">Logout</button>
        </div>
      </nav>

      <main className="flex flex-col px-8 py-8 gap-6 w-full">
        {error && <p className="text-red-400 text-sm bg-red-950 border border-red-900 px-4 py-3 rounded-lg">{error}</p>}

        <div className="grid grid-cols-4 gap-3">
          {[{ label: 'Jobs run', value: jobs.length.toString(), sub: 'all time', color: 'text-white' }, { label: 'PRs merged', value: mergedPRs.toString(), sub: `${jobs.length > 0 ? Math.round((mergedPRs / jobs.length) * 100) : 0}% merge rate`, color: 'text-purple-400' }, { label: 'Success rate', value: `${successRate}%`, sub: `${completedJobs.length} of ${jobs.length} jobs`, color: 'text-emerald-400' }, { label: 'Time saved', value: timeSaved, sub: 'est. at 30 min/fix', color: 'text-emerald-400' }].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">{s.label}</div>
              <div className={`text-4xl font-semibold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-zinc-600 mt-2">{s.sub}</div>
            </div>
          ))}
        </div>

        {runningJob && (
          <div className="bg-emerald-950 border border-emerald-900 rounded-xl px-5 py-3 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs text-emerald-400 font-medium">Agent running</span>
              <span className="text-xs text-emerald-700 font-mono truncate">{runningJob.repo_url.replace('https://github.com/', '')}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              {PIPELINE_STEPS.map(name => <StepChip key={name} name={name} status={getStepStatus(name)} />)}
            </div>
            <button onClick={() => navigate(`/jobs/${runningJob.id}`)} className="text-xs text-emerald-600 hover:text-emerald-400 transition ml-2 flex-shrink-0">View →</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-900">
          <button onClick={() => setActiveTab('jobs')} className={`text-xs px-4 py-2 font-medium transition border-b-2 -mb-px ${activeTab === 'jobs' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>Jobs</button>
          <button onClick={() => setActiveTab('repos')} className={`text-xs px-4 py-2 font-medium transition border-b-2 -mb-px ${activeTab === 'repos' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>Repos</button>
        </div>

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="flex flex-col gap-6">
            {jobs.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Jobs — last 7 days</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} barSize={24}>
                    <XAxis dataKey="day" tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12, color: '#d4d4d8' }} cursor={{ fill: '#27272a' }} />
                    <Bar dataKey="jobs" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-300">Recent jobs</h2>
                <div className="flex items-center gap-3">
                  <select value={repoFilter} onChange={e => setRepoFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-3 py-1.5 rounded-lg outline-none">
                    <option value="all">All repos</option>
                    {repos.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-3 py-1.5 rounded-lg outline-none">
                    <option value="all">All statuses</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="running">Running</option>
                  </select>
                  <a href="/jobs/new" className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs px-4 py-1.5 rounded-lg transition">+ New job</a>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-zinc-600 text-sm">Loading jobs...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 border border-zinc-900 rounded-xl">
                  <p className="text-zinc-500 text-sm">No jobs found</p>
                  <a href="/jobs/new" className="text-emerald-400 text-sm hover:text-emerald-300 transition">Run your first job →</a>
                </div>
              ) : (
                <div className="border border-zinc-900 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-900">
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-600 uppercase tracking-widest">Repo</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-600 uppercase tracking-widest">Job</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-600 uppercase tracking-widest">PR</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-600 uppercase tracking-widest">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((job, i) => (
                        <tr key={job.id} onClick={() => navigate(job.status === 'completed' ? `/jobs/${job.id}/result` : `/jobs/${job.id}`)} className={`cursor-pointer hover:bg-zinc-900 transition ${i !== filtered.length - 1 ? 'border-b border-zinc-900' : ''}`}>
                          <td className="px-5 py-3.5 font-mono text-xs text-zinc-400">{job.repo_url.replace('https://github.com/', '')}</td>
                          <td className="px-5 py-3.5"><StatusBadge status={job.status} /></td>
                          <td className="px-5 py-3.5"><PRBadge prStatus={job.pr_status} prUrl={job.pr_url} /></td>
                          <td className="px-5 py-3.5 text-xs text-zinc-600 font-mono">{timeAgo(job.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Repos Tab */}
        {activeTab === 'repos' && (
          <div className="flex flex-col gap-4">
            {reposError && <p className="text-red-400 text-sm bg-red-950 border border-red-900 px-4 py-3 rounded-lg">{reposError}</p>}
            {reposLoading ? (
              <div className="flex items-center justify-center py-20 text-zinc-600 text-sm">Fetching your repos...</div>
            ) : githubRepos.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-zinc-600 text-sm">No repos found</div>
            ) : (
              <div className="flex flex-col gap-3">
                {githubRepos.map(repo => {
                  const insight = insights[repo.html_url]
                  const isAnalyzing = analyzingRepo === repo.html_url
                  return (
                    <div key={repo.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <a href={repo.html_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-zinc-200 hover:text-emerald-400 transition">{repo.full_name}</a>
                            {repo.private && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">private</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-600 font-mono">
                            {repo.language && <span>{repo.language}</span>}
                            <span>pushed {timeAgo(repo.pushed_at)}</span>
                          </div>
                        </div>
                        <button onClick={() => analyzeRepo(repo.html_url)} disabled={isAnalyzing} className="text-xs px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">{isAnalyzing ? 'Analyzing...' : 'Analyze'}</button>
                      </div>

                      {insight && (
                        <div className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded font-mono border ${RISK_CLASSES[insight.risk_level]}`}>{insight.risk_level} risk</span>
                            {insight.vendors.map(v => <span key={v} className="text-xs px-2 py-0.5 rounded font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">{v}</span>)}
                          </div>
                          <p className="text-xs text-zinc-500">{insight.risk_reason}</p>
                          <p className="text-xs text-emerald-600">→ {insight.suggested_action}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-zinc-600">Scanned:</span>
                            {insight.files_scanned.map(f => <span key={f} className="text-xs font-mono text-zinc-500">{f}</span>)}
                          </div>

                          {insight.vendors.filter(v => VENDOR_HEALTH[v]).length > 0 && (
                            <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
                              <span className="text-xs text-zinc-600 uppercase tracking-widest">Vendor health</span>
                              {insight.vendors.filter(v => VENDOR_HEALTH[v]).map(v => {
                                const vh = VENDOR_HEALTH[v]
                                const riskCls = vh.risk === 'high' ? 'text-red-400' : vh.risk === 'medium' ? 'text-yellow-400' : 'text-emerald-400'
                                return (
                                  <div key={v} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-zinc-300 capitalize">{v}</span>
                                      <span className={`text-xs font-mono ${riskCls}`}>{vh.risk} risk</span>
                                      <span className="text-xs text-zinc-600 ml-auto">{vh.breakingPerYear}x breaking changes/year</span>
                                    </div>
                                    <p className="text-xs text-zinc-600">{vh.note}</p>
                                    <p className="text-xs text-zinc-700">Last change: {vh.lastChange}</p>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          <button onClick={() => navigate('/jobs/new')} className="self-start text-xs px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition">Run job on this repo →</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}