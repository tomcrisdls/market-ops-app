import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.png'

export function SetPasswordPage() {
  const { user, updatePassword } = useAuth()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    const { error } = await updatePassword(password)
    if (error) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <img src={logo} alt="Time Out Market" style={{ height: 48, objectFit: 'contain' }} />
          <p style={{ fontSize: 13, color: 'var(--sub)', margin: 0, letterSpacing: '0.02em' }}>
            Beverage Management
          </p>
        </div>

        {done ? (
          <div className="card" style={{ width: '100%', padding: '32px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 36 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Password set
            </h2>
            <p style={{ fontSize: 14, color: 'var(--sub)', margin: 0, lineHeight: 1.6 }}>
              You're all set. The app is loading now.
            </p>
          </div>
        ) : (
          <div className="card" style={{ width: '100%', padding: '32px 28px' }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px', textAlign: 'center' }}>
                Welcome
              </h2>
              <p style={{ fontSize: 13, color: 'var(--sub)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                Set a password for <strong style={{ color: 'var(--text)' }}>{user?.email}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sub)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--red)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,0,28,0.08)' }}
                  onBlur={e =>  { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sub)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--red)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,0,28,0.08)' }}
                  onBlur={e =>  { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {error && (
                <p style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#c0392b',
                  background: '#fff5f5',
                  border: '1px solid #fecaca',
                  borderRadius: 7,
                  padding: '9px 12px',
                }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 4, justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Setting password…' : 'Set password & continue'}
              </button>
            </form>
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--sub-light)', margin: 0, textAlign: 'center' }}>
          Access is by invitation only.
        </p>
      </div>
    </div>
  )
}
