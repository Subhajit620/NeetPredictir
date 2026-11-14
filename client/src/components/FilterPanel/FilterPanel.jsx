const QUOTA_OPTIONS = ['AIQ', 'State', 'Management', 'NRI', 'Deemed', 'Central']
const COLLEGE_TYPE_OPTIONS = ['Government', 'Private', 'Deemed', 'Central']

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

// Optional refinement filters only — Rank/State/Category/Course are the
// required search inputs and live directly on the Results search form.
export default function FilterPanel({ filters, onChange }) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value })

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
      <Select label="Quota" value={filters.quota} onChange={set('quota')} options={QUOTA_OPTIONS} />
      <Select label="College Type" value={filters.collegeType} onChange={set('collegeType')} options={COLLEGE_TYPE_OPTIONS} />
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Max Fees (₹)
        <input
          type="number"
          value={filters.maxFees || ''}
          onChange={(e) => set('maxFees')(e.target.value ? Number(e.target.value) : undefined)}
          placeholder="No limit"
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
        />
      </label>
    </div>
  )
}
