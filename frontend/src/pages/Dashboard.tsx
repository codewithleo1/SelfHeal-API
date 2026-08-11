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

const STATUS_CLASSES: Record<string, string> = {
  completed: 'bg-green-900 text-green-400',
  running: 'bg-yellow-900 text-yellow-400',
  queued: 'bg-gray-800 text-gray-400',
  failed: 'bg-red-900 text-red-400',
}

const PR_CLASSES: Record<string, string> = {
  merged: 'bg-purple-900 text-purple-300',
  open: 'bg-green-900 text-green-400',
  closed: 'bg-gray-800 text-gray-400',
}

function StatusBadge({ status }: { status: string }) {
  const cls = `px-2 py-0.5 rounded text-xs font-mono ${STATUS_CLASSES[status] || 'bg-gray-800 text-gray-400'}`
  return <span className={cls}>{status}</span>
}

function PRBadge({ prStatus, prUrl }: { prStatus: string | null; prUrl: string | null }) {
  if (!prUrl) return <span className="text-gray-600 text-xs">—</span>
  const label = prStatus || 'open'
  const cls = `px-2 py-0.5 rounded text-xs font-mono ${PR_CLASSES[label] || 'bg-gray-800 text-gray-400'}`
  return <a href={prUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className={cls}>{label}</a>
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
  }, [authed, storedToken, storedUser])

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">You are not logged in</h1>
        <a href="/" className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-3 rounded-lg transition">Go to Home</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <span className="text-xl font-bold text-green-400">SelfHeal-API</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">Logged in as <span className="text-white font-semibold">{displayUser}</span></span>
          <button onClick={() => { localStorage.removeItem('gh_token'); localStorage.removeItem('gh_user'); window.location.href = '/' }} className="text-sm text-gray-500 hover:text-red-400 transition">Logout</button>
        </div>
      </nav>
      <main className="flex flex-col px-8 py-10 gap-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Jobs</h1>
          <a href="/jobs/new" className="bg-green-500 hover:bg-green-400 text-black font-bold px-5 py-2 rounded-lg transition text-sm">New Job</a>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {loading ? (
          <p className="text-gray-500 text-sm">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <p className="text-gray-400">No jobs yet.</p>
            <a href="/jobs/new" className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-2 rounded-lg transition">Run your first job</a>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Repo</th>
                  <th className="text-left px-4 py-3">Job Status</th>
                  <th className="text-left px-4 py-3">PR Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} onClick={() => navigate(`/jobs/${job.id}/result`)} className="border-b border-gray-800 hover:bg-gray-900 cursor-pointer transition">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(job.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono max-w-xs truncate">{job.repo_url.replace('https://github.com/', '')}</td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3"><PRBadge prStatus={job.pr_status} prUrl={job.pr_url} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}