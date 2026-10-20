import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL, getToken } from '../lib/api'

// Drives the socket.io consultation lifecycle exactly as the Flutter app
// does (backend/src/socket/index.js) — request_consultation creates the
// session server-side (with wallet/balance checks), the professional accepts
// it, then messages/billing flow over the same socket. Shared by Chat and
// Call since the queue/accept/end lifecycle is identical between them; Call
// additionally fetches an Agora token once status is 'active'.
//
// Status machine: connecting -> queued -> active -> ended
//                            \-> rejected / insufficient_balance / error

export function useConsultation({ professionalId, type }) {
  const socketRef = useRef(null)
  const consultationIdRef = useRef(null)
  const statusRef = useRef('connecting')

  const [status, setStatusState] = useState('connecting')
  const [consultationId, setConsultationIdState] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [peerTyping, setPeerTyping] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const setStatus = useCallback((next) => {
    statusRef.current = next
    setStatusState(next)
  }, [])

  const setConsultationId = useCallback((next) => {
    consultationIdRef.current = next
    setConsultationIdState(next)
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setStatus('error')
      setErrorMessage('You must be logged in.')
      return undefined
    }

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('set_role', { role: 'user' })
      socket.emit('request_consultation', { professional_id: professionalId, type })
    })

    socket.on('consultation_queued', (data) => {
      setStatus('queued')
      if (data?.consultation_id) setConsultationId(data.consultation_id)
    })

    socket.on('consultation_started', (data) => {
      setStatus('active')
      if (data?.consultation_id) setConsultationId(data.consultation_id)
    })

    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg])
    })

    socket.on('peer_typing', (data) => {
      setPeerTyping(!!data?.typing)
    })

    socket.on('billing_tick', (data) => {
      if (typeof data?.elapsed_seconds === 'number') setElapsedSeconds(data.elapsed_seconds)
    })

    socket.on('consultation_ended', () => {
      setStatus('ended')
    })

    socket.on('consultation_rejected', () => {
      setStatus('rejected')
    })

    socket.on('insufficient_balance', () => {
      setStatus('insufficient_balance')
    })

    socket.on('error', (err) => {
      setStatus('error')
      setErrorMessage(typeof err === 'string' ? err : err?.message || 'Something went wrong.')
    })

    socket.on('connect_error', () => {
      setStatus('error')
      setErrorMessage('Could not connect. Please check your connection.')
    })

    return () => {
      if (consultationIdRef.current && statusRef.current === 'active') {
        socket.emit('end_consultation', { consultation_id: consultationIdRef.current })
      }
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalId, type])

  const sendMessage = useCallback((content) => {
    if (!socketRef.current || !consultationIdRef.current || !content.trim()) return
    socketRef.current.emit('send_message', {
      consultation_id: consultationIdRef.current,
      content: content.trim(),
      message_type: 'text',
    })
  }, [])

  const setTyping = useCallback((typing) => {
    if (!socketRef.current || !consultationIdRef.current) return
    socketRef.current.emit(typing ? 'typing_start' : 'typing_stop', {
      consultation_id: consultationIdRef.current,
    })
  }, [])

  const endConsultation = useCallback(() => {
    if (!socketRef.current || !consultationIdRef.current) return
    socketRef.current.emit('end_consultation', { consultation_id: consultationIdRef.current })
  }, [])

  return {
    socket: socketRef,
    status,
    consultationId,
    errorMessage,
    messages,
    peerTyping,
    elapsedSeconds,
    sendMessage,
    setTyping,
    endConsultation,
  }
}
