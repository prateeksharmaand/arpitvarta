import { Link } from 'react-router-dom'

export default function SectionHeading({ eyebrow, title, subtitle, actionLabel, actionTo, className = '', level = 'h2' }) {
  const Heading = level
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 ${className}`}>
      <div>
        {eyebrow && (
          <p className="text-brand text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">{eyebrow}</p>
        )}
        <Heading className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary">{title}</Heading>
        {subtitle && <p className="text-text-secondary text-sm mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="text-brand text-sm font-semibold hover:text-brand-light transition-colors shrink-0"
        >
          {actionLabel} &rarr;
        </Link>
      )}
    </div>
  )
}
