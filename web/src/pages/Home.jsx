import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MessageCircle, Phone, Video, Sparkles, ArrowRight, Eye, BadgeCheck, Wallet, Lock,
  ShieldCheck, UserRound, Search, Clock, Briefcase,
} from 'lucide-react'
import { ProfessionalCardSkeleton } from '../components/ui/Skeleton'
import Reveal from '../components/ui/Reveal'
import SectionHeading from '../components/ui/SectionHeading'
import ProfessionalCard from '../components/professional/ProfessionalCard'
import TestimonialSlider from '../components/ui/TestimonialSlider'
import { fetchProfessionals } from '../lib/professionals'
import { normalizeProfessional } from '../lib/professionalDisplay'
import { useCategories } from '../hooks/useCategories'
import { testimonials } from '../data/services'
import { blogArticles } from '../data/blog'
import { setPageMeta } from '../lib/demo'

const examplePrompts = [
  'My landlord won’t return my security deposit',
  'I’ve had a fever and sore throat for 3 days',
  'Help me file ITR for freelance income',
  'I feel anxious before every meeting',
]

const quickActions = [
  { label: 'Chat', hint: 'type at your pace', icon: MessageCircle, to: '/professionals' },
  { label: 'Voice Call', hint: 'talk it through', icon: Phone, to: '/professionals' },
  { label: 'Video Call', hint: 'face to face', icon: Video, to: '/professionals' },
  { label: 'Ask AI', hint: 'find the right expert', icon: Sparkles, to: '/ask-ai' },
]

const trustChips = [
  { icon: BadgeCheck, text: 'Credentials verified' },
  { icon: Eye, text: 'Per-minute rates upfront' },
  { icon: Lock, text: 'Private & secure' },
]

const steps = [
  { icon: Search, title: 'Tell us what you need', text: 'Browse a category or describe your problem to our AI assistant — it suggests the right kind of expert.' },
  { icon: UserRound, title: 'Pick a professional', text: 'Compare qualifications, experience, languages, ratings and per-minute rates.' },
  { icon: MessageCircle, title: 'Consult instantly', text: 'Chat, call or video. Pay per minute from your wallet and end whenever you like.' },
]

const whyUs = [
  { icon: BadgeCheck, title: 'Verified experts', text: 'Licenses and degrees are checked by our team before a professional can go online.' },
  { icon: Eye, title: 'Transparent pricing', text: 'The per-minute rate is on every profile. No hidden fees, no subscriptions needed.' },
  { icon: Wallet, title: 'Pay only for what you use', text: 'Recharge once, get bonus credit, and see every charge in your history.' },
  { icon: ShieldCheck, title: 'Confidential', text: 'Your chats and calls are shared only with the professional you consult.' },
]

export default function Home() {
  const navigate = useNavigate()
  const categories = useCategories()
  const [problem, setProblem] = useState('')

  useEffect(() => {
    setPageMeta(
      'ArpitVarta — Talk to Doctors, Lawyers, CAs & Experts Online',
      'Consult verified professionals of any field over chat, voice or video. Doctors, lawyers, chartered accountants, therapists, career coaches, tutors and more — pay per minute.'
    )
  }, [])

  const [onlinePros, setOnlinePros] = useState(null)
  const [prosError, setProsError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchProfessionals({ limit: 8, sort: 'rating' })
      .then(({ list }) => {
        if (!cancelled) setOnlinePros(list.map(normalizeProfessional))
      })
      .catch(() => {
        if (!cancelled) setProsError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const blogTeasers = useMemo(() => blogArticles.slice(0, 4), [])
  const totalPros = categories.reduce((n, c) => n + (c.professional_count || 0), 0)

  function submitProblem(e) {
    e.preventDefault()
    const q = problem.trim()
    navigate(q ? `/ask-ai?q=${encodeURIComponent(q)}` : '/ask-ai')
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-gold/10" aria-hidden="true" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand/15 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 right-0 w-[28rem] h-[28rem] rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
        <div className="container-page relative pt-12 pb-28 sm:pt-16 sm:pb-32 lg:pt-20 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <div className="animate-fade-in">
            <p className="badge-brand mb-5">
              <Briefcase size={12} /> Every expert, one tap away
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] mb-5">
              Talk to{' '}
              <span className="bg-gradient-to-r from-brand via-secondary to-gold bg-clip-text text-transparent">
                verified professionals
              </span>{' '}
              in minutes
            </h1>
            <p className="text-text-secondary text-base sm:text-lg mb-7 max-w-xl">
              Doctors, lawyers, chartered accountants, therapists, career coaches, tutors and more — over chat,
              voice or video. Pay only for the minutes you use.
            </p>

            <form onSubmit={submitProblem} className="card !p-2 flex items-center gap-2 max-w-xl mb-3 shadow-lg">
              <Sparkles size={18} className="text-brand ml-2 shrink-0" />
              <input
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Describe your problem — we’ll find the right expert"
                className="flex-1 bg-transparent outline-none text-sm sm:text-base py-2 min-w-0"
                aria-label="Describe your problem"
              />
              <button type="submit" className="btn-primary !py-2.5 !px-4 text-sm shrink-0">
                Ask AI <ArrowRight size={15} />
              </button>
            </form>
            <div className="flex flex-wrap gap-2 mb-8 max-w-xl">
              {examplePrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => navigate(`/ask-ai?q=${encodeURIComponent(p)}`)}
                  className="text-xs px-3 py-1.5 rounded-full bg-surface-light text-text-secondary hover:text-brand transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {trustChips.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Icon size={16} className="text-brand" /> {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Category mosaic */}
          <div className="hidden lg:grid grid-cols-3 gap-3">
            {categories.slice(0, 9).map((c, i) => (
              <Link
                key={c.slug}
                to={`/professional/${c.slug}`}
                className={`card !p-4 flex flex-col items-center text-center gap-2 hover:border-brand/50 hover:-translate-y-1 transition-all ${i % 2 ? 'animate-float-delayed' : 'animate-float'}`}
              >
                <span className="text-3xl" aria-hidden="true">{c.icon}</span>
                <span className="text-xs font-semibold leading-tight">{c.name}</span>
                <span className="text-[11px] text-text-muted">{c.professional_count || 0} experts</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick actions — overlaps the hero */}
      <section className="container-page relative z-10 -mt-16 sm:-mt-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map(({ label, hint, icon: Icon, to }) => (
            <Link key={label} to={to} className="card flex items-center gap-3 hover:border-brand/50 transition-colors shadow-lg">
              <span className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Icon size={20} />
              </span>
              <span>
                <span className="block font-semibold text-sm">{label}</span>
                <span className="block text-xs text-text-muted">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading
          eyebrow="Browse"
          title="Consult by profession"
          subtitle={totalPros ? `${totalPros} verified professionals across ${categories.length} fields.` : 'Pick a field to see available experts.'}
          actionLabel="All professionals"
          actionTo="/professionals"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 stagger-children">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/professional/${c.slug}`}
              className="card flex flex-col gap-2 hover:border-brand/50 transition-colors"
            >
              <span className="text-2xl" aria-hidden="true">{c.icon}</span>
              <span className="font-semibold text-sm">{c.name}</span>
              <span className="text-xs text-text-muted line-clamp-2">{(c.sub_specialities || []).slice(0, 3).join(' · ') || c.description}</span>
            </Link>
          ))}
        </div>
      </Reveal>

      {/* Top professionals */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading
          eyebrow="Top rated"
          title="Professionals clients love"
          subtitle="Highly rated experts, many available right now."
          actionLabel="View all"
          actionTo="/professionals"
        />
        {onlinePros === null && !prosError ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <ProfessionalCardSkeleton key={i} />)}
          </div>
        ) : prosError || !onlinePros?.length ? (
          <div className="card text-center py-12">
            <p className="text-text-secondary text-sm">Professionals will appear here once the service is reachable.</p>
            <Link to="/professionals" className="btn-outline mt-4 inline-flex">Browse professionals</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
            {onlinePros.map((p) => <ProfessionalCard key={p.id} professional={p} />)}
          </div>
        )}
      </Reveal>

      {/* How it works */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="Simple" title="How it works" subtitle="From question to expert advice in three steps." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="card relative">
              <span className="absolute top-4 right-5 text-4xl font-extrabold text-brand/10">{i + 1}</span>
              <span className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-3">
                <Icon size={20} />
              </span>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-text-secondary">{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Why us */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="Why ArpitVarta" title="Built to be trusted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {whyUs.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <Icon size={22} className="text-brand mb-3" />
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Testimonials */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="Reviews" title="What our users say" />
        <TestimonialSlider items={testimonials} />
      </Reveal>

      {/* For professionals */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <div className="card grid md:grid-cols-[1fr_auto] gap-6 items-center !p-8">
          <div>
            <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-1">For professionals</p>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Are you an expert? Earn from every minute you consult.</h2>
            <p className="text-sm text-text-secondary max-w-2xl">
              Join ArpitVarta as a doctor, lawyer, CA, coach, tutor or any other professional. Set your own rates,
              go online when you want and get paid weekly.
            </p>
          </div>
          <Link to="/become-a-professional" className="btn-primary shrink-0">
            <Clock size={16} /> Join as a Professional
          </Link>
        </div>
      </Reveal>

      {/* Blog teasers */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="Learn" title="Expert Insights" actionLabel="View all" actionTo="/blog" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {blogTeasers.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="card text-left flex flex-col gap-2 hover:border-brand/50 transition-colors"
            >
              <span className="badge-gold w-fit">{post.category}</span>
              <h3 className="font-semibold text-sm leading-snug line-clamp-2">{post.title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </Reveal>

      {/* Closing call to action */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-dark via-brand to-secondary px-6 py-12 sm:px-12 sm:py-14 text-center text-white shadow-xl">
          <Briefcase size={160} className="absolute -left-6 -top-8 text-white/10" aria-hidden="true" />
          <Sparkles size={120} className="absolute -right-4 -bottom-6 text-white/10" aria-hidden="true" />
          <h2 className="relative text-2xl sm:text-4xl font-extrabold mb-3">Get expert advice today</h2>
          <p className="relative text-white/90 max-w-xl mx-auto mb-7 text-sm sm:text-base">
            Talk to a verified professional now, or let our AI assistant point you to the right one.
          </p>
          <div className="relative flex flex-wrap justify-center gap-3">
            <Link to="/professionals" className="inline-flex items-center gap-2 bg-white text-brand-dark font-semibold py-3 px-6 rounded-xl hover:bg-white/90 transition-colors">
              <MessageCircle size={18} /> Talk to a Professional
            </Link>
            <Link to="/ask-ai" className="inline-flex items-center gap-2 border border-white/70 text-white font-semibold py-3 px-6 rounded-xl hover:bg-white/10 transition-colors">
              <Sparkles size={16} /> Ask AI
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
