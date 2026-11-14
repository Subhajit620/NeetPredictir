import { Link } from 'react-router-dom'
import { CheckCircle2, Archive, Trash2, Eye, FileSpreadsheet, ExternalLink } from 'lucide-react'

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  validated: 'bg-amber-50 text-amber-800 border-amber-200',
  published: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  archived: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function DatasetTable({ datasets, onPublish, onArchive, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      <table className="w-full text-left text-xs sm:text-sm">
        <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3.5">Dataset Name</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5">State & Year</th>
            <th className="px-4 py-3.5">Valid / Total</th>
            <th className="px-4 py-3.5">Published Cutoffs</th>
            <th className="px-4 py-3.5">Uploaded Date</th>
            <th className="px-4 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {datasets.map((d) => (
            <tr key={d._id} className="hover:bg-slate-50/60 transition">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div>
                    <Link
                      to={`/admin/datasets/${d._id}`}
                      className="font-bold text-slate-900 hover:text-brand-600 transition flex items-center gap-1"
                    >
                      {d.name}
                      <ExternalLink size={12} className="opacity-40" />
                    </Link>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {d.sourceFileName || 'Direct Upload'}
                    </span>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${
                    STATUS_STYLES[d.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      d.status === 'published'
                        ? 'bg-emerald-500'
                        : d.status === 'validated'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                    }`}
                  />
                  {d.status}
                </span>
              </td>

              <td className="px-4 py-3.5 font-medium text-slate-700">
                <span>{d.state || 'All India'}</span>
                <div className="text-[11px] text-slate-400 font-normal">
                  {d.year} • {d.round} ({d.counsellingType || 'AIQ'})
                </div>
              </td>

              <td className="px-4 py-3.5 font-semibold text-slate-800">
                <span className="text-emerald-700 font-bold">{d.validRows || 0}</span>
                <span className="text-slate-400 font-normal"> / {d.totalRows || 0}</span>
              </td>

              <td className="px-4 py-3.5 font-bold text-indigo-700">
                {d.recordCount || 0} cutoffs
              </td>

              <td className="px-4 py-3.5 text-xs text-slate-500">
                {new Date(d.uploadedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>

              <td className="px-4 py-3.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    to={`/admin/datasets/${d._id}`}
                    title="View details & rows"
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                  >
                    <Eye size={13} />
                    View
                  </Link>

                  {d.status !== 'published' && (
                    <button
                      onClick={() => onPublish(d._id)}
                      title="Publish to Live Predictor"
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      Publish
                    </button>
                  )}

                  {d.status === 'published' && (
                    <button
                      onClick={() => onArchive(d._id)}
                      title="Archive / Unpublish"
                      className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 shadow-2xs cursor-pointer"
                    >
                      <Archive size={13} />
                      Archive
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(d)}
                    title="Delete dataset"
                    className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

