import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Download, Sparkles, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import AdminSidebar from '../../components/Admin/AdminSidebar.jsx'
import UploadBox from '../../components/Admin/UploadBox.jsx'
import ValidationReport from '../../components/Admin/ValidationReport.jsx'
import ErrorMessage from '../../components/Loading/ErrorMessage.jsx'
import LoadingState from '../../components/Loading/LoadingState.jsx'
import api, { apiErrorMessage } from '../../services/api'

const CANONICAL_FIELDS = [
  'collegeName', 'state', 'category', 'quota', 'course',
  'round', 'year', 'openingRank', 'closingRank', 'allottedRank',
  'collegeCode', 'district', 'fees', 'collegeType', 'seatCount', 'gender',
]

export default function UploadDataset() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [round, setRound] = useState('Round 1')
  const [counsellingType, setCounsellingType] = useState('AIQ')
  const [state, setState] = useState('All India')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [dataset, setDataset] = useState(null)
  const [errorRows, setErrorRows] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [detectedHeaders, setDetectedHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)

  const handleUpload = async (autoPublish = false) => {
    if (!file) {
      setError('Please choose an Excel (.xlsx/.xls/.csv) or PDF file first.')
      return
    }
    setUploading(true)
    setError('')
    setSuccessMsg('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('year', year)
      form.append('round', round)
      form.append('counsellingType', counsellingType)
      form.append('state', state)
      form.append('autoPublish', autoPublish ? 'true' : 'false')

      const res = await api.post('/admin/datasets/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const loadedDataset = res.data.dataset
      const detectedCols = res.data.detectedHeaders || []
      const detectedMap = loadedDataset?.columnMapping || res.data.columnMapping || {}

      setDataset(loadedDataset)
      setDetectedHeaders(detectedCols)
      setMapping(detectedMap)

      if (autoPublish) {
        setSuccessMsg(`✓ Successfully uploaded and published ${loadedDataset.name}!`)
      }

      await refreshValidation(loadedDataset._id)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const handleSeedSample = async () => {
    setSeeding(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await api.post('/admin/datasets/seed-sample')
      setDataset(res.data.dataset)
      setSuccessMsg('✓ Sample NEET dataset (Chhattisgarh, UP, Bihar, Delhi) has been loaded and published live!')
      await refreshValidation(res.data.dataset._id)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSeeding(false)
    }
  }

  const downloadSampleTemplate = () => {
    const csvContent = [
      'College Name,State,Category,Quota,Course,Round,Year,Opening Rank,Closing Rank,Allotted Rank',
      '"Pt. JNM Memorial Medical College",Chhattisgarh,OBC,State,MBBS,Round 1,2025,21000,36500,34000',
      '"Pt. JNM Memorial Medical College",Chhattisgarh,General,State,MBBS,Round 1,2025,12000,24500,22000',
      '"AIIMS Raipur",Chhattisgarh,OBC,AIQ,MBBS,Round 1,2025,1100,2350,2100',
      '"King George Medical University",Uttar Pradesh,OBC,State,MBBS,Round 1,2025,1800,3800,3600',
      '"Patna Medical College (PMCH)",Bihar,OBC,State,MBBS,Round 1,2025,3800,7500,7100',
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'NEET_Counselling_Cutoff_Template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const refreshValidation = async (id) => {
    const res = await api.get(`/admin/datasets/${id}`)
    setDataset(res.data.dataset)
    if (res.data.detectedHeaders && res.data.detectedHeaders.length > 0) {
      setDetectedHeaders(res.data.detectedHeaders)
    }
    if (res.data.dataset?.columnMapping && Object.keys(res.data.dataset.columnMapping).length > 0) {
      setMapping(res.data.dataset.columnMapping)
    }
    setErrorRows(res.data.errorRows || [])
    setPreviewRows(res.data.previewRows || [])
  }

  const saveMapping = async () => {
    setError('')
    try {
      const res = await api.put(`/admin/datasets/${dataset._id}/mapping`, { mapping })
      setDataset(res.data.dataset)
      if (res.data.dataset?.columnMapping) {
        setMapping(res.data.dataset.columnMapping)
      }
      await refreshValidation(dataset._id)
      setSuccessMsg('✓ Column mapping updated and rows re-validated.')
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const doImport = async () => {
    setImporting(true)
    setError('')
    try {
      const res = await api.post(`/admin/datasets/${dataset._id}/import`)
      setDataset(res.data.dataset)
      await refreshValidation(dataset._id)
      setSuccessMsg('✓ Dataset successfully imported into cutoffs!')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setImporting(false)
    }
  }

  const doPublish = async () => {
    setError('')
    try {
      const res = await api.post(`/admin/datasets/${dataset._id}/publish`)
      setDataset(res.data.dataset)
      setSuccessMsg('✓ Dataset is now published and active in the Predictor!')
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f8fafc]">
      <AdminSidebar />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Upload Counselling Dataset</h1>
            <p className="text-xs text-slate-500">
              Upload PDF or Excel files with NEET counselling cutoffs. Data is automatically normalized and published.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadSampleTemplate}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <Download size={14} />
              Download Excel Template
            </button>

            <button
              onClick={handleSeedSample}
              disabled={seeding}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
            >
              <Sparkles size={14} />
              {seeding ? 'Loading Sample...' : '🚀 Load Sample NEET Data (1-Click)'}
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={18} className="text-emerald-600" />
            {successMsg}
          </div>
        )}

        {!dataset && (
          <div className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Select or Drop Dataset File
              </label>
              <UploadBox file={file} onFileSelected={setFile} />
            </div>

            {/* Collapsible Advanced / Fallback Settings */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between text-xs font-semibold text-slate-600"
              >
                <span>Fallback Dataset Details (Auto-detected from file if present)</span>
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAdvanced && (
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200/60 pt-3">
                  <label className="text-xs text-slate-500">
                    Default Year
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Default Round
                    <input
                      value={round}
                      onChange={(e) => setRound(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Default Quota
                    <select
                      value={counsellingType}
                      onChange={(e) => setCounsellingType(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    >
                      <option value="AIQ">AIQ</option>
                      <option value="State">State</option>
                    </select>
                  </label>
                  <label className="text-xs text-slate-500">
                    Default State
                    <input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleUpload(true)}
                disabled={uploading || !file}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 transition"
              >
                <Zap size={16} />
                {uploading ? 'Processing & Publishing...' : '⚡ 1-Click Upload & Publish'}
              </button>

              <button
                type="button"
                onClick={() => handleUpload(false)}
                disabled={uploading || !file}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Upload & Review
              </button>
            </div>
          </div>
        )}

        {uploading && <LoadingState label="Reading, validating, and publishing your counselling data..." />}

        {dataset && (
          <div className="max-w-4xl space-y-5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setDataset(null)
                  setFile(null)
                  setSuccessMsg('')
                }}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                ← Upload Another File
              </button>
            </div>

            {dataset.status === 'draft' && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800">Detected Column Mapping</h3>
                <p className="mb-3 text-xs text-slate-400">
                  Verify how your file columns are mapped to canonical NEET cutoff fields:
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {CANONICAL_FIELDS.slice(0, 10).map((field) => (
                    <label key={field} className="text-xs text-slate-500 font-medium">
                      {field}
                      <select
                        value={mapping[field] || ''}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))}
                        className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-800"
                      >
                        <option value="">(not mapped)</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <button
                  onClick={saveMapping}
                  className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Apply & Re-validate Mapping
                </button>
              </div>
            )}

            <ValidationReport
              dataset={dataset}
              errorRows={errorRows}
              previewRows={previewRows}
              onImport={doImport}
              onPublish={doPublish}
              importing={importing}
            />
          </div>
        )}
      </main>
    </div>
  )
}
