export default function ValidationReport({ dataset, errorRows, previewRows = [], onImport, onPublish, importing }) {
  const totalWarnings = dataset.warnings
    ? Object.values(dataset.warnings).reduce((acc, curr) => acc + (Number(curr) || 0), 0)
    : 0

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-medium text-slate-400">File</p>
          <p className="font-semibold text-slate-800">{dataset.sourceFileName || dataset.name}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${
            dataset.status === 'published'
              ? 'bg-emerald-100 text-emerald-800'
              : dataset.status === 'validated'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-amber-800'
          }`}
        >
          {dataset.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-400">Total rows</p>
          <p className="text-lg font-bold text-slate-800">{dataset.totalRows?.toLocaleString('en-IN') || 0}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs text-emerald-600">Valid rows</p>
          <p className="text-lg font-bold text-emerald-700">{dataset.validRows?.toLocaleString('en-IN') || 0}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-xs text-red-600">Invalid rows</p>
          <p className="text-lg font-bold text-red-700">{dataset.invalidRows?.toLocaleString('en-IN') || 0}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="text-xs text-amber-600">Duplicate rows</p>
          <p className="text-lg font-bold text-amber-700">{dataset.duplicateRows?.toLocaleString('en-IN') || 0}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-400">Warnings</p>
          <p className="text-lg font-bold text-slate-700">{totalWarnings.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {dataset.warnings && Object.keys(dataset.warnings).length > 0 && (
        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
          <p className="mb-1 text-xs font-semibold text-amber-800">Warnings breakdown</p>
          <ul className="space-y-0.5 text-xs text-amber-700">
            {Object.entries(dataset.warnings).map(([w, count]) => (
              <li key={w}>
                • {count} record(s): {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {previewRows && previewRows.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Preview Data (First {previewRows.length} Valid Rows)</h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">College</th>
                  <th className="px-3 py-2.5">State</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5 text-right">Opening Rank</th>
                  <th className="px-3 py-2.5 text-right font-extrabold text-brand-700">Closing Rank</th>
                  <th className="px-3 py-2.5 text-right">Allotted Rank</th>
                  <th className="px-3 py-2.5 text-center">Year</th>
                  <th className="px-3 py-2.5 text-center">Round</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((r, idx) => (
                  <tr key={r.rowIndex ?? idx} className="hover:bg-slate-50/60 transition">
                    <td className="px-3 py-2.5 font-bold text-slate-800">{r.normalized?.collegeName || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.normalized?.state || '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">{r.normalized?.category || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">
                      {r.normalized?.openingRank ? Number(r.normalized.openingRank).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900 bg-brand-50/20">
                      {r.normalized?.closingRank ? Number(r.normalized.closingRank).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">
                      {r.normalized?.allottedRank || r.normalized?.allotmentRank
                        ? Number(r.normalized?.allottedRank || r.normalized?.allotmentRank).toLocaleString('en-IN')
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">{r.normalized?.year || '—'}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600">{r.normalized?.round || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errorRows && errorRows.length > 0 && (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-red-600 hover:text-red-700">
            View {errorRows.length} invalid / error rows
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1.5">Row</th>
                  <th className="px-2 py-1.5">College</th>
                  <th className="px-2 py-1.5">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {errorRows.map((r) => (
                  <tr key={r.rowIndex}>
                    <td className="px-2 py-1.5 font-mono text-slate-400">{r.rowIndex + 1}</td>
                    <td className="px-2 py-1.5 font-medium text-slate-700">{r.normalized?.collegeName || '—'}</td>
                    <td className="px-2 py-1.5 text-red-600">{r.errors.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        {dataset.status === 'draft' && (
          <button
            onClick={onImport}
            disabled={importing || dataset.validRows === 0}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {importing ? 'Importing Data...' : 'Import Data'}
          </button>
        )}
        {dataset.status === 'validated' && (
          <button
            onClick={onPublish}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Publish Dataset
          </button>
        )}
        {dataset.status === 'published' && (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Dataset is live and active in the college predictor engine.
          </div>
        )}
      </div>
    </div>
  )
}
