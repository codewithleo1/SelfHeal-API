// frontend/src/pages/DemoRunner.tsx
// Public page — no auth required.
// Visitor clicks "Run Live Demo" → real pipeline runs on selfheal-test-repo
// → live step progress → real PR opens → locked CTA to sign in

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STEPS = [
  { key: 'detect', n: '01', label: 'Detect',  desc: 'AI reads the error log, extracts failing endpoint and field',    color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'search', n: '02', label: 'Search',  desc: 'GitHub Code Search locates the broken file and function',         color: '#2563eb', bg: '#eff6ff' },
  { key: 'crawl',  n: '03', label: 'Crawl',   desc: "Fetches Stripe's OpenAPI spec, diffs what changed",               color: '#0891b2', bg: '#ecfeff' },
  { key: 'patch',  n: '04', label: 'Patch',   desc: 'Rewrites the broken function, validates with AST parser',         color: '#16a34a', bg: '#f0fdf4' },
  { key: 'pr',     n: '05', label: 'PR',      desc: 'Opens a GitHub Pull Request with full explanation',               color: '#dc2626', bg: '#fef2f2' },
]

const VENDORS = ['Stripe', 'Twilio', 'Shopify', 'SendGrid', 'Plaid']

type Phase = 'idle' | 'starting' | 'running' | 'done' | 'error' | 'ratelimit'

export default function DemoRunner() {
  const navigate = useNavigate()
  const [phase, setPhase]     = useState<Phase>('idle')
  const [prUrl, setPrUrl]     = useState<string | null>(null)
  const [errMsg, setErrMsg]   = useState('')
  const [elapsed, setElapsed] = useState(0)

  const S = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

  const runDemo = async () => {
    setPhase('starting')
    setElapsed(0)
    setErrMsg('')
    setPrUrl(null)

    // Start elapsed timer
    const t0 = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500)

    try {
      // 1. Hit the demo endpoint — resets the file, enqueues a real job
      const res  = await fetch(`${API_URL}/api/v1/demo/run`, { method: 'POST' })
      const data = await res.json()

      if (res.status === 429) {
        clearInterval(timer)
        setPhase('ratelimit')
        setErrMsg(data.detail || 'Rate limited')
        return
      }
      if (!res.ok) {
        clearInterval(timer)
        setPhase('error')
        setErrMsg(data.detail || 'Failed to start demo')
        return
      }

      const id = data.job_id
      setPhase('running')

      // 2. Redirect to the real JobProgress page — it polls every 2s automatically
      //    Pass ?demo=true so JobProgress shows the demo banner
      clearInterval(timer)
      navigate(`/jobs/${id}?demo=true`)

    } catch (e: any) {
      clearInterval(timer)
      setPhase('error')
      setErrMsg(e.message || 'Network error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#fff', display: 'flex', flexDirection: 'column', ...S }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>SelfHeal<span style={{ color: '#a78bfa' }}>-API</span></span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Running on</span>
          <a href="https://github.com/codewithleo1/selfheal-test-repo" target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#a78bfa', textDecoration: 'none', fontFamily: 'monospace' }}>codewithleo1/selfheal-test-repo</a>
          <a href={`${API_URL}/api/v1/github/login`} style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: 600, fontSize: '13px', padding: '8px 18px', borderRadius: '8px', textDecoration: 'none' }}>Sign In →</a>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 32px', gap: '40px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', padding: '6px 16px', borderRadius: '999px', alignSelf: 'center' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa' }} />
            <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>Live Demo — Real Pipeline</span>
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
            Watch the Agent<br />
            <span style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Heal Code Live</span>
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280', maxWidth: '560px', margin: '0 auto', lineHeight: 1.6 }}>
            Click the button below. The agent will run all 5 steps autonomously on our test repo —
            detect the Stripe schema drift, patch the code, and open a real GitHub PR.
          </p>
        </div>

        {/* The broken file preview */}
        <div style={{ width: '100%', background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#13151f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
            </div>
            <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', marginLeft: '8px' }}>stripe_client.py</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>BROKEN</span>
          </div>
          <pre style={{ margin: 0, padding: '20px', fontSize: '13px', lineHeight: 1.7, color: '#d1d5db', fontFamily: 'monospace', overflow: 'auto' }}>{`import httpx

def create_payment_intent(amount: int, currency: str) -> dict:
    response = httpx.post(
        "https://api.stripe.com/v1/payment_intents",
        json={
`}<span style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>{`            "amount": amount * 100,  # ❌ Stripe renamed this field`}</span>{`
            "currency": currency,
        },
    )
    return response.json()`}</pre>
        </div>

        {/* Error log preview */}
        <div style={{ width: '100%', background: '#1a1d2e', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Error Log — what the agent receives</div>
          <pre style={{ margin: 0, fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace', lineHeight: 1.6 }}>{`POST /v1/payment_intents 400 Bad Request
{
  "error": {
    "type": "invalid_request_error",
    "message": "Unknown field: amount. Did you mean amount_total?"
  }
}`}</pre>
        </div>

        {/* Pipeline steps */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Agent Pipeline — 5 Autonomous Steps</div>
          {STEPS.map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: s.bg + '22', border: '1px solid ' + s.color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: s.color, fontWeight: 700 }}>{s.n}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.06)' }} />}
              </div>
              <div style={{ paddingBottom: i < STEPS.length - 1 ? '20px' : 0, paddingTop: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6' }}>{s.label}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA button area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>

          {phase === 'idle' && (
            <button
              onClick={runDemo}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: 700, fontSize: '16px', padding: '16px 40px', borderRadius: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 32px rgba(124,58,237,0.4)', transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Run Live Demo Now
            </button>
          )}

          {phase === 'starting' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', padding: '14px 28px', borderRadius: '12px' }}>
                <div style={{ width: '18px', height: '18px', border: '2px solid #a78bfa', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '14px', color: '#a78bfa', fontWeight: 600 }}>Resetting test repo and starting agent...</span>
              </div>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>{elapsed}s elapsed</span>
            </div>
          )}

          {phase === 'running' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '14px 28px', borderRadius: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 600 }}>Agent running — redirecting to live progress...</span>
            </div>
          )}

          {phase === 'ratelimit' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '14px 28px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>Demo runs once per 10 minutes per visitor</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Sign in to run unlimited jobs on your own repos.</div>
              </div>
              <a href={`${API_URL}/api/v1/github/login`} style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '12px 32px', borderRadius: '10px', textDecoration: 'none' }}>Sign In with GitHub →</a>
            </div>
          )}

          {phase === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '14px 28px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 600, marginBottom: '4px' }}>Something went wrong</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{errMsg}</div>
              </div>
              <button onClick={() => setPhase('idle')} style={{ fontSize: '13px', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button>
            </div>
          )}

          {phase === 'done' && prUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '480px' }}>
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '20px 28px', borderRadius: '14px', textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e', marginBottom: '4px' }}>PR Opened Autonomously!</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>The agent detected the drift, patched the code, and opened a real PR — zero human input.</div>
              </div>

              {/* PR link — visible but locked, CTA to sign in */}
              <div style={{ width: '100%', background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
                    <span style={{ fontSize: '13px', color: '#d1d5db', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{prUrl}</span>
                  </div>
                  <span style={{ fontSize: '11px', background: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '999px', fontWeight: 600, flexShrink: 0 }}>Merged</span>
                </div>
                <div style={{ padding: '12px 20px', background: 'rgba(124,58,237,0.08)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>This ran on our test repo. Sign in to run on your repos.</span>
                </div>
              </div>

              <a href={`${API_URL}/api/v1/github/login`} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: 700, fontSize: '15px', padding: '14px 36px', borderRadius: '12px', textDecoration: 'none', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}>
                Sign In to Heal Your Own APIs →
              </a>
            </div>
          )}

          {/* Trust line */}
          {phase === 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[{ icon: '🔒', text: 'Read-only on test repo' }, { icon: '⚡', text: '~60 seconds end-to-end' }, { icon: '🤖', text: 'Zero human input' }].map(b => (
                <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4b5563' }}>
                  <span>{b.icon}</span><span>{b.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vendor strip */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', paddingBottom: '24px' }}>
          <span style={{ fontSize: '11px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Supports</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {VENDORS.map(v => <span key={v} style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>{v}</span>)}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  )
}