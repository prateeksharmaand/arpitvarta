import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Clock, Wallet, Radio, Smartphone, Globe, ArrowRight } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import { useCategories } from '../hooks/useCategories'
import { setPageMeta } from '../lib/demo'

const PORTAL_URL = import.meta.env.VITE_PROFESSIONAL_PORTAL_URL || '/professional-portal/'

const perks = [
  { icon: Wallet, title: 'Earn per minute', text: 'Set your own chat, voice and video rates. Keep 80% of every minute you consult.' },
  { icon: Clock, title: 'Work when you want', text: 'Go online from the app or portal whenever you are free — no fixed hours.' },
  { icon: BadgeCheck, title: 'Verified badge', text: 'We verify your license or degree, so clients trust you from the first message.' },
  { icon: Radio, title: 'Go live', text: 'Host live Q&A sessions and workshops to reach hundreds of people at once.' },
]

const steps = [
  'Sign up on the professional portal or the ArpitVarta Pro app',
  'Add your profession, qualifications, license number and rates',
  'Upload proof of your credentials for verification',
  'Get approved, go online and start consulting',
]

export default function BecomeProfessional() {
  const categories = useCategories()

  useEffect(() => {
    setPageMeta('Become a Professional | ArpitVarta', 'Join ArpitVarta as a doctor, lawyer, CA, therapist, coach, tutor or any other expert and earn from online consultations.')
  }, [])

  return (
    <div className="container-page py-8 sm:py-12">
      <section className="card !p-8 sm:!p-12 relative overflow-hidden mb-12">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand/15 blur-3xl" aria-hidden="true" />
        <p className="badge-brand mb-4 relative">For professionals</p>
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4 max-w-3xl relative">
          Turn your expertise into a flexible online practice
        </h1>
        <p className="text-text-secondary max-w-2xl mb-8 relative">
          Whatever your field — medicine, law, finance, education, fitness, technology or anything else — ArpitVarta
          brings clients to you and handles payments, calls and scheduling.
        </p>
        <div className="flex flex-wrap gap-3 relative">
          <a href={`${PORTAL_URL}register`} className="btn-primary"><Globe size={16} /> Join on the web portal</a>
          <a href={`${PORTAL_URL}login`} className="btn-outline">Already registered? Sign in <ArrowRight size={15} /></a>
        </div>
        <p className="text-xs text-text-muted mt-4 flex items-center gap-1.5 relative"><Smartphone size={13} /> Or download the ArpitVarta Pro app on Android / iOS.</p>
      </section>

      <SectionHeading eyebrow="Why join" title="Built for independent professionals" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {perks.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card">
            <Icon size={22} className="text-brand mb-3" />
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
            <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <SectionHeading eyebrow="Onboarding" title="How to get started" />
          <ol className="flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={s} className="card flex items-center gap-4 !p-4">
                <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-sm">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <SectionHeading eyebrow="Fields" title="Professions we onboard" />
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link key={c.slug} to={`/professional/${c.slug}`} className="px-3 py-2 rounded-xl bg-surface-light text-sm text-text-secondary hover:text-brand">
                {c.icon} {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
