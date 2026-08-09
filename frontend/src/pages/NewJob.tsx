// frontend/src/pages/NewJob.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function NewJob() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    repo_url: '',
    error_log: '',
  })

  const token = localStorage.getItem('gh_token')
  const user = localStorage.getItem('gh_user')

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center gap-4 flex flex-col">
          <p className="text-gray-400">You need to log in first.</p>
          <a href="/" className="text-green-400 underline">Go to Home</a>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.repo_url || !form.error_log) {
      setError('Both fields are required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}:${user}`,
        },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to create job')
      navigate(`/jobs/${data.job_id}`)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <a href="/dashboard" className="text-xl font-bold text-green-400">SelfHeal-API</a>
        <span className="text-gray-400 text-sm">{user}</span>
      </nav>

      <main className="flex flex-col items-center px-8 py-12 gap-6 max-w-2xl mx-auto w-full">
        <div className="w-full flex flex-col gap-2">
          <h1 className="text-3xl font-bold">New Remediation Job</h1>
          <p className="text-gray-400 text-sm">
            Paste your error log and repo URL. The agent will automatically find the broken file and function.
          </p>
        </div>

        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">GitHub Repo URL</label>
            <input
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
              placeholder="https://github.com/your-org/your-repo"
              value={form.repo_url}
              onChange={e => setForm({ ...form, repo_url: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">
              Error Log
              <span className="text-yellow-500 ml-2 text-xs">Remove any sensitive data before pasting</span>
            </label>
            <textarea
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 font-mono text-sm h-48 resize-none"
              placeholder="Paste your API error log here..."
              value={form.error_log}
              onChange={e => setForm({ ...form, error_log: e.target.value })}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold px-8 py-3 rounded-lg text-lg transition"
          >
            {loading ? 'Submitting...' : 'Run Agent'}
          </button>
        </div>
      </main>
    </div>
  )
}