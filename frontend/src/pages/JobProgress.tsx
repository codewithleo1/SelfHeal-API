// frontend/src/pages/JobProgress.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Step {
  step: number
  step_name: string
  status: string
  output: any
}

interface Job {
  id: string
  status: string
  repo_url: string
  pr_url: string | null
  created_at: string
}

const STEP_META: Record<string, { title: string; desc: string; icon: string }> = {
  detect: { title: 'Detect', desc: 'Extract error and endpoint from log', icon: '◎' },
  search: { title: 'Search', desc: 'Find broken file in repository', icon: '⌕' },
  crawl: { title: 'Crawl', desc: 'Compare API schema changes', icon: '⊕' },
  patch: { title: 'Patch', desc: 'Generate and validate code', icon: '</>' },
  pr: { title: 'PR', desc: 'Create Pull Request & notify', icon: '⎇' },
}

const ALL_STEPS = ['detect', 'search', 'crawl', 'patch', 'pr']

function StepNode({ name, status, index, isLast }: { name: string; status: string; index: number; isLast: boolean }) {
  const meta = STEP_META[name]
  const isDone = status === 'done'
  const isRunning = status === 'running'
  const isError = status === 'error'
  const isPending = !isDone && !isRunning && !isError

  const circleCls = isDone ? 'bg-emerald-500 border-emerald-500' : isRunning ? 'bg-yellow-500 border-yellow-500 animate-pulse' : isError ? 'bg-red-500 border-red-500' : 'bg-zinc-900 border-zinc-700'
  const iconCls = isDone || isRunning || isError ? 'text-white' : 'text-zinc-600'
  const titleCls = isDone ? 'text-white' : isRunning ? 'text-yellow-400' : isError ? 'text-red-400' : 'text-zinc-500'
  const lineCls = isDone ? 'bg-emerald-500' : 'bg-zinc-800'

  return (
    <div className="flex flex-col items-center" style={{ flex: 1 }}>
      <div className="flex items-center w-full">
        {index > 0 && <div className={`flex-1 h-0.5 ${isDone ? 'bg-emerald-500' : 'bg-zinc-800'} transition-all`} />}
        <div className={`w-10 h-10 rounded-full border-2 ${circleCls} flex items-center justify-center flex-shrink-0 transition-all`}>
          {isDone ? <span className="text-white text-sm">✓</span> : isRunning ? <span className="text-white text-xs animate-spin">◌</span> : isError ? <span className="text-white text-sm">✗</span> : <span className={`text-xs font-mono ${iconCls}`}>0{index + 1}</span>}
        </div>
        {!isLast && <div className={`flex-1 h-0.5 ${lineCls} transition-all`} />}
      </div>
      <div className="flex flex-col items-center gap-0.5 mt-3 px-2 text-center">
        <span className={`text-xs font-semibold ${titleCls} transition-all`}>{meta.title}</span>
        <span className="text-xs text-zinc-600">{meta.desc}</span>
      </div>
    </div>
  )
}

export default function JobProgress() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const storedUser = localStorage.getItem('gh_user')

  const getStepStatus = (name: string) => steps.find(s => s.step_name === name)?.status || 'pending'

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/jobs/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail)
        setJob(data.job)
        setSteps(data.steps || [])

        const newLogs: string[] = (data.steps || []).filter((s: Step) => s.status === 'done' || s.status === 'running' || s.status === 'error').map((s: Step) => {
          const time = new Date().toLocaleTimeString('en-US', { hour12: false })
          if (s.status === 'done') return `[${time}] ${s.step_name} step completed`
          if (s.status === 'running') return `[${time}] ${s.step_name} step running...`
          return `[${time}] ${s.step_name} step failed`
        })
        setLogs(newLogs)

        if (data.job.status === 'completed') setTimeout(() => navigate(`/jobs/${id}/result`), 1500)
      } catch (e: any) { setError(e.message) }
    }
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [id, navigate])

  const completedCount = ALL_STEPS.filter(n => getStepStatus(n) === 'done').length
  const progressPct = Math.round((completedCount / ALL_STEPS.length) * 100)

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar user={storedUser} />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-900">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <button onClick={() => navigate('/dashboard')} className="hover:text-zinc-300 transition">Dashboard</button>
            <span>›</span>
            <span>Jobs</span>
            <span>›</span>
            <span className="text-zinc-300 font-mono">{id?.slice(0, 8)}...</span>
          </div>
          {job?.status === 'completed' && <span className="text-xs text-emerald-400 font-medium">Completed in 48s</span>}
        </div>

        <div className="flex flex-col gap-8 px-8 py-8 max-w-4xl w-full">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-white">Job Progress</h1>
            {job && <p className="text-xs text-zinc-500 font-mono">{job.repo_url}</p>}
          </div>

          {error && <p className="text-red-400 text-sm bg-red-950 border border-red-900 px-4 py-3 rounded-lg">{error}</p>}

          {/* Step timeline */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <div className="flex items-start w-full">
              {ALL_STEPS.map((name, i) => <StepNode key={name} name={name} status={getStepStatus(name)} index={i} isLast={i === ALL_STEPS.length - 1} />)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Overall progress</span>
              <span className="text-xs text-zinc-400 font-mono">{completedCount} / {ALL_STEPS.length} steps</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Live logs */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-zinc-400 font-medium">Live Logs</span>
              </div>
              <div className="flex flex-col gap-1.5 font-mono text-xs min-h-32">
                {logs.length === 0 ? <span className="text-zinc-700">Waiting for agent...</span> : logs.map((log, i) => <span key={i} className={log.includes('failed') ? 'text-red-400' : log.includes('running') ? 'text-yellow-400' : 'text-emerald-400'}>{log}</span>)}
              </div>
            </div>

            {/* Job details */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
              <span className="text-xs text-zinc-400 font-medium">Job Details</span>
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex flex-col gap-0.5"><span className="text-zinc-600">Job ID</span><span className="font-mono text-zinc-400">{id}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-zinc-600">Repository</span><span className="font-mono text-zinc-400 break-all">{job?.repo_url.replace('https://github.com/', '')}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-zinc-600">Status</span><span className={`font-mono ${job?.status === 'completed' ? 'text-emerald-400' : job?.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>{job?.status || '—'}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-zinc-600">Started</span><span className="font-mono text-zinc-400">{job ? new Date(job.created_at).toLocaleString() : '—'}</span></div>
              </div>
            </div>
          </div>

          {job?.status === 'completed' && <p className="text-emerald-400 text-sm font-medium text-center">All steps complete — redirecting to result...</p>}
          {job?.status === 'failed' && (
            <div className="text-center flex flex-col gap-3">
              <p className="text-red-400 text-sm font-medium">Agent encountered an error.</p>
              <button onClick={() => navigate('/jobs/new')} className="self-center bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-2 rounded-lg transition text-sm">Try Again</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}