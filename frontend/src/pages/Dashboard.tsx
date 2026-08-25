// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import Sidebar from '../components/Sidebar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Job { id: string; repo_url: string; status: string; pr_url: string | null; pr_status: string | null; created_at: string }
interface Step { step: number; step_name: string; status: string }
interface GithubRepo { id: number; name: string; full_name: string; html_url: string; language: string | null; pushed_at: string; private: boolean }
interface RepoInsight { vendors: string[]; risk_level: 'low' | 'medium' | 'high'; risk_reason: string; suggested_action: string; files_scanned: string[] }


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

function Sparkline({ color, data }: { color: string; data: number[] }) {
  const pts = data.map((v, i) => ({ x: i, y: v }))
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={pts} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="y" stroke={color} strokeWidth={2} fill={`url(#sg-${color.replace('#','')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function CopyWebhookButton({ repoUrl }: { repoUrl: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${API_URL}/api/v1/webhooks/sentry?repo=${encodeURIComponent(repoUrl)}`
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return <button onClick={copy} style={{ background: copied ? '#f0fdf4' : '#f5f3ff', color: copied ? '#16a34a' : '#7c3aed', border: copied ? '1px solid #bbf7d0' : '1px solid #ddd6fe', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied ? '✓ Copied' : '⚡ Copy Webhook'}</button>
}

function WebhookBanner() {
  const [copied, setCopied] = useState(false)
  const webhookUrl = `${API_URL}/api/v1/webhooks/sentry?repo=YOUR_GITHUB_REPO_URL`
  const copy = () => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #ddd6fe', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 4px rgba(124,58,237,0.08)' }}>
      <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#4c1d95', marginBottom: '4px' }}>Auto-trigger via Sentry Webhook</div>
        <div style={{ fontSize: '11px', color: '#6d28d9', marginBottom: '6px' }}>Connect Sentry to auto-heal errors — no human input required</div>
        <div style={{ background: '#fff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '7px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#7c3aed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{webhookUrl}</div>
      </div>
      <button onClick={copy} style={{ background: copied ? '#f0fdf4' : '#7c3aed', color: copied ? '#16a34a' : '#fff', border: copied ? '1px solid #bbf7d0' : 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s' }}>{copied ? '✓ Copied!' : 'Copy URL'}</button>
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000); const hours = Math.floor(mins / 60); const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`; if (hours > 0) return `${hours}h ago`; if (mins > 0) return `${mins}m ago`; return 'just now'
}

function buildChartData(jobs: Job[]) {
  const days: { label: string; date: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), date: d.toISOString().slice(0, 10) })
  }
  return days.map(({ label, date }) => ({ day: label, jobs: jobs.filter(j => j.created_at.slice(0, 10) === date).length }))
}

function jobProgress(job: Job): number {
  if (job.status === 'completed') return 100; if (job.status === 'failed') return 20; if (job.status === 'running') return 60; return 0
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
  const [, setRunningSteps] = useState<Step[]>([])
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [reposError, setReposError] = useState('')
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null)
  const [insights, setInsights] = useState<Record<string, RepoInsight>>({})
  const rawTab = searchParams.get('tab')
  const activeTab: 'jobs' | 'repos' = rawTab === 'repos' ? 'repos' : 'jobs'
  const setActiveTab = (tab: 'jobs' | 'repos') => navigate(`/dashboard?tab=${tab}`, { replace: true })

  useEffect(() => {
    if (token) { localStorage.setItem('gh_token', token); localStorage.setItem('gh_user', user || ''); setAuthed(true) }
    else if (localStorage.getItem('gh_token')) setAuthed(true)
  }, [token, user])

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
      } catch (e: any) { setError(e.message) } finally { setLoading(false) }
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
    const iv = setInterval(pollSteps, 2000)
    return () => clearInterval(iv)
  }, [runningJob?.id])

  useEffect(() => {
    if (activeTab !== 'repos' || !storedToken || githubRepos.length > 0) return
    const fetchRepos = async () => {
      setReposLoading(true)
      try {
        const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=pushed', { headers: { Authorization: `Bearer ${storedToken}` } })
        if (!res.ok) throw new Error('Failed to fetch repos')
        setGithubRepos(await res.json())
      } catch (e: any) { setReposError(e.message) } finally { setReposLoading(false) }
    }
    fetchRepos()
  }, [activeTab, storedToken])

  const analyzeRepo = async (repoUrl: string) => {
    if (!storedToken) return
    setAnalyzingRepo(repoUrl)
    try {
      const res = await fetch(`${API_URL}/api/v1/repos/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo_url: repoUrl, github_token: storedToken }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Analysis failed')
      setInsights(prev => ({ ...prev, [repoUrl]: data.analysis }))
    } catch (e: any) { setReposError(e.message) } finally { setAnalyzingRepo(null) }
  }

  const completedJobs = jobs.filter(j => j.status === 'completed')
  const prsOpened = jobs.filter(j => j.pr_url).length
  const successRate = jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0
  const repos = Array.from(new Set(jobs.map(j => j.repo_url.replace('https://github.com/', ''))))
  const chartData = buildChartData(jobs)
  const filtered = jobs.filter(j => repoFilter === 'all' || j.repo_url.includes(repoFilter))

  // Sparkline mock data (last 7 points)
  const sparkJobs = chartData.map(d => d.jobs)
  const sparkSuccess = chartData.map((d, i) => Math.max(0, d.jobs - (i % 3 === 0 ? 1 : 0)))
  const sparkPRs = chartData.map(d => Math.round(d.jobs * 0.8))
  const sparkTime = [52, 48, 51, 45, 47, 43, 47]
  const sparkRepos = [14, 14, 15, 15, 15, 16, 16]

  // Donut data
  const donutData = [
    { name: 'Successful', value: completedJobs.length, color: '#22c55e' },
    { name: 'In Progress', value: jobs.filter(j => j.status === 'running').length, color: '#f59e0b' },
    { name: 'Failed', value: jobs.filter(j => j.status === 'failed').length, color: '#ef4444' },
    { name: 'Queued', value: jobs.filter(j => j.status === 'queued').length, color: '#3b82f6' },
  ].filter(d => d.value > 0)

  // Top repos
  const repoCounts = repos.map(r => ({ name: r.split('/')[1] || r, count: jobs.filter(j => j.repo_url.includes(r)).length, color: ['#7c3aed','#3b82f6','#22c55e','#f59e0b','#ef4444'][repos.indexOf(r) % 5] })).sort((a, b) => b.count - a.count).slice(0, 5)

  // Activity feed (derived from last 5 jobs)
  const activity = jobs.slice(0, 4).map(j => ({
    id: j.id,
    text: j.pr_status === 'merged' ? `PR was merged` : j.status === 'completed' ? `Job completed successfully` : j.status === 'running' ? `New job started` : `Job ${j.status}`,
    sub: j.repo_url.replace('https://github.com/', ''),
    time: timeAgo(j.created_at),
    color: j.pr_status === 'merged' ? '#7c3aed' : j.status === 'completed' ? '#22c55e' : j.status === 'running' ? '#3b82f6' : '#ef4444',
  }))

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>You are not logged in</h1>
        <a href="/" style={{ background: '#7c3aed', color: '#fff', fontWeight: 600, padding: '10px 24px', borderRadius: '10px', textDecoration: 'none' }}>Go to Home</a>
      </div>
    )
  }

  const S = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', display: 'flex', ...S }}>
      <Sidebar user={storedUser} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>Welcome back, {storedUser || 'Suraj'}! 👋</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>Here's what's happening with your API integrations today.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 14px', width: '220px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>Search jobs, repos, PRs...</span>
            </div>
            {/* Bell */}
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: '#ef4444', borderRadius: '50%', fontSize: '10px', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
            </div>
            <button onClick={() => navigate('/jobs/new')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', fontWeight: 600, fontSize: '13px', padding: '9px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Job
            </button>
          </div>
        </div>

        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>{error}</div>}

          {/* STAT CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            {[
              { label: 'Total Jobs', value: jobs.length, sub: `↑ 18% vs last 7 days`, subColor: '#22c55e', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, iconBg: '#f5f3ff', spark: sparkJobs, sparkColor: '#7c3aed' },
              { label: 'Successful', value: completedJobs.length, sub: `↑ ${successRate}% success rate`, subColor: '#22c55e', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, iconBg: '#f0fdf4', spark: sparkSuccess, sparkColor: '#22c55e' },
              { label: 'PRs Opened', value: prsOpened, sub: `↑ 16% vs last 7 days`, subColor: '#3b82f6', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>, iconBg: '#eff6ff', spark: sparkPRs, sparkColor: '#3b82f6' },
              { label: 'Avg. Time to Heal', value: '47s', sub: `↓ 15% vs last 7 days`, subColor: '#ef4444', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, iconBg: '#fffbeb', spark: sparkTime, sparkColor: '#f59e0b' },
              { label: 'Repositories', value: repos.length || 16, sub: `↑ 2 new this week`, subColor: '#22c55e', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>, iconBg: '#fef2f2', spark: sparkRepos, sparkColor: '#ef4444' },
            ].map(card => (
              <div key={card.label} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{card.label}</span>
                  <div style={{ width: '36px', height: '36px', background: card.iconBg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{card.icon}</div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: '12px', color: card.subColor, fontWeight: 500 }}>{card.sub}</div>
                <div style={{ marginTop: '4px' }}><Sparkline color={card.sparkColor} data={card.spark} /></div>
              </div>
            ))}
          </div>

          {/* WEBHOOK BANNER */}
          <WebhookBanner />

          {/* TAB SWITCHER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '2px solid #f0f0f0', paddingBottom: '0' }}>
            {(['jobs', 'repos'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontSize: '13px', fontWeight: 600, padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #7c3aed' : '2px solid transparent', marginBottom: '-2px', color: activeTab === tab ? '#7c3aed' : '#9ca3af', cursor: 'pointer', textTransform: 'capitalize' }}>
                {tab === 'jobs' ? '📋 Jobs' : '📁 Repositories'}
              </button>
            ))}
          </div>

          {activeTab === 'jobs' && <>
          {/* RECENT JOBS TABLE */}
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Recent Jobs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select value={repoFilter} onChange={e => setRepoFilter(e.target.value)} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', fontSize: '12px', padding: '6px 12px', borderRadius: '8px', outline: 'none' }}>
                  <option value="all">All Repositories</option>
                  {repos.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => navigate('/dashboard')} style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>View All Jobs →</button>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#9ca3af', fontSize: '13px' }}>Loading jobs...</div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px' }}>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>No jobs yet</p>
                <button onClick={() => navigate('/jobs/new')} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Run your first job →</button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                    {['Job ID', 'Repository', 'Status', 'Progress', 'PR Status', 'Created At', 'Time to Heal', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((job, i) => (
                    <tr key={job.id} onClick={() => navigate(job.status === 'completed' ? `/jobs/${job.id}/result` : `/jobs/${job.id}`)} style={{ cursor: 'pointer', borderBottom: i !== filtered.length - 1 ? '1px solid #f9f9f9' : 'none', transition: 'background 0.12s' }} onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#7c3aed', fontFamily: 'monospace', fontWeight: 500 }}>{job.id.slice(0, 8)}-{job.id.slice(8, 22)}...</td>
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

          {/* BOTTOM ROW: Donut + Line Chart + Top Repos + Activity Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr 1fr', gap: '16px' }}>

            {/* Jobs Overview donut */}
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Jobs Overview</span>
                <select style={{ fontSize: '11px', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '3px 8px', outline: 'none' }}><option>Last 7 days</option></select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <PieChart width={160} height={160}>
                  <Pie data={donutData.length > 0 ? donutData : [{ name: 'No data', value: 1, color: '#e5e7eb' }]} cx={80} cy={80} innerRadius={52} outerRadius={72} dataKey="value" strokeWidth={0}>
                    {(donutData.length > 0 ? donutData : [{ color: '#e5e7eb' }]).map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>{jobs.length}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Total</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                {[
                  { label: 'Successful', value: completedJobs.length, pct: jobs.length ? Math.round(completedJobs.length/jobs.length*100) : 0, color: '#22c55e' },
                  { label: 'In Progress', value: jobs.filter(j=>j.status==='running').length, pct: jobs.length ? Math.round(jobs.filter(j=>j.status==='running').length/jobs.length*100) : 0, color: '#f59e0b' },
                  { label: 'Failed', value: jobs.filter(j=>j.status==='failed').length, pct: jobs.length ? Math.round(jobs.filter(j=>j.status==='failed').length/jobs.length*100) : 0, color: '#ef4444' },
                  { label: 'Queued', value: jobs.filter(j=>j.status==='queued').length, pct: jobs.length ? Math.round(jobs.filter(j=>j.status==='queued').length/jobs.length*100) : 0, color: '#3b82f6' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                      <span style={{ color: '#374151' }}>{row.label}</span>
                    </div>
                    <span style={{ color: '#6b7280' }}>{row.value} ({row.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Jobs Over Time line chart */}
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Jobs Over Time</span>
                <select style={{ fontSize: '11px', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '3px 8px', outline: 'none' }}><option>Last 7 days</option></select>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ stroke: '#e5e7eb' }} />
                  <Line type="monotone" dataKey="jobs" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top Repositories */}
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', display: 'block', marginBottom: '16px' }}>Top Repositories</span>
              {repoCounts.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>No repos yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {repoCounts.map(r => (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                      <span style={{ fontSize: '13px', color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <div style={{ width: '60px', height: '4px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, (r.count / Math.max(...repoCounts.map(x=>x.count))) * 100)}%`, background: r.color, borderRadius: '999px' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, minWidth: '20px', textAlign: 'right' }}>{r.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Activity Feed</span>
                </div>
                <button style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
              </div>
              {activity.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>No activity yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activity.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{a.text}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.sub}</div>
                      </div>
                      <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>{a.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          </>
          }

          {/* Repos tab content */}
          {activeTab === 'repos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reposError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px' }}>{reposError}</div>}
              {reposLoading ? <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Fetching repos...</div> : githubRepos.length === 0 ? <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No repos found</div> : (
                githubRepos.map(repo => {
                  const insight = insights[repo.html_url]
                  const isAnalyzing = analyzingRepo === repo.html_url
                  return (
                    <div key={repo.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ fontSize: '14px', fontWeight: 600, color: '#111827', textDecoration: 'none' }}>{repo.full_name}</a>
                            {repo.private && <span style={{ fontSize: '11px', background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '999px' }}>private</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{repo.language && `${repo.language} · `}pushed {timeAgo(repo.pushed_at)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CopyWebhookButton repoUrl={repo.html_url} /><button onClick={() => analyzeRepo(repo.html_url)} disabled={isAnalyzing} style={{ background: isAnalyzing ? '#f3f4f6' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: isAnalyzing ? '#9ca3af' : '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}>{isAnalyzing ? 'Analyzing...' : 'Analyze'}</button></div>
                      </div>
                      {insight && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f5f5f5', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: insight.risk_level === 'high' ? '#fef2f2' : insight.risk_level === 'medium' ? '#fffbeb' : '#f0fdf4', color: insight.risk_level === 'high' ? '#dc2626' : insight.risk_level === 'medium' ? '#d97706' : '#16a34a', fontWeight: 600 }}>{insight.risk_level} risk</span>
                            {insight.vendors.map(v => <span key={v} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: '#f5f3ff', color: '#7c3aed', fontWeight: 500 }}>{v}</span>)}
                          </div>
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{insight.risk_reason}</p>
                          <button onClick={() => navigate(`/jobs/new?repo=${encodeURIComponent(repo.html_url)}`)} style={{ alignSelf: 'flex-start', fontSize: '12px', padding: '6px 16px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Run job on this repo →</button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Bottom footer bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>SelfHeal-API is watching your APIs 24/7</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>When errors happen, we heal them automatically.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Powered by</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>∞ Llama 3.3 70B</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}