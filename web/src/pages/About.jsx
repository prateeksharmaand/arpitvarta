import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Phone, Video, Sparkles, Layers, BadgeCheck, Radio, ShieldCheck, Wallet, Eye } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Reveal from '../components/ui/Reveal'
import { setPageMeta } from '../lib/demo'

const offerings = [
  { icon: MessageCircle, title: 'Chat with professionals', text: 'Ask your questions in a private one-to-one chat with a professional who is online now.' },
  { icon: Phone, title: 'Voice calls', text: 'Prefer to talk? Connect with a professional over a live voice call.' },
  { icon: Video, title: 'Video consultations', text: 'Face-to-face guidance from wherever you are.' },
  { icon: Layers, title: 'Every profession', text: 'Doctors, lawyers, CAs, therapists, coaches, tutors, tech consultants and more — in one place.' },
  { icon: Sparkles, title: 'AI assistant', text: 'Describe your problem and our AI points you to the right kind of expert, with questions to ask.' },
  { icon: BadgeCheck, title: 'Verified credentials', text: 'Licenses, registrations and degrees are checked before professionals can go online.' },
  { icon: Radio, title: 'Live & community', text: 'Join live sessions with professionals and share in the community feed.' },
]

const steps = [
  { title: 'Create your account', text: 'Sign up with your email in a minute — no paperwork, no subscription.' },
  { title: 'Choose a professional', text: 'Browse by profession, compare qualifications, languages, ratings and per-minute rates, then pick who feels right.' },
  { title: 'Start a consultation', text: 'Chat, call or video. You are billed per minute from your wallet, and can end whenever you like.' },
]

const values = [
  { icon: Eye, title: 'Transparent pricing', text: 'The per-minute rate is shown on every profile before you begin — no surprises.' },
  { icon: ShieldCheck, title: 'Verified professionals', text: 'A Verified badge marks professionals whose credentials our team has checked.' },
  { icon: Wallet, title: 'Simple wallet', text: 'Add money once, pay only for the minutes you use, and see every charge in your history.' },
]

export default function About() {
  useEffect(() => {
    setPageMeta('About Us | ArpitVarta', 'ArpitVarta connects you with verified professionals of every field for chat, voice and video consultations.')
  }, [])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="About Us"
        title="Expert advice, one conversation away"
        subtitle="ArpitVarta brings verified professionals and the people who need them together in one simple, trustworthy place."
      />

      <Reveal className="card card-static max-w-3xl mb-12">
        <p className="text-sm text-text-secondary leading-relaxed">
          Getting good advice shouldn’t mean taking a day off, travelling across town or knowing someone who knows
          someone. We built ArpitVarta so that a doctor, a lawyer, a chartered accountant, a counsellor or any other
          expert is a tap away — and you pay only for the minutes you actually talk. Everything works the same on the
          web and in our mobile app, with one account and one wallet.
        </p>
      </Reveal>

      <Reveal as="section" className="mb-12">
        <h2 className="text-xl font-bold mb-5">What you can do on ArpitVarta</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {offerings.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-3">
                <Icon size={20} />
              </span>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-text-secondary">{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="mb-12">
        <h2 className="text-xl font-bold mb-5">How it works</h2>
        <ol className="grid md:grid-cols-3 gap-4 stagger-children">
          {steps.map((s, i) => (
            <li key={s.title} className="card">
              <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center mb-3">{i + 1}</span>
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-text-secondary">{s.text}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal as="section" className="mb-12">
        <h2 className="text-xl font-bold mb-5">What we stand for</h2>
        <div className="grid md:grid-cols-3 gap-4 stagger-children">
          {values.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <Icon size={22} className="text-gold mb-3" />
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-text-secondary">{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="card card-static max-w-3xl">
        <h2 className="text-lg font-bold mb-2">A note on online consultations</h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          Professionals on ArpitVarta are independent experts. Online consultations are not a substitute for emergency
          services — in an emergency, call 112 or visit the nearest hospital.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/professionals" className="btn-primary">Talk to a Professional</Link>
          <Link to="/contact" className="btn-outline">Contact Us</Link>
        </div>
      </Reveal>
    </div>
  )
}
