import { useEffect, useRef, useState } from 'react'
import AgoraRTC from 'agora-rtc-sdk-ng'
import { api } from '../lib/api'

// Same Agora App ID the Flutter app uses (user_app/lib/screens/consultation/call_screen.dart) —
// App IDs are public identifiers, not secrets; the App Certificate that
// actually signs tokens stays server-side (backend/src/routes/agora.js).
const AGORA_APP_ID = 'e2e9d562aa754dcca16a5219e557b133'

// Joins the Agora channel once a consultation is active, using the
// consultation ID as the channel name — same convention as the Flutter app.
// withVideo adds a camera track alongside the mic for video consultations;
// voice-only calls just publish audio (unchanged from before).
export function useAgoraCall({ consultationId, active, withVideo = false }) {
  const clientRef = useRef(null)
  const localAudioTrackRef = useRef(null)
  const localVideoTrackRef = useRef(null)

  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [callError, setCallError] = useState('')
  const [localVideoTrack, setLocalVideoTrack] = useState(null)
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null)

  useEffect(() => {
    if (!active || !consultationId) return undefined
    let cancelled = false

    async function join() {
      try {
        const uid = Math.floor(Math.random() * 1_000_000_000)
        const res = await api.get(
          `/api/agora/token?channel=${encodeURIComponent(consultationId)}&uid=${uid}`,
          { auth: true }
        )
        if (cancelled) return

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        clientRef.current = client

        client.on('user-published', async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType)
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play()
          } else if (mediaType === 'video') {
            setRemoteVideoTrack(remoteUser.videoTrack)
          }
        })

        client.on('user-unpublished', (remoteUser, mediaType) => {
          if (mediaType === 'video') setRemoteVideoTrack(null)
        })

        await client.join(AGORA_APP_ID, consultationId, res.token || null, uid)
        if (cancelled) {
          await client.leave()
          return
        }

        const micTrack = await AgoraRTC.createMicrophoneAudioTrack()
        localAudioTrackRef.current = micTrack
        const tracksToPublish = [micTrack]

        if (withVideo) {
          const camTrack = await AgoraRTC.createCameraVideoTrack()
          localVideoTrackRef.current = camTrack
          tracksToPublish.push(camTrack)
        }

        if (cancelled) {
          micTrack.close()
          localVideoTrackRef.current?.close()
          await client.leave()
          return
        }

        await client.publish(tracksToPublish)
        setLocalVideoTrack(localVideoTrackRef.current)
        setConnected(true)
      } catch (err) {
        if (!cancelled) setCallError(err.message || 'Could not connect the call.')
      }
    }

    join()

    return () => {
      cancelled = true
      localAudioTrackRef.current?.close()
      localVideoTrackRef.current?.close()
      clientRef.current?.leave()
      localAudioTrackRef.current = null
      localVideoTrackRef.current = null
      clientRef.current = null
      setLocalVideoTrack(null)
      setRemoteVideoTrack(null)
    }
  }, [active, consultationId, withVideo])

  function toggleMute() {
    const track = localAudioTrackRef.current
    if (!track) return
    const next = !muted
    track.setEnabled(!next)
    setMuted(next)
  }

  function toggleCamera() {
    const track = localVideoTrackRef.current
    if (!track) return
    const next = !cameraOff
    track.setEnabled(!next)
    setCameraOff(next)
  }

  return {
    connected,
    muted,
    toggleMute,
    cameraOff,
    toggleCamera,
    localVideoTrack,
    remoteVideoTrack,
    callError,
  }
}
