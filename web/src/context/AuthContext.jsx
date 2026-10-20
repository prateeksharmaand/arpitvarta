import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken, clearToken } from '../lib/api'

// Mirrors user_app's AuthProvider (lib/providers/auth_provider.dart) 1:1 —
// same backend, same token, same user shape — so a Flutter-app user can log
// into the website with the same account.

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const tryAutoLogin = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await api.get('/api/auth/profile', { auth: true })
      setUser(res.data)
    } catch {
      // Expired/invalid token — same reactive handling as the Flutter app.
      clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    tryAutoLogin()
  }, [tryAutoLogin])

  async function login(email, password) {
    const res = await api.post('/api/auth/login', { email, password, login_as: 'user' })
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  async function register({ email, password, name, phone, city }) {
    const res = await api.post('/api/auth/register', {
      email,
      password,
      name,
      phone: phone || undefined,
      city: city || undefined,
    })
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshProfile: tryAutoLogin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
