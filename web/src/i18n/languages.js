// Languages offered in the picker: English plus 18 of India's 22 scheduled
// languages, each with a complete file in ./locales. `native` is what the
// picker shows; `font` is the Google Fonts family that carries the script.
export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', font: null },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', font: 'Noto Sans Devanagari' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', font: 'Noto Sans Bengali' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', font: 'Noto Sans Telugu' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', font: 'Noto Sans Devanagari' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', font: 'Noto Sans Tamil' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', font: 'Noto Sans Gujarati' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', font: 'Noto Sans Kannada' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', font: 'Noto Sans Malayalam' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', font: 'Noto Sans Gurmukhi' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', font: 'Noto Sans Oriya' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', font: 'Noto Sans Bengali' },
  { code: 'ur', name: 'Urdu', native: 'اردو', font: 'Noto Naskh Arabic', rtl: true },
  { code: 'ne', name: 'Nepali', native: 'नेपाली', font: 'Noto Sans Devanagari' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', font: 'Noto Sans Devanagari' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली', font: 'Noto Sans Devanagari' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी', font: 'Noto Sans Devanagari' },
  { code: 'doi', name: 'Dogri', native: 'डोगरी', font: 'Noto Sans Devanagari' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي', font: 'Noto Naskh Arabic', rtl: true },
]

export const DEFAULT_LANG = 'en'

export function findLanguage(code) {
  return LANGUAGES.find((l) => l.code === code)
}

// Scheduled languages still waiting for a native-speaker translation. To add
// one: write its locale (see scripts/build-locale.mjs), then move its entry
// into LANGUAGES above.
export const PENDING_LANGUAGES = [
  { code: 'brx', name: 'Bodo', native: 'बड़ो', font: 'Noto Sans Devanagari' },
  { code: 'ks', name: 'Kashmiri', native: 'کٲشُر', font: 'Noto Naskh Arabic', rtl: true },
  { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', font: 'Noto Sans Ol Chiki' },
  { code: 'mni', name: 'Manipuri (Meitei)', native: 'ꯃꯩꯇꯩꯂꯣꯟ', font: 'Noto Sans Meetei Mayek' },
]
