// frontend/src/pages/JobResult.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Job {
  id: string
  status: string
  repo_url: string
  pr_url: string | null
  patch_diff: string | null
  created_at: string
}

interface Step {
  step: number
  step_name: string
  status: string
  output: any
}

function DiffViewer({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 font-mono text-xs">
      <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-zinc-800">
        <span className="text-zinc-500">Patched code</span>
        <button onClick={() => navigator.clipboard.writeText(code)} className="text-zinc-600 hover:text-zinc-400 transition text-xs">Copy</button>
      </div>
      <div className="bg-zinc-950 overflow-x-auto max-h-80 overflow-y-auto">
        {lines.map((line, i) => {
          const isAdded = line.startsWith('+')
          const isRemoved = line.startsWith('-')
          const cls = isAdded ? 'bg-emerald-950/50 text-emerald-300' : isRemoved ? 'bg-red-950/50 text-red-300' : 'text-zinc-400'
          return (
            <div key={i} className={`flex ${cls}`}>
              <span className="w-10 text-right px-3 py-0.5 text-zinc-700 select-none flex-shrink-0 border-r border-zinc-900">{i + 1}</span>
              <span className="px-4 py-0.5 whitespace-pre">{line || ' '}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function JobResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState('')

  const storedUser = localStorage.getItem('gh_user')

  useEffect(() => {
    const loadJob = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/jobs/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail)
        setJob(data.job)
        setSteps(data.steps || [])
      } catch (e: any) { setError(e.message) }
    }
    loadJob()
  }, [id])

  const detectStep = steps.find(s => s.step_name === 'detect')
  const crawlStep = steps.find(s => s.step_name === 'crawl')
  const patchStep = steps.find(s => s.step_name === 'patch')

  const prUrl = job?.pr_url
  const patchDiff = job?.patch_diff || patchStep?.output?.patched_code || null

  const handleDownload = () => {
    if (!patchDiff) return
    const blob = new Blob([patchDiff], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selfheal-patch-${id?.slice(0, 8)}.py`
    a.click()
    URL.revokeObjectURL(url)
  }

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
          <div className="flex items-center gap-3">
            {prUrl && <a href={prUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition">⎇ View PR on GitHub</a>}
            {patchDiff && <button onClick={handleDownload} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition">↓ Download Patch</button>}
          </div>
        </div>

        <div className="flex flex-col gap-6 px-8 py-8 max-w-5xl w-full">
          {error && <p className="text-red-400 text-sm bg-red-950 border border-red-900 px-4 py-3 rounded-lg">{error}</p>}

          {job && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-white">Job Result</h1>
                {job && <p className="text-xs text-zinc-500 font-mono">{job.repo_url}</p>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Summary card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">Summary</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900 font-mono">Success</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">The API schema change was detected and the code has been successfully patched.</p>
                  <div className="flex flex-col gap-2 text-xs border-t border-zinc-800 pt-3">
                    {detectStep?.output?.endpoint && <div className="flex flex-col gap-0.5"><span className="text-zinc-600">Endpoint</span><span className="font-mono text-zinc-400 text-xs">{detectStep.output.endpoint}</span></div>}
                    {detectStep?.output?.vendor && <div className="flex flex-col gap-0.5"><span className="text-zinc-600">Vendor</span><span className="font-mono text-zinc-400">{detectStep.output.vendor}</span></div>}
                    {crawlStep?.output?.diff_summary && <div className="flex flex-col gap-0.5"><span className="text-zinc-600">Breaking changes</span><span className="text-zinc-400 leading-relaxed">{crawlStep.output.diff_summary}</span></div>}
                    {detectStep?.output?.failing_field && <div className="flex flex-col gap-0.5"><span className="text-zinc-600">Failing field</span><span className="font-mono text-red-400">{detectStep.output.failing_field}</span></div>}
                  </div>
                </div>

                {/* Patched code — spans 2 cols */}
                <div className="col-span-2 flex flex-col gap-3">
                  <span className="text-xs text-zinc-400 font-medium">Patched Code</span>
                  {patchDiff ? <DiffViewer code={patchDiff} /> : <div className="flex items-center justify-center h-40 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-600 text-sm">No patch data available</div>}
                </div>
              </div>

              {/* PR description */}
              {prUrl && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">PR Description</span>
                    <button onClick={() => navigator.clipboard.writeText(prUrl)} className="text-xs text-zinc-600 hover:text-zinc-400 transition">Copy link</button>
                  </div>
                  <div className="flex flex-col gap-2 text-xs text-zinc-500 font-mono">
                    <div className="flex flex-col gap-0.5"><span className="text-zinc-600">Branch</span><span className="text-zinc-400">selfheal/fix-{id?.slice(0, 8)}</span></div>
                    <div className="flex flex-col gap-0.5"><span className="text-zinc-600">PR</span><a href={prUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 transition">{prUrl}</a></div>
                    {crawlStep?.output?.migration_notes && <div className="flex flex-col gap-0.5"><span className="text-zinc-600">Migration notes</span><span className="text-zinc-400">{crawlStep.output.migration_notes}</span></div>}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                {prUrl && <a href={prUrl} target="_blank" rel="noreferrer" className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm transition">View PR on GitHub →</a>}
                <button onClick={() => navigate('/jobs/new')} className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-medium px-6 py-2.5 rounded-xl text-sm transition">Run Another Job</button>
                <button onClick={() => navigate('/dashboard')} className="text-zinc-600 hover:text-zinc-400 text-sm transition">← Back to Dashboard</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}