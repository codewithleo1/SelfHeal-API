// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

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
  const cls = status === 'done'
    ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
    : status === 'running'
    ? 'bg-yellow-950 text-yellow-400 border border-yellow-900 animate-pulse'
    : status === 'error'
    ? 'bg-red-950 text-red-400 border border-red-900'
    : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
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

  const completedJobs = jobs.filter(j => j.status === 'completed')
  const mergedPRs = jobs.filter(j => j.pr_status === 'merged').length
  const successRate = jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0
  const timeSaved = `~${Math.round(completedJobs.length * 0.5)}h`

  const repos = Array.from(new Set(jobs.map(j => j.repo_url.replace('https://github.com/', ''))))

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
          <span className="text-xs text-zinc-500">
            <span className="text-zinc-400 font-medium">{displayUser}</span>
          </span>
          <button onClick={() => { localStorage.removeItem('gh_token'); localStorage.removeItem('gh_user'); window.location.href = '/' }} className="text-xs text-zinc-600 hover:text-red-400 transition">Logout</button>
        </div>
      </nav>

      <main className="flex flex-col px-8 py-8 gap-6 w-full">
        {error && <p className="text-red-400 text-sm bg-red-950 border border-red-900 px-4 py-3 rounded-lg">{error}</p>}

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Jobs run', value: jobs.length.toString(), sub: 'all time', color: 'text-white' },
            { label: 'PRs merged', value: mergedPRs.toString(), sub: `${jobs.length > 0 ? Math.round((mergedPRs / jobs.length) * 100) : 0}% merge rate`, color: 'text-purple-400' },
            { label: 'Success rate', value: `${successRate}%`, sub: `${completedJobs.length} of ${jobs.length} jobs`, color: 'text-emerald-400' },
            { label: 'Time saved', value: timeSaved, sub: 'est. at 30 min/fix', color: 'text-emerald-400' },
          ].map(s => (
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
      </main>
    </div>
  )
}