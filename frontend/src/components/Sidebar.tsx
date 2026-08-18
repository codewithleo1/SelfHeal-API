// frontend/src/components/Sidebar.tsx
import { useLocation, useNavigate } from 'react-router-dom'

interface SidebarProps {
  user?: string | null
}

const NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'Jobs', path: '/dashboard', icon: '≡' },
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
    <aside style={{ width: '200px', minHeight: '100vh', background: '#1e1e1e', borderRight: '0.5px solid #333', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderBottom: '0.5px solid #333' }}>
        <div style={{ width: '28px', height: '28px', background: '#10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#000', fontSize: '13px', fontWeight: 700 }}>S</span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>SelfHeal-API</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px 8px', flex: 1 }}>
        {NAV.map(item => {
          const active = isActive(item.path)
          const style = { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: active ? '#2d2d2d' : 'transparent', color: active ? '#fff' : '#a1a1aa', fontWeight: active ? 500 : 400, border: 'none', width: '100%', textAlign: 'left' as const, textDecoration: 'none' }
          if (item.external) return <a key={item.label} href={item.path} target="_blank" rel="noreferrer" style={style}><span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>{item.label}</a>
          return <button key={item.label} onClick={() => navigate(item.path)} style={style}><span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>{item.label}</button>
        })}
      </nav>

      <div style={{ padding: '10px 8px', borderTop: '0.5px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{initials}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user || 'User'}</span>
            <span style={{ fontSize: '11px', color: '#71717a' }}>@{user}</span>
          </div>
        </div>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', fontSize: '13px', color: '#71717a', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
          <span style={{ width: '16px', textAlign: 'center' }}>→</span>Logout
        </button>
      </div>
    </aside>
  )
}