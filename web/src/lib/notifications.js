import { api } from './api'

export async function fetchNotifications() {
  const res = await api.get('/api/live/notifications', { auth: true })
  return Array.isArray(res.data) ? res.data : []
}

export async function markAllNotificationsRead() {
  return api.patch('/api/live/notifications/read-all', undefined, { auth: true })
}
