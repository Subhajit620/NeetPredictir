import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  Layers,
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Scale,
  Award,
  Building,
  ClipboardCheck,
  X,
} from 'lucide-react'
import Navbar from '../components/Navbar/Navbar.jsx'
import CategorySelect from '../components/CategorySelect/CategorySelect.jsx'
import { useStudentAuth } from '../context/StudentAuthContext.jsx'
import CollegeCard from '../components/CollegeCard/CollegeCard.jsx'
import LoadingState from '../components/Loading/LoadingState.jsx'
import ErrorMessage from '../components/Loading/ErrorMessage.jsx'
import EmptyState from '../components/Loading/EmptyState.jsx'
import api, { apiErrorMessage } from '../services/api'

const DEFAULT_CATEGORIES = ['General', 'OBC', 'EWS', 'SC', 'ST', 'APST', 'NON-APST', 'PwD', 'All Categories']
const COURSE_OPTIONS = ['All Courses', 'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS']
const QUOTA_OPTIONS = ['All Quotas', 'AIQ', 'State', 'Management', 'NRI', 'Deemed', 'Central']
const YEAR_OPTIONS = ['All Years', '2026', '2025', '2024', '2023', '2022', '2021']
const ROUND_OPTIONS = ['All Rounds', 'Round 1', 'Round 2', 'Round 3', 'Stray Vacancy Round', 'Mop-Up Round']
const COLLEGE_TYPE_OPTIONS = ['All Types', 'Government', 'Private', 'Deemed']

function getRecordCollegeType(record) {
  const type = record.collegeType || record.collegeId?.collegeType || record.collegeId?.ownership || ''
  if (/gov|central|aiims|jipmer|autonomous/i.test(type)) return 'Government'
  if (/priv|trust|society/i.test(type)) return 'Private'
  if (/deem/i.test(type)) return 'Deemed'

  const name = (record.collegeName || record.collegeId?.name || '').toLowerCase()
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
    return 'Government'
  }
  if (
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
    return 'Private'
  }
  return type || 'Government'
}

const DEFAULT_STATES = [
  'All India',
  'Arunachal Pradesh',
  'Haryana',
  'West Bengal',
  'Chhattisgarh',
  'Uttar Pradesh',
  'Bihar',
  'Delhi',
  'Maharashtra',
  'Rajasthan',
  'Madhya Pradesh',
  'Karnataka',
]

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialData = location.state || {}
  const { user } = useStudentAuth()

  const [rank, setRank] = useState(initialData.rank || user?.air || '')
  const [state, setState] = useState(initialData.state || user?.domicileState || 'All India')
  const [availableStates, setAvailableStates] = useState(DEFAULT_STATES)
  const [availableCategories, setAvailableCategories] = useState(DEFAULT_CATEGORIES)
  const [category, setCategory] = useState(initialData.category || user?.category || 'General')
  const [includeGeneral, setIncludeGeneral] = useState(initialData.includeGeneral !== false)
  const [quota, setQuota] = useState(initialData.quota || 'All Quotas')
  const [course, setCourse] = useState(initialData.course || 'All Courses')
  const [year, setYear] = useState(initialData.year || 'All Years')
  const [round, setRound] = useState(initialData.round || 'All Rounds')
  const [collegeType, setCollegeType] = useState(initialData.collegeType || 'All Types')

  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'colleges'
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'WITHIN_HISTORICAL_RANGE' | 'BETTER_THAN_OPENING' | 'BEYOND_HISTORICAL_CLOSING'
  const [categoryView, setCategoryView] = useState('ALL') // 'ALL' | 'RESERVED' | 'OPEN_MERIT'
  const [quotaView, setQuotaView] = useState('ALL') // 'ALL' | 'HOME_STATE' | 'AIQ'
  const [collegeTypeView, setCollegeTypeView] = useState(
    initialData.collegeType && initialData.collegeType !== 'All Types' ? initialData.collegeType : 'ALL'
  )
  const [searchQuery, setSearchQuery] = useState(initialData.searchQuery || '')
  const [sortBy, setSortBy] = useState('BEST_MATCH') // 'BEST_MATCH' | 'CLOSING_ASC' | 'CLOSING_DESC' | 'FEES_ASC' | 'NAME_ASC'

  // Fetch uploaded states from DB on mount
  useEffect(() => {
    api
      .get('/predict/states')
      .then((res) => {
        if (res.data?.states && res.data.states.length > 0) {
          const merged = Array.from(new Set(['All India', ...res.data.states]))
          setAvailableStates(merged)
        }
      })
      .catch(() => {})
  }, [])

  // Dynamic category update whenever target state changes
  useEffect(() => {
    if (!state) return
    api
      .get(`/predict/categories?state=${encodeURIComponent(state)}`)
      .then((res) => {
        if (res.data?.categories && res.data.categories.length > 0) {
          const list = res.data.categories
          const merged = Array.from(new Set([...list, 'All Categories']))
          setAvailableCategories(merged)
          if (!merged.includes(category) && category !== 'All Categories') {
            setCategory(merged[0] || 'General')
          }
        }
      })
      .catch(() => {})
  }, [state])

  const loadStudentProfile = () => {
    if (user?.air) setRank(user.air.toString())
    if (user?.category) setCategory(user.category)
    if (user?.domicileState) setState(user.domicileState)
    if (user?.quota && user.quota !== 'All Quotas') setQuota(user.quota)
  }

  const [appliedParams, setAppliedParams] = useState(null)
  const [records, setRecords] = useState(null)
  const [colleges, setColleges] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedForCompare, setSelectedForCompare] = useState([])

  const runSearch = async (e, overrideRank) => {
    e?.preventDefault()
    const rankValue = Number(overrideRank ?? rank)
    if (!Number.isFinite(rankValue) || rankValue <= 0) {
      setError('Please enter a valid positive NEET rank.')
      return
    }
    if (!state.trim()) {
      setError('Please select or enter a target state.')
      return
    }
    if (!category) {
      setError('Please select a category.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/predict', {
        rank: rankValue,
        state: state.trim(),
        category,
        includeGeneral: category !== 'General' && category !== 'All Categories' ? includeGeneral : false,
        includeBeyondClosing: false,
        quota: quota !== 'All Quotas' ? quota : undefined,
        course: course !== 'All Courses' ? course : undefined,
        year: year !== 'All Years' ? year : undefined,
        round: round !== 'All Rounds' ? round : undefined,
        collegeType: collegeType !== 'All Types' ? collegeType : undefined,
        domicileState: user?.domicileState || undefined,
      })

      const rawItems = res.data.records || res.data.results || []
      const eligibleItems = rawItems.filter(
        (r) =>
          r.eligible !== false &&
          !r.isBeyondHistoricalClosing &&
          r.status !== 'OUTSIDE_HISTORICAL_CLOSING' &&
          r.status !== 'BEYOND_CLOSING' &&
          r.status !== 'NEAR_HISTORICAL_CLOSING' &&
          r.classification !== 'OUTSIDE_HISTORICAL_CLOSING' &&
          r.classification !== 'BEYOND_HISTORICAL_CLOSING' &&
          r.classification !== 'NEAR_HISTORICAL_CLOSING' &&
          r.classification !== 'OUTSIDE_HISTORICAL_RANGE'
      )
      setRecords(eligibleItems)
      setColleges(
        (res.data.colleges || []).filter((col) => col.hasEligible !== false)
      )
      setAppliedParams(
        res.data.filters || {
          rank: rankValue,
          state,
          category,
          includeGeneral,
          quota,
          course,
          year,
          round,
          collegeType,
          domicileState: user?.domicileState || undefined,
        }
      )
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialData.rank && initialData.state && initialData.category) {
      runSearch()
    } else if (user?.air && !appliedParams) {
      runSearch(null, user.air)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCompare = (record) => {
    const id = record.collegeId?._id || record.collegeId
    setSelectedForCompare((prev) => {
      const exists = prev.find((r) => (r.collegeId?._id || r.collegeId) === id)
      if (exists) return prev.filter((r) => (r.collegeId?._id || r.collegeId) !== id)
      if (prev.length >= 4) return prev
      return [...prev, record]
    })
  }

  const resetLocalFilters = () => {
    setStatusFilter('ALL')
    setCategoryView('ALL')
    setQuotaView('ALL')
    setCollegeTypeView('ALL')
    setSearchQuery('')
    setSortBy('BEST_MATCH')
  }

  const hasActiveLocalFilters =
    statusFilter !== 'ALL' ||
    categoryView !== 'ALL' ||
    quotaView !== 'ALL' ||
    collegeTypeView !== 'ALL' ||
    searchQuery.trim() !== '' ||
    sortBy !== 'BEST_MATCH'

  // Filter and Sort Records
  const processedRecords = useMemo(() => {
    if (!records) return []
    let list = records.filter((r) => {
      if (statusFilter !== 'ALL') {
        const matches =
          r.status === statusFilter ||
          r.classification === statusFilter ||
          (statusFilter === 'WITHIN_HISTORICAL_RANGE' &&
            (r.status === 'WITHIN_RANGE' ||
              r.status === 'WITHIN_HISTORICAL_RANGE' ||
              (r.classification === 'HISTORICALLY_WITHIN_CLOSING' && r.status !== 'BETTER_THAN_OPENING') ||
              r.classification === 'WITHIN_HISTORICAL_RANGE')) ||
          (statusFilter === 'BETTER_THAN_OPENING' &&
            (r.status === 'BETTER_THAN_OPENING' || r.classification === 'BETTER_THAN_OPENING')) ||
          (statusFilter === 'BEYOND_HISTORICAL_CLOSING' &&
            (r.status === 'BEYOND_CLOSING' ||
              r.status === 'OUTSIDE_HISTORICAL_CLOSING' ||
              r.status === 'NEAR_HISTORICAL_CLOSING' ||
              r.classification === 'BEYOND_HISTORICAL_CLOSING' ||
              r.classification === 'OUTSIDE_HISTORICAL_CLOSING' ||
              r.classification === 'NEAR_HISTORICAL_CLOSING' ||
              r.classification === 'OUTSIDE_HISTORICAL_RANGE'))
        if (!matches) return false
      }
      if (categoryView === 'RESERVED' && r.isGeneralMeritSeat) return false
      if (categoryView === 'OPEN_MERIT' && !r.isGeneralMeritSeat) return false
      if (quotaView === 'HOME_STATE') {
        const isHome =
          r.domicileType === 'HOME_STATE_85' ||
          (user?.domicileState &&
            r.state &&
            user.domicileState.toLowerCase() === r.state.toLowerCase() &&
            !String(r.quota || '').toUpperCase().includes('AIQ'))
        if (!isHome) return false
      }
      if (quotaView === 'AIQ') {
        const isAiq =
          r.domicileType === 'AIQ_15' ||
          String(r.quota || '').toUpperCase().includes('AIQ') ||
          String(r.quota || '').toUpperCase().includes('ALL INDIA')
        if (!isAiq) return false
      }
      if (collegeTypeView !== 'ALL') {
        const t = getRecordCollegeType(r)
        if (collegeTypeView === 'Government' && t !== 'Government' && t !== 'Central') return false
        if (collegeTypeView === 'Private' && t !== 'Private') return false
        if (collegeTypeView === 'Deemed' && t !== 'Deemed') return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const name = (r.collegeName || '').toLowerCase()
        const st = (r.state || '').toLowerCase()
        const city = (r.city || '').toLowerCase()
        const cat = (r.category || '').toLowerCase()
        const qta = (r.quota || '').toLowerCase()
        if (!name.includes(q) && !st.includes(q) && !city.includes(q) && !cat.includes(q) && !qta.includes(q)) return false
      }
      return true
    })

    list.sort((a, b) => {
      if (sortBy === 'CLOSING_ASC') {
        return (Number(a.closingRank) || 9999999) - (Number(b.closingRank) || 9999999)
      }
      if (sortBy === 'CLOSING_DESC') {
        return (Number(b.closingRank) || 0) - (Number(a.closingRank) || 0)
      }
      if (sortBy === 'FEES_ASC') {
        return (Number(a.fees) || 99999999) - (Number(b.fees) || 99999999)
      }
      if (sortBy === 'NAME_ASC') {
        return (a.collegeName || '').localeCompare(b.collegeName || '')
      }
      const priority = {
        BETTER_THAN_OPENING: 1,
        WITHIN_HISTORICAL_RANGE: 2,
        HISTORICALLY_WITHIN_CLOSING: 2,
        WITHIN_RANGE: 2,
        NEAR_HISTORICAL_CLOSING: 3,
        BEYOND_HISTORICAL_CLOSING: 4,
        OUTSIDE_HISTORICAL_CLOSING: 4,
        BEYOND_CLOSING: 4,
        OUTSIDE_HISTORICAL_RANGE: 4,
        INSUFFICIENT_DATA: 5,
        HISTORICAL_DATA_UNAVAILABLE: 5,
      }
      return (priority[a.status] || priority[a.classification] || 5) - (priority[b.status] || priority[b.classification] || 5)
    })

    return list
  }, [records, statusFilter, categoryView, quotaView, collegeTypeView, searchQuery, sortBy, user?.domicileState])

  // Filter Colleges & Timeline Tab by search query as well
  const filteredColleges = useMemo(() => {
    if (!colleges) return []
    if (!searchQuery.trim()) return colleges
    const q = searchQuery.toLowerCase()
    return colleges.filter(
      (col) =>
        (col.collegeName || '').toLowerCase().includes(q) ||
        (col.state || '').toLowerCase().includes(q) ||
        (col.category || '').toLowerCase().includes(q) ||
        (col.quota || '').toLowerCase().includes(q)
    )
  }, [colleges, searchQuery])

  const withinCount = (records || []).filter(
    (r) =>
      r.status === 'WITHIN_RANGE' ||
      r.status === 'WITHIN_HISTORICAL_RANGE' ||
      (r.classification === 'HISTORICALLY_WITHIN_CLOSING' && r.status !== 'BETTER_THAN_OPENING') ||
      r.classification === 'WITHIN_HISTORICAL_RANGE'
  ).length
  const betterCount = (records || []).filter(
    (r) => r.status === 'BETTER_THAN_OPENING' || r.classification === 'BETTER_THAN_OPENING'
  ).length
  const beyondCount = (records || []).filter(
    (r) =>
      r.status === 'BEYOND_CLOSING' ||
      r.status === 'OUTSIDE_HISTORICAL_CLOSING' ||
      r.status === 'NEAR_HISTORICAL_CLOSING' ||
      r.classification === 'BEYOND_HISTORICAL_CLOSING' ||
      r.classification === 'OUTSIDE_HISTORICAL_CLOSING' ||
      r.classification === 'NEAR_HISTORICAL_CLOSING' ||
      r.classification === 'OUTSIDE_HISTORICAL_RANGE'
  ).length
  const reservedCount = (records || []).filter((r) => !r.isGeneralMeritSeat).length
  const openMeritCount = (records || []).filter((r) => r.isGeneralMeritSeat).length

  const homeStateSeatCount = (records || []).filter(
    (r) =>
      r.domicileType === 'HOME_STATE_85' ||
      (user?.domicileState &&
        r.state &&
        user.domicileState.toLowerCase() === r.state.toLowerCase() &&
        !String(r.quota || '').toUpperCase().includes('AIQ'))
  ).length
  const aiqSeatCount = (records || []).filter(
    (r) =>
      r.domicileType === 'AIQ_15' ||
      String(r.quota || '').toUpperCase().includes('AIQ') ||
      String(r.quota || '').toUpperCase().includes('ALL INDIA')
  ).length

  const govtCount = (records || []).filter((r) => {
    const t = getRecordCollegeType(r)
    return t === 'Government' || t === 'Central'
  }).length
  const privateCount = (records || []).filter((r) => getRecordCollegeType(r) === 'Private').length
  const deemedCount = (records || []).filter((r) => getRecordCollegeType(r) === 'Deemed').length

  const exportCSV = () => {
    if (!processedRecords || processedRecords.length === 0) return
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
      'Your Rank',
      'Status',
    ]
    const rows = processedRecords.map((r) => [
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
      r.yourRank ?? '',
      r.classification || '',
    ])
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `NEET_Prediction_Rank_${appliedParams?.rank || rank}_${appliedParams?.state || state}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-sky-shaded pb-24">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-5">
        {/* Top Glassybar Search & Parameter Modifier */}
        <div className="glass-bar rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <SlidersHorizontal size={16} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">NEET Counselling Predictor</h1>
                <p className="text-[11px] text-slate-500">Adjust rank, state, category, or counselling filters anytime</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user?.air && (
                <button
                  type="button"
                  onClick={loadStudentProfile}
                  className="glass-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-white transition cursor-pointer"
                >
                  <ClipboardCheck size={13} className="text-sky-600" />
                  <span>Load My Profile (AIR #{Number(user.air).toLocaleString('en-IN')})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="glass-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white transition cursor-pointer"
              >
                {isFilterExpanded ? 'Hide Extra Filters' : 'Quota, Course & Year'}
                {isFilterExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          <form onSubmit={runSearch} className="mt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Rank */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  NEET AIR <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    placeholder="e.g. 14500"
                    className="w-full rounded-xl border border-sky-200/90 bg-white/95 px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:font-normal focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    required
                  />
                  {rank && (
                    <button
                      type="button"
                      onClick={() => setRank('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* State */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Target State <span className="text-rose-500">*</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-xl border border-sky-200/90 bg-white/95 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                  required
                >
                  {availableStates.map((s) => (
                    <option key={s} value={s}>
                      {s === 'All India' ? 'All India / All States' : s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  {category !== 'General' && category !== 'All Categories' && (
                    <label className="flex items-center gap-1 text-[10px] font-bold text-sky-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeGeneral}
                        onChange={(e) => setIncludeGeneral(e.target.checked)}
                        className="rounded text-sky-600 h-3 w-3"
                      />
                      + Open Merit
                    </label>
                  )}
                </div>
                <CategorySelect
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  availableCategories={availableCategories}
                  showAllOption={true}
                  allOptionLabel="All Categories (Show All Seats)"
                  required
                />
              </div>

              {/* Search CTA */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-btn flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white cursor-pointer disabled:opacity-50"
                >
                  <Search size={16} />
                  {loading ? 'Searching...' : 'Search Colleges'}
                </button>
              </div>
            </div>

            {/* Advanced Filters Drawer */}
            {isFilterExpanded && (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-sky-100 pt-4 sm:grid-cols-5">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">Quota</label>
                  <select
                    value={quota}
                    onChange={(e) => setQuota(e.target.value)}
                    className="w-full rounded-lg border border-sky-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-800"
                  >
                    {QUOTA_OPTIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">Course</label>
                  <select
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full rounded-lg border border-sky-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-800"
                  >
                    {COURSE_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full rounded-lg border border-sky-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-800"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">Round</label>
                  <select
                    value={round}
                    onChange={(e) => setRound(e.target.value)}
                    className="w-full rounded-lg border border-sky-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-800"
                  >
                    {ROUND_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">Institution Type</label>
                  <select
                    value={collegeType}
                    onChange={(e) => {
                      setCollegeType(e.target.value)
                      setCollegeTypeView(e.target.value !== 'All Types' ? e.target.value : 'ALL')
                    }}
                    className="w-full rounded-lg border border-sky-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {COLLEGE_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </form>
        </div>

        {error && <ErrorMessage message={error} onRetry={runSearch} />}
        {loading && <LoadingState label="Searching published NEET counselling records..." />}

        {/* Prompt if user came directly to /results without running a search */}
        {!loading && !appliedParams && records === null && (
          <div className="glass-card rounded-2xl p-10 text-center max-w-xl mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
              <Search size={22} />
            </div>
            <h2 className="mt-3 text-base font-bold text-slate-900">Enter Your NEET Rank Above to Start</h2>
            <p className="mt-1 text-xs text-slate-500">
              Type your All India Rank (AIR), select your target state and category, and click <strong>Search Colleges</strong>.
            </p>
          </div>
        )}

        {/* Results Body */}
        {!loading && appliedParams && records !== null && (
          <div className="space-y-5">
            {/* Interactive 1-Click Overview Metric Cards */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`glass-card text-left rounded-2xl p-4 transition cursor-pointer ${
                  statusFilter === 'ALL' ? 'ring-2 ring-sky-500/40 border-sky-400' : 'hover:border-sky-300'
                }`}
              >
                <span className="text-xs font-medium text-slate-500">Total Filtered</span>
                <p className="mt-1 text-2xl font-bold text-slate-900">{records.length}</p>
                <span className="text-[11px] text-slate-500">Click to show all records</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'WITHIN_HISTORICAL_RANGE' ? 'ALL' : 'WITHIN_HISTORICAL_RANGE')}
                className={`glass-card text-left rounded-2xl p-4 transition cursor-pointer ${
                  statusFilter === 'WITHIN_HISTORICAL_RANGE' ? 'ring-2 ring-emerald-500/40 border-emerald-400' : 'hover:border-emerald-300'
                }`}
              >
                <span className="text-xs font-medium text-emerald-700">Within Range</span>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{withinCount}</p>
                <span className="text-[11px] text-slate-500">Opening &le; Rank &le; Closing</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'BETTER_THAN_OPENING' ? 'ALL' : 'BETTER_THAN_OPENING')}
                className={`glass-card text-left rounded-2xl p-4 transition cursor-pointer ${
                  statusFilter === 'BETTER_THAN_OPENING' ? 'ring-2 ring-sky-500/40 border-sky-400' : 'hover:border-sky-300'
                }`}
              >
                <span className="text-xs font-medium text-sky-700">Better Than Opening</span>
                <p className="mt-1 text-2xl font-bold text-sky-700">{betterCount}</p>
                <span className="text-[11px] text-slate-500">Rank &lt; Opening Cutoff</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'colleges' ? 'all' : 'colleges')}
                className={`glass-card text-left rounded-2xl p-4 transition cursor-pointer ${
                  activeTab === 'colleges' ? 'ring-2 ring-sky-500/40 border-sky-400' : 'hover:border-sky-300'
                }`}
              >
                <span className="text-xs font-medium text-sky-700">Eligible Colleges</span>
                <p className="mt-1 text-2xl font-bold text-slate-900">{colleges.length}</p>
                <span className="text-[11px] text-slate-500">Unique eligible institutions</span>
              </button>
            </div>

            {/* Structured 2-Row Glassybar Search, Filter & Sort Workspace */}
            <div className="glass-bar rounded-2xl p-4 space-y-3.5">
              {/* Row 1: Instant Search Box + View Switcher + Sort Dropdown + Export CSV */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Prominent Search Box */}
                <div className="relative flex-1 max-w-xl">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sky-600">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search results by college name, city, state, or category..."
                    className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/15 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* View Tabs + Sort + Export */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-xl bg-sky-50/90 p-1 border border-sky-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('all')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        activeTab === 'all'
                          ? 'bg-white text-sky-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Filter size={13} />
                      Cutoffs ({processedRecords.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('colleges')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        activeTab === 'colleges'
                          ? 'bg-white text-sky-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers size={13} />
                      Colleges ({filteredColleges.length})
                    </button>
                  </div>

                  {activeTab === 'all' && (
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="rounded-xl border border-sky-200/90 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="BEST_MATCH">Sort: Best Match</option>
                      <option value="CLOSING_ASC">Closing Rank: Low &rarr; High</option>
                      <option value="CLOSING_DESC">Closing Rank: High &rarr; Low</option>
                      <option value="FEES_ASC">Tuition Fees: Low &rarr; High</option>
                      <option value="NAME_ASC">College Name: A &rarr; Z</option>
                    </select>
                  )}

                  <button
                    onClick={exportCSV}
                    type="button"
                    disabled={processedRecords.length === 0}
                    title="Export filtered prediction results to CSV"
                    className="glass-pill flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:text-sky-700 hover:bg-white disabled:opacity-50 transition cursor-pointer"
                  >
                    <Download size={13} />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Row 2: Quick Filter Pill Groups + Active Count + Reset Button */}
              {activeTab === 'all' && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-100/80 pt-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Group */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[11px] font-semibold text-slate-400 mr-0.5">Status:</span>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                          statusFilter === 'ALL'
                            ? 'bg-sky-600 text-white shadow-2xs'
                            : 'bg-white/80 text-slate-600 hover:bg-white border border-sky-100'
                        }`}
                      >
                        All ({records.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('WITHIN_HISTORICAL_RANGE')}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                          statusFilter === 'WITHIN_HISTORICAL_RANGE'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                        }`}
                      >
                        <CheckCircle2 size={11} />
                        Within Range ({withinCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('BETTER_THAN_OPENING')}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                          statusFilter === 'BETTER_THAN_OPENING'
                            ? 'bg-sky-600 text-white shadow-2xs'
                            : 'bg-sky-50/80 text-sky-800 hover:bg-sky-100 border border-sky-200/60'
                        }`}
                      >
                        <Award size={11} />
                        Better than Opening ({betterCount})
                      </button>
                    </div>

                    {/* Institution Ownership Filter */}
                    {(govtCount > 0 || privateCount > 0 || deemedCount > 0) && (
                      <div className="flex flex-wrap items-center gap-1 border-l border-sky-100 pl-2">
                        <span className="text-[11px] font-semibold text-slate-400 mr-0.5">Type:</span>
                        <button
                          type="button"
                          onClick={() => setCollegeTypeView('ALL')}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            collegeTypeView === 'ALL'
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'bg-white/80 text-slate-600 hover:bg-white border border-sky-100'
                          }`}
                        >
                          All
                        </button>
                        {govtCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setCollegeTypeView('Government')}
                            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                              collegeTypeView === 'Government'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-white/80 text-slate-700 hover:bg-white border border-sky-100'
                            }`}
                          >
                            Govt ({govtCount})
                          </button>
                        )}
                        {privateCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setCollegeTypeView('Private')}
                            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                              collegeTypeView === 'Private'
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'bg-white/80 text-slate-700 hover:bg-white border border-sky-100'
                            }`}
                          >
                            Private ({privateCount})
                          </button>
                        )}
                        {deemedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setCollegeTypeView('Deemed')}
                            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                              collegeTypeView === 'Deemed'
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'bg-white/80 text-slate-700 hover:bg-white border border-sky-100'
                            }`}
                          >
                            Deemed ({deemedCount})
                          </button>
                        )}
                      </div>
                    )}

                    {/* Quota Pool Filter (Home State 85% vs AIQ 15%) */}
                    {(homeStateSeatCount > 0 || aiqSeatCount > 0) && (
                      <div className="flex flex-wrap items-center gap-1 border-l border-sky-100 pl-2">
                        <span className="text-[11px] font-semibold text-slate-400 mr-0.5">Quota:</span>
                        <button
                          type="button"
                          onClick={() => setQuotaView('ALL')}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            quotaView === 'ALL'
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'bg-white/80 text-slate-600 hover:bg-white border border-sky-100'
                          }`}
                        >
                          All
                        </button>
                        {homeStateSeatCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setQuotaView('HOME_STATE')}
                            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                              quotaView === 'HOME_STATE'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-white/80 text-slate-700 hover:bg-white border border-sky-100'
                            }`}
                          >
                            85% State ({homeStateSeatCount})
                          </button>
                        )}
                        {aiqSeatCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setQuotaView('AIQ')}
                            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                              quotaView === 'AIQ'
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'bg-white/80 text-slate-700 hover:bg-white border border-sky-100'
                            }`}
                          >
                            15% AIQ ({aiqSeatCount})
                          </button>
                        )}
                      </div>
                    )}

                    {/* Dual Category Filter View (when open merit seats are present) */}
                    {openMeritCount > 0 && (
                      <div className="flex flex-wrap items-center gap-1 border-l border-sky-100 pl-2">
                        <button
                          type="button"
                          onClick={() => setCategoryView('ALL')}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            categoryView === 'ALL'
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'bg-white/80 text-slate-600 hover:bg-white border border-sky-100'
                          }`}
                        >
                          All Seats
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoryView('RESERVED')}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            categoryView === 'RESERVED'
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'bg-white/80 text-slate-700 hover:bg-white border border-sky-100'
                          }`}
                        >
                          {appliedParams?.category || 'Reserved'} ({reservedCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoryView('OPEN_MERIT')}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            categoryView === 'OPEN_MERIT'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          Open Merit ({openMeritCount})
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Active Filter Count & 1-Click Reset */}
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[11px] font-medium text-slate-500">
                      Showing <strong className="text-slate-800">{processedRecords.length}</strong> of{' '}
                      <strong className="text-slate-800">{records.length}</strong>
                    </span>
                    {hasActiveLocalFilters && (
                      <button
                        type="button"
                        onClick={resetLocalFilters}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                      >
                        <RotateCcw size={11} /> Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* TAB 1: Individual Cutoff Records Grid */}
            {activeTab === 'all' && (
              <>
                {processedRecords.length === 0 ? (
                  <EmptyState
                    title="No matching historical cutoffs"
                    description={`No published records match your current filter selection for rank ${appliedParams.rank} in ${appliedParams.state}. Try clearing active filters or selecting "All India".`}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {processedRecords.map((r, idx) => (
                      <CollegeCard
                        key={r._id ?? idx}
                        record={r}
                        onCompareToggle={toggleCompare}
                        isSelectedForCompare={selectedForCompare.some(
                          (s) => (s.collegeId?._id || s.collegeId) === (r.collegeId?._id || r.collegeId)
                        )}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: Multi-Year College Progression */}
            {activeTab === 'colleges' && (
              <div className="space-y-4">
                {filteredColleges.length === 0 ? (
                  <EmptyState
                    title="No colleges found"
                    description="No colleges matched the selected search or state criteria."
                  />
                ) : (
                  filteredColleges.map((col, idx) => (
                    <div
                      key={col.collegeName + idx}
                      className="glass-card rounded-2xl p-5 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                            <Building size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{col.collegeName}</h3>
                            <p className="text-xs text-slate-500 font-medium">
                              {col.state} • {col.course || 'MBBS'} • {col.category} {col.quota ? `• ${col.quota}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="glass-pill rounded-full px-3 py-1 text-xs font-bold text-sky-700">
                          {col.history.length} Record(s) on File
                        </span>
                      </div>

                      {/* Multi-Year Cutoff Progression */}
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Historical Cutoff Progression Timeline:
                        </p>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                          {col.history.map((h, hIdx) => {
                            const isWithin =
                              h.classification === 'WITHIN_HISTORICAL_RANGE' ||
                              h.classification === 'HISTORICALLY_WITHIN_CLOSING'
                            const isBetter = h.classification === 'BETTER_THAN_OPENING'
                            return (
                              <div
                                key={hIdx}
                                className={`flex items-center justify-between rounded-xl border p-3 text-xs transition ${
                                  isWithin
                                    ? 'border-emerald-200 bg-emerald-50/50'
                                    : isBetter
                                      ? 'border-sky-200 bg-sky-50/50'
                                      : 'border-slate-200 bg-white/80'
                                }`}
                              >
                                <div>
                                  <span className="flex items-center gap-1 font-bold text-slate-800">
                                    <Calendar size={12} className="text-slate-400" />
                                    {h.year} • {h.round}
                                  </span>
                                  <p className="mt-1 text-slate-500">
                                    Closing:{' '}
                                    <strong className="text-slate-900">
                                      {h.closingRank ? Number(h.closingRank).toLocaleString('en-IN') : 'N/A'}
                                    </strong>
                                  </p>
                                  {h.openingRank && (
                                    <p className="text-[11px] text-slate-400">
                                      Opening: {Number(h.openingRank).toLocaleString('en-IN')}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                    isWithin
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isBetter
                                        ? 'bg-sky-100 text-sky-800'
                                        : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {isWithin ? 'Within Range' : isBetter ? 'Better than Opening' : 'Beyond Closing'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Floating Comparison Bottom Drawer */}
        {selectedForCompare.length > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4">
            <div className="glass-bar flex items-center justify-between rounded-2xl p-4 text-slate-900 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white font-semibold text-xs">
                  {selectedForCompare.length}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 sm:text-sm">
                    {selectedForCompare.length} College(s) Selected for Comparison
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {selectedForCompare.map((c) => c.collegeName).join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedForCompare([])}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    navigate('/compare', { state: { records: selectedForCompare } })
                  }}
                  className="gradient-btn flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white shadow-2xs cursor-pointer"
                >
                  <Scale size={14} />
                  Compare Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="pt-6 text-center text-xs text-slate-400 max-w-2xl mx-auto">
          These results are based on previous-year counselling/cutoff data and are not a guarantee of admission. Actual admission depends on the current year&apos;s counselling process, seats, category, quota, competition and seat availability.
        </p>
      </main>
    </div>
  )
}
