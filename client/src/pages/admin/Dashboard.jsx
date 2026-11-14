import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UploadCloud,
  Database,
  Building2,
  FileCheck2,
  Search,
  ArrowUpRight,
  RefreshCw,
  Layers,
  MapPin,
  CheckCircle2,
  Eye,
  Archive,
  Send,
} from 'lucide-react'
import AdminSidebar from '../../components/Admin/AdminSidebar.jsx'
import LoadingState from '../../components/Loading/LoadingState.jsx'
import ErrorMessage from '../../components/Loading/ErrorMessage.jsx'
import api, { apiErrorMessage } from '../../services/api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionBusyId, setActionBusyId] = useState(null)
  const [error, setError] = useState('')

  const fetchDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const [analyticsRes, datasetsRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/datasets'),
      ])
      setData(analyticsRes.data)
      setDatasets(datasetsRes.data?.datasets || [])
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const handleToggleStatus = async (ds) => {
    setActionBusyId(ds._id)
    try {
      if (ds.status === 'published') {
        await api.post(`/admin/datasets/${ds._id}/archive`)
      } else {
        await api.post(`/admin/datasets/${ds._id}/publish`)
      }
      await fetchDashboard()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setActionBusyId(null)
    }
  }

  const topStates = (data?.byState || []).slice(0, 6)
  const maxStateCount = topStates[0]?.count || 1
  const topCategories = (data?.byCategory || []).slice(0, 6)
  const topQuotas = (data?.byQuota || []).slice(0, 4)

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-sky-shaded">
      <AdminSidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Glassybar Header */}
        <div className="glass-bar rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50/90 border border-sky-200 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              Live MongoDB Atlas Workspace
            </div>
            <h1 className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Counselling Data &amp; Predictor Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-slate-600">
              Real-time overview of published cutoff datasets, indexed medical colleges, and candidate rank searches.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={fetchDashboard}
              disabled={loading}
              className="glass-pill flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium text-sky-700 hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-sky-500' : 'text-sky-600'} />
              Refresh
            </button>
            <Link
              to="/admin/upload"
              className="gradient-btn flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              <UploadCloud size={15} />
              Upload Dataset
            </Link>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={fetchDashboard} />}
        {loading && !data && <LoadingState label="Loading dashboard metrics..." />}

        {data && (
          <div className="space-y-6 animate-fade-in-up">
            {/* 4 Glassybar Metric Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="glass-card card-hover-effect rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Datasets</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50/90 text-sky-600 border border-sky-200/60">
                    <Database size={17} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 tracking-tight">
                  {Number(data.totalDatasets || 0).toLocaleString('en-IN')}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200/70 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                    <CheckCircle2 size={11} className="text-sky-600" />
                    {data.publishedDatasets || 0} Live
                  </span>
                </div>
              </div>

              <div className="glass-card card-hover-effect rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Medical Colleges</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50/90 text-sky-600 border border-sky-200/60">
                    <Building2 size={17} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 tracking-tight">
                  {Number(data.totalColleges || 0).toLocaleString('en-IN')}
                </p>
                <p className="mt-2 text-xs text-slate-500">Unique verified institutions</p>
              </div>

              <div className="glass-card card-hover-effect rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Published Cutoffs</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50/90 text-sky-600 border border-sky-200/60">
                    <FileCheck2 size={17} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-sky-700 tracking-tight">
                  {Number(data.totalCutoffRecords || 0).toLocaleString('en-IN')}
                </p>
                <p className="mt-2 text-xs text-slate-500">Allotment rows across categories</p>
              </div>

              <div className="glass-card card-hover-effect rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Student Searches</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50/90 text-sky-600 border border-sky-200/60">
                    <Search size={17} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 tracking-tight">
                  {Number(data.totalPredictions || 0).toLocaleString('en-IN')}
                </p>
                <p className="mt-2 text-xs text-slate-500">Rank predictions executed</p>
              </div>
            </div>

            {/* Middle Row: State Distribution & Category / Quota Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* State Coverage */}
              <div className="glass-card lg:col-span-7 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-sky-100 pb-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                        <MapPin size={15} />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">Cutoff Records by State / Pool</h2>
                    </div>
                    <Link
                      to="/admin/analytics"
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                    >
                      All charts <ArrowUpRight size={13} />
                    </Link>
                  </div>

                  {topStates.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">No published state records yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3.5">
                      {topStates.map((st) => {
                        const pct = Math.max(5, Math.round((st.count / maxStateCount) * 100))
                        return (
                          <div key={st.label} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700">{st.label}</span>
                              <span className="font-semibold text-sky-700 tabular-nums">
                                {Number(st.count).toLocaleString('en-IN')} rows
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-sky-50/90 border border-sky-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-sky-100/80 pt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>Top {topStates.length} states by cutoff volume</span>
                  <span className="font-semibold text-sky-700">{data.totalColleges || 0} unique colleges</span>
                </div>
              </div>

              {/* Category & Quota Breakdown */}
              <div className="glass-card lg:col-span-5 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center justify-between border-b border-sky-100 pb-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                        <Layers size={15} />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">Category &amp; Quota Breakdown</h2>
                    </div>
                    <span className="text-xs font-medium text-sky-600">Published</span>
                  </div>

                  <p className="mt-3.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Top Categories
                  </p>
                  {topCategories.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">No category data available.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {topCategories.map((cat) => (
                        <div
                          key={cat.label}
                          className="flex items-center justify-between rounded-xl border border-sky-100 bg-white/80 px-3 py-2"
                        >
                          <span className="text-xs font-medium text-slate-700 truncate">{cat.label}</span>
                          <span className="rounded-md bg-sky-50 border border-sky-200/60 px-2 py-0.5 text-xs font-bold text-sky-700 tabular-nums">
                            {Number(cat.count).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {topQuotas.length > 0 && (
                    <>
                      <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Quotas
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {topQuotas.map((q) => (
                          <div
                            key={q.label}
                            className="flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2"
                          >
                            <span className="text-xs font-medium text-slate-700 truncate">{q.label}</span>
                            <span className="text-xs font-semibold text-sky-700 tabular-nums">
                              {Number(q.count).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Live Datasets Management Table (Directly Useful Action Center) */}
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Uploaded Counselling Datasets</h2>
                  <p className="text-xs text-slate-500">
                    Publish, archive, or inspect datasets directly from your overview workspace.
                  </p>
                </div>
                <Link
                  to="/admin/datasets"
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  Open full dataset manager <ArrowUpRight size={13} />
                </Link>
              </div>

              {datasets.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-500">No datasets uploaded yet.</p>
                  <Link
                    to="/admin/upload"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white"
                  >
                    <UploadCloud size={14} /> Upload First Dataset
                  </Link>
                </div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-sky-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 px-3">Dataset Name</th>
                        <th className="py-2.5 px-3">State / Pool</th>
                        <th className="py-2.5 px-3">Year &amp; Round</th>
                        <th className="py-2.5 px-3">Valid Rows</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100/70">
                      {datasets.slice(0, 6).map((ds) => {
                        const isPublished = ds.status === 'published'
                        const isBusy = actionBusyId === ds._id
                        return (
                          <tr key={ds._id} className="hover:bg-sky-50/40 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-900 max-w-[240px] truncate">
                              {ds.name}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {ds.state || ds.counsellingType || 'All India'}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {ds.year} &bull; {ds.round}
                            </td>
                            <td className="py-3 px-3 font-semibold text-sky-700 tabular-nums">
                              {Number(ds.recordCount || ds.validRows || ds.totalRows || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                                  isPublished
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isPublished ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                />
                                {ds.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleToggleStatus(ds)}
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                    isPublished
                                      ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                      : 'bg-sky-600 text-white hover:bg-sky-700'
                                  }`}
                                >
                                  {isPublished ? <Archive size={12} /> : <Send size={12} />}
                                  {isBusy ? 'Saving...' : isPublished ? 'Archive' : 'Publish'}
                                </button>
                                <Link
                                  to={`/admin/datasets/${ds._id}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50/70 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
                                >
                                  <Eye size={12} /> Inspect
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
