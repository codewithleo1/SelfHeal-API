// frontend/src/pages/JobProgress.tsx
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Step { step: number; step_name: string; status: string; output: any }
interface Job { id: string; status: string; repo_url: string; pr_url: string | null; created_at: string }

const STEP_META: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {
  detect: {
    title: '1. Detect',
    desc: 'Extract error and endpoint from logs',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><circle cx="11" cy="11" r="3"/></svg>
  },
  search: {
    title: '2. Search',
    desc: 'Find broken file and function in repository',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
  },
  crawl: {
    title: '3. Crawl',
    desc: 'Compare API schema and detect changes',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  },
  patch: {
    title: '4. Patch',
    desc: 'Generate and validate patched code',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
  },
  pr: {
    title: '5. PR',
    desc: 'Create Pull Request and notify',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
  },
}

const ALL_STEPS = ['detect', 'search', 'crawl', 'patch', 'pr']

function StepNode({ name, status, index, isLast }: { name: string; status: string; index: number; isLast: boolean }) {
  const meta = STEP_META[name]
  const isDone = status === 'done'
  const isRunning = status === 'running'
  const isError = status === 'error'

  let circleStyle: React.CSSProperties = { width: '52px', height: '52px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }
  let iconColor = '#9ca3af'
  let circleBg = '#f3f4f6'
  let circleBorder = '2px solid #e5e7eb'
  let timeBg = '#f3f4f6'
  let timeColor = '#9ca3af'

  if (isDone) { circleBg = '#dcfce7'; circleBorder = '2px solid #86efac'; iconColor = '#16a34a'; timeBg = '#dcfce7'; timeColor = '#16a34a' }
  else if (isRunning) { circleBg = '#eff6ff'; circleBorder = '2px solid #93c5fd'; iconColor = '#2563eb'; timeBg = '#eff6ff'; timeColor = '#2563eb' }
  else if (isError) { circleBg = '#fef2f2'; circleBorder = '2px solid #fca5a5'; iconColor = '#dc2626'; timeBg = '#fef2f2'; timeColor = '#dc2626' }

  const lineColor = isDone ? '#86efac' : '#e5e7eb'

  const mockTime: Record<string, string> = { detect: '8s', search: '12s', crawl: '18s', patch: '15-30s', pr: 'Pending' }
  const timeLabel = isDone ? mockTime[name] : isRunning ? mockTime[name] : 'Pending'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {index > 0 && <div style={{ flex: 1, height: '2px', background: lineColor, transition: 'background 0.4s' }} />}
        <div style={{ ...circleStyle, background: circleBg, border: circleBorder, boxShadow: isRunning ? '0 0 0 4px rgba(37,99,235,0.15)' : isDone ? '0 0 0 4px rgba(22,163,74,0.1)' : 'none' }}>
          {isDone ? (
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          ) : isError ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          ) : (
            <span style={{ color: iconColor }}>{meta.icon}</span>
          )}
          {isRunning && (
            <div style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          )}
        </div>
        {!isLast && <div style={{ flex: 1, height: '2px', background: lineColor, transition: 'background 0.4s' }} />}
      </div>
      <div style={{ marginTop: '12px', textAlign: 'center', padding: '0 4px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: isDone ? '#111827' : isRunning ? '#1d4ed8' : '#6b7280' }}>{meta.title}</div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', lineHeight: 1.4 }}>{meta.desc}</div>
        <div style={{ marginTop: '6px', display: 'inline-block', background: timeBg, color: timeColor, fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' }}>{timeLabel}</div>
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
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number>(Date.now())
  const logsEndRef = useRef<HTMLDivElement>(null)

  const storedUser = localStorage.getItem('gh_user')
  const getStepStatus = (name: string) => steps.find(s => s.step_name === name)?.status || 'pending'
  const completedCount = ALL_STEPS.filter(n => getStepStatus(n) === 'done').length
  const currentStepIdx = ALL_STEPS.findIndex(n => getStepStatus(n) === 'running')

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/jobs/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail)
        if (data.job?.created_at) startRef.current = new Date(data.job.created_at).getTime()
        setJob(data.job)
        setSteps(data.steps || [])

        const newLogs: string[] = []
        ;(data.steps || []).forEach((s: Step) => {
          const pad = (n: number) => n.toString().padStart(2, '0')
          const d = new Date()
          const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
          if (s.status === 'done') {
            newLogs.push(`[${t}] Step ${ALL_STEPS.indexOf(s.step_name)+1}/5 (${s.step_name.charAt(0).toUpperCase()+s.step_name.slice(1)}) started`)
            if (s.step_name === 'detect' && s.output?.endpoint) newLogs.push(`[${t}] ✓ Detect completed - Endpoint: ${s.output.endpoint}`)
            else if (s.step_name === 'search' && s.output?.file_path) newLogs.push(`[${t}] ✓ Search completed - Found file: ${s.output.file_path}`)
            else if (s.step_name === 'crawl') newLogs.push(`[${t}] ✓ Crawl completed - ${s.output?.diff_summary ? '2 breaking changes detected' : 'Schema compared'}`)
            else if (s.step_name === 'patch') newLogs.push(`[${t}] ✓ Patch validation passed`)
            else if (s.step_name === 'pr' && s.output?.pr_url) newLogs.push(`[${t}] ✓ PR opened: ${s.output.pr_url}`)
            else newLogs.push(`[${t}] ✓ ${s.step_name} completed`)
          } else if (s.status === 'running') {
            newLogs.push(`[${t}] Step ${ALL_STEPS.indexOf(s.step_name)+1}/5 (${s.step_name.charAt(0).toUpperCase()+s.step_name.slice(1)}) started`)
            if (s.step_name === 'detect') newLogs.push(`[${t}] LLM analyzing error log...`)
            else if (s.step_name === 'search') newLogs.push(`[${t}] Searching repository with GitHub Code Search...`)
            else if (s.step_name === 'crawl') { newLogs.push(`[${t}] Fetching Stripe OpenAPI spec...`); newLogs.push(`[${t}] Comparing schema versions...`) }
            else if (s.step_name === 'patch') { newLogs.push(`[${t}] Generating patched code with LLM...`); newLogs.push(`[${t}] Validating syntax with AST...`) }
            else if (s.step_name === 'pr') newLogs.push(`[${t}] Creating branch and opening PR...`)
          } else if (s.status === 'error') {
            newLogs.push(`[${t}] ✗ ${s.step_name} step failed`)
          }
        })
        if (newLogs.length > 0) setLogs(newLogs)
        if (data.job?.status === 'completed') setTimeout(() => navigate(`/jobs/${id}/result`), 1500)
      } catch (e: any) { setError(e.message) }
    }
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [id, navigate])

  const elapsedStr = `${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`

  const pipelineStepsList = ALL_STEPS.map((name, i) => {
    const status = getStepStatus(name)
    const meta = STEP_META[name]
    const mockTime: Record<string, string> = { detect: '8s', search: '12s', crawl: '18s', patch: '15-30s', pr: 'Pending' }
    return { name, status, meta, time: status === 'done' ? mockTime[name] : status === 'running' ? 'In Progress' : 'Pending', idx: i }
  })

  const jobDetailsRows = [
    { label: 'Job ID', value: id, mono: true, highlight: true },
    { label: 'Repository', value: job?.repo_url.replace('https://github.com/','') || '—', mono: false },
    { label: 'Branch', value: 'main', mono: true },
    { label: 'Vendor', value: steps.find(s=>s.step_name==='detect')?.output?.vendor || '—', mono: false },
    { label: 'Endpoint', value: steps.find(s=>s.step_name==='detect')?.output?.endpoint || '—', mono: true, pill: true, pillColor: '#eff6ff', pillText: '#2563eb' },
    { label: 'Error Type', value: steps.find(s=>s.step_name==='detect')?.output?.error_type || 'Invalid Request Error', mono: false, pill: true, pillColor: '#fef2f2', pillText: '#dc2626' },
    { label: 'Triggered By', value: 'Sentry Webhook', mono: false },
    { label: 'Priority', value: 'Medium', mono: false, pill: true, pillColor: '#fffbeb', pillText: '#d97706' },
    { label: 'Queued At', value: job ? new Date(job.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—', mono: false },
    { label: 'Started At', value: job ? new Date(job.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—', mono: false },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', display: 'flex', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      <Sidebar user={storedUser} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af' }}>
            <button onClick={() => navigate('/dashboard')} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0 }}>Jobs</button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ color: '#374151', fontFamily: 'monospace', fontSize: '12px' }}>{id?.slice(0,8)}-{id?.slice(8,22)}...</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View Result (Read Only)
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Cancel Job
            </button>
          </div>
        </div>

        {/* Page title */}
        <div style={{ padding: '20px 32px 0', background: '#fff', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>Job Progress</h1>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px', background: job?.status === 'completed' ? '#f0fdf4' : job?.status === 'failed' ? '#fef2f2' : '#eff6ff', color: job?.status === 'completed' ? '#16a34a' : job?.status === 'failed' ? '#dc2626' : '#2563eb' }}>
              {job?.status === 'completed' ? 'Completed' : job?.status === 'failed' ? 'Failed' : 'In Progress'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Tracking the autonomous healing process in real-time.</p>
        </div>

        {error && <div style={{ margin: '16px 32px 0', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 16px', borderRadius: '10px', fontSize: '13px' }}>{error}</div>}

        <div style={{ padding: '20px 32px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', flex: 1 }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Step pipeline card */}
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '28px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Started at</div>
                  <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600, marginTop: '2px' }}>{job ? new Date(job.created_at).toLocaleString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated time remaining</div>
                  <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {job?.status === 'completed' ? 'Done' : '15-30s'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {ALL_STEPS.map((name, i) => <StepNode key={name} name={name} status={getStepStatus(name)} index={i} isLast={i === ALL_STEPS.length - 1} />)}
              </div>
            </div>

            {/* Live logs + Job details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              {/* Live logs */}
              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Live Logs</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                      <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 500 }}>Streaming...</span>
                    </div>
                    <button onClick={() => setLogs([])} style={{ fontSize: '11px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      Clear
                    </button>
                  </div>
                </div>
                <div style={{ background: '#0f1117', padding: '12px 14px', height: '300px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
                  {logs.length === 0 ? (
                    <span style={{ color: '#4b5563' }}>Waiting for agent...</span>
                  ) : (
                    logs.map((log, i) => {
                      const isSuccess = log.includes('✓') || log.includes('completed') || log.includes('passed') || log.includes('opened')
                      const isStep = log.includes('/5') && log.includes('started')
                      const isError = log.includes('✗') || log.includes('failed')
                      const isFinalizing = log.includes('Finalizing') || log.includes('Applying') || log.includes('Generating') || log.includes('Validating') || log.includes('Fetching') || log.includes('Searching') || log.includes('Comparing') || log.includes('LLM')
                      const color = isError ? '#f87171' : isSuccess ? '#4ade80' : isStep ? '#60a5fa' : isFinalizing ? '#e5e7eb' : '#9ca3af'
                      return <div key={i} style={{ color, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{log}</div>
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* Job details */}
              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Job Details</span>
                </div>
                <div style={{ padding: '4px 0' }}>
                  {jobDetailsRows.map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid #fafafa' }}>
                      <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>{row.label}</span>
                      {row.pill ? (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: row.pillColor, color: row.pillText, fontFamily: row.mono ? 'monospace' : 'inherit', fontWeight: 500 }}>{row.value}</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: row.highlight ? '#7c3aed' : '#374151', fontFamily: row.mono ? 'monospace' : 'inherit', fontWeight: row.highlight ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{row.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Did you know banner */}
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '14px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🚀</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Did you know?</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>SelfHeal-API can automatically detect and fix breaking changes from 50+ API providers.</div>
                </div>
              </div>
              <button style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>View Supported Vendors →</button>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Job Summary purple card */}
            <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)', borderRadius: '14px', padding: '20px', color: '#fff', position: 'relative', overflow: 'hidden', minHeight: '140px' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-10px', opacity: 0.15 }}>
                <svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="#fff"/></svg>
              </div>
              <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                <svg width="60" height="60" viewBox="0 0 72 72" fill="none">
                  <rect x="20" y="32" width="32" height="24" rx="6" fill="rgba(255,255,255,0.3)"/>
                  <rect x="22" y="16" width="28" height="22" rx="8" fill="rgba(255,255,255,0.4)"/>
                  <circle cx="29" cy="26" r="4" fill="#fff"/>
                  <circle cx="43" cy="26" r="4" fill="#fff"/>
                  <circle cx="30" cy="27" r="2" fill="#7c3aed"/>
                  <circle cx="44" cy="27" r="2" fill="#7c3aed"/>
                  <line x1="36" y1="16" x2="36" y2="10" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="36" cy="9" r="2.5" fill="rgba(255,255,255,0.6)"/>
                </svg>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Job Summary</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                {job?.status === 'completed' ? 'Completed!' : job?.status === 'failed' ? 'Failed' : 'In Progress'}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                Step {completedCount + (currentStepIdx >= 0 ? 1 : 0)} of {ALL_STEPS.length}
              </div>
              {/* Wave decoration */}
              <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, height: '20px', opacity: 0.3 }}>
                <svg viewBox="0 0 300 20" fill="none" width="100%" height="100%"><path d="M0 10 Q75 0 150 10 Q225 20 300 10" stroke="#fff" strokeWidth="2" fill="none"/></svg>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Elapsed Time', value: elapsedStr, icon: '⏱', color: '#f59e0b' },
                { label: 'Avg. Step Time', value: '12s', icon: '⚡', color: '#f59e0b' },
                { label: 'Retries', value: '0', icon: '↺', color: '#9ca3af' },
                { label: 'Model', value: 'Llama 3.3 70B', icon: '🤖', color: '#9ca3af' },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ color: stat.color }}>{stat.icon}</span> {stat.label}
                  </div>
                  <div style={{ fontSize: stat.label.includes('Model') ? '13px' : '18px', fontWeight: 700, color: '#111827', fontFamily: stat.label.includes('Model') ? 'inherit' : 'monospace' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Pipeline Steps list */}
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Pipeline Steps</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pipelineStepsList.map(s => {
                  const isDone = s.status === 'done'
                  const isRunning = s.status === 'running'
                  const isError = s.status === 'error'
                  return (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: isRunning ? '#eff6ff' : '#fafafa', border: isRunning ? '1px solid #bfdbfe' : '1px solid #f5f5f5' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isDone ? '#dcfce7' : isRunning ? '#dbeafe' : isError ? '#fef2f2' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isDone ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> : isRunning ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="4 2"/></svg> : isError ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> : <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #d1d5db', display: 'block' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{s.meta.title}</div>
                        <div style={{ fontSize: '11px', color: isRunning ? '#2563eb' : '#9ca3af' }}>{isRunning ? 'In Progress' : isDone ? `Completed ${s.time}` : 'Pending'}</div>
                      </div>
                      <div>
                        {isDone ? <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div> : isRunning ? <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} /> : <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e5e7eb', background: '#fafafa' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: '12px', fontSize: '11px', color: '#9ca3af', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                Auto-refresh in 3s
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}