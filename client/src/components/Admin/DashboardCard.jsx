export default function DashboardCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value ?? '—'}</p>
    </div>
  )
}
