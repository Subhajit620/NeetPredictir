import { useState } from 'react'

export default function RankInput({ onSubmit, loading }) {
  const [rank, setRank] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const value = Number(rank)
    if (!Number.isFinite(value) || value <= 0) return
    onSubmit(value)
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col items-center gap-3">
      <input
        type="number"
        inputMode="numeric"
        value={rank}
        onChange={(e) => setRank(e.target.value)}
        placeholder="Enter your NEET AIR"
        className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-center text-lg shadow-sm focus:border-brand-500 focus:outline-none"
        autoFocus
      />
      <button
        type="submit"
        disabled={loading || !rank}
        className="w-full rounded-full bg-brand-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? 'Analyzing...' : 'Analyze My Rank'}
      </button>
    </form>
  )
}
