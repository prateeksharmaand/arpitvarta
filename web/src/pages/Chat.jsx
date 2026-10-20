import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, Send, PhoneOff, Wallet } from 'lucide-react'
import { T } from '@i18n'
import { fetchProfessionalById } from '../lib/professionals'
import { normalizeProfessional } from '../lib/professionalDisplay'
import { useConsultation } from '../hooks/useConsultation'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/ui/Avatar'
import { setPageMeta } from '../lib/demo'

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const s = (totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const statusCopy = {
  connecting: 'Connecting…',
  queued: 'Waiting for the professional to accept…',
  rejected: 'Not available right now',
  insufficient_balance: 'Low wallet balance',
  ended: 'Chat ended',
  error: 'Connection problem',
}

export default function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [professional, setProfessional] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [text, setText] = useState('')
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const {
    status, errorMessage, messages, peerTyping, elapsedSeconds, sendMessage, setTyping, endConsultation,
  } = useConsultation({ professionalId: id, type: 'chat' })

  useEffect(() => {
    let cancelled = false
    fetchProfessionalById(id)
      .then((raw) => {
        if (!cancelled) setProfessional(normalizeProfessional(raw))
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (professional) {
      setPageMeta(`Chat with ${professional.name} | ArpitVarta`, `Live chat consultation with ${professional.name}.`)
    }
  }, [professional])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (notFound) {
    return <Navigate to="/professionals" replace />
  }

  function handleInputChange(e) {
    setText(e.target.value)
    setTyping(true)
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 1500)
  }

  function handleSend(e) {
    e.preventDefault()
    if (!text.trim()) return
    sendMessage(text)
    setText('')
    setTyping(false)
  }

  function handleEnd() {
    endConsultation()
  }

  const isOwnMessage = (msg) => (msg.sender_type ? msg.sender_type === 'user' : msg.sender_id === user?.id)

  return (
    <div className="container-page py-6 sm:py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand mb-4"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card flex flex-col h-[70vh] overflow-hidden !p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Avatar src={professional?.photo} name={professional?.name} size={40} online={status === 'active'} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{professional?.name || 'Professional'}</p>
            <p className="text-xs text-text-muted">
              {status === 'active' ? `Live · ${formatTime(elapsedSeconds)}` : <T>{statusCopy[status] || status}</T>}
            </p>
          </div>
          {status === 'active' && (
            <button
              type="button"
              onClick={handleEnd}
              className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center text-error hover:bg-error/20 transition-colors"
              aria-label="End chat"
            >
              <PhoneOff size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        {status === 'connecting' || status === 'queued' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <span className="w-12 h-12 rounded-full border-4 border-surface-light border-t-brand animate-spin" />
            <p className="text-sm text-text-secondary"><T>{statusCopy[status]}</T></p>
          </div>
        ) : status === 'rejected' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <p className="text-sm text-text-secondary">
              {professional?.name || 'This professional'} isn&apos;t available right now.
            </p>
            <button type="button" onClick={() => navigate(`/professional/profile/${id}`)} className="btn-outline">
              Back to Profile
            </button>
          </div>
        ) : status === 'insufficient_balance' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <Wallet size={28} className="text-brand" />
            <p className="text-sm text-text-secondary">
              You don&apos;t have enough wallet balance to start this consultation.
            </p>
            <button type="button" onClick={() => navigate('/account')} className="btn-primary">
              Add Money to Wallet
            </button>
          </div>
        ) : status === 'error' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <p className="text-sm text-error">{errorMessage || 'Something went wrong.'}</p>
            <button type="button" onClick={() => navigate(`/professional/profile/${id}`)} className="btn-outline">
              Back to Profile
            </button>
          </div>
        ) : status === 'ended' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <p className="text-sm text-text-secondary">This consultation has ended.</p>
            <p className="text-xs text-text-muted">Duration: {formatTime(elapsedSeconds)}</p>
            <button type="button" onClick={() => navigate(`/professional/profile/${id}`)} className="btn-outline">
              Back to Profile
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
            {messages.length === 0 && (
              <p className="text-xs text-text-muted text-center mt-4">
                You&apos;re connected — say hello to get started.
              </p>
            )}
            {messages.map((msg, i) => {
              const own = isOwnMessage(msg)
              return (
                <div
                  key={msg.id || i}
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    own
                      ? 'self-end bg-brand text-white rounded-tr-sm'
                      : 'self-start bg-surface-light text-text-primary rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              )
            })}
            {peerTyping && (
              <p className="text-xs text-text-muted italic">{professional?.name || 'Professional'} is typing…</p>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        {status === 'active' && (
          <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-3 border-t border-border shrink-0">
            <input
              type="text"
              value={text}
              onChange={handleInputChange}
              placeholder="Type a message…"
              className="input-field flex-1 !py-2.5"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center disabled:opacity-40 shrink-0"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
