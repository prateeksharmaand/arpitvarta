import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '../ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'

const emptyForm = { name: '', email: '', password: '' }

export default function LoginModal({ open, onClose, onSuccess, message }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleClose() {
    setForm(emptyForm)
    setError('')
    setMode('login')
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email.trim(), form.password)
      } else {
        await register({ email: form.email.trim(), password: form.password, name: form.name.trim() })
      }
      setForm(emptyForm)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={mode === 'login' ? 'Log In' : 'Create Account'}>
      {message && (
        <p className="text-sm text-text-secondary mb-4 bg-surface-light rounded-xl px-3 py-2.5">{message}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'register' && (
          <div>
            <label htmlFor="auth-name" className="block text-sm font-medium mb-1.5">Full Name</label>
            <input
              id="auth-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Enter your full name"
              className="input-field"
              required
            />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className="block text-sm font-medium mb-1.5">Email</label>
          <input
            id="auth-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            className="input-field"
            required
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="block text-sm font-medium mb-1.5">Password</label>
          <input
            id="auth-password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="At least 6 characters"
            className="input-field"
            minLength={6}
            required
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button type="submit" className="btn-primary w-full inline-flex items-center justify-center gap-2" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>

      <p className="text-sm text-text-secondary text-center mt-4">
        {mode === 'login' ? (
          <>
            New here?{' '}
            <button type="button" onClick={() => setMode('register')} className="text-brand font-semibold hover:underline">
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" onClick={() => setMode('login')} className="text-brand font-semibold hover:underline">
              Log in
            </button>
          </>
        )}
      </p>
    </Modal>
  )
}
