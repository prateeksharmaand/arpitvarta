import { createContext, useContext, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import LoginModal from '../components/auth/LoginModal'

// Implements "Professional Profile -> Chat -> Login Required -> Login ->
// Automatically continue to Chat" without a page redirect: the calling page
// stays mounted, and requireAuth() either runs the action immediately (if
// already logged in) or opens the login modal and replays the action on
// success — no need to re-select the professional or re-click Chat/Call.

const RequireAuthContext = createContext(null)

export function RequireAuthProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const pendingActionRef = useRef(null)

  function requireAuth(action, promptMessage = 'Log in to continue.') {
    if (isAuthenticated) {
      action()
      return
    }
    pendingActionRef.current = action
    setMessage(promptMessage)
    setOpen(true)
  }

  function handleClose() {
    pendingActionRef.current = null
    setOpen(false)
  }

  function handleSuccess() {
    setOpen(false)
    const action = pendingActionRef.current
    pendingActionRef.current = null
    // A gated action (Chat/Call) continues where the user was; a plain login
    // lands on the professional list.
    if (action) action()
    else navigate('/professionals')
  }

  function openLogin(promptMessage = '') {
    pendingActionRef.current = null
    setMessage(promptMessage)
    setOpen(true)
  }

  return (
    <RequireAuthContext.Provider value={{ requireAuth, openLogin }}>
      {children}
      <LoginModal open={open} onClose={handleClose} onSuccess={handleSuccess} message={message} />
    </RequireAuthContext.Provider>
  )
}

export function useRequireAuth() {
  const ctx = useContext(RequireAuthContext)
  if (!ctx) throw new Error('useRequireAuth must be used within a RequireAuthProvider')
  return ctx.requireAuth
}

export function useOpenLogin() {
  const ctx = useContext(RequireAuthContext)
  if (!ctx) throw new Error('useOpenLogin must be used within a RequireAuthProvider')
  return ctx.openLogin
}
