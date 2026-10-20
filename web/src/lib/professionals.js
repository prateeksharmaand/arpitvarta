// Calls the real arpitvarta-backend professional endpoints (same ones the
// Flutter app uses — see backend/src/routes/professionals.js). Listing and
// profile/reviews are public (no auth required to browse).
import { api } from './api'

export async function fetchProfessionals({ page = 1, limit = 50, sort, onlineOnly, category, q, city } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (sort) params.set('sort', sort)
  if (onlineOnly) params.set('online_only', 'true')
  if (category) params.set('category', category)
  if (q) params.set('q', q)
  if (city) params.set('city', city)

  const res = await api.get(`/api/professionals?${params.toString()}`)
  return {
    list: Array.isArray(res.data) ? res.data : [],
    total: res.total ?? 0,
    page: res.page ?? page,
    limit: res.limit ?? limit,
  }
}

export async function fetchProfessionalById(id) {
  const res = await api.get(`/api/professionals/${id}`)
  return res.data
}

export async function fetchProfessionalReviews(id) {
  const res = await api.get(`/api/professionals/${id}/reviews`)
  return Array.isArray(res.data) ? res.data : []
}

// Reviews are scoped per consultation (professional_id + user_id + consultation_id
// is the DB's unique key) — so this is called from a specific past consultation,
// not just "I want to review this professional" in the abstract.
export async function submitProfessionalReview(professionalId, { rating, reviewText, consultationId, isAnonymous }) {
  const res = await api.post(
    `/api/professionals/${professionalId}/reviews`,
    { rating, review_text: reviewText, consultation_id: consultationId, is_anonymous: isAnonymous },
    { auth: true }
  )
  return res
}

// Backend sort ids (see professionalController.listProfessionals's sortMap) —
// keep the UI's own labels separate from these wire values.
export const sortOptions = [
  { id: 'popular', label: 'Popularity' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'rating', label: 'Rating' },
  { id: 'experience', label: 'Experience' },
]
