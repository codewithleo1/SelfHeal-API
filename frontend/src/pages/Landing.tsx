const API_URL = 'http://localhost:8000'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <span className="text-xl font-bold text-green-400">SelfHeal-API</span>
        <a href={`${API_URL}/api/v1/github/login`} className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-lg transition">
          Login with GitHub
        </a>
      </nav>
      <main className="flex flex-col items-center justify-center flex-1 px-8 text-center gap-6">
        <h1 className="text-5xl font-bold leading-tight max-w-3xl">
          Your APIs break.{' '}
          <span className="text-green-400">We fix them.</span>
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl">
          SelfHeal-API detects schema drift in third-party API integrations,
          patches your client code, and opens a GitHub PR automatically.
        </p>
        <div className="flex gap-4 mt-4">
          <a href={`${API_URL}/api/v1/github/login`} className="bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-3 rounded-lg text-lg transition">
            Get Started Free
          </a>
          <a href="#how-it-works" className="border border-gray-600 hover:border-gray-400 text-white px-8 py-3 rounded-lg text-lg transition">
            How it works
          </a>
        </div>
      </main>
      <section id="how-it-works" className="px-8 py-16 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Paste error log', desc: 'Drop in your 4xx/5xx API error log' },
            { step: '02', title: 'Agent detects drift', desc: 'Claude analyzes the schema change' },
            { step: '03', title: 'Code gets patched', desc: 'Only the broken function is rewritten' },
            { step: '04', title: 'PR opened', desc: 'Ready to review and merge' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="text-green-400 text-sm font-mono mb-2">{step}</div>
              <div className="font-semibold mb-1">{title}</div>
              <div className="text-gray-400 text-sm">{desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}