// frontend/src/components/Sidebar.tsx

import { useLocation, useNavigate } from 'react-router-dom'

interface SidebarProps { user?: string | null }

const NAV = [
  { label: 'Dashboard',    path: '/dashboard',          icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { label: 'Jobs',         path: '/jobs', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { label: 'New Job',      path: '/jobs/new',           icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
  { label: 'Repositories', path: '/dashboard?tab=repos', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg> },
  { label: 'PRs',          path: '#',                   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg> },
  { label: 'Webhooks',     path: '#',                   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { label: 'Integrations', path: '#',                   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M19.07 19.07l-1.41-1.41M5.34 5.34 3.93 3.93M22 12h-2M4 12H2M12 22v-2M12 4V2"/></svg> },
  { label: 'Settings',     path: '#',                   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  { label: 'Docs',         path: 'https://github.com/codewithleo1/SelfHeal-API', external: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
]

function RobotMascot() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="36" cy="36" r="36" fill="rgba(124,58,237,0.2)" />
      <rect x="20" y="32" width="32" height="24" rx="6" fill="#7c3aed" />
      <rect x="22" y="16" width="28" height="22" rx="8" fill="#6d28d9" />
      <circle cx="29" cy="26" r="4" fill="#fff" />
      <circle cx="43" cy="26" r="4" fill="#fff" />
      <circle cx="30" cy="27" r="2" fill="#1e1b4b" />
      <circle cx="44" cy="27" r="2" fill="#1e1b4b" />
      <circle cx="31" cy="25.5" r="0.8" fill="#fff" />
      <circle cx="45" cy="25.5" r="0.8" fill="#fff" />
      <line x1="36" y1="16" x2="36" y2="10" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="9" r="2.5" fill="#a78bfa" />
      <path d="M29 35 Q36 39 43 35" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="10" y="34" width="10" height="6" rx="3" fill="#7c3aed" />
      <rect x="52" y="34" width="10" height="6" rx="3" fill="#7c3aed" />
      <path d="M32 42 L36 40 L40 42 L40 48 Q36 51 32 48 Z" fill="#a78bfa" opacity="0.7" />
      <path d="M34 45 L35.5 46.5 L38.5 43.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export default function Sidebar({ user }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const initials = user ? user.slice(0, 2).toUpperCase() : 'SU'

  const handleLogout = () => {
    localStorage.removeItem('gh_token')
    localStorage.removeItem('gh_user')
    window.location.href = '/'
  }

  // Active detection — checks both pathname and search params
  const isActive = (path: string) => {
    if (path === '#') return false
    if (path.startsWith('http')) return false
    const [p, q] = path.split('?')
    const tab = q ? new URLSearchParams(q).get('tab') : null
    const currentTab = new URLSearchParams(location.search).get('tab')
    if (path === '/dashboard' && !q) {
      // "Dashboard" nav item is active only when on /dashboard with no tab param
      return location.pathname === '/dashboard' && !currentTab
    }
    if (p === '/dashboard' && tab) {
      return location.pathname === '/dashboard' && currentTab === tab
    }
    return p === '/jobs' ? location.pathname === '/jobs' : location.pathname.startsWith(p)
  }

  return (
    <aside style={{ width: '220px', minHeight: '100vh', background: '#0f1117', display: 'flex', flexDirection: 'column', flexShrink: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
            SelfHeal<span style={{ color: '#a78bfa' }}>-API</span>
          </div>
        </div>
        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, lineHeight: 1.4, paddingLeft: '2px' }}>AI heals your APIs while you sleep.</p>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px 10px', flex: 1 }}>
        {NAV.map(item => {
          const active = isActive(item.path)
          if ((item as any).external) {
            return (
              <a key={item.label} href={item.path} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', color: '#9ca3af', textDecoration: 'none' }}>
                <span style={{ color: '#6b7280', flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                {item.label}
              </a>
            )
          }
          return (
            <button key={item.label} onClick={() => item.path !== '#' && navigate(item.path)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: active ? 600 : 400, cursor: item.path === '#' ? 'default' : 'pointer', border: 'none', width: '100%', textAlign: 'left', background: active ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'transparent', color: active ? '#fff' : '#9ca3af', boxShadow: active ? '0 4px 12px rgba(124,58,237,0.3)' : 'none' }}>
              <span style={{ color: active ? '#e9d5ff' : '#6b7280', flexShrink: 0, display: 'flex' }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Robot mascot card */}
      <div style={{ margin: '0 10px 12px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)', borderRadius: '50%' }} />
        <RobotMascot />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Autonomous Healing</div>
          <div style={{ fontSize: '11px', color: '#a78bfa', lineHeight: 1.4 }}>Detects. Patches. Opens PRs.<br />All while you sleep.</div>
        </div>
        <button onClick={() => navigate('/jobs/new')} style={{ marginTop: '4px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
          See How It Works →
        </button>
      </div>

      {/* User profile */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#fff' }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user || 'User'}</span>
              <span style={{ fontSize: '10px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', padding: '1px 6px', borderRadius: '999px', fontWeight: 600, flexShrink: 0 }}>Pro</span>
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user ? `${user}@example.c...` : ''}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', fontSize: '12px', color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', marginTop: '2px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log out
        </button>
      </div>

    </aside>
  )
}