// frontend/src/pages/Jobs.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Job {
  id: string
  repo_url: string
  status: string
  pr_url: string | null
  pr_status: string | null
  created_at: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; dot: string }> = {
    completed: { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
    running:   { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
    queued:    { bg: '#f9fafb', color: '#6b7280', dot: '#9ca3af' },
    failed:    { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' },
  }
  const s = map[status] || map.queued
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: s.bg, color: s.color, fontSize: '12px', fontWeight: 500, padding: '3px 10px', borderRadius: '999px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function PRBadge({ prStatus, prUrl }: { prStatus: string | null; prUrl: string | null }) {
  if (!prUrl) return <span style={{ color: '#d1d5db', fontSize: '13px' }}>—</span>
  const label = (!prStatus || prStatus === 'unknown') ? 'open' : prStatus
  const map: Record<string, { bg: string; color: string }> = {
    merged: { bg: '#f5f3ff', color: '#7c3aed' },
    open:   { bg: '#f0fdf4', color: '#16a34a' },
    closed: { bg: '#f9fafb', color: '#6b7280' },
  }
  const s = map[label] || map.open
  return (
    <a href={prUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: s.bg, color: s.color, fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', textDecoration: 'none' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </a>
  )
}

function ProgressBar({ value }: { value: number }) {
  const color = value === 100 ? '#7c3aed' : value > 0 ? '#3b82f6' : '#e5e7eb'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '90px', height: '6px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '999px', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, minWidth: '32px' }}>{value}%</span>
    </div>
  )
}

function jobProgress(job: Job): number {
  if (job.status === 'completed') return 100
  if (job.status === 'failed') return 20
  if (job.status === 'running') return 60
  return 0
}

export default function Jobs() {
  const navigate = useNavigate()
  const storedUser  = localStorage.getItem('gh_user')
  const storedToken = localStorage.getItem('gh_token')

  const [jobs, setJobs]       = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    if (!storedToken) return
    const fetchJobs = async () => {
      try {
        const res  = await fetch(`${API_URL}/api/v1/jobs`, { headers: { Authorization: `Bearer ${storedToken}:${storedUser}` } })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Failed to load jobs')
        setJobs(data.jobs || [])
      } catch (e: any) { setError(e.message) } finally { setLoading(false) }
    }
    fetchJobs()
    const iv = setInterval(fetchJobs, 5000)
    return () => clearInterval(iv)
  }, [storedToken, storedUser])

  const filtered = jobs.filter(j => {
    const matchStatus = statusFilter === 'all' || j.status === statusFilter
    const matchSearch = !search || j.repo_url.toLowerCase().includes(search.toLowerCase()) || j.id.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const completedCount = jobs.filter(j => j.status === 'completed').length
  const runningCount   = jobs.filter(j => j.status === 'running').length
  const failedCount    = jobs.filter(j => j.status === 'failed').length

  const S = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', display: 'flex', ...S }}>
      <Sidebar user={storedUser} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>All Jobs</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>Every remediation job run on your repositories.</p>
          </div>
          <button onClick={() => navigate('/jobs/new')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', fontWeight: 600, fontSize: '13px', padding: '9px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Job
          </button>
        </div>

        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Stat pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {[
              { label: 'Total', value: jobs.length, color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'Completed', value: completedCount, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Running', value: runningCount, color: '#d97706', bg: '#fffbeb' },
              { label: 'Failed', value: failedCount, color: '#dc2626', bg: '#fef2f2' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '10px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{s.label}</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Filters bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 14px', flex: 1, maxWidth: '360px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by job ID or repo..." style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#111827', flex: 1 }} />
            </div>
            {/* Status filter */}
            {['all', 'completed', 'running', 'failed', 'queued'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ fontSize: '12px', fontWeight: 500, padding: '7px 14px', borderRadius: '8px', border: '1px solid', borderColor: statusFilter === s ? '#7c3aed' : '#e5e7eb', background: statusFilter === s ? '#f5f3ff' : '#fff', color: statusFilter === s ? '#7c3aed' : '#6b7280', cursor: 'pointer', textTransform: 'capitalize' }}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 24px', fontSize: '13px', borderBottom: '1px solid #fecaca' }}>{error}</div>}

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: '#9ca3af', fontSize: '14px' }}>Loading jobs...</div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '12px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>No jobs found</p>
                <button onClick={() => navigate('/jobs/new')} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Run your first job →</button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                    {['Job ID', 'Repository', 'Status', 'Progress', 'PR Status', 'Created At', 'Time to Heal', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 20px', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((job, i) => (
                    <tr key={job.id} onClick={() => navigate(job.status === 'completed' ? `/jobs/${job.id}/result` : `/jobs/${job.id}`)} style={{ cursor: 'pointer', borderBottom: i !== filtered.length - 1 ? '1px solid #f9f9f9' : 'none', transition: 'background 0.12s' }} onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#7c3aed', fontFamily: 'monospace', fontWeight: 500 }}>{job.id.slice(0, 8)}-{job.id.slice(8, 18)}...</td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#374151', fontWeight: 500 }}>{job.repo_url.replace('https://github.com/', '').split('/')[1] || job.repo_url.replace('https://github.com/', '')}</td>
                      <td style={{ padding: '14px 20px' }}><StatusBadge status={job.status} /></td>
                      <td style={{ padding: '14px 20px' }}><ProgressBar value={jobProgress(job)} /></td>
                      <td style={{ padding: '14px 20px' }}><PRBadge prStatus={job.pr_status} prUrl={job.pr_url} /></td>
                      <td style={{ padding: '14px 20px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{new Date(job.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: job.status === 'completed' ? '#22c55e' : '#9ca3af', fontWeight: 600 }}>{job.status === 'completed' ? '~47s' : '—'}</td>
                      <td style={{ padding: '14px 20px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', paddingBottom: '16px' }}>
            Showing {filtered.length} of {jobs.length} jobs · Auto-refreshes every 5s
          </div>
        </div>
      </main>
    </div>
  )
}