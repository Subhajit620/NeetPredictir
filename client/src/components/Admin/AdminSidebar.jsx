import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  UploadCloud,
  BarChart3,
  LogOut,
  ArrowLeft,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext.jsx'

const links = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/datasets', label: 'Datasets', icon: Database },
  { to: '/admin/upload', label: 'Upload Data', icon: UploadCloud },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function AdminSidebar() {
  const { admin, logout } = useAdminAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Glassy Header Bar */}
      <div className="navbar-glass flex items-center justify-between px-4 py-3 lg:hidden sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-xs">
            <ShieldCheck size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-tight">Admin Console</p>
            <p className="text-[11px] text-sky-600 leading-tight">{admin?.email || 'Administrator'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="glass-pill rounded-xl p-2 text-sky-700 hover:bg-sky-100/70 transition-colors cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="glass-sidebar relative z-10 flex w-64 flex-col p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white">
                  <ShieldCheck size={17} />
                </div>
                <span className="text-sm font-semibold text-slate-900">Admin Console</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-sky-50 hover:text-sky-700"
              >
                <X size={16} />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5">
              {links.map((l) => {
                const Icon = l.icon
                return (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs transition-all ${
                        isActive
                          ? 'nav-link-active'
                          : 'font-medium text-slate-600 hover:bg-white/70 hover:text-sky-700'
                      }`
                    }
                  >
                    <Icon size={16} />
                    {l.label}
                  </NavLink>
                )
              })}
            </nav>

            <div className="space-y-1 border-t border-sky-200/60 pt-4">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-white/70 hover:text-sky-700 transition-colors"
              >
                <ArrowLeft size={15} />
                Back to Predictor
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50/80 transition-colors cursor-pointer"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Glassy Sidebar */}
      <aside className="glass-sidebar hidden lg:flex w-64 shrink-0 flex-col px-4 py-6 sticky top-0 h-screen">
        <div className="glass-card mb-7 rounded-2xl p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-xs shadow-sky-500/20">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">Admin Console</p>
              <p className="text-[11px] font-medium text-sky-700 truncate">{admin?.email || 'Administrator'}</p>
            </div>
          </div>
        </div>

        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sky-700/75">
          Workspace
        </div>
        <nav className="flex-1 space-y-1.5">
          {links.map((l) => {
            const Icon = l.icon
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs transition-all duration-150 ${
                    isActive
                      ? 'nav-link-active'
                      : 'font-medium text-slate-600 hover:bg-white/75 hover:text-sky-700'
                  }`
                }
              >
                <Icon size={16} />
                {l.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-sky-200/60 pt-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-white/75 hover:text-sky-700 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Predictor
          </Link>

          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50/80 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
