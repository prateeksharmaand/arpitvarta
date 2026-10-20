import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import ProfessionalCard from '../components/professional/ProfessionalCard'
import { ProfessionalCardSkeleton } from '../components/ui/Skeleton'
import SectionHeading from '../components/ui/SectionHeading'
import { fetchProfessionals } from '../lib/professionals'
import { fetchCategory } from '../lib/categories'
import { normalizeProfessional } from '../lib/professionalDisplay'
import { setPageMeta } from '../lib/demo'

export default function ProfessionalCategory() {
  const { category } = useParams()

  const [meta, setMeta] = useState(null)
  const [professionals, setProfessionals] = useState([])
  const [speciality, setSpeciality] = useState('')
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setNotFound(false)
    fetchCategory(category)
      .then((c) => {
        if (cancelled) return
        setMeta(c)
        setPageMeta(`${c.name} — Consult Online | ArpitVarta`, c.description || `Consult verified ${c.name.toLowerCase()} online on ArpitVarta.`)
      })
      .catch((e) => { if (!cancelled && e.status === 404) setNotFound(true) })
    return () => { cancelled = true }
  }, [category])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    fetchProfessionals({ limit: 100, category, onlineOnly, sort: 'rating' })
      .then(({ list }) => {
        if (!cancelled) setProfessionals(list.map(normalizeProfessional))
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category, onlineOnly])

  const list = useMemo(
    () => (speciality ? professionals.filter((p) => p.expertise.includes(speciality)) : professionals),
    [professionals, speciality]
  )

  if (notFound) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-text-secondary mb-4">That category doesn’t exist.</p>
        <Link to="/professionals" className="btn-outline">Browse all professionals</Link>
      </div>
    )
  }

  const name = meta?.name || 'Professionals'

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/professionals" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand mb-4">
        <ArrowLeft size={16} /> All professionals
      </Link>
      <SectionHeading
        level="h1"
        eyebrow={meta ? `${meta.icon} Category` : 'Category'}
        title={name}
        subtitle={
          loading
            ? 'Loading…'
            : `${list.length} ${list.length === 1 ? 'expert' : 'experts'} available. ${meta?.description || ''}`
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(meta?.sub_specialities || []).length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setSpeciality('')}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${!speciality ? 'bg-brand text-white' : 'bg-surface-light text-text-secondary hover:text-brand'}`}
            >
              All
            </button>
            {meta.sub_specialities.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeciality(s === speciality ? '' : s)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${speciality === s ? 'bg-brand text-white' : 'bg-surface-light text-text-secondary hover:text-brand'}`}
              >
                {s}
              </button>
            ))}
          </>
        )}
        <label className="flex items-center gap-2 text-xs cursor-pointer ml-auto">
          <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="accent-brand w-3.5 h-3.5" />
          Online now
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProfessionalCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="card text-center py-16">
          <p className="text-text-secondary">Could not load professionals right now. Please try again shortly.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-text-secondary">No {name.toLowerCase()} available {speciality ? `for ${speciality} ` : ''}right now.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Link to="/professionals" className="btn-outline inline-flex">Browse all professionals</Link>
            <Link to="/ask-ai" className="btn-primary inline-flex"><Sparkles size={15} /> Ask AI</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((a) => (
            <ProfessionalCard key={a.id} professional={a} />
          ))}
        </div>
      )}
    </div>
  )
}
