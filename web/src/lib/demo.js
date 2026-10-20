import toast from 'react-hot-toast'
import { translateText } from '../i18n/store'

// Central helper for stub actions (Chat/Call buttons etc.) so behaviour is
// consistent across the whole demo site. No backend calls are ever made.
export function demoOnly(message = "This is a demo — that action isn't wired up yet.") {
  toast(translateText(message), { icon: '✨' })
}

// Simple deterministic string hash (djb2-style) so demo results
// stay consistent for the same input instead of changing on every render.
export function hashString(str = '') {
  let hash = 5381
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return Math.abs(hash)
}

// Pick a deterministic item from an array using a hash value.
export function pickFromHash(hash, array) {
  return array[hash % array.length]
}

const DEFAULT_OG_IMAGE = 'https://picsum.photos/seed/arpitvarta-og-default/1200/630'

function upsertMeta(attr, key, content) {
  if (!content) return
  let tag = document.querySelector(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function upsertCanonical(href) {
  let tag = document.querySelector('link[rel="canonical"]')
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', 'canonical')
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', href)
}

// Sets document title/description plus canonical link and Open Graph tags.
// Accepts either the original positional form, setPageMeta(title, description),
// or the richer options form, setPageMeta({ title, description, image, type }).
// Every existing call site keeps working unchanged.
export function setPageMeta(titleOrOptions, maybeDescription) {
  const options =
    typeof titleOrOptions === 'object' && titleOrOptions !== null
      ? titleOrOptions
      : { title: titleOrOptions, description: maybeDescription }

  const { title, description, image, type = 'website' } = options

  if (title) document.title = title
  upsertMeta('name', 'description', description)

  const canonicalUrl = window.location.origin + window.location.pathname
  upsertCanonical(canonicalUrl)

  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:type', type)
  upsertMeta('property', 'og:url', canonicalUrl)
  upsertMeta('property', 'og:image', image || DEFAULT_OG_IMAGE)
}
