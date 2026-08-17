// frontend/src/pages/Landing.tsx
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STEPS = [
  { n: '01', title: 'Detect', desc: 'LLM analyzes the error log, extracts endpoint + failing field' },
  { n: '02', title: 'Search', desc: 'GitHub Code Search locates the broken file and function' },
  { n: '03', title: 'Crawl', desc: 'Fetches vendor OpenAPI spec, identifies what changed' },
  { n: '04', title: 'Patch', desc: 'Rewrites the broken function with AST-validated code gen' },
  { n: '05', title: 'PR', desc: 'Opens a GitHub PR with full explanation + Discord alert' },
]

const FEATURES = [
  { icon: '⚡', title: 'Lightning Fast', desc: 'End-to-end in under 60 seconds' },
  { icon: '🤖', title: 'Autonomous', desc: 'Works while you sleep. Zero human input' },
  { icon: '🔓', title: 'Open Source', desc: 'MIT License. Built for developers' },
  { icon: '🎁', title: 'Free Forever', desc: '100% free-tier infrastructure' },
  { icon: '🔒', title: 'Secure', desc: 'Tokens encrypted. No code execution' },
]

const VENDORS = ['Stripe', 'Twilio', 'Shopify', 'SendGrid', 'Plaid']

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-zinc-900 sticky top-0 bg-zinc-950 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center"><span className="text-black text-xs font-bold">S</span></div>
          <span className="text-sm font-semibold text-white">SelfHeal-API</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition">How it works</a>
          <a href="#features" className="text-sm text-zinc-400 hover:text-white transition">Features</a>
          <a href="https://github.com/codewithleo1/SelfHeal-API" target="_blank" rel="noreferrer" className="text-sm text-zinc-400 hover:text-white transition">Docs</a>
          <a href={`${API_URL}/api/v1/github/login`} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition">Get Started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-8 py-24 text-center gap-8 max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-emerald-950 border border-emerald-900 px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Autonomous AI Agent</span>
        </div>
        <h1 className="text-6xl font-bold leading-tight tracking-tight">Detects API Breaks.<br /><span className="text-zinc-400">Patches Code.</span><br /><span className="text-emerald-400">Opens PRs.</span></h1>
        <p className="text-zinc-400 text-xl max-w-2xl leading-relaxed">SelfHeal-API detects schema drift, patches your client code, and opens a GitHub PR — without human intervention.</p>
        <div className="flex items-center gap-4">
          <a href={`${API_URL}/api/v1/github/login`} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-3.5 rounded-xl text-base transition">Start Now for Free</a>
          <a href="https://github.com/codewithleo1/selfheal-test-repo/pull/17" target="_blank" rel="noreferrer" className="border border-zinc-700 hover:border-zinc-500 text-white px-8 py-3.5 rounded-xl text-base transition">View Live Demo →</a>
        </div>
        {/* Trust badges */}
        <div className="flex items-center gap-8 mt-4 flex-wrap justify-center">
          {[{ icon: '🎁', text: '100% Free Tier' }, { icon: '⚡', text: '< 60 Seconds' }, { icon: '🤖', text: 'Zero Human Input' }, { icon: '🔓', text: 'Open Source' }].map(b => (
            <div key={b.text} className="flex items-center gap-2 text-sm text-zinc-500"><span>{b.icon}</span><span>{b.text}</span></div>
          ))}
        </div>
        {/* Vendor logos */}
        <div className="flex flex-col items-center gap-3 mt-4">
          <span className="text-xs text-zinc-600 uppercase tracking-widest">Trusted by developers building with</span>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            {VENDORS.map(v => <span key={v} className="text-sm font-semibold text-zinc-500 hover:text-zinc-300 transition">{v}</span>)}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-8 py-20 bg-zinc-900/30 border-y border-zinc-900">
        <div className="max-w-5xl mx-auto flex flex-col gap-12">
          <div className="text-center flex flex-col gap-3">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="text-zinc-400">Five autonomous steps. Zero human input required.</p>
          </div>
          <div className="flex flex-col gap-0">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-start gap-6 relative">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center flex-shrink-0 z-10"><span className="text-xs font-mono text-emerald-400">{s.n}</span></div>
                  {i < STEPS.length - 1 && <div className="w-px h-12 bg-zinc-800" />}
                </div>
                <div className="flex flex-col gap-1 pb-8">
                  <span className="font-semibold text-white">{s.title}</span>
                  <span className="text-sm text-zinc-500">{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Live proof */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-sm font-medium text-emerald-400">Live Pipeline Proof</span></div>
            <p className="text-zinc-400 text-sm">PR opened and merged autonomously on August 10, 2026 — zero human input.</p>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs font-mono text-zinc-600">Job: 61c02ac4</span>
              <a href="https://github.com/codewithleo1/selfheal-test-repo/pull/17" target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 transition font-mono">selfheal-test-repo/pull/17 — MERGED →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-8 py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-12">
          <div className="text-center flex flex-col gap-3">
            <h2 className="text-3xl font-bold">Why SelfHeal-API</h2>
            <p className="text-zinc-400">Built for developers who can't afford API drift downtime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3 hover:border-zinc-700 transition">
                <span className="text-3xl">{f.icon}</span>
                <span className="font-semibold text-white">{f.title}</span>
                <span className="text-sm text-zinc-500">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20 border-t border-zinc-900">
        <div className="max-w-2xl mx-auto text-center flex flex-col gap-6">
          <h2 className="text-3xl font-bold">Stop fixing API breaks manually.</h2>
          <p className="text-zinc-400">Connect your GitHub repo and let SelfHeal-API handle the rest.</p>
          <a href={`${API_URL}/api/v1/github/login`} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-10 py-4 rounded-xl text-lg transition self-center">Get Started Free →</a>
          <p className="text-xs text-zinc-600">No credit card required. 100% free tier.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 px-8 py-6 flex items-center justify-between">
        <span className="text-xs text-zinc-600">Built by <a href="https://github.com/codewithleo1" className="text-zinc-500 hover:text-zinc-300 transition">Suraj</a></span>
        <div className="flex items-center gap-4">
          <a href="https://github.com/codewithleo1/SelfHeal-API" target="_blank" rel="noreferrer" className="text-xs text-zinc-600 hover:text-zinc-400 transition">GitHub</a>
          <a href="https://github.com/codewithleo1/SelfHeal-API/blob/main/SECURITY.md" target="_blank" rel="noreferrer" className="text-xs text-zinc-600 hover:text-zinc-400 transition">Security</a>
        </div>
      </footer>
    </div>
  )
}