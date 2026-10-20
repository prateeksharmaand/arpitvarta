import { Star } from 'lucide-react'

export default function StarRating({ rating = 0, size = 14, showValue = true, reviewCount, className = '' }) {
  const rounded = Math.round(rating)
  return (
    <div className={`flex items-center gap-1 ${className}`} aria-label={`Rated ${rating} out of 5`}>
      <div className="flex items-center" role="img">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={size}
            className={i < rounded ? 'fill-gold text-gold' : 'fill-transparent text-text-muted'}
          />
        ))}
      </div>
      {showValue && <span className="text-xs font-medium text-text-secondary">{rating.toFixed(1)}</span>}
      {typeof reviewCount === 'number' && (
        <span className="text-xs text-text-muted">({reviewCount.toLocaleString()})</span>
      )}
    </div>
  )
}
