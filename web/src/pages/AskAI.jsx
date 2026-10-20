import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sparkles, ArrowRight, AlertTriangle, CheckCircle2, HelpCircle, Loader2 } from 'lucide-react'
import ProfessionalCard from '../components/professional/ProfessionalCard'
import SectionHeading from '../components/ui/SectionHeading'
import { askAssistant } from '../lib/ai'
import { normalizeProfessional } from '../lib/professionalDisplay'
import { setPageMeta } from '../lib/demo'
import { useOpenLogin } from '../context/RequireAuthContext'

const URGENCY = {
  low: { label: 'Not urgent', cls: 'bg-success/15 text-success' },
  medium: { label: 'Consult soon', cls: 'bg-gold/15 text-gold' },
  high: { label: 'Consult today', cls: 'bg-brand/15 text-brand' },
  emergency: { label: 'Emergency', cls: 'bg-error/15 text-error' },
}

const EXAMPLES = [
  'My employer hasn’t paid my salary for 2 months. What can I do?',
  'Lower back pain for a week after lifting something heavy',
  'Should I choose the old or new tax regime this year?',
  'My 6-year-old struggles with maths — need a tutor',
  'My dog has been vomiting since morning',
  'I want to switch from testing to a developer role',
]

export default function AskAI() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const openLogin = useOpenLogin()
  const autoRan = useRef(false)

  useEffect(() => {
    setPageMeta('Ask AI — Find the Right Professional | ArpitVarta', 'Describe your problem and our AI assistant suggests what kind of professional you need, with safe first steps.')
  }, [])

  async function run(q = query) {
    const text = q.trim()
    if (text.length < 5) return
    setLoading(true)
    setError(null)
    setSearchParams({ q: text }, { replace: true })
    try {
      const data = await askAssistant(text)
      setResult({ ...data, professionals: (data.professionals || []).map(normalizeProfessional) })
    } catch (e) {
      setResult(null)
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!autoRan.current && query.trim().length >= 5) {
      autoRan.current = true
      run(query)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const urgency = URGENCY[result?.urgency] || URGENCY.medium
  const primaryCategory = result?.categories?.[0]

  return (
    <div className="container-page py-8 sm:py-12 max-w-5xl">
      <SectionHeading
        level="h1"
        eyebrow="AI Assistant"
        title="Not sure whom to consult?"
        subtitle="Describe your situation in your own words. Our AI suggests the right kind of professional, a few safe first steps, and questions to ask."
      />

      <form
        onSubmit={(e) => { e.preventDefault(); run() }}
        className="card !p-3 mb-4"
      >
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="e.g. I received a GST notice for a mismatch in returns and don’t know what to do"
          className="w-full bg-transparent outline-none resize-none text-sm sm:text-base p-2"
          aria-label="Describe your problem"
        />
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-divider">
          <p className="text-[11px] text-text-muted">Don’t share passwords, OTPs or bank details.</p>
          <button type="submit" disabled={loading || query.trim().length < 5} className="btn-primary !py-2.5 !px-5 text-sm">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Thinking…' : 'Find my expert'}
          </button>
        </div>
      </form>

      {!result && !loading && (
        <div className="flex flex-wrap gap-2 mb-10">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => { setQuery(ex); run(ex) }}
              className="text-xs px-3 py-1.5 rounded-full bg-surface-light text-text-secondary hover:text-brand transition-colors text-left"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="card border-error/40 mb-6">
          <p className="text-sm text-error">
            {error.status === 429 ? error.message : 'The assistant is unavailable right now. You can still browse professionals directly.'}
          </p>
          {error.status === 429 && (
            <button type="button" onClick={() => openLogin()} className="btn-outline mt-3 text-sm">Log in for more</button>
          )}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {result.urgency === 'emergency' && (
            <div className="card border-error bg-error/10 flex gap-3">
              <AlertTriangle className="text-error shrink-0" />
              <div>
                <p className="font-semibold text-error">This may need immediate help.</p>
                <p className="text-sm text-text-secondary">Call <a href="tel:112" className="font-semibold text-error underline">112</a> or go to the nearest hospital right away. Online consultations are not a substitute for emergency care.</p>
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {(result.categories || []).map((c) => (
                <Link key={c.slug} to={`/professional/${c.slug}`} className="badge-brand">{c.name}</Link>
              ))}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${urgency.cls}`}>{urgency.label}</span>
              {result.consultation_type && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-surface-light text-text-secondary capitalize">Suggested: {result.consultation_type}</span>
              )}
            </div>
            <p className="text-text-primary">{result.summary}</p>

            <div className="grid md:grid-cols-2 gap-5 mt-5">
              {result.general_guidance?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><CheckCircle2 size={15} className="text-success" /> What you can do now</h3>
                  <ul className="flex flex-col gap-1.5">
                    {result.general_guidance.map((g) => <li key={g} className="text-sm text-text-secondary leading-relaxed">• {g}</li>)}
                  </ul>
                </div>
              )}
              {result.questions_to_ask?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><HelpCircle size={15} className="text-brand" /> Questions to ask your expert</h3>
                  <ul className="flex flex-col gap-1.5">
                    {result.questions_to_ask.map((q) => <li key={q} className="text-sm text-text-secondary leading-relaxed">• {q}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-5">{result.disclaimer}</p>
          </div>

          <div>
            <SectionHeading
              title="Recommended professionals"
              subtitle={result.specializations?.length ? `Matched for: ${result.specializations.join(', ')}` : undefined}
              actionLabel={primaryCategory ? `All ${primaryCategory.name}` : undefined}
              actionTo={primaryCategory ? `/professional/${primaryCategory.slug}` : undefined}
            />
            {result.professionals.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {result.professionals.map((p) => <ProfessionalCard key={p.id} professional={p} />)}
              </div>
            ) : (
              <div className="card text-center py-10">
                <p className="text-text-secondary text-sm mb-4">No matching professional is listed yet.</p>
                <Link to="/professionals" className="btn-outline inline-flex">Browse all professionals <ArrowRight size={15} /></Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
