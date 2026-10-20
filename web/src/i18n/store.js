import { DEFAULT_LANG, findLanguage } from './languages'

// Tiny external store for the active language plus static translation
// dictionaries. Each language lives in src/i18n/locales/<code>.json
// ({ "English text": "translation" }) and is loaded on demand, so only the
// chosen language is downloaded. Text with no entry simply shows in English.

const LANG_KEY = 'arpitvarta-lang'

const loaders = import.meta.glob('./locales/*.json', { import: 'default' })
const listeners = new Set()
const dicts = {}
let version = 0
let lang = DEFAULT_LANG

function notify() {
  version += 1
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getSnapshot() {
  return `${lang}:${version}`
}

export function getLang() {
  return lang
}

function format(text, args) {
  if (!args) return text
  return text.replace(/\{(\d+)\}/g, (match, i) => (args[i] !== undefined && args[i] !== null ? args[i] : match))
}

// English text that had no translation in the active language (dev aid: see
// scripts/check-i18n.mjs, which renders the pages and lists these).
const missing = new Set()
export function getMissingTranslations() {
  return [...missing]
}

// Values of each loaded dictionary, so text that is already translated (it can
// pass through two translated props) is left alone instead of looked up again.
const valueSets = {}
function isTranslatedValue(code, text) {
  if (!valueSets[code]) valueSets[code] = new Set(Object.values(dicts[code]))
  return valueSets[code].has(text)
}

export function translateText(source, args) {
  if (typeof source !== 'string' || !source) return source
  const dict = lang === DEFAULT_LANG ? null : dicts[lang]
  const hit = dict ? dict[source] : undefined
  if (dict && hit === undefined && !isTranslatedValue(lang, source)) missing.add(source)
  return format(hit !== undefined ? hit : source, args)
}

const loadedFonts = new Set()

function applyDocumentLanguage() {
  const meta = findLanguage(lang)
  const root = document.documentElement
  root.lang = lang
  root.dir = meta?.rtl ? 'rtl' : 'ltr'

  if (meta?.font) {
    root.style.setProperty('--lang-font', `'${meta.font}'`)
    if (!loadedFonts.has(meta.font)) {
      loadedFonts.add(meta.font)
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${meta.font.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
      document.head.appendChild(link)
    }
  } else {
    root.style.removeProperty('--lang-font')
  }
}

async function loadDictionary(code) {
  if (code === DEFAULT_LANG || dicts[code]) return
  const load = loaders[`./locales/${code}.json`]
  dicts[code] = load ? await load() : {}
}

export async function setLang(code) {
  if (!findLanguage(code) || code === lang) return
  await loadDictionary(code)
  lang = code
  try {
    localStorage.setItem(LANG_KEY, code)
  } catch {
    // storage unavailable — the choice just won't persist
  }
  applyDocumentLanguage()
  notify()
}

export function installI18n() {
  let stored = null
  try {
    stored = localStorage.getItem(LANG_KEY)
  } catch {
    // ignore
  }
  if (stored && findLanguage(stored) && stored !== DEFAULT_LANG) {
    setLang(stored)
  }
}
