const ROWS = [
  {
    key: 'collegeType',
    label: 'Institution Type',
    format: (v, r) => {
      const type = r.collegeType || r.collegeId?.collegeType || r.collegeId?.ownership || ''
      const name = (r.collegeName || r.collegeId?.name || '').toLowerCase()
      if (/gov|central|aiims|jipmer|autonomous/i.test(type)) return 'Government'
      if (/priv|trust|society/i.test(type)) return 'Private'
      if (/deem/i.test(type)) return 'Deemed'
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
      return 'Government'
    },
  },
  { key: 'state', label: 'State & City', format: (v, r) => `${r.state}${r.city ? `, ${r.city}` : ''}` },
  { key: 'course', label: 'Course', format: (v, r) => r.course || 'MBBS' },
  { key: 'category', label: 'Category', format: (v) => v || 'General' },
  { key: 'quota', label: 'Quota', format: (v) => v || 'AIQ/State' },
  { key: 'round', label: 'Round & Year', format: (v, r) => `${r.round} (${r.year})` },
  {
    key: 'openingRank',
    label: 'Opening Rank',
    format: (v) => (v != null && Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-IN') : 'N/A'),
  },
  {
    key: 'closingRank',
    label: 'Closing Rank',
    format: (v) => (v != null && Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-IN') : 'N/A'),
    isHighlight: true,
  },
  {
    key: 'allottedRank',
    label: 'Allotted Rank',
    format: (v, r) => {
      const val = v ?? r.allotmentRank
      return val != null && Number.isFinite(Number(val)) ? Number(val).toLocaleString('en-IN') : '—'
    },
  },
  {
    key: 'fees',
    label: 'Tuition Fees',
    format: (v) => (v ? `₹${Number(v).toLocaleString('en-IN')}` : 'Govt / Standard'),
  },
  {
    key: 'classification',
    label: 'Match Status',
    format: (v, r) => {
      if (r.statusLabel) return r.statusLabel
      if (v === 'BETTER_THAN_OPENING') return 'Better than Historical Opening'
      if (v === 'WITHIN_HISTORICAL_RANGE') return 'Within Historical Range'
      if (v === 'BEYOND_HISTORICAL_CLOSING' || v === 'OUTSIDE_HISTORICAL_RANGE') return 'Beyond Historical Closing'
      if (v === 'INSUFFICIENT_DATA') return 'Historical Data Unavailable'
      return 'Historical Record'
    },
  },
]

export default function ComparisonTable({ records, onRemove }) {
  if (!records || records.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      <table className="w-full min-w-[540px] text-left text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-slate-500 text-[11px] w-40">
              Parameter
            </th>
            {records.map((r, i) => (
              <th key={i} className="px-4 py-3.5 font-bold text-slate-900 border-l border-slate-200/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="line-clamp-2">{r.collegeName}</span>
                  {onRemove && (
                    <button
                      onClick={() => onRemove(i)}
                      className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-rose-600"
                      title="Remove from comparison"
                    >
                      ×
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ROWS.map((row) => (
            <tr key={row.key} className="hover:bg-slate-50/50 transition">
              <td className="px-4 py-3 font-semibold text-slate-500 text-xs bg-slate-50/30">
                {row.label}
              </td>
              {records.map((r, i) => {
                const formatted = row.format ? row.format(r[row.key], r) : r[row.key] ?? 'N/A'
                return (
                  <td
                    key={i}
                    className={`px-4 py-3 text-slate-800 font-medium border-l border-slate-100 ${
                      row.isHighlight ? 'font-bold text-brand-700 bg-brand-50/20' : ''
                    }`}
                  >
                    {formatted}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

