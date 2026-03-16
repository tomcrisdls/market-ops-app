import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Header }         from './components/layout/Header'
import { LoginPage }      from './components/auth/LoginPage'
import { BeverageModule } from './modules/beverages/BeverageModule'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

function MobileBlock() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      textAlign: 'center',
      background: 'var(--bg)',
      gap: 16,
    }}>
      <div style={{ fontSize: 52 }}>🖥️</div>
      <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text)' }}>
        Desktop Only
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.6 }}>
        This app is designed for desktop use. Please open it on a computer or laptop.
      </div>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()
  const isDesktop = useIsDesktop()

  if (!isDesktop) return <MobileBlock />

  // Blank screen while session is being checked
  if (loading) return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--border)', borderTopColor: 'var(--red)', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (!user) return <LoginPage />

  return (
    <>
      <Header moduleTitle="N/A Beverage Management" />
      <BeverageModule />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
