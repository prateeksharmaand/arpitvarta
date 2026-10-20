import { useEffect, useRef, useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { useI18n, findLanguage } from '@i18n'

// Language picker: shows each language in its own script. Lives in the header
// (desktop) and the mobile menu (`inline`).
export default function LanguageSwitcher({ inline = false }) {
  const { lang, setLang, languages } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = findLanguage(lang)

  useEffect(() => {
    if (!open || inline) return undefined
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, inline])

  function choose(code) {
    setLang(code)
    setOpen(false)
  }

  const list = (
    <ul className="grid grid-cols-2 gap-1" role="listbox" aria-label="Language">
      {languages.map((l) => (
        <li key={l.code}>
          <button
            type="button"
            role="option"
            aria-selected={l.code === lang}
            translate="no"
            onClick={() => choose(l.code)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors ${
              l.code === lang ? 'bg-brand/10 text-brand font-medium' : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
            }`}
          >
            <span className="truncate">{l.native}</span>
            {l.code === lang && <Check size={14} className="shrink-0" />}
          </button>
        </li>
      ))}
    </ul>
  )

  if (inline) {
    return (
      <div className="px-1 py-2">
        <p className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 px-2">
          <Globe size={14} /> <span translate="no">Language</span>
        </p>
        {list}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        translate="no"
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl hover:bg-surface-light text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
      >
        <Globe size={18} />
        <span className="hidden xl:inline">{current?.native}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[22rem] max-h-[70vh] overflow-y-auto p-2 rounded-2xl border border-border bg-card shadow-xl animate-fade-in z-50">
          {list}
        </div>
      )}
    </div>
  )
}
