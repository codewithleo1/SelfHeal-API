import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const user = searchParams.get('user')
  const token = searchParams.get('token')
  const [authed, setAuthed] = useState(false)

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

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">You are not logged in</h1>
        <a href="/" className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-3 rounded-lg transition">
          Go to Home
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <span className="text-xl font-bold text-green-400">SelfHeal-API</span>
        <span className="text-gray-400 text-sm">
          Logged in as <span className="text-white font-semibold">{displayUser}</span>
        </span>
      </nav>
      <main className="flex flex-col items-center justify-center flex-1 px-8 gap-6">
        <h1 className="text-3xl font-bold">Welcome, {displayUser}!</h1>
        <p className="text-gray-400">Your jobs will appear here once you submit one.</p>
        <a href="/jobs/new" className="bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-3 rounded-lg text-lg transition">
          New Job
        </a>
      </main>
    </div>
  )
}
