import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Sparkles, Briefcase, Sun, Moon, ChevronDown, UserRound, LogOut } from 'lucide-react'
import { useCategories } from '../../hooks/useCategories'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useOpenLogin } from '../../context/RequireAuthContext'
import LanguageSwitcher from './LanguageSwitcher'

const primaryLinks = [
  { label: 'Home', to: '/' },
  { label: 'Professionals', to: '/professionals' },
]

const trailingLinks = [
  { label: 'Ask AI', to: '/ask-ai' },
  { label: 'Blog', to: '/blog' },
]

const navLinkClass = ({ isActive }) =>
  `px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
    isActive ? 'text-brand bg-brand/10' : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
  }`

function CategoriesDropdown() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const location = useLocation()
  const categories = useCategories()
  const isToolsActive = location.pathname.startsWith('/professional/')

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
          isToolsActive || open
            ? 'text-brand bg-brand/10'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
        }`}
      >
        Categories
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 w-[460px] p-3 rounded-2xl border border-border bg-card shadow-xl grid grid-cols-2 gap-1 animate-fade-in"
        >
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/professional/${c.slug}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 text-base">
                {c.icon}
              </span>
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountMenu() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-semibold text-sm shrink-0"
        aria-label={`Account menu for ${user.name}`}
      >
        {user.name?.[0]?.toUpperCase() || <UserRound size={16} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-48 p-1.5 rounded-2xl border border-border bg-card shadow-xl animate-fade-in"
        >
          <p className="px-3 py-2 text-sm font-medium truncate border-b border-divider mb-1">{user.name}</p>
          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
          >
            <UserRound size={15} /> My Account
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-error hover:bg-error/10 transition-colors"
          >
            <LogOut size={15} /> Log Out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const categories = useCategories()
  const { isLight, toggleTheme } = useTheme()
  const { isAuthenticated, user, logout } = useAuth()
  const openLogin = useOpenLogin()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="container-page flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="ArpitVarta home">
          <span className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
            <Briefcase size={18} className="text-white" />
          </span>
          <span translate="no" className="text-lg font-bold tracking-tight">
            Arpit<span className="text-brand">Varta</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {primaryLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
          <CategoriesDropdown />
          {trailingLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-surface-light text-text-secondary hover:text-text-primary transition-colors"
            aria-label={isLight ? 'Switch to dark theme' : 'Switch to day theme'}
          >
            {isLight ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <Link to="/ask-ai" className="btn-primary !py-2 !px-4 text-sm">
            <Sparkles size={15} /> Find the Right Expert
          </Link>
          {isAuthenticated && user ? (
            <AccountMenu />
          ) : (
            <button
              type="button"
              onClick={() => openLogin()}
              className="px-3 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
            >
              Log In
            </button>
          )}
        </div>

        <div className="lg:hidden flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-surface-light text-text-secondary"
            aria-label={isLight ? 'Switch to dark theme' : 'Switch to day theme'}
          >
            {isLight ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-surface-light"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-2 py-3 rounded-xl text-sm font-medium border-b border-divider ${
                    isActive ? 'text-brand' : 'text-text-secondary'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            <p className="px-2 pt-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wide">
              Categories
            </p>
            {categories.map((c) => (
              <NavLink
                key={c.slug}
                to={`/professional/${c.slug}`}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2 py-3 rounded-xl text-sm font-medium border-b border-divider ${
                    isActive ? 'text-brand' : 'text-text-secondary'
                  }`
                }
              >
                <span className="w-5 text-center shrink-0">{c.icon}</span> {c.name}
              </NavLink>
            ))}

            {trailingLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-2 py-3 rounded-xl text-sm font-medium border-b border-divider last:border-b-0 ${
                    isActive ? 'text-brand' : 'text-text-secondary'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            <div className="mt-3 border-t border-divider pt-2">
              <LanguageSwitcher inline />
            </div>

            <Link
              to="/professionals"
              onClick={() => setOpen(false)}
              className="btn-primary mt-4 w-full text-sm"
            >
              Talk to a Professional
            </Link>

            {isAuthenticated && user ? (
              <>
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-2 btn-outline mt-3 w-full text-sm"
                >
                  <UserRound size={16} /> My Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setOpen(false)
                    navigate('/')
                  }}
                  className="inline-flex items-center justify-center gap-2 mt-3 w-full text-sm text-error py-2"
                >
                  <LogOut size={16} /> Log Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  openLogin()
                }}
                className="btn-outline mt-3 w-full text-sm"
              >
                Log In
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
