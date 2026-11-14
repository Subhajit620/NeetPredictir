import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'
import AdminSidebar from '../../components/Admin/AdminSidebar.jsx'
import LoadingState from '../../components/Loading/LoadingState.jsx'
import ErrorMessage from '../../components/Loading/ErrorMessage.jsx'
import api, { apiErrorMessage } from '../../services/api'

function AnalyticsBarChart({ title, rows, color = '#0284c7' }) {
  const chartData = (rows || []).slice(0, 10)
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="mb-4 text-xs font-bold text-slate-800">{title}</h3>
      {chartData.length === 0 ? (
        <p className="text-xs text-slate-400">No data available.</p>
      ) : (
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e0f2fe" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: '#bae6fd', boxShadow: '0 4px 12px -2px rgb(2 132 199 / 0.1)' }}
                cursor={{ fill: '#f0f9ff' }}
              />
              <Bar dataKey="count" fill={color} radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/admin/analytics')
      .then((res) => setData(res.data))
      .catch((err) => setError(apiErrorMessage(err)))
  }, [])

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-sky-shaded">
      <AdminSidebar />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <div className="glass-bar rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cutoff &amp; Predictor Analytics</h1>
              <p className="text-xs text-slate-500">
                Distribution of published counselling cutoffs across States, Years, Rounds, and Categories.
              </p>
            </div>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}
        {!data && !error && <LoadingState label="Calculating analytics distributions..." />}

        {data && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="glass-card rounded-2xl p-4">
                <span className="text-xs font-medium text-slate-500">Datasets</span>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">{data.totalDatasets || 0}</p>
                <span className="text-[11px] text-sky-600 font-semibold">{data.publishedDatasets || 0} published</span>
              </div>

              <div className="glass-card rounded-2xl p-4">
                <span className="text-xs font-medium text-slate-500">Medical Colleges</span>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">{data.totalColleges || 0}</p>
                <span className="text-[11px] text-slate-500">Unique institutions</span>
              </div>

              <div className="glass-card rounded-2xl p-4">
                <span className="text-xs font-medium text-slate-500">Published Cutoffs</span>
                <p className="mt-1.5 text-2xl font-bold text-sky-600">{data.totalCutoffRecords || 0}</p>
                <span className="text-[11px] text-slate-500">Historical seat rows</span>
              </div>

              <div className="glass-card rounded-2xl p-4">
                <span className="text-xs font-medium text-slate-500">Total Searches</span>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">{data.totalPredictions || 0}</p>
                <span className="text-[11px] text-slate-500">Predictor executions</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <AnalyticsBarChart title="Cutoff Records by State" rows={data.byState} color="#0284c7" />
              <AnalyticsBarChart
                title="Cutoff Records by Year"
                rows={(data.byYear || []).map((r) => ({ ...r, label: String(r.label) }))}
                color="#0ea5e9"
              />
              <AnalyticsBarChart title="Cutoff Records by Round" rows={data.byRound} color="#38bdf8" />
              <AnalyticsBarChart title="Cutoff Records by Category" rows={data.byCategory} color="#0369a1" />
              <AnalyticsBarChart title="Cutoff Records by Quota" rows={data.byQuota} color="#0284c7" />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
