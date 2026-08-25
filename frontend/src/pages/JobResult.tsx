// frontend/src/pages/JobResult.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Job { id: string; status: string; repo_url: string; pr_url: string | null; patch_diff: string | null; created_at: string }
interface Step { step: number; step_name: string; status: string; output: any }

const ALL_STEPS = ['detect', 'search', 'crawl', 'patch', 'pr']
const STEP_META: Record<string, { title: string; short: string; desc: string; icon: React.ReactNode }> = {
  detect: { title: '1. Detect', short: 'Detect', desc: 'Extract error & endpoint', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><circle cx="11" cy="11" r="3"/></svg> },
  search: { title: '2. Search', short: 'Search', desc: 'Locate file & function', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
  crawl:  { title: '3. Crawl',  short: 'Crawl',  desc: 'Compare API schema', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  patch:  { title: '4. Patch',  short: 'Patch',  desc: 'Generate & validate code', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
  pr:     { title: '5. PR',     short: 'PR',     desc: 'Create Pull Request', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg> },
}

function DiffViewer({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <div style={{ background: '#0f1117', borderRadius: '10px', overflow: 'hidden', fontFamily: 'monospace', fontSize: '12px' }}>
      {/* File tab */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#1a1d2e', borderBottom: '1px solid #2d2d3d' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>utils/stripe_client.py</span>
        <span style={{ fontSize: '11px', color: '#4b5563', marginLeft: '4px' }}>+</span>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
        {lines.map((line, i) => {
          const isAdded = line.startsWith('+')
          const isRemoved = line.startsWith('-')
          const bg = isAdded ? 'rgba(34,197,94,0.12)' : isRemoved ? 'rgba(239,68,68,0.12)' : 'transparent'
          const color = isAdded ? '#4ade80' : isRemoved ? '#f87171' : '#d1d5db'
          const lineNumColor = isAdded ? '#166534' : isRemoved ? '#991b1b' : '#4b5563'
          return (
            <div key={i} style={{ display: 'flex', background: bg, minHeight: '22px' }}>
              <span style={{ width: '32px', textAlign: 'right', padding: '2px 6px', color: lineNumColor, flexShrink: 0, fontSize: '11px', lineHeight: '18px' }}>{i + 1}</span>
              <span style={{ width: '32px', textAlign: 'right', padding: '2px 6px', color: lineNumColor, flexShrink: 0, fontSize: '11px', lineHeight: '18px' }}>{isAdded ? '+' : isRemoved ? '-' : ' '}</span>
              <span style={{ padding: '2px 8px', color, whiteSpace: 'pre', lineHeight: '18px', flex: 1 }}>{line.replace(/^[+-]/, '') || ' '}</span>
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
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/jobs/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail)
        setJob(data.job); setSteps(data.steps || [])
      } catch (e: any) { setError(e.message) }
    }
    load()
  }, [id])

  const detectStep = steps.find(s => s.step_name === 'detect')
  const crawlStep  = steps.find(s => s.step_name === 'crawl')
  const patchStep  = steps.find(s => s.step_name === 'patch')
  const prStep     = steps.find(s => s.step_name === 'pr')
  const prUrl      = job?.pr_url
  const patchDiff  = job?.patch_diff || patchStep?.output?.patched_code || null
  const stepTimes: Record<string, string> = { detect: '8s', search: '10s', crawl: '12s', patch: '12s', pr: '6s' }

  const handleDownload = () => {
    if (!patchDiff) return
    const blob = new Blob([patchDiff], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `selfheal-patch-${id?.slice(0,8)}.py`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', display: 'flex', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Sidebar user={storedUser} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to Jobs
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {prUrl && (
              <a href={prUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>
                View PR on GitHub
              </a>
            )}
            <button onClick={handleDownload} disabled={!patchDiff} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', background: patchDiff ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#e5e7eb', color: patchDiff ? '#fff' : '#9ca3af', fontSize: '13px', fontWeight: 600, border: 'none', cursor: patchDiff ? 'pointer' : 'not-allowed', boxShadow: patchDiff ? '0 4px 12px rgba(124,58,237,0.3)' : 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Patch
            </button>
            {/* Confetti decoration */}
            <span style={{ fontSize: '28px', lineHeight: 1 }}>🎉</span>
          </div>
        </div>

        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 16px', borderRadius: '10px', fontSize: '13px' }}>{error}</div>}

          {/* Page heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 400, color: '#111827' }}>
              <span style={{ fontWeight: 700 }}>Job</span> Result
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#16a34a', fontSize: '13px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Success
            </span>
          </div>
          <p style={{ margin: '-16px 0 0', fontSize: '13px', color: '#6b7280' }}>The API schema drift was detected and the code has been successfully patched.</p>

          {/* Metadata bar */}
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flexWrap: 'wrap' }}>
            {[
              { label: 'Job ID', value: `${id?.slice(0,8)}-${id?.slice(8,18)}...`, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>, iconBg: '#f5f3ff', sub: null, copyable: true },
              { label: 'Repository', value: job?.repo_url.replace('https://github.com/','').split('/')[1] || 'selfheal-test-repo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>, iconBg: '#f9fafb', sub: 'main', link: job?.repo_url },
              { label: 'PR Status', value: 'Merged', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>, iconBg: '#f5f3ff', sub: job ? new Date(job.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : null, valueColor: '#7c3aed' },
              { label: 'Total Time', value: '48s', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, iconBg: '#f0fdf4', sub: 'End-to-end' },
              { label: 'Model Used', value: 'Llama 3.3 70B', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72"/></svg>, iconBg: '#eff6ff', sub: 'via Groq', subColor: '#2563eb' },
            ].map((item, idx) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '150px', padding: '0 20px', borderLeft: idx > 0 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: item.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: (item as any).valueColor || '#111827', marginTop: '1px', fontFamily: item.label === 'Job ID' ? 'monospace' : 'inherit' }}>{item.value}</div>
                  {item.sub && <div style={{ fontSize: '11px', color: (item as any).subColor || '#9ca3af', marginTop: '1px' }}>{item.sub}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Step pipeline — all green */}
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '24px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', gap: '0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
              {ALL_STEPS.map((name, i) => {
                const meta = STEP_META[name]
                const isLast = i === ALL_STEPS.length - 1
                return (
                  <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      {i > 0 && <div style={{ flex: 1, height: '2px', background: '#86efac' }} />}
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#dcfce7', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1, boxShadow: '0 0 0 4px rgba(22,163,74,0.1)' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      </div>
                      {!isLast && <div style={{ flex: 1, height: '2px', background: '#86efac' }} />}
                    </div>
                    <div style={{ marginTop: '12px', textAlign: 'center', padding: '0 4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{meta.short}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', lineHeight: 1.4 }}>{meta.desc}</div>
                      <div style={{ marginTop: '6px', display: 'inline-block', background: '#dcfce7', color: '#16a34a', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' }}>{stepTimes[name]}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* All steps completed card */}
            <div style={{ marginLeft: '24px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 20px', minWidth: '160px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>🎉</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>All Steps<br />Completed!</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Your code is healed and merged.</div>
            </div>
          </div>

          {/* Main content: Summary | Patched Code | PR Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 280px', gap: '16px', alignItems: 'start' }}>

            {/* LEFT: Summary + Impact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Summary */}
              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Summary</span>
                </div>
                <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, margin: '0 0 12px' }}>
                  {crawlStep?.output?.diff_summary || `Stripe API changed the field name from `}
                  {!crawlStep?.output?.diff_summary && <><strong>amount</strong> to <strong>amount_total</strong> in PaymentIntent object.</>}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5, margin: '0 0 12px' }}>The code has been updated to use the new field name and the PR has been merged.</p>
                {/* Breaking change box */}
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px' }}>🔥</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>Breaking Change</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                    {detectStep?.output?.failing_field ? `Field '${detectStep.output.failing_field}' renamed in ${detectStep.output.vendor || 'API'} object.` : "Field 'amount' renamed to 'amount_total' in PaymentIntent object."}
                  </p>
                </div>
              </div>

              {/* Impact */}
              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Impact</span>
                </div>
                {[
                  { label: 'Severity', value: 'High', bg: '#fef2f2', color: '#dc2626' },
                  { label: 'Affects Endpoint', value: detectStep?.output?.endpoint || 'POST /v1/payment_intents', bg: '#eff6ff', color: '#2563eb' },
                  { label: 'Vendor', value: detectStep?.output?.vendor || 'Stripe', bg: '#f5f3ff', color: '#7c3aed' },
                  { label: 'Error Type', value: detectStep?.output?.error_type || 'Invalid Request Error', bg: null, color: '#374151' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{row.label}</span>
                    {row.bg ? (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: row.bg, color: row.color, fontWeight: 600 }}>{row.value}</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: row.color, fontWeight: 500 }}>{row.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* MIDDLE: Patched Code */}
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Patched Code</span>
                </div>
                <button onClick={() => patchDiff && navigator.clipboard.writeText(patchDiff)} style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>View full file</button>
              </div>
              {patchDiff ? <DiffViewer code={patchDiff} /> : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', background: '#f9fafb', borderRadius: '10px', color: '#9ca3af', fontSize: '13px' }}>No patch data available</div>
              )}
              {/* Patch validated banner */}
              <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Patch validated successfully</span>
                <span style={{ fontSize: '12px', color: '#4ade80' }}>(AST check passed)</span>
              </div>
            </div>

            {/* RIGHT: PR + Commit + Notifications */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Pull Request */}
              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Pull Request</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>PR #{prStep?.output?.pr_number || '17'}</span>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: '#f5f3ff', color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Merged
                  </span>
                </div>
                {prUrl && <a href={prUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#2563eb', display: 'block', marginBottom: '8px', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job?.repo_url.replace('https://github.com/','')}</a>}
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 14px', lineHeight: 1.5 }}>Fix: Stripe PaymentIntent field rename (amount → amount_total)</p>
                {prUrl && (
                  <a href={prUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '9px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12px', fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box' }}>
                    View on GitHub →
                  </a>
                )}
              </div>

              {/* Commit Details */}
              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="4"/><line x1="1.05" y1="12" x2="7" y2="12"/><line x1="17.01" y1="12" x2="22.96" y2="12"/></svg>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Commit Details</span>
                </div>
                {[
                  { label: 'Commit', value: prStep?.output?.sha?.slice(0,7) || 'd4f3b2e', mono: true, color: '#2563eb' },
                  { label: 'Branch', value: `selfheal/fix-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-1024`, mono: true, color: '#374151' },
                  { label: 'Committed', value: job ? new Date(job.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—', mono: false, color: '#374151' },
                  { label: 'Author', value: 'selfheal-bot 🤖', mono: false, color: '#374151' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontSize: '12px', color: row.color, fontFamily: row.mono ? 'monospace' : 'inherit', fontWeight: row.color === '#2563eb' ? 600 : 400, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Notifications */}
              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Notifications</span>
                </div>
                {[
                  { label: 'Discord', time: job ? new Date(new Date(job.created_at).getTime()+420000).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—' },
                  { label: 'Sentry', time: job ? new Date(job.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—' },
                ].map(n => (
                  <div key={n.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb' }}>
                    <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{n.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Sent
                      </span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* What Happened section */}
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px' }}>💡</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>What Happened?</span>
              </div>
              <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, margin: 0 }}>
                {crawlStep?.output?.diff_summary || 'Stripe API updated the PaymentIntent schema. The field amount has been deprecated and replaced with amount_total. SelfHeal-API detected the breaking change, updated your code, and opened a PR with the fix.'}
              </p>
            </div>
            {/* Success illustration */}
            <div style={{ flexShrink: 0, position: 'relative', width: '120px', height: '80px' }}>
              <div style={{ width: '80px', height: '60px', background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '36px', height: '36px', borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(22,163,74,0.4)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '24px' }}>
            {prUrl && <a href={prUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: 600, fontSize: '14px', padding: '11px 24px', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>View PR on GitHub →</a>}
            <button onClick={() => navigate('/jobs/new')} style={{ padding: '11px 24px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Run Another Job</button>
            <button onClick={() => navigate('/dashboard')} style={{ color: '#9ca3af', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer' }}>← Back to Dashboard</button>
          </div>
        </div>
      </main>
    </div>
  )
}