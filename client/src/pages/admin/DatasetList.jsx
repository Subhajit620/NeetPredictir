import { useEffect, useState } from 'react'
import AdminSidebar from '../../components/Admin/AdminSidebar.jsx'
import DatasetTable from '../../components/Admin/DatasetTable.jsx'
import LoadingState from '../../components/Loading/LoadingState.jsx'
import ErrorMessage from '../../components/Loading/ErrorMessage.jsx'
import EmptyState from '../../components/Loading/EmptyState.jsx'
import api, { apiErrorMessage } from '../../services/api'

export default function DatasetList() {
  const [datasets, setDatasets] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    api
      .get('/admin/datasets')
      .then((res) => setDatasets(res.data.datasets))
      .catch((err) => setError(apiErrorMessage(err)))
  }

  useEffect(load, [])

  const publish = async (id) => {
    try {
      await api.post(`/admin/datasets/${id}/publish`)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const archive = async (id) => {
    try {
      await api.post(`/admin/datasets/${id}/archive`)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const remove = async (dataset) => {
    const confirmPublished = dataset.status === 'published'
    if (!window.confirm(`Delete "${dataset.name}"?${confirmPublished ? ' This dataset is published — its cutoff records will be removed too.' : ''}`)) return
    try {
      await api.delete(`/admin/datasets/${dataset._id}`, { params: confirmPublished ? { confirm: true } : {} })
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f8fafc]">
      <AdminSidebar />
      <main className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <div className="border-b border-slate-200/80 pb-4">
          <p className="text-xs font-medium text-slate-500">Admin Console / Datasets</p>
          <h1 className="mt-0.5 text-xl font-semibold text-slate-900 tracking-tight">Uploaded Datasets</h1>
        </div>
        {error && <ErrorMessage message={error} />}
        {!datasets && !error && <LoadingState />}
        {datasets && datasets.length === 0 && <EmptyState title="No datasets uploaded yet" description="Upload a counselling dataset to get started." />}
        {datasets && datasets.length > 0 && <DatasetTable datasets={datasets} onPublish={publish} onArchive={archive} onDelete={remove} />}
      </main>
    </div>
  )
}
