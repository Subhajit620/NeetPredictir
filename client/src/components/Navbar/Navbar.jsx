import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStudentAuth } from '../../context/StudentAuthContext'
import {
  Stethoscope,
  MessageSquare,
  Scale,
  ShieldCheck,
  Search,
  Menu,
  X,
  Layers,
  ClipboardCheck,
  Bookmark,
  LogOut,
  ChevronDown,
  UserPlus,
  Compass,
  Settings,
} from 'lucide-react'

export default function Navbar({ onNewChat }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, choiceList, openAuthModal, logout } = useStudentAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setUserDropdownOpen(false)
  }, [location.pathname])

  return (
    <header className="navbar-glass sticky top-0 z-40 transition-all duration-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/25 group-hover:scale-105 transition-transform duration-200">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M10 4.5C10 3.94772 10.4477 3.5 11 3.5H13C13.5523 3.5 14 3.94772 14 4.5V10H19.5C20.0523 10 20.5 10.4477 20.5 11V13C20.5 13.5523 20.0523 14 19.5 14H14V19.5C14 20.0523 13.5523 20.5 13 20.5H11C10.4477 20.5 10 20.0523 10 19.5V14H4.5C3.94772 14 3.5 13.5523 3.5 13V11C3.5 10.4477 3.94772 10 4.5 10H10V4.5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900">
                NEET<span className="text-sky-600">Predictor</span>
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-sky-50 border border-sky-200/80 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                2026
              </span>
            </div>
            <p className="hidden text-[11px] font-medium text-slate-500 sm:block leading-none mt-0.5">
              AIQ 15% &amp; State 85% Counselling
            </p>
          </div>
        </Link>

        {/* Desktop Glassy Navigation Bar */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className={`nav-link-hover flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${
              isActive('/') ? 'nav-link-active' : 'text-slate-600'
            }`}
          >
            <Search size={14} className={isActive('/') ? 'text-sky-600' : 'text-slate-400'} />
            <span>Predictor</span>
          </Link>

          <Link
            to="/profile"
            className={`nav-link-hover flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${
              isActive('/profile')
                ? 'bg-sky-600 text-white font-semibold shadow-xs shadow-sky-500/20'
                : 'bg-sky-50/80 text-sky-800 border border-sky-200/70 hover:bg-sky-100/80'
            }`}
          >
            <ClipboardCheck size={14} className={isActive('/profile') ? 'text-white' : 'text-sky-600'} />
            <span>1-Click Predict</span>
          </Link>

          <Link
            to="/cutoffs"
            className={`nav-link-hover flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${
              isActive('/cutoffs') ? 'nav-link-active' : 'text-slate-600'
            }`}
          >
            <Layers size={14} className={isActive('/cutoffs') ? 'text-sky-600' : 'text-slate-400'} />
            <span>Cutoffs</span>
          </Link>

          <Link
            to="/compare"
            className={`nav-link-hover flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${
              isActive('/compare') ? 'nav-link-active' : 'text-slate-600'
            }`}
          >
            <Scale size={14} className={isActive('/compare') ? 'text-sky-600' : 'text-slate-400'} />
            <span>Compare</span>
          </Link>

          <button
            type="button"
            onClick={() => (onNewChat ? onNewChat() : navigate('/chat'))}
            className={`nav-link-hover flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium cursor-pointer ${
              isActive('/chat') ? 'nav-link-active' : 'text-slate-600'
            }`}
          >
            <MessageSquare size={14} className={isActive('/chat') ? 'text-sky-600' : 'text-slate-400'} />
            <span>Counselling Chat</span>
          </button>

          <Link
            to="/counselling-guide"
            className={`nav-link-hover flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${
              isActive('/counselling-guide') || isActive('/tools') ? 'nav-link-active' : 'text-slate-600'
            }`}
          >
            <Compass size={14} className={isActive('/counselling-guide') ? 'text-sky-600' : 'text-slate-400'} />
            <span>Guide &amp; Tools</span>
          </Link>

          <Link
            to="/login"
            className={`nav-link-hover flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium ${
              isActive('/login') || location.pathname.startsWith('/admin')
                ? 'nav-link-active'
                : 'text-slate-500'
            }`}
            title="Admin Console"
          >
            <ShieldCheck size={14} className={isActive('/login') ? 'text-sky-600' : 'text-slate-400'} />
            <span>Admin</span>
          </Link>

          <div className="mx-1.5 h-4 w-px bg-sky-200/70" />

          {/* Focused Student Account Capsule */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="glass-pill flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-white transition-all duration-150 cursor-pointer shadow-2xs"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-semibold text-xs border border-sky-200/60">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>

              <div className="text-left leading-tight hidden xl:block">
                <span className="block text-xs font-semibold text-slate-800 truncate max-w-[100px]">
                  {user?.name || 'My Profile'}
                </span>
                <span className="block text-[10px] text-sky-600 font-medium">
                  {user?.air ? `AIR #${user.air}` : user?.category || 'Guest'}
                </span>
              </div>

              {choiceList.length > 0 && (
                <span className="flex items-center gap-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 px-1.5 py-0.5 text-[10px] font-semibold">
                  <Bookmark size={10} className="text-sky-600" />
                  {choiceList.length}
                </span>
              )}

              <ChevronDown
                size={13}
                className={`text-slate-400 transition-transform duration-150 ${
                  userDropdownOpen ? 'rotate-180 text-sky-600' : ''
                }`}
              />
            </button>

            {userDropdownOpen && (
              <div className="glass-card absolute right-0 mt-2 w-68 rounded-2xl p-3 z-50 animate-dropdown">
                {/* Account Summary */}
                <div className="rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50/90 to-white p-3.5 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white font-semibold text-xs">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || 'Candidate'}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {user?.isRegistered ? user.email : 'Guest Session'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {user?.air ? (
                      <span className="rounded-lg bg-white border border-sky-200 px-2 py-0.5 font-semibold text-sky-700">
                        AIR #{user.air}
                      </span>
                    ) : (
                      <span className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 font-medium text-amber-800">
                        AIR Not Set
                      </span>
                    )}
                    <span className="rounded-lg bg-white border border-sky-100 px-2 py-0.5 text-slate-600">
                      {user?.category || 'General'}
                    </span>
                    {user?.domicileState && (
                      <span className="rounded-lg bg-white border border-sky-100 px-2 py-0.5 text-slate-600">
                        {user.domicileState}
                      </span>
                    )}
                  </div>
                </div>

                {/* Account-Specific Actions Only (No duplicate nav links) */}
                <div className="space-y-0.5 text-xs font-medium text-slate-700">
                  <button
                    type="button"
                    onClick={() => { setUserDropdownOpen(false); navigate('/profile') }}
                    className="w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-sky-50 hover:text-sky-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Settings size={14} className="text-sky-600" />
                      <span>Candidate Profile &amp; Preferences</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUserDropdownOpen(false); navigate('/choice-list') }}
                    className="w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-sky-50 hover:text-sky-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Bookmark size={14} className="text-sky-600" />
                      <span>My Saved Choice Sheet</span>
                    </div>
                    {choiceList.length > 0 && (
                      <span className="rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-[10px] font-semibold">
                        {choiceList.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="border-t border-sky-100 mt-2 pt-2">
                  {user?.isRegistered ? (
                    <button
                      type="button"
                      onClick={() => { setUserDropdownOpen(false); logout() }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Sign out</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setUserDropdownOpen(false); openAuthModal('register') }}
                      className="gradient-btn w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-white cursor-pointer"
                    >
                      <UserPlus size={13} />
                      <span>Save Account</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile Menu Trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            to="/profile"
            className="glass-pill flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-sky-700"
          >
            <ClipboardCheck size={12} className="text-sky-600" />
            <span>Profile</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="glass-pill rounded-xl p-2 text-slate-700 hover:bg-white transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-sky-100 bg-white/95 backdrop-blur-xl px-4 py-4 md:hidden space-y-3 shadow-lg animate-fade-in-up">
          <Link
            to="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between rounded-xl border border-sky-200/80 bg-gradient-to-r from-sky-50 to-white p-3.5 text-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white font-semibold text-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-900">{user?.name || 'Candidate Profile'}</span>
                <span className="block text-[11px] text-sky-700 font-medium">
                  {user?.air ? `NEET AIR #${user.air}` : 'Set AIR for 1-Click Predictions'}
                </span>
              </div>
            </div>
            <span className="rounded-lg bg-white border border-sky-200 px-2.5 py-1 text-xs font-semibold text-sky-700">
              Open
            </span>
          </Link>

          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 rounded-xl p-2.5 border ${
                isActive('/') ? 'bg-sky-50 text-sky-700 border-sky-200 font-semibold' : 'bg-white text-slate-700 border-slate-200/80'
              }`}
            >
              <Search size={15} className="text-sky-600" />
              <span>Predictor</span>
            </Link>

            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 rounded-xl p-2.5 border ${
                isActive('/profile') ? 'bg-sky-50 text-sky-700 border-sky-200 font-semibold' : 'bg-white text-slate-700 border-slate-200/80'
              }`}
            >
              <ClipboardCheck size={15} className="text-sky-600" />
              <span>1-Click Predict</span>
            </Link>

            <Link
              to="/cutoffs"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 rounded-xl p-2.5 border ${
                isActive('/cutoffs') ? 'bg-sky-50 text-sky-700 border-sky-200 font-semibold' : 'bg-white text-slate-700 border-slate-200/80'
              }`}
            >
              <Layers size={15} className="text-sky-600" />
              <span>Cutoffs</span>
            </Link>

            <Link
              to="/compare"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 rounded-xl p-2.5 border ${
                isActive('/compare') ? 'bg-sky-50 text-sky-700 border-sky-200 font-semibold' : 'bg-white text-slate-700 border-slate-200/80'
              }`}
            >
              <Scale size={15} className="text-sky-600" />
              <span>Compare</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                if (onNewChat) onNewChat()
                else navigate('/chat')
              }}
              className={`flex items-center gap-2 rounded-xl p-2.5 border text-left cursor-pointer ${
                isActive('/chat') ? 'bg-sky-50 text-sky-700 border-sky-200 font-semibold' : 'bg-white text-slate-700 border-slate-200/80'
              }`}
            >
              <MessageSquare size={15} className="text-sky-600" />
              <span>Counselling Chat</span>
            </button>

            <Link
              to="/counselling-guide"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 rounded-xl p-2.5 border ${
                isActive('/counselling-guide') ? 'bg-sky-50 text-sky-700 border-sky-200 font-semibold' : 'bg-white text-slate-700 border-slate-200/80'
              }`}
            >
              <Compass size={15} className="text-sky-600" />
              <span>Guide &amp; Tools</span>
            </Link>
          </div>

          <div className="border-t border-sky-100 pt-2 flex items-center justify-between gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-sky-50"
            >
              <ShieldCheck size={14} className="text-sky-600" />
              <span>Admin Console</span>
            </Link>

            {user?.isRegistered ? (
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); logout() }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-600"
              >
                <LogOut size={13} />
                <span>Sign out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); openAuthModal('register') }}
                className="gradient-btn flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-white"
              >
                <UserPlus size={13} />
                <span>Save Account</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
