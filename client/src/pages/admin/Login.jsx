import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext.jsx'
import ErrorMessage from '../../components/Loading/ErrorMessage.jsx'
import { apiErrorMessage } from '../../services/api'

export default function Login() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/admin')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const fillDefaultCredentials = () => {
    setEmail('admin@example.com')
    setPassword('123')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 px-4 py-12">
      {/* Back to App Link */}
      <Link
        to="/"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition"
      >
        <ArrowLeft size={15} />
        Back to Predictor
      </Link>

      <div className="w-full max-w-md space-y-6">
        {/* Header Icon */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/25">
            <ShieldCheck size={28} />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Admin Portal</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Sign in to upload, review, and publish NEET counselling cutoff spreadsheets.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl">
          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Admin Email
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3.5 text-sm font-semibold text-slate-900 placeholder:font-normal focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3.5 text-sm font-semibold text-slate-900 placeholder:font-normal focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="gradient-btn flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white shadow-md cursor-pointer disabled:opacity-50 transition"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Credential Preset Helper */}
          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <button
              type="button"
              onClick={fillDefaultCredentials}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            >
              <Sparkles size={13} className="text-amber-500" />
              Fill Default Demo Admin: <span className="font-mono text-brand-700">admin@example.com / 123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
