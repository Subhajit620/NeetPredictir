import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Search,
  Building2,
  ArrowRight,
  SlidersHorizontal,
  TrendingUp,
  MapPin,
  ClipboardCheck,
  User,
  Layers,
  Scale,
  Compass,
  RotateCcw,
  X,
  Calculator,
  CheckCircle2,
} from 'lucide-react'
import Navbar from '../components/Navbar/Navbar.jsx'
import CategorySelect from '../components/CategorySelect/CategorySelect.jsx'
import { useStudentAuth } from '../context/StudentAuthContext.jsx'
import api from '../services/api'

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

const DEFAULT_CATEGORIES = ['General', 'OBC', 'EWS', 'SC', 'ST', 'PwD', 'All Categories']
const QUOTA_OPTIONS = ['All Quotas', 'AIQ', 'State', 'Management', 'NRI', 'Deemed', 'Central']
const COURSE_OPTIONS = ['All Courses', 'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS']
const YEAR_OPTIONS = ['All Years', '2026', '2025', '2024', '2023', '2022', '2021']
const ROUND_OPTIONS = ['All Rounds', 'Round 1', 'Round 2', 'Round 3', 'Stray Vacancy Round', 'Mop-Up Round']

// Marks (out of 720) to Estimated AIR helper
function estimateRankFromMarks(marks) {
  const m = Number(marks)
  if (!Number.isFinite(m) || m <= 0 || m > 720) return ''
  if (m >= 715) return 50
  if (m >= 705) return Math.round(50 + ((715 - m) / 10) * 950)
  if (m >= 685) return Math.round(1000 + ((705 - m) / 20) * 5500)
  if (m >= 660) return Math.round(6500 + ((685 - m) / 25) * 14500)
  if (m >= 635) return Math.round(21000 + ((660 - m) / 25) * 21000)
  if (m >= 600) return Math.round(42000 + ((635 - m) / 35) * 38000)
  if (m >= 550) return Math.round(80000 + ((600 - m) / 50) * 65000)
  if (m >= 500) return Math.round(145000 + ((550 - m) / 50) * 85000)
  if (m >= 400) return Math.round(230000 + ((500 - m) / 100) * 220000)
  return Math.round(450000 + ((400 - m) / 400) * 650000)
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useStudentAuth()

  const [inputMode, setInputMode] = useState('RANK') // 'RANK' | 'MARKS'
  const [rank, setRank] = useState('')
  const [marks, setMarks] = useState('')
  const [collegeSearch, setCollegeSearch] = useState('')

  const [state, setState] = useState('All India')
  const [availableStates, setAvailableStates] = useState(DEFAULT_STATES)
  const [availableCategories, setAvailableCategories] = useState(DEFAULT_CATEGORIES)
  const [category, setCategory] = useState('General')
  const [includeGeneral, setIncludeGeneral] = useState(true)
  const [collegeType, setCollegeType] = useState('All Types')
  const [quota, setQuota] = useState('All Quotas')
  const [course, setCourse] = useState('All Courses')
  const [year, setYear] = useState('All Years')
  const [round, setRound] = useState('All Rounds')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (user?.air && !rank) {
      setRank(user.air.toString())
    }
    if (user?.category) {
      setCategory(user.category)
    }
    if (user?.domicileState && user.domicileState !== 'All India') {
      setState(user.domicileState)
    }
  }, [user])

  // Fetch published states from DB while keeping 'All India' available
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

  // Fetch state-specific categories whenever target state changes
  useEffect(() => {
    if (!state) return
    api
      .get(`/predict/categories?state=${encodeURIComponent(state)}`)
      .then((res) => {
        if (res.data?.categories && res.data.categories.length > 0) {
          const merged = Array.from(new Set([...res.data.categories, 'All Categories']))
          setAvailableCategories(merged)
          if (!merged.includes(category) && category !== 'All Categories') {
            setCategory(merged[0] || 'General')
          }
        }
      })
      .catch(() => {})
  }, [state])

  const handleMarksChange = (val) => {
    setMarks(val)
    const estimated = estimateRankFromMarks(val)
    setRank(estimated ? String(estimated) : '')
  }

  const handleFillFromProfile = () => {
    if (!user) return
    setInputMode('RANK')
    if (user.air) setRank(String(user.air))
    if (user.category) setCategory(user.category)
    if (user.domicileState) setState(user.domicileState)
    if (user.quota && user.quota !== 'All Quotas') setQuota(user.quota)
  }

  const handleResetForm = () => {
    setInputMode('RANK')
    setRank('')
    setMarks('')
    setCollegeSearch('')
    setState('All India')
    setCategory('General')
    setIncludeGeneral(true)
    setCollegeType('All Types')
    setQuota('All Quotas')
    setCourse('All Courses')
    setYear('All Years')
    setRound('All Rounds')
  }

  const isCustomized =
    rank !== '' ||
    marks !== '' ||
    collegeSearch !== '' ||
    state !== 'All India' ||
    category !== 'General' ||
    collegeType !== 'All Types' ||
    quota !== 'All Quotas' ||
    course !== 'All Courses' ||
    year !== 'All Years' ||
    round !== 'All Rounds'

  const handlePredict = (e) => {
    e.preventDefault()
    if (!rank || Number(rank) <= 0) return
    navigate('/results', {
      state: {
        rank: Number(rank),
        state: state.trim(),
        category,
        includeGeneral: category !== 'General' && category !== 'All Categories' ? includeGeneral : false,
        collegeType: collegeType !== 'All Types' ? collegeType : undefined,
        quota,
        course,
        year,
        round,
        searchQuery: collegeSearch.trim() || undefined,
      },
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-sky-shaded">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* Hero & Predictor Section */}
        <section className="pt-8 pb-6 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold text-sky-700 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-sky-500" />
              Verified Counselling Cutoff Records &bull; AIQ &amp; State Quotas
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl sm:leading-tight">
              Predict Your Medical College with{' '}
              <span className="gradient-text">Historical NEET Cutoffs</span>
            </h1>

            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Search by <strong>NEET Rank</strong>, <strong>Expected Marks</strong>, or <strong>College Name</strong> across official 15% AIQ and 85% State Quota datasets.
            </p>
          </div>

          {/* 1-Click Profile Quick Bar */}
          {user?.air ? (
            <div className="glass-bar mx-auto mt-6 w-full max-w-3xl rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
                  <ClipboardCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Welcome back, {user.name ? user.name : 'Candidate'} (AIR #{Number(user.air).toLocaleString('en-IN')} &bull; {user.category || 'General'})
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Your 1-Click Profile Predictor and Choice Filling Sheet are ready.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleFillFromProfile}
                  className="glass-pill flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-sky-700 hover:bg-white transition cursor-pointer"
                >
                  <CheckCircle2 size={13} /> Fill Form
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="gradient-btn flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <span>1-Click Predictor</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-bar mx-auto mt-6 w-full max-w-3xl rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-left">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <ClipboardCheck size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Save Your Rank &amp; Domicile Profile</h4>
                  <p className="text-[11px] text-slate-500">Get 1-click multi-tier Safe, Target, and Dream college breakdowns.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="glass-pill w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 rounded-xl hover:bg-white px-3.5 py-1.5 text-xs font-semibold text-sky-700 transition-colors cursor-pointer"
              >
                <User size={13} className="text-sky-600" /> Set Up Profile
              </button>
            </div>
          )}

          {/* Main Glassybar Predictor Search Card */}
          <div className="glass-card mx-auto mt-5 w-full max-w-3xl rounded-2xl p-6 sm:p-7">
            {/* Search Card Top Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                  <Search size={15} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">College Predictor Search</h2>
                  <p className="text-[11px] text-slate-500">Enter your rank or marks and select your target pool</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Input Mode Toggle: Rank vs Marks */}
                <div className="inline-flex rounded-xl bg-sky-50/90 p-1 border border-sky-100">
                  <button
                    type="button"
                    onClick={() => setInputMode('RANK')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                      inputMode === 'RANK'
                        ? 'bg-white text-sky-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp size={12} /> By NEET Rank
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('MARKS')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                      inputMode === 'MARKS'
                        ? 'bg-white text-sky-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calculator size={12} /> By Marks (/720)
                  </button>
                </div>

                {isCustomized && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    title="Reset all search fields"
                    className="glass-pill inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-rose-600 hover:bg-white transition cursor-pointer"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handlePredict} className="space-y-5">
              {/* Row 1: Rank OR Marks Input + Optional College Name Filter */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-7">
                  {inputMode === 'RANK' ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          NEET All India Rank (AIR) <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] font-medium text-slate-400">Overall rank on scorecard</span>
                      </div>

                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sky-600">
                          <TrendingUp size={18} />
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="3000000"
                          value={rank}
                          onChange={(e) => setRank(e.target.value)}
                          placeholder="Enter NEET Rank (e.g. 12500)"
                          className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2.5 pl-10 pr-9 text-sm sm:text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-sky-500/15 transition"
                          required
                        />
                        {rank && (
                          <button
                            type="button"
                            onClick={() => setRank('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          NEET Score / Marks (0–720) <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] font-semibold text-sky-700">
                          {rank ? `Est. AIR: ~#${Number(rank).toLocaleString('en-IN')}` : 'Auto-estimates AIR'}
                        </span>
                      </div>

                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sky-600">
                          <Calculator size={18} />
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="720"
                          value={marks}
                          onChange={(e) => handleMarksChange(e.target.value)}
                          placeholder="Enter Marks out of 720 (e.g. 640)"
                          className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2.5 pl-10 pr-9 text-sm sm:text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-sky-500/15 transition"
                          required
                        />
                        {marks && (
                          <button
                            type="button"
                            onClick={() => {
                              setMarks('')
                              setRank('')
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional College / City Keyword Filter */}
                <div className="sm:col-span-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      College / City Filter
                    </label>
                    <span className="text-[11px] text-slate-400">Optional</span>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Building2 size={16} />
                    </div>
                    <input
                      type="text"
                      value={collegeSearch}
                      onChange={(e) => setCollegeSearch(e.target.value)}
                      placeholder="e.g. AIIMS, GMC, Kolkata..."
                      className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2.5 pl-9 pr-8 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-sky-500/15 transition"
                    />
                    {collegeSearch && (
                      <button
                        type="button"
                        onClick={() => setCollegeSearch('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Target State & Category Side-by-Side */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Target State / Pool <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-medium text-sky-700 flex items-center gap-1">
                      <MapPin size={11} /> {availableStates.length - 1} States Live
                    </span>
                  </div>

                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-xl border border-sky-200/90 bg-white/95 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-sky-500/15 transition cursor-pointer"
                    required
                  >
                    {availableStates.map((s) => (
                      <option key={s} value={s}>
                        {s === 'All India' ? 'All India (All Uploaded States)' : s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    {category !== 'General' && category !== 'All Categories' && (
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeGeneral}
                          onChange={(e) => setIncludeGeneral(e.target.checked)}
                          className="rounded text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                        />
                        + Include Open (UR) Merit
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
              </div>

              {/* Row 3: Institution Type & Quota Quick Selection */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Institution Type
                    </label>
                    <span className="text-[11px] text-slate-400">Ownership</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'All Types', label: 'All' },
                      { id: 'Government', label: 'Govt' },
                      { id: 'Private', label: 'Private' },
                      { id: 'Deemed', label: 'Deemed' },
                    ].map((opt) => {
                      const isSelected = collegeType === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setCollegeType(opt.id)}
                          className={`flex items-center justify-center rounded-xl border py-2 px-2 text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-2xs ring-2 ring-sky-500/15'
                              : 'border-sky-100 bg-white/85 text-slate-700 hover:border-sky-200 hover:bg-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Counselling Quota
                    </label>
                    <span className="text-[11px] text-slate-400">Seat Pool</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'All Quotas', label: 'All Pools' },
                      { id: 'AIQ', label: '15% AIQ' },
                      { id: 'State', label: '85% State' },
                      { id: 'Deemed', label: 'Deemed/Mgmt' },
                    ].map((opt) => {
                      const isSelected = quota === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setQuota(opt.id)}
                          className={`flex items-center justify-center rounded-xl border py-2 px-2 text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-2xs ring-2 ring-sky-500/15'
                              : 'border-sky-100 bg-white/85 text-slate-700 hover:border-sky-200 hover:bg-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Row 4: Optional Course, Year & Round */}
              <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3.5">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex w-full items-center justify-between text-xs font-semibold text-slate-700 hover:text-sky-700 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-sky-600" />
                    Course, Year &amp; Counselling Round ({course} &bull; {year} &bull; {round})
                  </span>
                  <span className="text-xs font-semibold text-sky-600">
                    {showAdvanced ? 'Hide Options' : 'Customize'}
                  </span>
                </button>

                {showAdvanced && (
                  <div className="mt-3.5 grid grid-cols-1 gap-3 border-t border-sky-100 pt-3.5 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">Exact Quota</label>
                      <select
                        value={quota}
                        onChange={(e) => setQuota(e.target.value)}
                        className="w-full rounded-lg border border-sky-200/80 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                      >
                        {QUOTA_OPTIONS.map((q) => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">Course</label>
                      <select
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className="w-full rounded-lg border border-sky-200/80 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                      >
                        {COURSE_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">Year</label>
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full rounded-lg border border-sky-200/80 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                      >
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">Round</label>
                      <select
                        value={round}
                        onChange={(e) => setRound(e.target.value)}
                        className="w-full rounded-lg border border-sky-200/80 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                      >
                        {ROUND_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button + Direct Cutoff Explorer Shortcut */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="gradient-btn w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white cursor-pointer"
                >
                  <Search size={18} />
                  Predict Matching Medical Colleges
                  <ArrowRight size={16} />
                </button>
                <Link
                  to="/cutoffs"
                  className="glass-pill w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-700 hover:text-sky-700 hover:bg-white transition"
                >
                  <Layers size={15} className="text-sky-600" />
                  Browse All Cutoffs Without Rank
                </Link>
              </div>
            </form>
          </div>
        </section>

        {/* Functional Quick-Access Workspace Bar (4 Distinct Feature Routes) */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/profile"
              className="glass-card card-hover-effect rounded-2xl p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <ClipboardCheck size={17} />
                </div>
                <h3 className="mt-3 text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  1-Click Smart Predictor
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Safe, Target &amp; Dream college tiers with an auto-generated MCC choice sheet.
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                Open Profile <ArrowRight size={12} />
              </span>
            </Link>

            <Link
              to="/cutoffs"
              className="glass-card card-hover-effect rounded-2xl p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Layers size={17} />
                </div>
                <h3 className="mt-3 text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  Cutoff Archive Explorer
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Search any medical college across India by name, state, round, and category.
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                Browse Cutoffs <ArrowRight size={12} />
              </span>
            </Link>

            <Link
              to="/compare"
              className="glass-card card-hover-effect rounded-2xl p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Scale size={17} />
                </div>
                <h3 className="mt-3 text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  Compare Medical Colleges
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Compare up to 4 medical colleges side-by-side by cutoff rank, quota, and tuition fees.
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                Compare Now <ArrowRight size={12} />
              </span>
            </Link>

            <Link
              to="/counselling-guide"
              className="glass-card card-hover-effect rounded-2xl p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Compass size={17} />
                </div>
                <h3 className="mt-3 text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  Counselling Guide &amp; Bonds
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Marks-to-AIR estimator, document checklist, MCC 4-round rules, and state service bonds.
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                Explore Guide <ArrowRight size={12} />
              </span>
            </Link>
          </div>

          <p className="mt-8 text-center text-[11px] text-slate-400 max-w-2xl mx-auto">
            Note: Predictions are based on historical counselling cutoff records. Actual allotment depends on current-year seat matrix, category, quota, and candidate preferences.
          </p>
        </section>
      </main>
    </div>
  )
}
