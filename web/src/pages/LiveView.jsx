import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation, Navigate } from 'react-router-dom'
import { ArrowLeft, Eye, Send, Gift } from 'lucide-react'
import { useLiveView } from '../hooks/useLiveView'
import { tipPresets } from '../lib/live'
import Avatar from '../components/ui/Avatar'
import { setPageMeta } from '../lib/demo'

// Mirrors user_app's LiveViewScreen — full-bleed video, top bar with
// professional info + viewer count + LIVE badge, scrolling chat overlay,
// bottom input bar with send + tip.
function VideoBackground({ track }) {
  const containerRef = useRef(null)
  useEffect(() => {
    if (track && containerRef.current) track.play(containerRef.current)
    return () => track?.stop()
  }, [track])
  return <div ref={containerRef} className="absolute inset-0 bg-black" />
}

export default function LiveView() {
  const { sessionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const session = location.state?.session

  const [chatText, setChatText] = useState('')
  const [tipOpen, setTipOpen] = useState(false)
  const [tipAmount, setTipAmount] = useState(50)
  const [tipMessage, setTipMessage] = useState('')
  const chatEndRef = useRef(null)

  const { viewerCount, messages, remoteVideoTrack, sendChatMessage, sendTip } = useLiveView({
    sessionId,
    agoraChannel: session?.agora_channel || sessionId,
    initialViewerCount: session?.viewer_count || 0,
  })

  useEffect(() => {
    if (session) {
      setPageMeta(`${session.professional_name} is Live | ArpitVarta`, session.title)
    }
  }, [session])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!session) {
    return <Navigate to="/account" replace />
  }

  function handleSendChat(e) {
    e.preventDefault()
    if (!chatText.trim()) return
    sendChatMessage(chatText)
    setChatText('')
  }

  function handleSendTip() {
    sendTip(tipAmount, tipMessage)
    setTipOpen(false)
    setTipMessage('')
  }

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col overflow-hidden">
      {remoteVideoTrack ? (
        <VideoBackground track={remoteVideoTrack} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand/20 via-black to-black">
          <Avatar src={session.avatar_url} name={session.professional_name} size={112} rounded="rounded-full" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      {/* Top bar */}
      <div className="relative flex items-center gap-3 px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <Avatar src={session.avatar_url} name={session.professional_name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm truncate">{session.professional_name}</p>
          <p className="text-white/70 text-xs truncate">{session.title}</p>
        </div>
        <span className="inline-flex items-center gap-1 bg-black/40 text-white/80 text-xs px-2 py-1 rounded-full">
          <Eye size={12} /> {viewerCount}
        </span>
        <span className="inline-flex items-center gap-1 bg-error text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
        </span>
      </div>

      {/* Chat overlay */}
      <div className="relative flex-1 flex flex-col justify-end overflow-hidden px-3 pb-2">
        <div className="max-h-56 overflow-y-auto flex flex-col gap-2">
          {messages.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${
                  m.isTip ? 'bg-gold' : 'bg-brand'
                }`}
              >
                {m.user?.[0]?.toUpperCase() || '?'}
              </span>
              <p className={`text-sm px-3 py-1.5 rounded-2xl backdrop-blur ${m.isTip ? 'bg-gold/25 border border-gold/40' : 'bg-black/45'}`}>
                <span className={`font-semibold mr-1.5 ${m.isTip ? 'text-gold' : 'text-brand'}`}>{m.user}</span>
                <span className="text-white">{m.isTip ? `🎁 ${m.message}` : m.message}</span>
              </p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <form onSubmit={handleSendChat} className="relative flex items-center gap-2 px-3 py-3 shrink-0 backdrop-blur bg-black/30">
        <input
          type="text"
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder="Send a message…"
          className="flex-1 h-11 rounded-full bg-white/10 border border-white/15 px-4 text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        <button type="submit" className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center shrink-0" aria-label="Send">
          <Send size={18} />
        </button>
        <button
          type="button"
          onClick={() => setTipOpen(true)}
          className="w-11 h-11 rounded-full bg-gold text-white flex items-center justify-center shrink-0"
          aria-label="Send a gift"
        >
          <Gift size={18} />
        </button>
      </form>

      {tipOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setTipOpen(false)}>
          <div className="card card-static w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Gift size={18} className="text-gold" /> Send a Gift</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {tipPresets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTipAmount(amt)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium ${
                    tipAmount === amt ? 'bg-gold text-white' : 'bg-surface-light text-text-secondary'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={tipMessage}
              onChange={(e) => setTipMessage(e.target.value)}
              placeholder="Add a message (optional)"
              className="input-field mb-4"
            />
            <button type="button" onClick={handleSendTip} className="btn-primary w-full">
              Send ₹{tipAmount} Gift
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
