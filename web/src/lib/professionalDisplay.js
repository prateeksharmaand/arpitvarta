// Normalizes the real `professionals` table shape (backend/migrations/001_schema.sql)
// into the flat fields the UI components use — one place to adapt if the
// backend response shape ever changes, instead of five.
export function capitalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s.'-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
}

export function normalizeProfessional(raw) {
  if (!raw) return null
  const tags = raw.specializations?.length ? raw.specializations : raw.expertise_areas || []

  return {
    id: raw.id,
    name: capitalizeName(raw.display_name || raw.name) || 'Professional',
    photo: raw.avatar_url || null,
    badge: raw.verification_badge || (raw.is_verified ? 'Verified' : null),
    expertise: tags,
    languages: raw.languages || [],
    experienceYears: Number(raw.experience_years) || 0,
    rating: Number(raw.rating) || 0,
    reviewCount: Number(raw.review_count) || 0,
    pricePerMin: Number(raw.per_minute_rate_chat) || 0,
    pricePerMinCall: Number(raw.per_minute_rate_call) || 0,
    online: !!raw.is_online,
    available: raw.is_available !== false,
    pricePerMinVideo: Number(raw.per_minute_rate_video) || 0,
    bio: raw.bio || '',
    title: raw.profession_title || raw.category_name || 'Professional',
    categorySlug: raw.category_slug || null,
    categoryName: raw.category_name || null,
    categoryIcon: raw.category_icon || '💼',
    qualifications: raw.qualifications || [],
    organization: raw.organization || null,
    city: raw.city || null,
    verified: !!raw.is_verified,
    consultations: Number(raw.total_consultations) || 0,
  }
}

export function normalizeReview(raw) {
  return {
    id: raw.id,
    user: raw.is_anonymous ? 'Anonymous' : raw.user_name || 'User',
    rating: Number(raw.rating) || 0,
    text: raw.review_text || '',
    date: raw.created_at ? new Date(raw.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '',
  }
}
