import { useState, useMemo } from 'react'
import CollegeCard from './CollegeCard.jsx'
import EmptyState from '../Loading/EmptyState.jsx'
import { Filter, Search, ArrowUpDown, Building2 } from 'lucide-react'

export default function CollegeGrid({ records = [], onCompareToggle, selectedIds = [] }) {
  const [filterType, setFilterType] = useState('ELIGIBLE')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('DEFAULT')

  const eligibleRecords = useMemo(() => {
    return records.filter((r) => r.eligible === true || r.isWithinHistoricalRange || r.isBetterThanOpening || r.classification === 'HISTORICALLY_WITHIN_CLOSING' || r.classification === 'BETTER_THAN_OPENING')
  }, [records])

  const borderlineCount = useMemo(() => {
    return records.filter((r) => r.isNearHistoricalClosing || r.classification === 'NEAR_HISTORICAL_CLOSING').length
  }, [records])

  const govtCount = useMemo(() => {
    return eligibleRecords.filter((r) => /govt|government|gmc/i.test(r.collegeType || '')).length
  }, [eligibleRecords])

  const filteredAndSortedRecords = useMemo(() => {
    if (!records || records.length === 0) return []

    let list = records.filter((r) => {
      const isEligible = r.eligible === true || r.isWithinHistoricalRange || r.isBetterThanOpening || r.classification === 'HISTORICALLY_WITHIN_CLOSING' || r.classification === 'BETTER_THAN_OPENING'
      const isNear = r.isNearHistoricalClosing || r.classification === 'NEAR_HISTORICAL_CLOSING'
      const isGovt = /govt|government|gmc/i.test(r.collegeType || '')

      if (filterType === 'ELIGIBLE') return isEligible
      if (filterType === 'BORDERLINE') return isNear
      if (filterType === 'GOVT') return isEligible && isGovt
      if (filterType === 'ALL') return isEligible || isNear
      return isEligible
    })

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (r) =>
          r.collegeName?.toLowerCase().includes(q) ||
          r.state?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q)
      )
    }

    if (sortBy === 'CLOSING_ASC') {
      list = [...list].sort((a, b) => (Number(a.closingRank) || 9999999) - (Number(b.closingRank) || 9999999))
    } else if (sortBy === 'FEES_ASC') {
      list = [...list].sort((a, b) => (Number(a.fees) || 9999999) - (Number(b.fees) || 9999999))
    }

    return list
  }, [records, filterType, searchQuery, sortBy])

  if (!records || records.length === 0) {
    return (
      <EmptyState
        title="No matching historical records found"
        description="Try exploring All India Quota, different states, or other category reservation cutoffs."
        suggestions={['Try All India Quota', 'Try Private / Deemed colleges', 'Try another category quota', 'Explore other states']}
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Quick Summary Breakdown Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-gradient-to-r from-emerald-50/60 via-white to-slate-50 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-800">Counselling Results:</span>
          <span className="font-bold text-emerald-800">{eligibleRecords.length} Eligible Institutions</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800 border border-emerald-200 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {eligibleRecords.length} Historically Within Cutoff
          </span>
          {borderlineCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-800 border border-amber-200 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {borderlineCount} Borderline (Near Cutoff)
            </span>
          )}
        </div>
      </div>

      {/* Interactive Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 text-xs">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterType('ELIGIBLE')}
            className={`rounded-lg px-2.5 py-1 font-bold transition cursor-pointer ${
              filterType === 'ELIGIBLE'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            ✓ Eligible Colleges ({eligibleRecords.length})
          </button>

          {govtCount > 0 && (
            <button
              onClick={() => setFilterType('GOVT')}
              className={`rounded-lg px-2.5 py-1 font-bold transition cursor-pointer ${
                filterType === 'GOVT'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              🏛️ Govt Only ({govtCount})
            </button>
          )}

          {borderlineCount > 0 && (
            <button
              onClick={() => setFilterType('BORDERLINE')}
              className={`rounded-lg px-2.5 py-1 font-bold transition cursor-pointer ${
                filterType === 'BORDERLINE'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              ⚠ Borderline ({borderlineCount})
            </button>
          )}
        </div>

        {/* Quick Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in results..."
              className="rounded-lg border border-slate-200 bg-white pl-7 pr-2.5 py-1 text-[11px] text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
          >
            <option value="DEFAULT">Default Sort</option>
            <option value="CLOSING_ASC">Lowest Closing Rank</option>
            <option value="FEES_ASC">Lowest Tuition Fees</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedRecords.map((record) => (
          <CollegeCard
            key={record._id || `${record.collegeName}-${record.year}-${record.round}-${record.quota}-${record.category}`}
            record={record}
            onCompareToggle={onCompareToggle}
            isSelectedForCompare={selectedIds.includes(record.collegeId?._id || record.collegeId)}
          />
        ))}
      </div>

      {filteredAndSortedRecords.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
          No colleges match the selected filter or search query.
        </div>
      )}
    </div>
  )
}

