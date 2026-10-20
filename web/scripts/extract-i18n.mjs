// Lists every English string the site can show, so translations can be checked
// for completeness: node scripts/extract-i18n.mjs [--write]
import { transformSync } from '@babel/core'
import fs from 'node:fs'
import path from 'node:path'
import autoT from '../tools/babel-plugin-auto-t.js'

const ROOT = new URL('..', import.meta.url).pathname
const strings = new Set()

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

// Babel output is a JS string literal (may contain \xB7, \u20B9 ...).
const unescape = (s) => new Function(`return "${s}"`)()

const DATA_FILES = ['src/data/services.js', 'src/lib/professionals.js'].map((f) => path.join(ROOT, f))
const COPY_KEYS = /\b(?:label|hint|title|text|description|heading|after|quote|category|excerpt|topic):\s*(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g

for (const file of DATA_FILES) {
  for (const m of fs.readFileSync(file, 'utf8').matchAll(COPY_KEYS)) {
    if (/\p{L}/u.test(m[2])) strings.add(m[2].replace(/\\'/g, "'"))
  }
}

for (const file of [...walk(path.join(ROOT, 'src/pages')), ...walk(path.join(ROOT, 'src/components'))]) {
  if (!file.endsWith('.jsx')) continue
  const src = fs.readFileSync(file, 'utf8')
  const out = transformSync(src, { filename: file, plugins: [autoT], parserOpts: { plugins: ['jsx'] }, babelrc: false, configFile: false }).code
  for (const m of out.matchAll(/<__T>\{"((?:[^"\\]|\\.)*)"\}<\/__T>/g)) strings.add(unescape(m[1]))
  for (const m of out.matchAll(/__t\("((?:[^"\\]|\\.)*)"/g)) strings.add(unescape(m[1]))
  // toasts via demoOnly('...') and status maps passed to translateText()
  for (const m of src.matchAll(/demoOnly\(\s*(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) strings.add(m[2].replace(/\\'/g, "'"))
  for (const m of src.matchAll(/^\s*(?:connecting|queued|rejected|insufficient_balance|ended|error):\s*'((?:[^'\\\n]|\\.)*)'/gm)) strings.add(m[1])
  // data-driven copy rendered through {x.label} / {title} etc.
  for (const m of src.matchAll(/\b(?:label|hint|title|text|description|heading|after|quote|category|excerpt|topic):\s*(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) {
    if (/\p{L}/u.test(m[2])) strings.add(m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'))
  }
}

// Mock/decorative or non-copy strings that must not be translated.
const EXCLUDE = new Set([
  'AK', 'Arpit', 'Varta', 'R', 's', 'Today · 9:38 AM', 'Online · ₹25/min',
  'This page is translated for your convenience. If anything differs, the English version applies.',
])
// Strings that live in plain arrays/objects or are built at runtime.
;[
  'Chat consultation', 'Voice consultation', 'Video consultation', 'Connected · {0}', 'Connecting audio…',
  'Wallet top-ups, charges or billing questions',
  'Problems with a chat, call or video consultation',
  'Account, login or profile help',
  'Privacy requests — access, correction or deletion of your data',
  'Feedback and suggestions',
  'The full text of this page is available in English.',
].forEach((x) => strings.add(x))
const list = [...strings].filter((x) => !EXCLUDE.has(x) && !x.includes('${')).sort((a, b) => a.localeCompare(b))
if (process.argv.includes('--write')) fs.writeFileSync(path.join(ROOT, 'src/i18n/source-strings.json'), JSON.stringify(list, null, 2))
const long = list.filter((s) => s.length > 120).length
console.log(`${list.length} strings (${long} longer than 120 chars, ${list.reduce((n, s) => n + s.length, 0)} chars total)`)
