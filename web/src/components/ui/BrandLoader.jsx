import { Briefcase } from 'lucide-react'

// Brand loader — a pulsing briefcase mark inside a spinning ring.
export default function BrandLoader({ size = 96, label = 'Loading' }) {
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }} role="status" aria-label={label}>
      <div className="absolute inset-0 rounded-full bg-brand/20 blur-2xl animate-pulse" aria-hidden="true" />
      <span
        className="absolute inset-0 rounded-full border-4 border-brand/15 border-t-brand animate-spin"
        aria-hidden="true"
      />
      <span className="relative w-1/2 h-1/2 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30" aria-hidden="true">
        <Briefcase size={size / 4.5} className="text-white" />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  )
}
