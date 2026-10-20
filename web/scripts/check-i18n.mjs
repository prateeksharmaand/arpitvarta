// Renders the site's pages in one language and lists English text that has no
// translation yet:  node scripts/check-i18n.mjs [lang]   (default: hi)
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'

const lang = process.argv[2] || 'hi'
globalThis.localStorage = { getItem: () => null, setItem() {} }
globalThis.document = {
  documentElement: { style: { setProperty() {}, removeProperty() {} } },
  createElement: () => ({}),
  head: { appendChild() {} },
}

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const load = async (p) => (await server.ssrLoadModule(p)).default
const named = async (p, n) => (await server.ssrLoadModule(p))[n]

const { setLang, getMissingTranslations } = await server.ssrLoadModule('/src/i18n/store.js')
const { StaticRouter } = await import('react-router-dom/server.js')
const ThemeProvider = await named('/src/context/ThemeContext.jsx', 'ThemeProvider')
const AuthProvider = await named('/src/context/AuthContext.jsx', 'AuthProvider')
const RequireAuthProvider = await named('/src/context/RequireAuthContext.jsx', 'RequireAuthProvider')

const wrap = (el) =>
  React.createElement(StaticRouter, { location: '/' },
    React.createElement(ThemeProvider, null,
      React.createElement(AuthProvider, null,
        React.createElement(RequireAuthProvider, null, el))))

await setLang(lang)
const pages = ['Home', 'Professionals', 'ProfessionalCategory', 'ProfessionalProfile', 'AskAI', 'BecomeProfessional', 'Account',
  'About', 'Contact', 'PrivacyPolicy', 'TermsOfUse', 'Blog', 'BlogArticle', 'Chat', 'Call', 'LiveView', 'ComingSoon']
const failed = []
for (const name of pages) {
  try {
    renderToString(wrap(React.createElement(await load(`/src/pages/${name}.jsx`))))
  } catch (e) {
    failed.push(`${name}: ${String(e.message).slice(0, 160)}`)
  }
}
for (const [dir, name] of [['layout', 'Header'], ['layout', 'Footer'], ['layout', 'AnnouncementMarquee']]) {
  renderToString(wrap(React.createElement(await load(`/src/components/${dir}/${name}.jsx`))))
}

const missing = getMissingTranslations().filter((s) => /\p{L}/u.test(s.replace(/\{\d+\}/g, '')))
console.log(`${lang}: ${missing.length} untranslated string(s) across ${pages.length - failed.length} rendered pages`)
missing.forEach((s) => console.log('  -', s.slice(0, 110)))
if (failed.length) console.log('could not render:', failed.join(' | '))
await server.close()
