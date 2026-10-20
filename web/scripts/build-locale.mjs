// Turns an authoring file of "English => translation" lines into the
// English-keyed locale JSON the site loads, checking it against the source list.
//   node scripts/build-locale.mjs <lang-code> <authoring.txt> [source.json]
import fs from 'node:fs'
import path from 'node:path'

const [code, file, sourceArg] = process.argv.slice(2)
const ROOT = new URL('..', import.meta.url).pathname
const source = JSON.parse(fs.readFileSync(sourceArg || path.join(ROOT, 'src/i18n/source-strings.json'), 'utf8'))
const known = new Set(source)
const placeholders = (s) => (s.match(/\{\d+\}/g) || []).sort().join()

const authored = new Map()
const problems = []
for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue
  const cut = line.indexOf(' => ')
  if (cut < 0) { problems.push(`no separator: ${line.slice(0, 60)}`); continue }
  const english = line.slice(0, cut)
  const tr = line.slice(cut + 4).trim()
  if (!known.has(english)) { problems.push(`unknown English: ${english.slice(0, 70)}`); continue }
  if (!tr) { problems.push(`empty translation: ${english.slice(0, 50)}`); continue }
  if (placeholders(english) !== placeholders(tr)) problems.push(`placeholders: ${english.slice(0, 40)} -> ${tr.slice(0, 50)}`)
  authored.set(english, tr)
}
for (const english of source) if (!authored.has(english)) problems.push(`missing: ${english.slice(0, 70)}`)

if (problems.length) {
  console.error(`${code}: ${problems.length} problem(s)`)
  problems.slice(0, 40).forEach((p) => console.error('  ' + p))
  process.exitCode = 1
} else {
  const out = {}
  source.forEach((english) => { out[english] = authored.get(english) })
  fs.mkdirSync(path.join(ROOT, 'src/i18n/locales'), { recursive: true })
  fs.writeFileSync(path.join(ROOT, `src/i18n/locales/${code}.json`), JSON.stringify(out, null, 1) + '\n')
  console.log(`${code}: ok, ${Object.keys(out).length} strings`)
}
