import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Building2, MapPin, Globe, ArrowLeft, Filter, Search, Calendar, Bookmark, Zap } from 'lucide-react'
import Navbar from '../components/Navbar/Navbar.jsx'
import { useStudentAuth } from '../context/StudentAuthContext.jsx'
import LoadingState from '../components/Loading/LoadingState.jsx'
import ErrorMessage from '../components/Loading/ErrorMessage.jsx'
import EmptyState from '../components/Loading/EmptyState.jsx'
import { formatCategoryLabel } from '../constants/categoryConstants'
import api, { apiErrorMessage } from '../services/api'

export default function CollegeDetails() {
  const { id } = useParams()
  const { user, isChoiceSaved, addToChoiceList, removeFromChoiceList } = useStudentAuth()
  const savedItem = isChoiceSaved(id, undefined, undefined, true)
  const isSaved = Boolean(savedItem)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [roundFilter, setRoundFilter] = useState('ALL')

  useEffect(() => {
    let isMounted = true
    api
      .get(`/colleges/${id}`)
      .then((res) => {
        if (isMounted) setData(res.data)
      })
      .catch((err) => {
        if (isMounted) setError(apiErrorMessage(err))
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id])

  const cutoffs = data?.cutoffs || []

  const filteredCutoffs = useMemo(() => {
    return cutoffs.filter((c) => {
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false
      if (roundFilter !== 'ALL' && c.round !== roundFilter) return false
      return true
    })
  }, [cutoffs, categoryFilter, roundFilter])

  const uniqueCategories = Array.from(new Set(cutoffs.map((c) => c.category).filter(Boolean)))
  const uniqueRounds = Array.from(new Set(cutoffs.map((c) => c.round).filter(Boolean)))

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <Navbar />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {/* Back Button */}
        <div>
          <Link
            to="/results"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition"
          >
            <ArrowLeft size={14} />
            Back to Prediction Results
          </Link>
        </div>

        {loading && <LoadingState label="Loading college details & cutoffs..." />}
        {error && <ErrorMessage message={error} />}

        {data && data.college && (
          <>
            {/* College Hero Card */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 shadow-xs">
                    <Building2 size={30} />
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                      {data.college.name}
                    </h1>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-slate-400" />
                        {data.college.state}
                        {data.college.district ? `, ${data.college.district}` : ''}
                      </span>
                      {(() => {
                        const rawType = data.college.collegeType || data.college.ownership || ''
                        const name = (data.college.name || '').toLowerCase()
                        let isGovt = /gov|central|aiims|jipmer|autonomous/i.test(rawType)
                        let isPriv = /priv|trust|society/i.test(rawType)
                        let isDeemed = /deem/i.test(rawType)

                        if (!isGovt && !isPriv && !isDeemed) {
                          if (
                            name.includes('government') ||
                            name.includes('govt') ||
                            name.includes('aiims') ||
                            name.includes('jipmer') ||
                            name.includes('gmc') ||
                            name.includes('institute of pg') ||
                            name.includes('medical college,') ||
                            name.includes('medical college and hospital') ||
                            name.includes('trihms') ||
                            name.includes('rims')
                          ) {
                            isGovt = true
                          } else if (
                            name.includes('private') ||
                            name.includes('society') ||
                            name.includes('trust') ||
                            name.includes('kpc') ||
                            name.includes('iq city') ||
                            name.includes('icare') ||
                            name.includes('gouri devi') ||
                            name.includes('jagannath') ||
                            name.includes('santiniketan') ||
                            name.includes('sks') ||
                            name.includes('jis school')
                          ) {
                            isPriv = true
                          } else {
                            isGovt = true
                          }
                        }

                        return (
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black border shadow-2xs ${
                              isGovt
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-500/20'
                                : isPriv
                                ? 'bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-500/20'
                                : 'bg-indigo-50 text-indigo-900 border-indigo-300 ring-1 ring-indigo-500/20'
                            }`}
                          >
                            <span>{isGovt ? 'Government' : isPriv ? 'Private' : 'Deemed'}</span>
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isSaved) {
                        removeFromChoiceList(savedItem?._id || id)
                      } else {
                        const preferredCat = user?.category || 'General'
                        const bestCutoff =
                          cutoffs.find((c) => String(c.category || '').toLowerCase() === preferredCat.toLowerCase()) ||
                          cutoffs[0] ||
                          {}
                        addToChoiceList({
                          collegeId: id,
                          cutoffId: bestCutoff._id,
                          course: bestCutoff.course || 'MBBS',
                          quota: bestCutoff.quota || 'AIQ',
                          category: bestCutoff.category || preferredCat,
                          round: bestCutoff.round || 'Round 1',
                          openingRank: bestCutoff.openingRank ?? null,
                          closingRank: bestCutoff.closingRank ?? null,
                          fees: bestCutoff.fees ?? null,
                        })
                      }
                    }}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer shadow-2xs ${
                      isSaved
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-400/30'
                        : 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100'
                    }`}
                  >
                    <Bookmark size={14} className={isSaved ? 'fill-amber-500 text-amber-600' : ''} />
                    <span>{isSaved ? 'In Your Choice List' : 'Add to Choice List'}</span>
                  </button>

                  {data.college.website && (
                    <a
                      href={data.college.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Globe size={14} />
                      Official Website
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Cutoff Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Historical Counselling Cutoffs</h2>
                  <p className="text-xs text-slate-500">All published allotment ranks for this institution</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {uniqueCategories.length > 1 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Categories</option>
                      {uniqueCategories.map((c) => (
                        <option key={c} value={c}>
                          {formatCategoryLabel(c)}
                        </option>
                      ))}
                    </select>
                  )}

                  {uniqueRounds.length > 1 && (
                    <select
                      value={roundFilter}
                      onChange={(e) => setRoundFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">All Rounds</option>
                      {uniqueRounds.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {filteredCutoffs.length === 0 ? (
                <EmptyState
                  title="No published cutoffs found"
                  description="No historical cutoff records match the selected category or round filter for this college."
                />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3.5">Year</th>
                        <th className="px-4 py-3.5">Round</th>
                        <th className="px-4 py-3.5">Course</th>
                        <th className="px-4 py-3.5">Category</th>
                        <th className="px-4 py-3.5">Quota</th>
                        <th className="px-4 py-3.5">Opening Rank</th>
                        <th className="px-4 py-3.5 text-brand-700 font-extrabold">Closing Rank</th>
                        <th className="px-4 py-3.5">Allotted Rank</th>
                        <th className="px-4 py-3.5">Fees</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCutoffs.map((c) => (
                        <tr key={c._id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 font-bold text-slate-800">{c.year}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{c.round}</td>
                          <td className="px-4 py-3 font-bold text-indigo-700">{c.course}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{c.category}</td>
                          <td className="px-4 py-3 font-medium text-slate-600">{c.quota || '—'}</td>
                          <td className="px-4 py-3 font-medium text-slate-600">
                            {c.openingRank ? Number(c.openingRank).toLocaleString('en-IN') : '—'}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900 bg-brand-50/20">
                            {c.closingRank ? Number(c.closingRank).toLocaleString('en-IN') : '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-600">
                            {c.allottedRank || c.allotmentRank ? Number(c.allottedRank || c.allotmentRank).toLocaleString('en-IN') : '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-emerald-700">
                            {c.fees ? `₹${Number(c.fees).toLocaleString('en-IN')}` : 'Govt/Standard'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <p className="pt-4 text-center text-xs text-slate-400 max-w-2xl mx-auto">
              These results are based on previous-year counselling/cutoff data and are not a guarantee of admission. Actual admission depends on the current year&apos;s counselling process, seats, category, quota, competition and seat availability.
            </p>
          </>
        )}
      </main>
    </div>
  )
}

