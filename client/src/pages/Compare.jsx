import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Scale, Search, Plus, Trash2, Building2, Bookmark, Zap } from 'lucide-react'
import Navbar from '../components/Navbar/Navbar.jsx'
import { useStudentAuth } from '../context/StudentAuthContext.jsx'
import ComparisonTable from '../components/Comparison/ComparisonTable.jsx'
import ErrorMessage from '../components/Loading/ErrorMessage.jsx'
import EmptyState from '../components/Loading/EmptyState.jsx'
import api, { apiErrorMessage } from '../services/api'

export default function Compare() {
  const location = useLocation()
  const initialRecords = location.state?.records || []

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(initialRecords)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)

  // Live auto-suggestions as user types
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get('/colleges/suggestions', { params: { q: query.trim(), limit: 8 } })
        setResults(res.data.suggestions || [])
      } catch (err) {
        // Fallback to regular search
        try {
          const res2 = await api.get('/colleges', { params: { search: query.trim(), limit: 8 } })
          setResults(res2.data.colleges || [])
        } catch (e) {}
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  const search = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setError('')
    setSearching(true)
    try {
      const res = await api.get('/colleges', { params: { search: query.trim(), limit: 12 } })
      setResults(res.data.colleges || [])
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSearching(false)
    }
  }

  const { user, choiceList } = useStudentAuth()

  const addToCompare = async (college) => {
    const collegeKey = college._id || college.name
    if (selected.find((s) => (s.collegeId?._id || s.collegeId || s.collegeName) === collegeKey)) {
      setError(`${college.name} is already in the comparison table.`)
      return
    }
    if (selected.length >= 4) {
      setError('You can compare up to 4 colleges at a time.')
      return
    }
    setError('')
    try {
      const res = await api.get(`/colleges/${college._id}`)
      const cutoffs = res.data.cutoffs || []
      const preferredCat = (user?.category || 'General').toLowerCase()
      const latest =
        cutoffs.find((c) => String(c.category || '').toLowerCase() === preferredCat) ||
        cutoffs.find((c) => /^(general|ur|open|oc|non-apst)$/i.test(String(c.category || '').trim())) ||
        cutoffs[0] ||
        {}
      setSelected((prev) => [
        ...prev,
        {
          collegeId: college._id,
          collegeName: college.name,
          state: college.state || latest.state || 'All India',
          city: college.city || latest.city || '',
          course: latest.course || 'MBBS',
          category: latest.category || 'General',
          quota: latest.quota || 'AIQ/State',
          round: latest.round || 'Round 1',
          year: latest.year || 2025,
          openingRank: latest.openingRank ?? null,
          closingRank: latest.closingRank ?? latest.allottedRank ?? latest.allotmentRank ?? null,
          allottedRank: latest.allottedRank ?? latest.allotmentRank ?? null,
          fees: latest.fees ?? null,
          statusLabel: latest.statusLabel || 'Historical Record',
        },
      ])
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const loadFromChoiceList = async () => {
    if (!choiceList || choiceList.length === 0) return
    const topChoices = await Promise.all(
      choiceList.slice(0, 4).map(async (c) => {
        const cid = c.collegeId?._id || c.collegeId
        let closingRank = c.closingRank ?? c.cutoffId?.closingRank ?? null
        let openingRank = c.openingRank ?? c.cutoffId?.openingRank ?? null
        let fees = c.fees ?? c.cutoffId?.fees ?? c.collegeId?.fees ?? null
        let round = c.round || c.cutoffId?.round || ''
        let year = c.cutoffId?.year || ''

        if (closingRank === null && cid) {
          try {
            const res = await api.get(`/colleges/${cid}`)
            const cutoffs = res.data?.cutoffs || []
            const match =
              cutoffs.find(
                (ct) =>
                  (!c.quota || String(ct.quota || '').toLowerCase() === String(c.quota).toLowerCase()) &&
                  (!c.category || String(ct.category || '').toLowerCase() === String(c.category).toLowerCase())
              ) || cutoffs[0]
            if (match) {
              closingRank = match.closingRank ?? null
              openingRank = match.openingRank ?? null
              fees = fees ?? match.fees ?? null
              round = round || match.round || ''
              year = year || match.year || ''
            }
          } catch {
            // Fallback gracefully
          }
        }

        return {
          collegeId: cid,
          collegeName: c.collegeId?.name || 'Medical College',
          state: c.collegeId?.state || '',
          category: c.category || 'General',
          course: c.course || 'MBBS',
          quota: c.quota || 'AIQ',
          round,
          year,
          openingRank,
          closingRank,
          fees,
          statusLabel: 'Choice List Selection',
        }
      })
    )
    setSelected(topChoices)
  }

  const removeCollege = (index) => {
    setSelected((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <Navbar />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 shadow-2xs">
              <Scale size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Compare Medical Colleges</h1>
              <p className="text-xs text-slate-500 font-medium">
                Side-by-side comparison of historical NEET closing cutoffs, tuition fees, and quota criteria.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {choiceList.length > 0 && selected.length === 0 && (
              <button
                type="button"
                onClick={loadFromChoiceList}
                className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition cursor-pointer shadow-2xs"
              >
                <Bookmark size={13} className="text-amber-500 fill-amber-400" />
                Load from My Choice List ({choiceList.length})
              </button>
            )}

            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                <Trash2 size={13} />
                Clear All ({selected.length})
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search published medical college by name (e.g. AIIMS, King George, JNM)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="gradient-btn flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white shadow-xs cursor-pointer"
            >
              <Search size={14} />
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Quick Search Result Chips */}
          {results.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-400 py-1">Matching Colleges:</span>
              {results.map((c) => {
                const isAdded = selected.some((s) => (s.collegeId?._id || s.collegeId || s.collegeName) === (c._id || c.name))
                return (
                  <button
                    key={c._id}
                    onClick={() => addToCompare(c)}
                    disabled={isAdded}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      isAdded
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 opacity-60'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/50'
                    }`}
                  >
                    <Plus size={13} />
                    <span>{c.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({c.state})</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Selected Comparison Matrix */}
        {selected.length === 0 ? (
          <EmptyState
            title="No colleges in comparison"
            description="Search for colleges above or check the 'Compare' option on any prediction card in the search results."
          />
        ) : (
          <ComparisonTable records={selected} onRemove={removeCollege} />
        )}

        {/* Disclaimer */}
        <p className="pt-4 text-center text-xs text-slate-400 max-w-2xl mx-auto">
          These results are based on previous-year counselling/cutoff data and are not a guarantee of admission. Actual admission depends on current year counselling, competition, and seat matrix.
        </p>
      </main>
    </div>
  )
}

