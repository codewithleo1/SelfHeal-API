import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

const API_URL = 'http://localhost:8000'

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

export default function JobResult() {
  const { id } = useParams()
  const [job, setJob] = useState<Job | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loadJob = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/jobs/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail)
        setJob(data.job)
        setSteps(data.steps)
      } catch (e: any) {
        setError(e.message)
      }
    }
    loadJob()
  }, [id])

  const detectStep = steps.find(s => s.step_name === 'detect')
  const crawlStep = steps.find(s => s.step_name === 'crawl')

  const prUrl = job ? job.pr_url : null
  const patchDiff = job ? job.patch_diff : null

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <a href="/dashboard" className="text-xl font-bold text-green-400">SelfHeal-API</a>
        <a href="/jobs/new" className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-lg transition text-sm">
          New Job
        </a>
      </nav>

      <main className="flex flex-col px-8 py-12 gap-8 max-w-3xl mx-auto w-full">
        {error && <p className="text-red-400">{error}</p>}

        {job && (
          <div className="flex flex-col gap-8">
            <div className="text-center">
              <div className="text-green-400 text-5xl mb-4">✓</div>
              <h1 className="text-3xl font-bold mb-2">Fix Applied</h1>
              <p className="text-gray-400">The agent patched your code and opened a GitHub PR</p>
            </div>

            {prUrl ? <a href={prUrl} target="_blank" rel="noreferrer" className="bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-4 rounded-xl text-lg transition text-center">View Pull Request on GitHub</a> : null}

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-2">
              <h2 className="font-semibold text-gray-300 mb-2">Job Details</h2>
              <div className="text-sm text-gray-400">
                <span className="text-gray-500">Repo: </span>{job.repo_url}
              </div>
              <div className="text-sm text-gray-400">
                <span className="text-gray-500">Status: </span>
                <span className="text-green-400">{job.status}</span>
              </div>
              <div className="text-sm text-gray-400">
                <span className="text-gray-500">Created: </span>
                {new Date(job.created_at).toLocaleString()}
              </div>
            </div>

            {detectStep && detectStep.output && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="font-semibold text-gray-300 mb-4">What broke</h2>
                <div className="flex flex-col gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Endpoint: </span>
                    <span className="font-mono text-yellow-400">{detectStep.output.endpoint}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Failing field: </span>
                    <span className="font-mono text-red-400">{detectStep.output.failing_field}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Vendor: </span>
                    <span>{detectStep.output.vendor}</span>
                  </div>
                </div>
              </div>
            )}

            {crawlStep && crawlStep.output && crawlStep.output.diff_summary && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="font-semibold text-gray-300 mb-4">What changed in the API</h2>
                <p className="text-sm text-gray-400">{crawlStep.output.diff_summary}</p>
                {crawlStep.output.migration_notes && (
                  <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Migration notes</p>
                    <p className="text-sm text-gray-300">{crawlStep.output.migration_notes}</p>
                  </div>
                )}
              </div>
            )}

            {patchDiff && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="font-semibold text-gray-300 mb-4">Patched Code</h2>
                <pre className="text-sm text-green-300 font-mono overflow-x-auto whitespace-pre-wrap">
                  {patchDiff}
                </pre>
              </div>
            )}

            
              <a href="/jobs/new" className="border border-gray-700 hover:border-gray-500 text-white font-semibold px-8 py-3 rounded-xl transition text-center">
              Run Another Job
            </a>
          </div>
        )}
      </main>
    </div>
  )
}