// Thin client for the real arpitvarta-backend (Express + Postgres) that the
// Flutter app already uses. Mirrors that app's contract exactly — see
// user_app/lib/services/api_service.dart — rather than inventing a new
// shape: Bearer-token auth, {success, data, message} envelope.
//
// VITE_API_URL / VITE_SOCKET_URL point at the real backend (a VPS/staging
// URL) once available. Until then these calls simply fail with a network
// error, which every call site already handles via loading/error state.

export const API_URL = import.meta.env.VITE_API_URL || ''
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL

const TOKEN_KEY = 'arpitvarta_auth_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Ignore — storage may be unavailable (private browsing, quota, etc).
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore — storage may be unavailable (private browsing, quota, etc).
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Could not reach the server. Please check your connection.', 0)
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // Some endpoints (e.g. a 204) may have no body — that's fine.
  }

  if (!res.ok) {
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', res.status)
  }

  return data
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}
