// AI assistant (Gemini, server-side). Describes the user's problem in plain
// language and routes them to the right kind of professional.
import { api } from './api'

export async function askAssistant(query) {
  const res = await api.post('/api/ai/assist', { query }, { auth: true })
  return res.data
}
