import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AdminSidebar from '../../components/Admin/AdminSidebar.jsx'
import ValidationReport from '../../components/Admin/ValidationReport.jsx'
import LoadingState from '../../components/Loading/LoadingState.jsx'
import ErrorMessage from '../../components/Loading/ErrorMessage.jsx'
import api, { apiErrorMessage } from '../../services/api'

export default function DatasetDetails() {
  const { id } = useParams()
  const [dataset, setDataset] = useState(null)
  const [errorRows, setErrorRows] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [error, setError] = useState('')

  const load = () => {
    api
      .get(`/admin/datasets/${id}`)
      .then((res) => {
        setDataset(res.data.dataset)
        setErrorRows(res.data.errorRows)
        setPreviewRows(res.data.previewRows)
      })
      .catch((err) => setError(apiErrorMessage(err)))
  }

  useEffect(load, [id])

  const doImport = async () => {
    try {
      await api.post(`/admin/datasets/${id}/import`)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const doPublish = async () => {
    try {
      await api.post(`/admin/datasets/${id}/publish`)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f8fafc]">
      <AdminSidebar />
      <main className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {error && <ErrorMessage message={error} />}
        {!dataset && !error && <LoadingState />}
        {dataset && (
          <div className="max-w-3xl space-y-4">
            <h1 className="text-lg font-semibold text-slate-800">{dataset.name}</h1>
            <ValidationReport
              dataset={dataset}
              errorRows={errorRows}
              previewRows={previewRows}
              onImport={doImport}
              onPublish={doPublish}
            />
          </div>
        )}
      </main>
    </div>
  )
}
