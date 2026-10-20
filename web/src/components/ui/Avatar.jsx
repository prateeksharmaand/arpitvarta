import { useEffect, useState } from 'react'
import { User } from 'lucide-react'

// A real photo when the professional has one; otherwise (or if the image fails
// to load) a neutral person-silhouette placeholder — never a fake stock photo.
export default function Avatar({ src, name, size = 64, rounded = 'rounded-xl', className = '', online }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          className={`w-full h-full object-cover border border-border ${rounded}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center bg-surface-light border border-border text-text-muted ${rounded}`}
          role="img"
          aria-label={name ? `${name} (no photo)` : 'No photo'}
        >
          <User size={Math.round(size * 0.5)} strokeWidth={1.5} />
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute -bottom-1 -right-1 rounded-full border-2 border-card ${online ? 'bg-success' : 'bg-text-muted'}`}
          style={{ width: Math.max(10, size * 0.22), height: Math.max(10, size * 0.22) }}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  )
}
