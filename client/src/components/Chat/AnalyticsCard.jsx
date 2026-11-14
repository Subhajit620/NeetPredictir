import { MapPin, Award, CheckCircle2, AlertCircle, TrendingUp, Layers, HelpCircle } from 'lucide-react'

export default function AnalyticsCard({ comparisonData, analyticsData }) {
  if (!comparisonData && !analyticsData) return null

  // 1. STATE COMPARISON
  if (comparisonData?.comparisonType === 'STATE_COMPARISON') {
    const states = comparisonData.states || []
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-xs backdrop-blur-xs card-hover-effect animate-fade-in-up">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-brand-50/30 to-indigo-50/20 px-4 py-3 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-2xs">
              <MapPin size={14} />
            </div>
            Inter-State Cutoff Comparison Matrix
          </h4>
          <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200/60 rounded-full px-2.5 py-0.5">
            {states.length} States Analyzed
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">State</th>
                <th className="px-4 py-2.5">Colleges</th>
                <th className="px-4 py-2.5">Top Closing Rank</th>
                <th className="px-4 py-2.5">Avg Closing Rank</th>
                <th className="px-4 py-2.5">Your Eligible Choices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {states.map((st, i) => (
                <tr key={i} className="hover:bg-brand-50/30 transition-colors duration-150">
                  <td className="px-4 py-2.5 font-bold text-slate-900">{st.state}</td>
                  <td className="px-4 py-2.5 text-slate-600">{st.totalColleges}</td>
                  <td className="px-4 py-2.5 text-emerald-700 font-bold">
                    {st.mostCompetitiveClosingRank ? `AIR ${st.mostCompetitiveClosingRank.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {st.averageClosingRank ? `AIR ${st.averageClosingRank.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {st.eligibleRecordsCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                        <CheckCircle2 size={12} className="text-emerald-600" /> {st.eligibleRecordsCount} Options
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-semibold">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // 2. CATEGORY COMPARISON
  if (comparisonData?.comparisonType === 'CATEGORY_COMPARISON') {
    const cats = comparisonData.categories || []
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-xs backdrop-blur-xs card-hover-effect animate-fade-in-up">
        <div className="border-b border-slate-100 bg-gradient-to-r from-purple-50/60 via-slate-50 to-indigo-50/20 px-4 py-3 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-600 shadow-2xs">
              <Award size={14} />
            </div>
            Category Cutoff Relaxation Matrix ({comparisonData.targetState || 'All India'})
          </h4>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/60 rounded-full px-2.5 py-0.5">
            {cats.length} Categories
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Records</th>
                <th className="px-4 py-2.5">Opening Rank</th>
                <th className="px-4 py-2.5">Closing Rank</th>
                <th className="px-4 py-2.5">Average Closing Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {cats.map((c, i) => (
                <tr key={i} className="hover:bg-purple-50/30 transition-colors duration-150">
                  <td className="px-4 py-2.5 font-bold text-slate-900">{c.category}</td>
                  <td className="px-4 py-2.5 text-slate-600">{c.totalRecords}</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {c.openingCutoff ? `AIR ${c.openingCutoff.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-black text-brand-700">
                    {c.closingCutoff ? `AIR ${c.closingCutoff.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {c.averageClosingRank ? `AIR ${c.averageClosingRank.toLocaleString('en-IN')}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // 3. QUOTA COMPARISON
  if (comparisonData?.comparisonType === 'QUOTA_COMPARISON') {
    const quotas = comparisonData.quotas || []
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-xs backdrop-blur-xs card-hover-effect animate-fade-in-up">
        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 via-slate-50 to-blue-50/20 px-4 py-3">
          <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shadow-2xs">
              <Layers size={14} />
            </div>
            Quota Comparison: AIQ (15%) vs State Quota (85%)
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
          {quotas.map((q, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2 card-hover-effect transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">{q.quota}</span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-600">Cutoff Range: <strong className="text-slate-900 font-bold">AIR {q.openingCutoff?.toLocaleString('en-IN')} - {q.closingCutoff?.toLocaleString('en-IN')}</strong></p>
              <p className="text-xs text-slate-600">Average Closing Rank: <strong className="text-indigo-700 font-bold">AIR {q.averageClosingRank?.toLocaleString('en-IN')}</strong></p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 4. RANK ANALYSIS SUMMARY
  if (analyticsData?.analysisType === 'RANK_ANALYSIS') {
    const stats = analyticsData.stats || {}
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xs space-y-3 backdrop-blur-xs card-hover-effect animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-2xs">
              <TrendingUp size={14} />
            </div>
            Historical Rank Comparison Breakdown (AIR {analyticsData.rank?.toLocaleString('en-IN')})
          </h4>
          <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            Cutoff Distribution
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-emerald-100/30 p-3 shadow-2xs">
            <div className="text-lg font-black text-emerald-700">{stats.betterThanOpeningCount || 0}</div>
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mt-0.5">Better than Opening</div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/80 to-blue-100/30 p-3 shadow-2xs">
            <div className="text-lg font-black text-blue-700">{stats.withinRangeCount || 0}</div>
            <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mt-0.5">Within Range</div>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-50/80 to-purple-100/30 p-3 shadow-2xs">
            <div className="text-lg font-black text-purple-700">{stats.beyondClosingCount || 0}</div>
            <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider mt-0.5">Beyond Closing</div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
