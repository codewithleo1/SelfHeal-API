// frontend/src/pages/NewJob.tsx
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const EXAMPLE_LOG = `POST /v1/payment_intents 400 Bad Request
{
  "error": {
    "type": "invalid_request_error",
    "message": "Unknown field: amount. Did you mean amount_total?"
  }
}`

export default function NewJob() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    repo_url: searchParams.get('repo') || '',
    error_log: '',
  })

  const token = localStorage.getItem('gh_token')
  const user = localStorage.getItem('gh_user')

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center gap-4 flex flex-col">
          <p className="text-zinc-400">You need to log in first.</p>
          <a href="/" className="text-emerald-400 hover:text-emerald-300 transition">Go to Home →</a>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.repo_url || !form.error_log) { setError('Both fields are required.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}:${user}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to create job')
      navigate(`/jobs/${data.job_id}`)
    } catch (e: any) { setError(e.message); setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar user={user} />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-900">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <button onClick={() => navigate('/dashboard')} className="hover:text-zinc-300 transition">Dashboard</button>
            <span>›</span>
            <span className="text-zinc-300">New Job</span>
          </div>
        </div>

        <div className="flex flex-col gap-8 px-8 py-8 max-w-2xl w-full">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold text-white">New Remediation Job</h1>
            <p className="text-sm text-zinc-500">Paste your error log and repo URL. The agent will automatically find the broken file and function.</p>
          </div>

          <div className="flex flex-col gap-5">
            {/* Repo URL */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">GitHub Repo URL</label>
              <input className="bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700" placeholder="https://github.com/your-org/your-repo" value={form.repo_url} onChange={e => setForm({ ...form, repo_url: e.target.value })} />
            </div>

            {/* Error log */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Error Log</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-yellow-600">Remove sensitive data before pasting</span>
                  <button onClick={() => setForm({ ...form, error_log: EXAMPLE_LOG })} className="text-xs text-zinc-600 hover:text-zinc-400 transition">Use example</button>
                </div>
              </div>
              <textarea className="bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition font-mono resize-none h-52 placeholder:text-zinc-700" placeholder="Paste your API error log here..." value={form.error_log} onChange={e => setForm({ ...form, error_log: e.target.value })} />
            </div>

            {error && <p className="text-red-400 text-sm bg-red-950 border border-red-900 px-4 py-3 rounded-xl">{error}</p>}

            <button onClick={handleSubmit} disabled={loading} className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold px-8 py-3.5 rounded-xl text-sm transition">
              {loading ? 'Submitting...' : 'Run Agent →'}
            </button>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-3 gap-3 border-t border-zinc-900 pt-6">
            {[{ icon: '⚡', title: 'Automatic', desc: 'Agent finds the broken file automatically' }, { icon: '🔒', title: 'Safe', desc: 'No code is executed server-side' }, { icon: '⎇', title: 'PR Ready', desc: 'Opens a GitHub PR with full explanation' }].map(c => (
              <div key={c.title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-lg">{c.icon}</span>
                <span className="text-xs font-semibold text-zinc-300">{c.title}</span>
                <span className="text-xs text-zinc-600">{c.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}