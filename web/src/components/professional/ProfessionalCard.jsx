import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, Phone, BadgeCheck, MapPin } from 'lucide-react'
import Card from '../ui/Card'
import StarRating from '../ui/StarRating'
import Avatar from '../ui/Avatar'
import { useRequireAuth } from '../../context/RequireAuthContext'

export default function ProfessionalCard({ professional }) {
  const navigate = useNavigate()
  const requireAuth = useRequireAuth()
  const { id, name, photo, expertise, languages, experienceYears, rating, reviewCount, pricePerMin, online, title, categoryIcon, verified, city, qualifications } =
    professional

  function startChat() {
    requireAuth(() => navigate(`/chat/${id}`), `Log in to chat with ${name}.`)
  }

  function startCall() {
    requireAuth(() => navigate(`/call/${id}`), `Log in to call ${name}.`)
  }

  return (
    <Card className="flex flex-col gap-3 hover:border-brand/50 transition-colors">
      <Link to={`/professional/profile/${id}`} className="flex gap-3 items-start">
        <Avatar src={photo} name={name} size={64} online={online} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-text-primary truncate">{name}</h3>
            {verified && <BadgeCheck size={16} className="text-brand shrink-0" aria-label="Verified" />}
          </div>
          <p className="text-xs text-text-secondary truncate">
            <span aria-hidden="true">{categoryIcon}</span> {title}
          </p>
          {qualifications?.length > 0 && <p className="text-[11px] text-text-muted truncate">{qualifications.join(', ')}</p>}
          <StarRating rating={rating} reviewCount={reviewCount} className="mt-1.5" />
        </div>
      </Link>

      {expertise.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {expertise.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-surface-light text-text-secondary">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span className="truncate">{languages.join(', ') || '—'}</span>
        <span className="flex items-center gap-2 shrink-0">
          {city && <span className="flex items-center gap-0.5"><MapPin size={11} />{city}</span>}
          <span>{experienceYears} yrs exp</span>
        </span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-divider">
        <span className="text-sm font-semibold text-brand">
          {pricePerMin > 0 ? `₹${pricePerMin}/min` : '—'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startChat}
            className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary hover:text-brand transition-colors"
            aria-label={`Chat with ${name}`}
          >
            <MessageCircle size={16} />
          </button>
          <button
            type="button"
            onClick={startCall}
            className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary hover:text-brand transition-colors"
            aria-label={`Call ${name}`}
          >
            <Phone size={16} />
          </button>
        </div>
      </div>
    </Card>
  )
}
