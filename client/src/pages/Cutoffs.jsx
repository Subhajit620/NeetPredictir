import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Download,
  Building2,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bookmark,
  RotateCcw,
  X,
  TrendingUp,
} from 'lucide-react'
import Navbar from '../components/Navbar/Navbar.jsx'
import CategorySelect from '../components/CategorySelect/CategorySelect.jsx'
import { useStudentAuth } from '../context/StudentAuthContext.jsx'
import LoadingState from '../components/Loading/LoadingState.jsx'
import ErrorMessage from '../components/Loading/ErrorMessage.jsx'
import EmptyState from '../components/Loading/EmptyState.jsx'
import api, { apiErrorMessage } from '../services/api'

const DEFAULT_CATEGORIES = ['All Categories', 'General', 'OBC', 'EWS', 'SC', 'ST', 'PwD']
const COURSE_OPTIONS = ['All Courses', 'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS']
const QUOTA_OPTIONS = ['All Quotas', 'AIQ', 'State', 'Management', 'NRI', 'Deemed', 'Central']
const YEAR_OPTIONS = ['All Years', '2026', '2025', '2024', '2023', '2022', '2021']
const ROUND_OPTIONS = ['All Rounds', 'Round 1', 'Round 2', 'Round 3', 'Stray Vacancy Round', 'Mop-Up Round']

export default function Cutoffs() {
  const { isChoiceSaved, addToChoiceList, removeFromChoiceList } = useStudentAuth()
  const [cutoffs, setCutoffs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [rankFilter, setRankFilter] = useState('')
  const [debouncedRank, setDebouncedRank] = useState('')
  const [selectedState, setSelectedState] = useState('All India')
  const [availableStates, setAvailableStates] = useState(['All India'])
  const [availableCategories, setAvailableCategories] = useState(DEFAULT_CATEGORIES)
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [selectedQuota, setSelectedQuota] = useState('All Quotas')
  const [selectedCourse, setSelectedCourse] = useState('All Courses')
  const [selectedYear, setSelectedYear] = useState('All Years')
  const [selectedRound, setSelectedRound] = useState('All Rounds')
  const [sortBy, setSortBy] = useState('closing_asc')

  // Debounce search and rank inputs for smooth server-side querying
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 280)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRank(rankFilter.trim())
      setPage(1)
    }, 280)
    return () => clearTimeout(timer)
  }, [rankFilter])

  // Fetch states
  useEffect(() => {
    api
      .get('/predict/states')
      .then((res) => {
        if (res.data?.states) {
          setAvailableStates(Array.from(new Set(['All India', ...res.data.states])))
        }
      })
      .catch(() => {})
  }, [])

  // Fetch dynamic categories when state changes
  useEffect(() => {
    api
      .get(`/predict/categories?state=${encodeURIComponent(selectedState)}`)
      .then((res) => {
        if (res.data?.categories && res.data.categories.length > 0) {
          const merged = Array.from(new Set(['All Categories', ...res.data.categories]))
          setAvailableCategories(merged)
          if (!merged.includes(selectedCategory)) {
            setSelectedCategory('All Categories')
          }
        }
      })
      .catch(() => {})
  }, [selectedState])

  // Fetch cutoffs from server with full-database search, rank filter, and sort
  const loadCutoffs = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        page,
        limit,
        sort: sortBy,
      }
      if (selectedState !== 'All India') params.state = selectedState
      if (selectedCategory !== 'All Categories') params.category = selectedCategory
      if (selectedQuota !== 'All Quotas') params.quota = selectedQuota
      if (selectedCourse !== 'All Courses') params.course = selectedCourse
      if (selectedYear !== 'All Years') params.year = selectedYear
      if (selectedRound !== 'All Rounds') params.round = selectedRound
      if (debouncedSearch) params.search = debouncedSearch
      if (debouncedRank && Number(debouncedRank) > 0) params.maxRank = Number(debouncedRank)

      const res = await api.get('/cutoffs', { params })
      setCutoffs(res.data.cutoffs || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCutoffs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    selectedState,
    selectedCategory,
    selectedQuota,
    selectedCourse,
    selectedYear,
    selectedRound,
    debouncedSearch,
    debouncedRank,
    sortBy,
  ])

  const resetAllFilters = () => {
    setSearchQuery('')
    setDebouncedSearch('')
    setRankFilter('')
    setDebouncedRank('')
    setSelectedState('All India')
    setSelectedCategory('All Categories')
    setSelectedQuota('All Quotas')
    setSelectedCourse('All Courses')
    setSelectedYear('All Years')
    setSelectedRound('All Rounds')
    setSortBy('closing_asc')
    setPage(1)
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    rankFilter.trim() !== '' ||
    selectedState !== 'All India' ||
    selectedCategory !== 'All Categories' ||
    selectedQuota !== 'All Quotas' ||
    selectedCourse !== 'All Courses' ||
    selectedYear !== 'All Years' ||
    selectedRound !== 'All Rounds' ||
    sortBy !== 'closing_asc'

  const totalPages = Math.ceil(total / limit) || 1

  const exportCSV = () => {
    if (!cutoffs || cutoffs.length === 0) return
    const headers = [
      'College Name',
      'State',
      'Category',
      'Quota',
      'Course',
      'Round',
      'Year',
      'Opening Rank',
      'Closing Rank',
      'Allotted Rank',
      'Fees',
    ]
    const rows = cutoffs.map((r) => [
      `"${r.collegeName?.replace(/"/g, '""') || ''}"`,
      `"${r.state || ''}"`,
      r.category || '',
      r.quota || '',
      r.course || '',
      r.round || '',
      r.year || '',
      r.openingRank ?? '',
      r.closingRank ?? '',
      r.allottedRank ?? r.allotmentRank ?? '',
      r.fees ?? '',
    ])
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `NEET_Historical_Cutoffs_${selectedState}_${selectedCategory}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-sky-shaded pb-20">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-5">
        {/* Glassybar Header Section */}
        <div className="glass-bar rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-xs">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Historical NEET Cutoffs Directory</h1>
              <p className="text-xs text-slate-500 font-medium">
                Search across all published MCC &amp; State Counselling Opening and Closing Ranks in India.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                type="button"
                className="glass-pill flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-white transition cursor-pointer"
              >
                <RotateCcw size={13} />
                Reset Filters
              </button>
            )}
            <button
              onClick={exportCSV}
              disabled={cutoffs.length === 0}
              className="glass-pill flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 hover:text-sky-700 hover:bg-white disabled:opacity-50 transition cursor-pointer"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        {/* User-Friendly Glassybar Search & Filter Workspace */}
        <div className="glass-bar rounded-2xl p-5 space-y-4">
          {/* Primary Row: College Name Search + Rank Eligibility Filter + State + Category */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-12">
            {/* Search Input (Full Database) */}
            <div className="lg:col-span-4">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Search College / State / Quota
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sky-600">
                  <Search size={15} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type college name (e.g. AIIMS, GMC, Kolkata...)"
                  className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2.5 pl-9 pr-8 text-xs sm:text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Optional Rank Filter */}
            <div className="lg:col-span-2">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Eligible at Rank
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sky-600">
                  <TrendingUp size={14} />
                </div>
                <input
                  type="number"
                  min="1"
                  value={rankFilter}
                  onChange={(e) => setRankFilter(e.target.value)}
                  placeholder="Your AIR (opt.)"
                  className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2.5 pl-8 pr-7 text-xs sm:text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                {rankFilter && (
                  <button
                    type="button"
                    onClick={() => setRankFilter('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* State Select */}
            <div className="lg:col-span-3">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                State / Quota Region
              </label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-xl border border-sky-200/90 bg-white/95 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
              >
                {availableStates.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All India' ? 'All India / All States' : s}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Select */}
            <div className="lg:col-span-3">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Category
              </label>
              <CategorySelect
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setPage(1)
                }}
                availableCategories={availableCategories}
                showAllOption={true}
                allOptionLabel="All Categories (Show All)"
              />
            </div>
          </div>

          {/* Secondary Row: Quota, Course, Year, Round, Sort & Total Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100/80 pt-3.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedQuota}
                onChange={(e) => {
                  setSelectedQuota(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-sky-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none cursor-pointer"
              >
                {QUOTA_OPTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>

              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-sky-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none cursor-pointer"
              >
                {COURSE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-sky-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select
                value={selectedRound}
                onChange={(e) => {
                  setSelectedRound(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-sky-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none cursor-pointer"
              >
                {ROUND_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-sky-200/80 bg-sky-50/70 px-3 py-1.5 text-xs font-semibold text-sky-800 focus:border-sky-500 focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="closing_asc">Sort: Closing Rank (Low &rarr; High)</option>
                <option value="closing_desc">Sort: Closing Rank (High &rarr; Low)</option>
                <option value="opening_asc">Sort: Opening Rank (Low &rarr; High)</option>
                <option value="name_asc">Sort: College Name (A &rarr; Z)</option>
                <option value="fees_asc">Sort: Tuition Fees (Low &rarr; High)</option>
              </select>
            </div>

            <span className="font-medium text-slate-500">
              Showing <strong className="text-slate-800">{cutoffs.length}</strong> of{' '}
              <strong className="text-sky-700">{total.toLocaleString('en-IN')}</strong> Matching Cutoff Records
            </span>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={loadCutoffs} />}
        {loading && <LoadingState label="Searching historical NEET cutoff records..." />}

        {/* Cutoffs Data Table */}
        {!loading && (
          <>
            {cutoffs.length === 0 ? (
              <EmptyState
                title="No historical cutoffs found"
                description="Try clearing your active search keywords, rank filter, or selecting All India / All Categories."
              />
            ) : (
              <div className="glass-card overflow-x-auto rounded-2xl">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-sky-100 bg-sky-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">College Name</th>
                      <th className="px-4 py-3.5">State</th>
                      <th className="px-4 py-3.5">Course</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Quota</th>
                      <th className="px-4 py-3.5">Round &amp; Year</th>
                      <th className="px-4 py-3.5 text-right">Opening Rank</th>
                      <th className="px-4 py-3.5 text-right font-extrabold text-sky-700">Closing Rank</th>
                      <th className="px-4 py-3.5 text-right">Allotted Rank</th>
                      <th className="px-4 py-3.5 text-right">Tuition Fees</th>
                      <th className="px-4 py-3.5 text-center">Save</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/60">
                    {cutoffs.map((c) => {
                      const collegeId = c.collegeId?._id || c.collegeId
                      const savedItem = isChoiceSaved(collegeId, c.quota, c.course, true)
                      const isSaved = Boolean(savedItem)
                      return (
                        <tr key={c._id} className="hover:bg-sky-50/40 transition">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                                <Building2 size={14} />
                              </div>
                              <div>
                                <Link
                                  to={`/college/${collegeId}`}
                                  className="font-bold text-slate-900 hover:text-sky-600 transition flex items-center gap-1"
                                >
                                  {c.collegeName}
                                  <ExternalLink size={11} className="opacity-40" />
                                </Link>
                                {c.city && <span className="text-[11px] text-slate-400 font-normal">{c.city}</span>}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-medium text-slate-700">{c.state}</td>

                          <td className="px-4 py-3.5">
                            <span className="rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700 border border-sky-100">
                              {c.course || 'MBBS'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-semibold text-slate-800">{c.category}</td>

                          <td className="px-4 py-3.5 text-slate-600 font-medium">{c.quota || '—'}</td>

                          <td className="px-4 py-3.5 text-slate-600">
                            <span className="font-bold text-slate-800">{c.round}</span>
                            <span className="text-slate-400"> ({c.year})</span>
                          </td>

                          <td className="px-4 py-3.5 text-right text-slate-600">
                            {c.openingRank ? Number(c.openingRank).toLocaleString('en-IN') : '—'}
                          </td>

                          <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 bg-sky-50/30">
                            {c.closingRank ? Number(c.closingRank).toLocaleString('en-IN') : '—'}
                          </td>

                          <td className="px-4 py-3.5 text-right text-slate-600">
                            {c.allottedRank || c.allotmentRank
                              ? Number(c.allottedRank || c.allotmentRank).toLocaleString('en-IN')
                              : '—'}
                          </td>

                          <td className="px-4 py-3.5 text-right font-medium text-emerald-700">
                            {c.fees ? `₹${Number(c.fees).toLocaleString('en-IN')}` : 'Govt/Std'}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            {collegeId && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSaved) removeFromChoiceList(savedItem?._id || collegeId)
                                  else
                                    addToChoiceList({
                                      collegeId,
                                      cutoffId: c._id,
                                      quota: c.quota,
                                      category: c.category,
                                      course: c.course || 'MBBS',
                                      round: c.round,
                                      openingRank: c.openingRank ?? null,
                                      closingRank: c.closingRank ?? null,
                                      fees: c.fees ?? null,
                                    })
                                }}
                                className={`rounded-xl p-1.5 transition cursor-pointer ${
                                  isSaved
                                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                    : 'text-slate-400 hover:bg-sky-50 hover:text-sky-700'
                                }`}
                                title={isSaved ? 'In your Choice Sheet (Click to remove)' : 'Add to Choice Sheet'}
                              >
                                <Bookmark size={14} className={isSaved ? 'fill-amber-500 text-amber-600' : ''} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="glass-bar flex items-center justify-between rounded-2xl p-4">
                <span className="text-xs font-medium text-slate-600">
                  Page <strong className="text-slate-900">{page}</strong> of{' '}
                  <strong className="text-slate-900">{totalPages}</strong> ({total.toLocaleString('en-IN')} total records)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="glass-pill flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="glass-pill flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white disabled:opacity-40 cursor-pointer"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
