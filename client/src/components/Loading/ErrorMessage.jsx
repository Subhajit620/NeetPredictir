import { AlertTriangle } from 'lucide-react'

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <div>
        <p>{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 font-medium text-red-800 underline underline-offset-2">
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
