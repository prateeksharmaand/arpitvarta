import axios from 'axios'

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // An expired session sends the user back to the portal's login page.
    // A failed login itself (wrong password) must stay on the page so the
    // form can show the error.
    const isLoginCall = /\/auth\/(login|register)$/.test(err.config?.url || '')
    if (err.response?.status === 401 && !isLoginCall) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = `${import.meta.env.BASE_URL}login` // BASE_URL = /professional-portal/
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  uploadAvatar: (file) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return api.post('/auth/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const categoryAPI = {
  list: () => api.get('/categories'),
}

export const aiAPI = {
  profileBio: (data) => api.post('/ai/profile-bio', data),
}

export const uploadAPI = {
  documents: (files) => {
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('files', f))
    return api.post('/upload/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const professionalAPI = {
  register: (data) => api.post('/professionals/register', data),
  getMe: () => api.get('/professionals/me'),
  updateMe: (data) => api.put('/professionals/me', data),
  getDashboard: () => api.get('/professionals/me/dashboard'),
  updateAvailability: (is_available) => api.patch('/professionals/availability', { is_available }),
  getConsultationHistory: () => api.get('/professionals/consultations/history'),
  getConsultationMessages: (id) => api.get(`/professionals/consultations/${id}/messages`),
}

export const liveAPI = {
  getSessions: () => api.get('/live/sessions'),
  createSession: (data) => api.post('/live/sessions', data),
  startSession: (id) => api.patch(`/live/sessions/${id}/start`),
  endSession: (id) => api.patch(`/live/sessions/${id}/end`),
}

export const communityAPI = {
  getPosts: (category) => api.get(`/live/community${category && category !== 'all' ? `?category=${category}` : ''}`),
  createPost: (data) => api.post('/live/community', data),
  deletePost: (id) => api.delete(`/live/community/${id}`),
  toggleLike: (id) => api.post(`/live/community/${id}/like`),
  getComments: (id) => api.get(`/live/community/${id}/comments`),
  addComment: (id, content) => api.post(`/live/community/${id}/comments`, { content }),
}

export const agoraAPI = {
  getToken: (channel, uid = 1) => api.get(`/agora/token?channel=${channel}&uid=${uid}`),
}

export const walletAPI = {
  getWallet: () => api.get('/professionals/me/wallet'),
  getStats: () => api.get('/professionals/me/wallet'),
  getTransactions: () => api.get('/professionals/me/transactions'),
}

export default api
