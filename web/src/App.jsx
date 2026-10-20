import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import BrandLoader from './components/ui/BrandLoader'

const Home = lazy(() => import('./pages/Home'))
const Professionals = lazy(() => import('./pages/Professionals'))
const ProfessionalCategory = lazy(() => import('./pages/ProfessionalCategory'))
const ProfessionalProfile = lazy(() => import('./pages/ProfessionalProfile'))
const Chat = lazy(() => import('./pages/Chat'))
const Call = lazy(() => import('./pages/Call'))
const ComingSoon = lazy(() => import('./pages/ComingSoon'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogArticle = lazy(() => import('./pages/BlogArticle'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const Account = lazy(() => import('./pages/Account'))
const LiveView = lazy(() => import('./pages/LiveView'))
const AskAI = lazy(() => import('./pages/AskAI'))
const BecomeProfessional = lazy(() => import('./pages/BecomeProfessional'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading page">
      <span className="w-10 h-10 rounded-full border-4 border-surface-light border-t-brand animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

const BOOT_SPLASH_MS = 500

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), BOOT_SPLASH_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showSplash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <BrandLoader label="Loading ArpitVarta" />
        </div>
      )}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgb(var(--color-card))',
            color: 'rgb(var(--color-text-primary))',
            border: '1px solid rgb(var(--color-border))',
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/professionals" element={<Professionals />} />
            <Route path="/professional/profile/:id" element={<ProfessionalProfile />} />
            <Route path="/professional/:category" element={<ProfessionalCategory />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="/call/:id" element={<Call />} />
            <Route path="/account" element={<Account />} />
            <Route path="/ask-ai" element={<AskAI />} />
            <Route path="/become-a-professional" element={<BecomeProfessional />} />
            <Route path="/live/:sessionId" element={<LiveView />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route path="*" element={<ComingSoon feature="This page" />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
