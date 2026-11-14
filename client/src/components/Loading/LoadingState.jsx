import { Loader2 } from 'lucide-react'

export default function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
      <Loader2 size={28} className="animate-spin text-brand-500" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
