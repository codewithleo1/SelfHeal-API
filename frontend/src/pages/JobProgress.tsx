import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:8000'

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
}

const STEP_LABELS: Record<string, string> = {
  detect: 'Analyzing error log',
  crawl: 'Fetching API spec',
  patch: 'Rewriting broken function',
  pr: 'Opening GitHub PR',
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'done') return <span className="text-green-400">✓</span>
  if (status === 'running') return <span className="text-yellow-400 animate-pulse">●</span>
  if (status === 'error') return <span className="text-red-400">✗</span>
  return <span className="text-gray-600">○</span>
}

export default function JobProgress() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/jobs/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail)
        setJob(data.job)
        setSteps(data.steps)

        if (data.job.status === 'completed') {
          setTimeout(() => navigate(`/jobs/${id}/result`), 1500)
        }
      } catch (e: any) {
        setError(e.message)
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [id, navigate])

  const allStepNames = ['detect', 'crawl', 'patch', 'pr']

  const getStepStatus = (name: string) => {
    const step = steps.find(s => s.step_name === name)
    return step?.status || 'pending'
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <a href="/dashboard" className="text-xl font-bold text-green-400">SelfHeal-API</a>
        <span className="text-gray-400 text-sm">Job {id?.slice(0, 8)}...</span>
      </nav>

      <main className="flex flex-col items-center px-8 py-12 gap-8 max-w-2xl mx-auto w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Agent Running</h1>
          <p className="text-gray-400">The agent is analyzing and fixing your API drift</p>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        <div className="w-full flex flex-col gap-4">
          {allStepNames.map((name, i) => {
            const status = getStepStatus(name)
            return (
              <div key={name} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                <div className="text-2xl w-8 text-center">
                  <StatusIcon status={status} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-xs font-mono">0{i + 1}</span>
                    <span className="font-semibold">{STEP_LABELS[name]}</span>
                  </div>
                  <div className="text-gray-500 text-sm capitalize">{status}</div>
                </div>
              </div>
            )
          })}
        </div>

        {job?.status === 'completed' && (
          <p className="text-green-400 font-semibold">All steps complete! Redirecting...</p>
        )}

        {job?.status === 'failed' && (
          <div className="text-center">
            <p className="text-red-400 font-semibold mb-4">Agent encountered an error.</p>
            <a href="/jobs/new" className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-2 rounded-lg transition">
              Try Again
            </a>
          </div>
        )}
      </main>
    </div>
  )
}