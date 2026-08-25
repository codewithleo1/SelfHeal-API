// frontend/src/pages/NewJob.tsx
import { useEffect, useState } from 'react'
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
  const [form, setForm] = useState({ repo_url: searchParams.get('repo') || '', error_log: '' })

  const token = localStorage.getItem('gh_token')
  const user  = localStorage.getItem('gh_user')

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>You need to log in first.</p>
        <a href="/" style={{ color: '#7c3aed', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>Go to Home →</a>
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}:${user}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to create job')
      navigate(`/jobs/${data.job_id}`)
    } catch (e: any) { setError(e.message); setLoading(false) }
  }

  const S = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', display: 'flex', ...S }}>
      <Sidebar user={user} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 32px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af' }}>
            <button onClick={() => navigate('/dashboard')} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0 }}>Dashboard</button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ color: '#374151', fontWeight: 500 }}>New Job</span>
          </div>
        </div>

        <div style={{ padding: '32px', display: 'flex', gap: '32px', alignItems: 'flex-start', maxWidth: '1100px' }}>

          {/* LEFT: Form */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Heading */}
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>New Remediation Job</h1>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Paste your error log and repo URL. The agent will automatically find the broken file and function.</p>
            </div>

            {/* Form card */}
            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Repo URL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GitHub Repo URL</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '0 14px', transition: 'border-color 0.15s' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>
                  <input
                    value={form.repo_url}
                    onChange={e => setForm({ ...form, repo_url: e.target.value })}
                    placeholder="https://github.com/your-org/your-repo"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#111827', padding: '12px 0' }}
                  />
                </div>
              </div>

              {/* Error log */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Error Log</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>Remove sensitive data before pasting</span>
                    <button onClick={() => setForm({ ...form, error_log: EXAMPLE_LOG })} style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Use example</button>
                  </div>
                </div>
                <textarea
                  value={form.error_log}
                  onChange={e => setForm({ ...form, error_log: e.target.value })}
                  placeholder="Paste your API error log here..."
                  style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '14px', fontSize: '13px', color: '#111827', fontFamily: 'monospace', resize: 'none', height: '200px', outline: 'none', lineHeight: 1.6 }}
                />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 16px', borderRadius: '10px', fontSize: '13px' }}>{error}</div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: loading ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: loading ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: '15px', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(124,58,237,0.35)', transition: 'all 0.2s' }}
              >
                {loading ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid #9ca3af', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    Run Agent →
                  </>
                )}
              </button>
            </div>

            {/* Info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {[
                { icon: '⚡', title: 'Automatic', desc: 'Agent finds the broken file and function automatically — no need to specify.', color: '#f5f3ff', iconColor: '#7c3aed' },
                { icon: '🔒', title: 'Safe', desc: 'No code is executed server-side. Only read access to your repository.', color: '#f0fdf4', iconColor: '#16a34a' },
                { icon: '⎇', title: 'PR Ready', desc: 'Opens a GitHub PR with full explanation of what changed and why.', color: '#eff6ff', iconColor: '#2563eb' },
              ].map(c => (
                <div key={c.title} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '10px' }}>{c.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>{c.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: How it works panel */}
          <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>How it works</div>
              {[
                { step: '1', label: 'Detect', desc: 'AI reads your error log and extracts the failing endpoint and field.', color: '#f5f3ff', text: '#7c3aed' },
                { step: '2', label: 'Search', desc: 'GitHub Code Search finds the exact file and function to fix.', color: '#eff6ff', text: '#2563eb' },
                { step: '3', label: 'Crawl', desc: 'Fetches the vendor\'s latest OpenAPI spec and diffs the schema.', color: '#f0fdf4', text: '#16a34a' },
                { step: '4', label: 'Patch', desc: 'Rewrites the broken function and validates syntax with AST.', color: '#fffbeb', text: '#d97706' },
                { step: '5', label: 'PR', desc: 'Opens a GitHub PR with full explanation ready to review.', color: '#fef2f2', text: '#dc2626' },
              ].map((s, i) => (
                <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: i < 4 ? '16px' : 0, position: 'relative' }}>
                  {i < 4 && <div style={{ position: 'absolute', left: '15px', top: '32px', width: '2px', height: '20px', background: '#f0f0f0' }} />}
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: s.color, color: s.text, fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{s.label}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4, marginTop: '2px' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vendor support card */}
            <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '14px', padding: '20px', color: '#fff' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Supported Vendors</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Stripe', 'Twilio', 'Shopify', 'Plaid', 'SendGrid', 'GitHub', 'Slack', '+44 more'].map(v => (
                  <span key={v} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 500 }}>{v}</span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}