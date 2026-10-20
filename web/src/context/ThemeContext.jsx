import { createContext, useContext, useEffect, useState } from 'react'

// Light/dark theme toggle. Persists to localStorage and mirrors the choice
// onto <html data-theme> so index.css's CSS variables (see :root and
// :root[data-theme='light']) pick the right palette.

const ThemeContext = createContext(null)
// v2: default flipped to light; a new key resets the dark value the old
// default had auto-saved for returning visitors.
const STORAGE_KEY = 'arpitvarta-theme-v2'

function loadTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(loadTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore — storage may be unavailable (private browsing, quota, etc).
    }
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const value = { theme, toggleTheme, isLight: theme === 'light' }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
