import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageCircle, HelpCircle } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import { setPageMeta } from '../lib/demo'

const SUPPORT_EMAIL = 'support@arpitvarta.com'

function openLiveChat() {
  const api = window.Tawk_API
  if (api && typeof api.maximize === 'function') {
    api.maximize()
  } else {
    window.location.href = `mailto:${SUPPORT_EMAIL}`
  }
}

const topics = [
  'Wallet top-ups, charges or billing questions',
  'Problems with a chat, call or video consultation',
  'Account, login or profile help',
  'Privacy requests — access, correction or deletion of your data',
  'Feedback and suggestions',
]

export default function Contact() {
  useEffect(() => {
    setPageMeta('Contact Us | ArpitVarta', 'Get in touch with ArpitVarta support by live chat or email.')
  }, [])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Contact Us"
        title="We're here to help"
        subtitle="Reach out by live chat or email and our team will get back to you."
      />

      <div className="grid md:grid-cols-2 gap-4 max-w-3xl mb-10">
        <div className="card">
          <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-3">
            <MessageCircle size={20} />
          </span>
          <h2 className="font-semibold mb-1">Live chat</h2>
          <p className="text-sm text-text-secondary mb-4">Chat with our support team right from the site — look for the chat bubble in the corner.</p>
          <button type="button" onClick={openLiveChat} className="btn-primary">Start live chat</button>
        </div>

        <div className="card">
          <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-3">
            <Mail size={20} />
          </span>
          <h2 className="font-semibold mb-1">Email</h2>
          <p className="text-sm text-text-secondary mb-4">Send us the details and we'll reply to the email address you write from.</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-outline">{SUPPORT_EMAIL}</a>
        </div>
      </div>

      <div className="card card-static max-w-3xl">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><HelpCircle size={18} className="text-gold" /> What can we help with?</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-text-secondary">
          {topics.map((topic) => <li key={topic}>{topic}</li>)}
        </ul>
        <p className="text-xs text-text-muted mt-5">
          For billing or account questions, please write from the email address on your account so we can find it quickly.
          See our <Link to="/privacy" className="text-brand hover:underline">Privacy Policy</Link> and{' '}
          <Link to="/terms" className="text-brand hover:underline">Terms of Use</Link>.
        </p>
      </div>
    </div>
  )
}
