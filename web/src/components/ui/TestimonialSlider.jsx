import { useEffect, useState } from 'react'
import { Quote } from 'lucide-react'
import Card from './Card'
import StarRating from './StarRating'

const SLIDE_MS = 2000
const TRANSITION_MS = 700

// Tracks how many cards should be visible at once, matching the site's usual
// sm/lg breakpoints (was previously a 1/2/3-col grid).
function useVisibleCount() {
  const getCount = () => {
    if (typeof window === 'undefined') return 1
    if (window.matchMedia('(min-width: 1024px)').matches) return 3
    if (window.matchMedia('(min-width: 640px)').matches) return 2
    return 1
  }

  const [visible, setVisible] = useState(getCount)

  useEffect(() => {
    const mqLg = window.matchMedia('(min-width: 1024px)')
    const mqSm = window.matchMedia('(min-width: 640px)')
    const update = () => setVisible(getCount())
    mqLg.addEventListener('change', update)
    mqSm.addEventListener('change', update)
    return () => {
      mqLg.removeEventListener('change', update)
      mqSm.removeEventListener('change', update)
    }
  }, [])

  return visible
}

// Auto-advancing slider showing `visible` cards at once (1 on mobile, 2 on
// tablet, 3 on desktop), sliding left by one card every SLIDE_MS and looping
// seamlessly via cloned leading cards appended to the track.
export default function TestimonialSlider({ items }) {
  const visible = Math.min(useVisibleCount(), items.length)
  const extended = [...items, ...items.slice(0, visible)]
  const itemWidth = 100 / visible

  const [index, setIndex] = useState(0)
  const [withTransition, setWithTransition] = useState(true)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    setIndex(0)
    setWithTransition(true)
  }, [visible])

  useEffect(() => {
    if (paused || items.length <= visible) return undefined
    const timer = setInterval(() => setIndex((i) => i + 1), SLIDE_MS)
    return () => clearInterval(timer)
  }, [paused, items.length, visible])

  useEffect(() => {
    if (index !== items.length) return undefined
    const timer = setTimeout(() => {
      setWithTransition(false)
      setIndex(0)
    }, TRANSITION_MS)
    return () => clearTimeout(timer)
  }, [index, items.length])

  useEffect(() => {
    if (withTransition) return undefined
    const raf = requestAnimationFrame(() => setWithTransition(true))
    return () => cancelAnimationFrame(raf)
  }, [withTransition])

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className={`flex ${withTransition ? 'transition-transform duration-700 ease-out' : ''}`}
          style={{ transform: `translateX(-${index * itemWidth}%)` }}
        >
          {extended.map((t, i) => (
            <div key={`${t.id}-${i}`} className="shrink-0 px-2" style={{ width: `${itemWidth}%` }}>
              <Card className="flex flex-col gap-3 h-full">
                <Quote size={20} className="text-brand" aria-hidden="true" />
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-4">{t.text}</p>
                <div className="flex items-center justify-between mt-auto pt-2">
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.city}</p>
                  </div>
                  <StarRating rating={t.rating} showValue={false} />
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {items.length > visible && (
        <div className="flex items-center justify-center gap-2 mt-5" role="tablist" aria-label="Testimonials">
          {items.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={i === index % items.length}
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => {
                setWithTransition(true)
                setIndex(i)
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index % items.length ? 'w-6 bg-brand' : 'w-1.5 bg-border hover:bg-text-muted'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
