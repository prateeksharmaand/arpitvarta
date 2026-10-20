import { Link } from 'react-router-dom'

const messages = [
  { text: 'Chat, Call or Video with verified professionals', to: '/professionals' },
  { text: 'Not sure whom to consult? Ask our AI assistant', to: '/ask-ai' },
  { text: 'Doctors available 24×7 for quick advice', to: '/professional/doctor' },
  { text: 'Legal help for property, family & consumer issues', to: '/professional/legal' },
  { text: 'File your ITR & GST with expert CAs', to: '/professional/finance' },
  { text: 'Get 50% extra on your first wallet recharge', to: '/account' },
]

function Track({ hidden }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {messages.map((m) => (
        <li key={m.to} className="flex items-center">
          <Link
            to={m.to}
            tabIndex={hidden ? -1 : undefined}
            className="px-6 text-xs sm:text-sm font-medium text-white hover:underline whitespace-nowrap"
          >
            {m.text}
          </Link>
          <span className="text-white/60 text-xs" aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  )
}

export default function AnnouncementMarquee() {
  return (
    <div
      className="group overflow-hidden bg-gradient-to-r from-brand-dark via-brand to-secondary py-2"
      role="region"
      aria-label="Highlights"
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        <Track />
        <Track hidden />
      </div>
    </div>
  )
}
