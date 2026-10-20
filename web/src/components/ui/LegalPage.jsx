import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from './SectionHeading'
import { setPageMeta } from '../../lib/demo'
import { getLang, translateText, useI18nVersion } from '@i18n'

// Shared layout for long-form legal pages: heading, sticky section index on
// desktop, numbered sections, and a cross-link to the sibling policy.
export default function LegalPage({ title, metaDescription, effectiveDate, sections, seeAlso }) {
  useI18nVersion()
  useEffect(() => {
    setPageMeta(`${title} | ArpitVarta`, metaDescription)
  }, [title, metaDescription])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading level="h1" eyebrow="Legal" title={translateText(title)} subtitle={`Effective date: ${effectiveDate}`} />

      <div className="grid lg:grid-cols-[14rem_1fr] gap-8">
        <nav aria-label={`${title} sections`} className="hidden lg:block">
          <ul className="sticky top-24 flex flex-col gap-1 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block px-3 py-1.5 rounded-lg text-text-secondary hover:bg-surface-light hover:text-text-primary transition-colors"
                >
                  {i + 1}. {s.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="card card-static space-y-8">
          {getLang() !== 'en' && (
            <p className="text-xs text-text-muted bg-surface-light rounded-xl px-3 py-2.5">
              The full text of this page is available in English.
            </p>
          )}
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-lg font-semibold mb-3">{i + 1}. {s.heading}</h2>
              {s.body?.map((p) => (
                <p key={p} className="text-sm text-text-secondary leading-relaxed mb-3">{p}</p>
              ))}
              {s.list && (
                <ul className="list-disc pl-5 space-y-2 text-sm text-text-secondary leading-relaxed">
                  {s.list.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
              {s.after && <p className="text-sm text-text-secondary leading-relaxed mt-3">{s.after}</p>}
            </section>
          ))}
          {seeAlso && (
            <p className="text-xs text-text-muted border-t border-border pt-4">
              See also our <Link to={seeAlso.to} className="text-brand hover:underline">{seeAlso.label}</Link>.
            </p>
          )}
        </article>
      </div>
    </div>
  )
}
