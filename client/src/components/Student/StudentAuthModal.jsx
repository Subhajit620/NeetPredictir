import { useState } from 'react'
import { useStudentAuth } from '../../context/StudentAuthContext'
import CategorySelect from '../CategorySelect/CategorySelect'
import { X, Lock, Mail, User, Phone, Sparkles, CheckCircle2, ShieldCheck, Award } from 'lucide-react'

export default function StudentAuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, authModalMode, openAuthModal, login, register, error } = useStudentAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    air: '',
    category: 'General',
    domicileState: '',
  })

  if (!isAuthModalOpen) return null

  const isLogin = authModalMode === 'login'

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setIsSubmitting(true)
    try {
      if (isLogin) {
        const res = await login(formData.email, formData.password)
        if (!res?.success) {
          setLocalError(res?.error || 'Login failed')
        }
      } else {
        const res = await register(formData)
        if (!res?.success) {
          setLocalError(res?.error || 'Registration failed')
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl transition-all">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-accent-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                <Sparkles size={16} />
              </div>
              <h3 className="text-lg font-extrabold tracking-tight">
                {isLogin ? 'Welcome to Student Account' : 'Create Student Account'}
              </h3>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
          <p className="mt-1 text-xs text-brand-100 font-medium">
            {isLogin
              ? 'Access your saved choices, profile predictions & counselling sheets across all devices.'
              : 'Save your NEET AIR, state quota eligibility, and build your MCC choice preference list.'}
          </p>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setLocalError(''); openAuthModal('login') }}
            className={`flex-1 rounded-xl py-2 transition ${
              isLogin ? 'bg-white text-brand-700 shadow-xs border border-slate-200/60 font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setLocalError(''); openAuthModal('register') }}
            className={`flex-1 rounded-xl py-2 transition ${
              !isLogin ? 'bg-white text-brand-700 shadow-xs border border-slate-200/60 font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Free Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {(localError || error) && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {localError || error}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Subhajit Saha"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="student@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none transition shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none transition shadow-2xs"
              />
            </div>
          </div>

          {!isLogin && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NEET AIR (Optional)</label>
                <input
                  type="number"
                  name="air"
                  value={formData.air}
                  onChange={handleChange}
                  placeholder="e.g. 400"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none transition shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <CategorySelect
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="py-2 text-xs"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-brand-600 via-brand-700 to-accent-600 py-2.5 text-xs font-extrabold text-white shadow-md shadow-brand-500/25 hover:opacity-95 active:scale-[0.98] transition disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : isLogin ? 'Sign In to Student Account' : 'Create Student Account'}
          </button>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              By continuing, you gain full access to verified historical counselling cutoffs & 1-click prediction tools.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
