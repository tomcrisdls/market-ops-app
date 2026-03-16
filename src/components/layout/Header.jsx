import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.png'

export function Header({ moduleTitle = 'Beverage Management' }) {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const now     = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="header">
      <div className="header-brand">
        <img src={logo} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />
        <div className="header-sep" />
        <div className="header-title">{moduleTitle}</div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="header-date">{dateStr}</span>

        {/* User avatar + dropdown */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 8,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {/* Avatar circle */}
            <div style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'var(--red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              letterSpacing: '0.02em',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>
              {profile?.full_name?.split(' ')[0] ?? 'Account'}
            </span>
            {/* Chevron */}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, transition: 'transform 0.15s ease', transform: menuOpen ? 'rotate(180deg)' : 'none' }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              minWidth: 180,
              overflow: 'hidden',
              animation: 'slideUp 0.18s cubic-bezier(0.32, 0.72, 0, 1)',
              zIndex: 1000,
            }}>
              {/* Profile info */}
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {profile?.full_name ?? 'Unknown'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2, textTransform: 'capitalize' }}>
                  {profile?.role ?? 'manager'}
                </div>
              </div>

              {/* Sign out */}
              <button
                onClick={() => { setMenuOpen(false); signOut() }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--text)',
                  textAlign: 'left',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2M9.5 9.5L12 7l-2.5-2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
