// frontend/src/components/Sidebar.tsx
import { useLocation, useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface SidebarProps {
  user?: string | null
}

const NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'Jobs', path: '/dashboard', icon: '≡', exact: false },
  { label: 'New Job', path: '/jobs/new', icon: '+' },
  { label: 'Repositories', path: '/dashboard?tab=repos', icon: '⌗' },
  { label: 'Webhooks', path: '#', icon: '⚡' },
  { label: 'Discord', path: '#', icon: '◈' },
  { label: 'Docs', path: 'https://github.com/codewithleo1/SelfHeal-API', icon: '📄', external: true },
]

export default function Sidebar({ user }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const initials = user ? user.slice(0, 2).toUpperCase() : 'SC'

  const handleLogout = () => {
    localStorage.removeItem('gh_token')
    localStorage.removeItem('gh_user')
    window.location.href = '/'
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="w-56 min-h-screen bg-zinc-950 border-r border-zinc-900 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-900">
        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <span className="text-black text-xs font-bold">S</span>
        </div>
        <span className="text-sm font-semibold text-white">SelfHeal-API</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
        {NAV.map(item => {
          const active = isActive(item.path)
          const cls = `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition cursor-pointer ${active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`
          if (item.external) {
            return <a key={item.label} href={item.path} target="_blank" rel="noreferrer" className={cls}><span className="text-base w-4 text-center">{item.icon}</span>{item.label}</a>
          }
          return <button key={item.label} onClick={() => navigate(item.path)} className={`${cls} w-full text-left`}><span className="text-base w-4 text-center">{item.icon}</span>{item.label}</button>
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-zinc-900 flex flex-col gap-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-zinc-300">{initials}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-zinc-300 truncate">{user || 'User'}</span>
            <span className="text-xs text-zinc-600 truncate">{user ? `@${user}` : ''}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:text-red-400 hover:bg-zinc-900 transition w-full text-left">
          <span className="text-base w-4 text-center">→</span>Logout
        </button>
      </div>
    </aside>
  )
}