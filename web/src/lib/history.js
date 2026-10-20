// Chat/consultation history endpoints. Threads (backend/src/routes/threads.js)
// already exist and are scoped to req.user.id. Consultation history is a
// NEW endpoint this feature needs — see the backend hand-off notes in the
// plan file; it doesn't exist on the live backend yet, so this call will
// 404 until that's deployed. Every call site here already handles that
// gracefully (empty-state, not a crash).
import { api } from './api'

export async function fetchChatThreads() {
  const res = await api.get('/api/threads', { auth: true })
  return Array.isArray(res.data) ? res.data : []
}

export async function fetchConsultationHistory({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  const res = await api.get(`/api/consultations/history?${params.toString()}`, { auth: true })
  return { list: Array.isArray(res.data) ? res.data : [], total: res.total ?? 0 }
}
