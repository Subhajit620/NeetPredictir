import { SearchX } from 'lucide-react'

export default function EmptyState({ title, description, suggestions }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <SearchX size={28} className="mx-auto mb-2 text-slate-300" />
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {suggestions && suggestions.length > 0 && (
        <ul className="mt-4 inline-flex flex-col gap-1 text-sm text-slate-500">
          {suggestions.map((s) => (
            <li key={s}>• {s}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
