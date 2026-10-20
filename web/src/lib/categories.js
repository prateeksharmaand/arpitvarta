// Profession categories (doctors, lawyers, CAs, …) — managed by admins in the
// admin portal, served by backend/src/controllers/categoryController.js.
import { api } from './api'

let cache = null

export async function fetchCategories() {
  if (cache) return cache
  const res = await api.get('/api/categories')
  cache = Array.isArray(res.data) ? res.data : []
  return cache
}

export async function fetchCategory(slug) {
  const res = await api.get(`/api/categories/${encodeURIComponent(slug)}`)
  return res.data
}

export async function fetchHome() {
  const res = await api.get('/api/dashboard', { auth: true })
  return res.data
}
