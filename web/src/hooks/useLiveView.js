import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import AgoraRTC from 'agora-rtc-sdk-ng'
import { SOCKET_URL, getToken, api } from '../lib/api'

// Mirrors user_app's LiveViewScreen (screens/live/live_screen.dart) —
// same socket events (join_live/leave_live/live_chat/send_tip), same
// optimistic local echo of your own sent chat message (the server doesn't
// echo live_chat_message back to the sender), same Agora audience-only join
// using the session's agora_channel.
const AGORA_APP_ID = 'e2e9d562aa754dcca16a5219e557b133'

export function useLiveView({ sessionId, agoraChannel, initialViewerCount = 0 }) {
  const socketRef = useRef(null)
  const agoraClientRef = useRef(null)

  const [viewerCount, setViewerCount] = useState(initialViewerCount)
  const [messages, setMessages] = useState([])
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null)
  const [liveEnded, setLiveEnded] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return undefined

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_live', { session_id: sessionId })
    })

    socket.on('viewer_count', (data) => {
      if (typeof data?.count === 'number') setViewerCount(data.count)
    })

    socket.on('live_chat_message', (data) => {
      setMessages((prev) => [...prev, { user: data.user || 'User', message: data.message, isTip: false }])
    })

    socket.on('new_tip', (data) => {
      setMessages((prev) => [
        ...prev,
        { user: data.user || 'User', message: `sent ₹${data.amount} ${data.message ? `— ${data.message}` : ''}`.trim(), isTip: true },
      ])
    })

    socket.on('session_ended', () => setLiveEnded(true))

    async function joinAgora() {
      try {
        const uid = 0
        const res = await api.get(
          `/api/agora/token?channel=${encodeURIComponent(agoraChannel)}&uid=${uid}`,
          { auth: true }
        )
        const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8', role: 'audience' })
        agoraClientRef.current = client

        client.on('user-published', async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType)
          if (mediaType === 'audio') remoteUser.audioTrack?.play()
          else if (mediaType === 'video') setRemoteVideoTrack(remoteUser.videoTrack)
        })
        client.on('user-unpublished', (_, mediaType) => {
          if (mediaType === 'video') setRemoteVideoTrack(null)
        })

        await client.setClientRole('audience')
        await client.join(AGORA_APP_ID, agoraChannel, res.token || null, uid)
      } catch {
        // Silent — the chat/tip layer still works even if the video stream
        // can't be reached (e.g. professional hasn't started publishing yet).
      }
    }

    joinAgora()

    return () => {
      socket.emit('leave_live', { session_id: sessionId })
      socket.disconnect()
      agoraClientRef.current?.leave()
      agoraClientRef.current = null
    }
  }, [sessionId, agoraChannel])

  function sendChatMessage(text) {
    if (!text.trim() || !socketRef.current) return
    socketRef.current.emit('live_chat', { session_id: sessionId, message: text.trim() })
    // The server doesn't echo this back to its sender, so add it locally —
    // same approach as the Flutter app.
    setMessages((prev) => [...prev, { user: 'You', message: text.trim(), isTip: false }])
  }

  function sendTip(amount, message) {
    if (!socketRef.current) return
    socketRef.current.emit('send_tip', { session_id: sessionId, amount, message })
  }

  return { viewerCount, messages, remoteVideoTrack, liveEnded, sendChatMessage, sendTip }
}
