import { Link } from 'react-router-dom'
import { Briefcase, Facebook, Instagram, Twitter, Youtube } from 'lucide-react'

const columns = [
  {
    heading: 'Consult',
    links: [
      { label: 'All Professionals', to: '/professionals' },
      { label: 'Doctors', to: '/professional/doctor' },
      { label: 'Lawyers', to: '/professional/legal' },
      { label: 'Chartered Accountants', to: '/professional/finance' },
      { label: 'Therapists', to: '/professional/mental-health' },
      { label: 'Career Coaches', to: '/professional/career' },
    ],
  },
  {
    heading: 'Platform',
    links: [
      { label: 'Ask AI Assistant', to: '/ask-ai' },
      { label: 'My Account & Wallet', to: '/account' },
      { label: 'Become a Professional', to: '/become-a-professional' },
      { label: 'Blog', to: '/blog' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Use', to: '/terms' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-16">
      <div className="container-page py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
              <Briefcase size={18} className="text-white" />
            </span>
            <span translate="no" className="text-lg font-bold">
              Arpit<span className="text-brand">Varta</span>
            </span>
          </Link>
          <p className="text-text-secondary text-sm leading-relaxed">
            Talk to verified doctors, lawyers, chartered accountants, therapists, coaches and
            other experts over chat, voice or video — pay only for the minutes you use.
          </p>
          <div className="flex items-center gap-3 mt-4">
            {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
              <button
                key={i}
                type="button"
                aria-label="Social link (demo)"
                className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary hover:text-brand transition-colors"
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.heading}>
            <h3 className="text-sm font-semibold text-text-primary mb-3">{col.heading}</h3>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-text-secondary hover:text-brand transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container-page py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text-muted text-center">
            &copy; {new Date().getFullYear()} ArpitVarta. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <Link to="/privacy" className="hover:text-brand transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-brand transition-colors">Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
