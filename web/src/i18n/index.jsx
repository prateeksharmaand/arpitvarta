import { useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, getLang, setLang, translateText, installI18n, getMissingTranslations } from './store'
import { LANGUAGES, findLanguage } from './languages'

export { translateText, installI18n, setLang, getLang, getMissingTranslations, LANGUAGES, findLanguage }

// Subscribes a component to language / translation updates.
export function useI18nVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useI18n() {
  useI18nVersion()
  return { lang: getLang(), setLang, t: translateText, languages: LANGUAGES }
}

// Renders its (string) children translated. Children must be plain text.
export function T({ children }) {
  useI18nVersion()
  const source = Array.isArray(children) ? children.join('') : children == null ? '' : String(children)
  return <>{translateText(source)}</>
}
