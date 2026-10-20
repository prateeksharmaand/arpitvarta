import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Phone, Video, CheckCircle2, GraduationCap, Building2, MapPin, Users } from 'lucide-react'
import Badge from '../components/ui/Badge'
import StarRating from '../components/ui/StarRating'
import Card from '../components/ui/Card'
import Avatar from '../components/ui/Avatar'
import { fetchProfessionalById, fetchProfessionalReviews } from '../lib/professionals'
import { normalizeProfessional, normalizeReview } from '../lib/professionalDisplay'
import { useRequireAuth } from '../context/RequireAuthContext'
import { setPageMeta } from '../lib/demo'

export default function ProfessionalProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const requireAuth = useRequireAuth()

  const [professional, setProfessional] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    Promise.all([fetchProfessionalById(id), fetchProfessionalReviews(id).catch(() => [])])
      .then(([raw, rawReviews]) => {
        if (cancelled) return
        if (!raw) {
          setNotFound(true)
          return
        }
        setProfessional(normalizeProfessional(raw))
        setReviews(rawReviews.map(normalizeReview))
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (professional) {
      setPageMeta({
        title: `${professional.name} — Professional Profile | ArpitVarta`,
        description: professional.bio || `Consult ${professional.name} on ArpitVarta.`,
        image: professional.photo,
      })
    }
  }, [professional])

  if (notFound) {
    return <Navigate to="/professionals" replace />
  }

  if (loading || !professional) {
    return (
      <div className="container-page py-24 flex flex-col items-center justify-center text-center gap-4 min-h-[40vh]">
        <span className="w-12 h-12 rounded-full border-4 border-surface-light border-t-brand animate-spin" />
      </div>
    )
  }

  const { name, photo, badge, expertise, languages, experienceYears, rating, reviewCount, pricePerMin, pricePerMinCall, pricePerMinVideo, online, bio,
    title, categoryName, categoryIcon, categorySlug, qualifications, organization, city, consultations } = professional

  function startChat() {
    requireAuth(() => navigate(`/chat/${id}`), `Log in to chat with ${name}.`)
  }

  function startCall() {
    requireAuth(() => navigate(`/call/${id}`), `Log in to call ${name}.`)
  }

  function startVideoCall() {
    requireAuth(() => navigate(`/call/${id}?type=video`), `Log in to video call ${name}.`)
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/professionals" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand mb-6">
        <ArrowLeft size={16} /> All professionals
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: main info */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card className="flex flex-col sm:flex-row gap-5">
            <div className="mx-auto sm:mx-0">
              <Avatar src={photo} name={name} size={128} rounded="rounded-2xl" online={online} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-xl sm:text-2xl font-bold">{name}</h1>
                {badge && (
                  <Badge tone="gold" className="w-fit mx-auto sm:mx-0">
                    <CheckCircle2 size={12} /> {badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1">
                {title}
                {categoryName && (
                  <> · <Link to={`/professional/${categorySlug}`} className="hover:text-brand">{categoryIcon} {categoryName}</Link></>
                )}
              </p>
              <StarRating rating={rating} reviewCount={reviewCount} className="justify-center sm:justify-start mt-2" />
              {expertise.length > 0 && (
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-3">
                  {expertise.map((tag) => (
                    <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-surface-light text-text-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-text-secondary mt-3">
                <span>{languages.join(', ') || '—'}</span>
                <span>{experienceYears} yrs experience</span>
                {consultations > 0 && <span className="flex items-center gap-1"><Users size={12} />{consultations.toLocaleString()} consultations</span>}
                {city && <span className="flex items-center gap-1"><MapPin size={12} />{city}</span>}
              </div>
            </div>
          </Card>

          {(qualifications.length > 0 || organization) && (
            <section className="grid sm:grid-cols-2 gap-3">
              {qualifications.length > 0 && (
                <Card className="!p-4 flex gap-3">
                  <GraduationCap size={20} className="text-brand shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Qualifications</p>
                    <p className="text-sm font-medium">{qualifications.join(', ')}</p>
                  </div>
                </Card>
              )}
              {organization && (
                <Card className="!p-4 flex gap-3">
                  <Building2 size={20} className="text-brand shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Currently at</p>
                    <p className="text-sm font-medium">{organization}</p>
                  </div>
                </Card>
              )}
            </section>
          )}

          {bio && (
            <section>
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className="text-sm text-text-secondary leading-relaxed">{bio}</p>
            </section>
          )}

          {expertise.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Areas of Expertise</h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {expertise.map((tag) => (
                  <li key={tag} className="card !p-3 text-sm text-center">{tag}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold mb-3">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-text-muted">No reviews yet.</p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-gold">{rating.toFixed(1)}</span>
                  <div>
                    <StarRating rating={rating} showValue={false} />
                    <p className="text-xs text-text-muted mt-0.5">{reviewCount.toLocaleString()} reviews</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {reviews.map((r) => (
                    <Card key={r.id} className="!p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold">{r.user}</p>
                        <span className="text-xs text-text-muted">{r.date}</span>
                      </div>
                      <StarRating rating={r.rating} showValue={false} className="mb-1.5" />
                      {r.text && <p className="text-sm text-text-secondary leading-relaxed">{r.text}</p>}
                    </Card>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Right: sticky consult card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 flex flex-col gap-4">
            <p className="text-sm font-semibold">Consult {name.split(' ')[0] === 'Dr.' || name.split(' ')[0] === 'Adv.' || name.split(' ')[0] === 'CA' ? name : name.split(' ')[0]}</p>
            <button type="button" onClick={startChat} className="btn-primary w-full justify-between">
              <span className="flex items-center gap-2"><MessageCircle size={18} /> Chat</span>
              <span className="text-sm font-normal">{pricePerMin > 0 ? `₹${pricePerMin}/min` : '—'}</span>
            </button>
            <button type="button" onClick={startCall} className="btn-outline w-full justify-between">
              <span className="flex items-center gap-2"><Phone size={18} /> Voice Call</span>
              <span className="text-sm font-normal">{pricePerMinCall > 0 ? `₹${pricePerMinCall}/min` : '—'}</span>
            </button>
            <button type="button" onClick={startVideoCall} className="btn-outline w-full justify-between">
              <span className="flex items-center gap-2"><Video size={18} /> Video Call</span>
              <span className="text-sm font-normal">{pricePerMinVideo > 0 ? `₹${pricePerMinVideo}/min` : '—'}</span>
            </button>
            <p className="text-[11px] text-text-muted text-center">Billed per minute from your wallet. End anytime.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
