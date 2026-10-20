import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom'
import { Mic, MicOff, PhoneOff, Wallet, Video, VideoOff } from 'lucide-react'
import { fetchProfessionalById } from '../lib/professionals'
import { normalizeProfessional } from '../lib/professionalDisplay'
import { useConsultation } from '../hooks/useConsultation'
import { useAgoraCall } from '../hooks/useAgoraCall'
import { translateText, useI18nVersion } from '@i18n'
import Avatar from '../components/ui/Avatar'
import { setPageMeta } from '../lib/demo'

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const s = (totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const statusLabel = {
  connecting: 'Connecting…',
  queued: 'Ringing…',
  rejected: 'Not available right now',
  insufficient_balance: 'Low wallet balance',
  ended: 'Call ended',
  error: 'Connection problem',
}

function VideoTile({ track, mirrored, className = '' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (track && containerRef.current) {
      track.play(containerRef.current, mirrored ? { mirror: true } : undefined)
    }
    return () => {
      track?.stop()
    }
  }, [track, mirrored])

  return <div ref={containerRef} className={`bg-black ${className}`} />
}

export default function Call() {
  useI18nVersion()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isVideo = searchParams.get('type') === 'video'
  const navigate = useNavigate()

  const [professional, setProfessional] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const { status, consultationId, errorMessage, elapsedSeconds, endConsultation } = useConsultation({
    professionalId: id,
    type: isVideo ? 'video' : 'voice',
  })
  const { connected, muted, toggleMute, cameraOff, toggleCamera, localVideoTrack, remoteVideoTrack, callError } =
    useAgoraCall({ consultationId, active: status === 'active', withVideo: isVideo })

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
      setPageMeta(
        `${isVideo ? 'Video call' : 'Call'} with ${professional.name} | ArpitVarta`,
        `Live ${isVideo ? 'video ' : ''}call consultation with ${professional.name}.`
      )
    }
  }, [professional, isVideo])

  if (notFound) {
    return <Navigate to="/professionals" replace />
  }

  const displayStatus =
    status === 'active'
      ? connected
        ? translateText('Connected · {0}', [formatTime(elapsedSeconds)])
        : translateText('Connecting audio…')
      : translateText(statusLabel[status] || status)

  const inCallScreen = status === 'connecting' || status === 'queued' || status === 'active'
  const showVideoLayout = isVideo && inCallScreen

  const controls = (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={toggleMute}
        disabled={status !== 'active'}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
          muted ? 'bg-error/10 text-error' : 'bg-surface-light text-text-secondary'
        }`}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
      {isVideo && (
        <button
          type="button"
          onClick={toggleCamera}
          disabled={status !== 'active'}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
            cameraOff ? 'bg-error/10 text-error' : 'bg-surface-light text-text-secondary'
          }`}
          aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {cameraOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
      )}
      <button
        type="button"
        onClick={endConsultation}
        className="w-16 h-16 rounded-full bg-error text-white flex items-center justify-center"
        aria-label="End call"
      >
        <PhoneOff size={24} />
      </button>
    </div>
  )

  if (showVideoLayout) {
    return (
      <div className="fixed inset-0 z-40 bg-black flex flex-col">
        <div className="relative flex-1">
          {remoteVideoTrack ? (
            <VideoTile track={remoteVideoTrack} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center">
              <Avatar src={professional?.photo} name={professional?.name} size={96} rounded="rounded-full" />
              <p className="text-white font-semibold">{professional?.name || 'Professional'}</p>
              <p className="text-white/70 text-sm">{displayStatus}</p>
            </div>
          )}

          {localVideoTrack && !cameraOff && (
            <VideoTile
              track={localVideoTrack}
              mirrored
              className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-52 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg"
            />
          )}

          {remoteVideoTrack && (
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full">
              <p className="text-white text-xs font-medium">{displayStatus}</p>
            </div>
          )}
        </div>

        {callError && (
          <p className="text-center text-xs text-error bg-black/60 py-1.5">{callError}</p>
        )}

        <div className="flex items-center justify-center py-6 bg-black/40">{controls}</div>
      </div>
    )
  }

  return (
    <div className="container-page py-10 sm:py-16">
      <div className="card flex flex-col items-center text-center gap-6 py-10">
        <Avatar src={professional?.photo} name={professional?.name} size={112} rounded="rounded-full" />
        <div>
          <h1 className="text-xl font-bold">{professional?.name || 'Professional'}</h1>
          <p className="text-sm text-text-muted mt-1">{displayStatus}</p>
        </div>

        {status === 'rejected' ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-text-secondary">
              {professional?.name || 'This professional'} isn&apos;t available right now.
            </p>
            <button type="button" onClick={() => navigate(`/professional/profile/${id}`)} className="btn-outline">
              Back to Profile
            </button>
          </div>
        ) : status === 'insufficient_balance' ? (
          <div className="flex flex-col items-center gap-3">
            <Wallet size={28} className="text-brand" />
            <p className="text-sm text-text-secondary">
              You don&apos;t have enough wallet balance to start this call.
            </p>
            <button type="button" onClick={() => navigate('/account')} className="btn-primary">
              Add Money to Wallet
            </button>
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-error">{errorMessage || 'Something went wrong.'}</p>
            <button type="button" onClick={() => navigate(`/professional/profile/${id}`)} className="btn-outline">
              Back to Profile
            </button>
          </div>
        ) : status === 'ended' ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-text-secondary">Call ended.</p>
            <p className="text-xs text-text-muted">Duration: {formatTime(elapsedSeconds)}</p>
            <button type="button" onClick={() => navigate(`/professional/profile/${id}`)} className="btn-outline">
              Back to Profile
            </button>
          </div>
        ) : (
          <>
            {callError && <p className="text-xs text-error">{callError}</p>}
            {controls}
          </>
        )}
      </div>
    </div>
  )
}
