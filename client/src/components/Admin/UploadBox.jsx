import { useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, FileText, CheckCircle, X } from 'lucide-react'

export default function UploadBox({ file, onFileSelected }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) onFileSelected(dropped)
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition duration-200 ${
        dragOver
          ? 'border-brand-600 bg-brand-50/70 scale-[1.01]'
          : file
            ? 'border-emerald-300 bg-emerald-50/30'
            : 'border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-white'
      }`}
      onClick={(e) => {
        // Prevent opening dialog if clicking clear button
        if (e.target.closest('.clear-btn')) return
        inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
      />

      {file ? (
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
            {file.name.endsWith('.pdf') ? <FileText size={28} /> : <FileSpreadsheet size={28} />}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{file.name}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
              {formatFileSize(file.size)}
            </span>
          </div>

          <p className="mt-1 text-xs text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle size={13} />
            File ready for 1-click parsing & publishing
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onFileSelected(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="clear-btn mt-3 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-rose-600 shadow-2xs"
          >
            <X size={13} />
            Remove / Change File
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs group-hover:scale-110 transition duration-200">
            <UploadCloud size={30} className="stroke-[2.2]" />
          </div>

          <h4 className="mt-3 text-sm font-bold text-slate-800">
            Click to choose Excel/CSV/PDF or drag & drop here
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Supports <strong className="text-slate-700">.xlsx, .xls, .csv, .pdf</strong> (Counselling Cutoff / Allotment Lists)
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            <span>Standard columns:</span>
            <span className="text-indigo-600 font-bold">College, State, Category, Quota, Ranks</span>
          </div>
        </div>
      )}
    </div>
  )
}

