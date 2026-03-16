import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,              setUser]              = useState(null)
  const [profile,           setProfile]           = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Detect invite link click — user is signed in but needs to set a password
      if (event === 'SIGNED_IN') {
        const hash   = window.location.hash
        const params = new URLSearchParams(hash.replace('#', '?'))
        if (params.get('type') === 'invite') {
          setNeedsPasswordSetup(true)
          // Clear the hash so it doesn't persist on refresh
          window.history.replaceState(null, '', window.location.pathname)
        }
      }

      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) setNeedsPasswordSetup(false)
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, needsPasswordSetup, signIn, signOut, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
