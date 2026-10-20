import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI, professionalAPI } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [professional, setProfessional] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      connectSocket(token)
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchProfile() {
    try {
      const res = await authAPI.getProfile()
      const userData = res.data.data
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))

      // Try to fetch professional profile
      try {
        const me = await professionalAPI.getMe()
        setProfessional(me.data.data)
      } catch {
        // Not a professional yet
      }
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const res = await authAPI.login({ email, password, login_as: 'professional' })
    const { user: userData, token } = res.data.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    connectSocket(token)

    try {
      const me = await professionalAPI.getMe()
      setProfessional(me.data.data)
    } catch {
      // Not yet registered as professional
    }

    return userData
  }

  async function register(data) {
    const res = await authAPI.register(data)
    const { user: userData, token } = res.data.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    connectSocket(token)
    return userData
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setProfessional(null)
    disconnectSocket()
  }

  return (
    <AuthContext.Provider value={{ user, professional, setProfessional, loading, login, register, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
