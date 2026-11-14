import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentAuth } from '../context/StudentAuthContext'
import Navbar from '../components/Navbar/Navbar'
import StudentAuthModal from '../components/Student/StudentAuthModal'
import CategorySelect from '../components/CategorySelect/CategorySelect'
import CollegeGrid from '../components/CollegeCard/CollegeGrid'
import ComparisonTable from '../components/Comparison/ComparisonTable'
import {
  MessageSquare,
  ClipboardCheck,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Settings,
  TrendingUp,
  Award,
  Layers,
  FileSpreadsheet,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  UserCheck,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react'

const ALL_STATES = [
  'All India', 'Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]

export default function StudentProfile() {
  const navigate = useNavigate()
  const {
    user,
    profileHealth,
    choiceList,
    updateProfile,
    predictProfile,
    addToChoiceList,
    removeFromChoiceList,
    reorderChoiceList,
    openAuthModal,
  } = useStudentAuth()

  const [activeTab, setActiveTab] = useState('predict') // 'predict' | 'choices' | 'edit'
  const [loadingPrediction, setLoadingPrediction] = useState(false)
  const [predictionData, setPredictionData] = useState(null)
  const [predictError, setPredictError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [addingChoiceId, setAddingChoiceId] = useState(null)
  const [batchActionMsg, setBatchActionMsg] = useState('')

  const [selectedForCompare, setSelectedForCompare] = useState([])
  const [isCompareExpanded, setIsCompareExpanded] = useState(false)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    air: '',
    score: '',
    percentile: '',
    category: 'General',
    domicileState: '',
    targetStates: [],
    quota: 'All Quotas',
    course: 'MBBS',
    collegeType: 'All',
    maxFees: '',
    isPwd: false,
    isMinority: false,
    minorityType: '',
  })

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        air: user.air || '',
        score: user.score || '',
        percentile: user.percentile || '',
        category: user.category || 'General',
        domicileState: user.domicileState || '',
        targetStates: user.targetStates || [],
        quota: user.quota || 'All Quotas',
        course: user.course || 'MBBS',
        collegeType: user.collegeType || 'All',
        maxFees: user.maxFees || '',
        isPwd: !!user.isPwd,
        isMinority: !!user.isMinority,
        minorityType: user.minorityType || '',
      })
    }
  }, [user])

  const handleRunProfilePrediction = async () => {
    setPredictError('')
    setLoadingPrediction(true)
    try {
      const data = await predictProfile()
      if (data.success) {
        setPredictionData(data)
        setActiveTab('predict')
      } else {
        setPredictError(data.error || 'Failed to generate profile prediction.')
      }
    } catch (err) {
      setPredictError(err.message || 'Error running profile prediction.')
    } finally {
      setLoadingPrediction(false)
    }
  }

  useEffect(() => {
    if (user?.air && !predictionData && !loadingPrediction) {
      handleRunProfilePrediction()
    }
  }, [user?.air])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setSaveSuccessMsg('')
    try {
      const res = await updateProfile(form)
      if (res.success) {
        setSaveSuccessMsg('Candidate profile updated! Re-running prediction...')
        await handleRunProfilePrediction()
        setTimeout(() => setSaveSuccessMsg(''), 4000)
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const moveChoice = async (index, direction) => {
    const newChoices = [...choiceList]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newChoices.length) return

    const temp = newChoices[index]
    newChoices[index] = newChoices[targetIndex]
    newChoices[targetIndex] = temp

    const orderedIds = newChoices.map((c) => c._id)
    await reorderChoiceList(orderedIds)
  }

  const exportChoiceListCSV = () => {
    if (choiceList.length === 0) return
    const esc = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const headers = ['Preference #', 'College Name', 'State', 'Course', 'Quota', 'Category', 'Closing Rank', 'Notes']
    const rows = choiceList.map((c, idx) => [
      idx + 1,
      esc(c.collegeId?.name || 'Unknown'),
      esc(c.collegeId?.state || ''),
      esc(c.course || 'MBBS'),
      esc(c.quota || 'AIQ'),
      esc(c.category || 'General'),
      c.closingRank ?? c.cutoffId?.closingRank ?? '',
      esc(c.notes || ''),
    ])

    const csvString = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `NEET_MCC_Choice_Preference_List_${user?.name || 'Candidate'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportPredictedCollegesCSV = () => {
    if (!predictionData?.records?.length) return
    const esc = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const headers = [
      'College Name',
      'State',
      'Course',
      'Quota',
      'Category',
      'Admission Tier',
      'Admission Probability',
      'Opening Rank',
      'Closing Rank',
      'Candidate AIR',
      'Safety Margin',
    ]
    const rows = (predictionData.records || []).map((r) => [
      esc(r.collegeName || r.collegeId?.name || 'Unknown'),
      esc(r.state || r.collegeId?.state || ''),
      esc(r.course || 'MBBS'),
      esc(r.quota || 'AIQ'),
      esc(r.category || 'General'),
      esc(r.tier || 'TARGET'),
      esc(`${r.admissionProbability || 75}%`),
      r.openingRank ?? '',
      r.closingRank ?? '',
      user?.air ?? '',
      r.rankMargin ?? '',
    ])

    const csvString = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `NEET_1Click_Prediction_AIR_${user?.air || 'Candidate'}_${user?.category || 'General'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const isInChoiceList = (collegeId, quota, course) => {
    const cid = String(collegeId?._id || collegeId || '')
    return choiceList.some((c) => {
      if (String(c.collegeId?._id || c.collegeId || '') !== cid) return false
      if (quota && c.quota && String(c.quota).toLowerCase() !== String(quota).toLowerCase()) return false
      if (course && c.course && String(c.course).toLowerCase() !== String(course).toLowerCase()) return false
      return true
    })
  }

  const handleAddRecommendedChoice = async (college) => {
    const cid = college.collegeId?._id || college.collegeId
    setAddingChoiceId(cid)
    try {
      await addToChoiceList({
        collegeId: cid,
        cutoffId: college._id || college.cutoffId,
        course: college.course || 'MBBS',
        quota: college.quota || 'AIQ',
        category: college.category || user?.category || 'General',
        round: college.round || 'Round 1',
        openingRank: college.openingRank ?? null,
        closingRank: college.closingRank ?? null,
        fees: college.fees ?? null,
        notes: `${college.tier || 'TARGET'} (${college.admissionProbability || 85}% Probability) - AIR #${user?.air}`,
      })
    } finally {
      setAddingChoiceId(null)
    }
  }

  const handleAddAllRecommended = async () => {
    if (!predictionData?.choiceFillingSheet?.length) return
    setBatchActionMsg('Adding top choices to your preference list...')
    try {
      for (const item of predictionData.choiceFillingSheet.slice(0, 10)) {
        const c = item.college
        const cid = c.collegeId?._id || c.collegeId
        if (!isInChoiceList(cid, c.quota, c.course)) {
          await addToChoiceList({
            collegeId: cid,
            cutoffId: c._id || c.cutoffId,
            course: c.course || 'MBBS',
            quota: c.quota || 'AIQ',
            category: c.category || user?.category || 'General',
            round: c.round || 'Round 1',
            openingRank: c.openingRank ?? null,
            closingRank: c.closingRank ?? null,
            fees: c.fees ?? null,
            notes: `${item.stageLabel} (${item.probability})`,
          })
        }
      }
      setBatchActionMsg('Top choices added to your Choice Filling Sheet!')
      setTimeout(() => setBatchActionMsg(''), 4000)
    } catch (err) {
      setBatchActionMsg('Failed to add choices: ' + err.message)
    }
  }

  const toggleCompare = (record) => {
    const id = record.collegeId?._id || record.collegeId
    setSelectedForCompare((prev) => {
      const exists = prev.find((r) => (r.collegeId?._id || r.collegeId) === id)
      if (exists) return prev.filter((r) => (r.collegeId?._id || r.collegeId) !== id)
      if (prev.length >= 4) return prev
      return [...prev, record]
    })
  }

  const filteredRecords = (predictionData?.records || []).filter((r) => {
    if (tierFilter === 'ALL') return true
    if (tierFilter === 'SAFE') return r.tier === 'SAFE'
    if (tierFilter === 'TARGET') return r.tier === 'TARGET'
    if (tierFilter === 'AMBITIOUS') return r.tier === 'AMBITIOUS'
    if (tierFilter === 'AIQ') return String(r.quota || '').toUpperCase().includes('AIQ') || String(r.quota || '').toUpperCase().includes('ALL INDIA')
    if (tierFilter === 'STATE') return !String(r.quota || '').toUpperCase().includes('AIQ') && !String(r.quota || '').toUpperCase().includes('ALL INDIA')
    return true
  })

  return (
    <div className="min-h-screen bg-sky-shaded flex flex-col font-sans">
      <Navbar />
      <StudentAuthModal />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 space-y-5">
        {/* Glassybar Candidate Header */}
        <section className="glass-bar rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200/80 px-3 py-0.5 text-[11px] font-semibold text-sky-700">
                  <UserCheck size={13} /> Candidate Workspace
                </span>
                {user?.isRegistered ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2 size={12} /> Synced
                  </span>
                ) : (
                  <button
                    onClick={() => openAuthModal('register')}
                    className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <ShieldAlert size={12} /> Guest Session (Save Account)
                  </button>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {user?.name ? user.name : 'Student Counselling Dashboard'}
              </h1>

              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                <div className="glass-pill rounded-xl px-3 py-1 font-medium text-slate-600">
                  AIR: <span className="font-bold text-sky-700">{user?.air ? `#${user.air}` : 'Not Set'}</span>
                </div>
                <div className="glass-pill rounded-xl px-3 py-1 font-medium text-slate-600">
                  Category: <span className="font-semibold text-slate-900">{user?.category || 'General'}</span>
                </div>
                <div className="glass-pill rounded-xl px-3 py-1 font-medium text-slate-600">
                  Domicile: <span className="font-semibold text-slate-900">{user?.domicileState || 'Not Specified'}</span>
                </div>
                <div className="glass-pill rounded-xl px-3 py-1 font-medium text-slate-600">
                  Choice Sheet: <span className="font-bold text-sky-600">{choiceList.length}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 glass-card p-3.5 rounded-xl">
              <div className="space-y-1 sm:min-w-[145px]">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-600">Profile Completeness</span>
                  <span className="font-bold text-sky-600">{profileHealth.score}%</span>
                </div>
                <div className="h-2 w-full bg-sky-50 border border-sky-100 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-full bg-gradient-to-r from-sky-500 to-sky-400"
                    style={{ width: `${profileHealth.score}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <button
                  onClick={handleRunProfilePrediction}
                  disabled={loadingPrediction || !user?.air}
                  className="gradient-btn flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  <ClipboardCheck size={14} className={loadingPrediction ? 'animate-spin' : ''} />
                  {loadingPrediction ? 'Predicting...' : '1-Click Predict'}
                </button>
                <button
                  onClick={() => navigate('/chat')}
                  className="glass-pill flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-sky-700 hover:bg-white transition-colors cursor-pointer"
                >
                  <MessageSquare size={14} className="text-sky-600" />
                  Counselling Chat
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Glassybar Navigation Tabs */}
        <div className="glass-bar flex rounded-xl p-1">
          <button
            onClick={() => setActiveTab('predict')}
            className={`flex items-center justify-center gap-2 flex-1 rounded-lg py-2 text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'predict'
                ? 'nav-link-active'
                : 'text-slate-600 hover:text-sky-700 hover:bg-white/60'
            }`}
          >
            <ClipboardCheck size={14} /> 1-Click Prediction
          </button>
          <button
            onClick={() => setActiveTab('choices')}
            className={`flex items-center justify-center gap-2 flex-1 rounded-lg py-2 text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'choices'
                ? 'nav-link-active'
                : 'text-slate-600 hover:text-sky-700 hover:bg-white/60'
            }`}
          >
            <Bookmark size={14} /> Choice Sheet ({choiceList.length})
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center justify-center gap-2 flex-1 rounded-lg py-2 text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'edit'
                ? 'nav-link-active'
                : 'text-slate-600 hover:text-sky-700 hover:bg-white/60'
            }`}
          >
            <Settings size={14} /> Edit Profile
          </button>
        </div>

        {/* TAB 1: 1-CLICK SMART PREDICTION */}
        {activeTab === 'predict' && (
          <div className="space-y-5">
            {!user?.air && (
              <div className="glass-card rounded-2xl p-6 text-center space-y-3">
                <AlertCircle size={30} className="mx-auto text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">NEET All India Rank (AIR) Required</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Set your NEET AIR in the Edit Profile tab to generate your personalized 1-Click college prediction.
                </p>
                <button
                  onClick={() => setActiveTab('edit')}
                  className="gradient-btn rounded-xl px-5 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Configure Profile Now
                </button>
              </div>
            )}

            {predictError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
                {predictError}
              </div>
            )}

            {predictionData?.success && (
              <>
                {/* 4-Metric Glassy Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="glass-card rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-500">Total Eligible</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{predictionData.summaryStats?.totalFound || 0}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Historical cutoffs matched</p>
                  </div>
                  <div className="glass-card rounded-2xl p-4">
                    <p className="text-xs font-semibold text-emerald-700">Safe Colleges</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{predictionData.summaryStats?.safeCount || 0}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">High rank safety margin</p>
                  </div>
                  <div className="glass-card rounded-2xl p-4">
                    <p className="text-xs font-semibold text-sky-700">Realistic Target</p>
                    <p className="text-2xl font-bold text-sky-700 mt-1">{predictionData.summaryStats?.targetCount || 0}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Core allotment zone</p>
                  </div>
                  <div className="glass-card rounded-2xl p-4">
                    <p className="text-xs font-semibold text-amber-700">Dream / Stretch</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{predictionData.summaryStats?.ambitiousCount || 0}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Round 2 / Mop-up reach</p>
                  </div>
                </div>

                {/* Live Quota & Category Breakdown Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-card rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                          <Layers size={15} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">Quota Seat Availability</h4>
                      </div>
                      {predictionData.candidate?.domicileState && predictionData.candidate?.domicileState !== 'Not Specified' ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {predictionData.candidate?.domicileState} Domicile
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          Domicile Not Set
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                        <p className="text-[11px] text-sky-700 font-semibold">15% All India Quota (AIQ)</p>
                        <p className="text-lg font-bold text-slate-900 mt-0.5">{predictionData.summaryStats?.aiqCount || 0} Records</p>
                      </div>
                      <div className="rounded-xl border border-sky-100 bg-white/80 p-3">
                        <p className="text-[11px] text-slate-600 font-semibold">85% Home State Quota</p>
                        <p className="text-lg font-bold text-slate-900 mt-0.5">
                          {predictionData.summaryStats?.homeStateCount ?? predictionData.summaryStats?.stateCount ?? 0} Records
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-5 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                          <Award size={15} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">Category Cutoff Summary</h4>
                      </div>
                      <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[10px] font-semibold text-sky-700">
                        {predictionData.candidate?.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Matched against <span className="font-semibold text-slate-900">{predictionData.candidate?.canonicalCategory}</span> and Open Merit cutoffs.
                      {predictionData.summaryStats?.avgCategoryAdvantage > 0 && (
                        <> Average cutoff extension vs General Merit: <strong className="text-sky-700">+{Number(predictionData.summaryStats.avgCategoryAdvantage).toLocaleString('en-IN')} ranks</strong>.</>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 bg-sky-50/70 border border-sky-100 px-3 py-2 rounded-xl">
                      <TrendingUp size={14} /> Canonical Category: {predictionData.candidate?.canonicalCategory}
                    </div>
                  </div>
                </div>

                {/* MCC Recommended Choice-Filling Strategy Table */}
                {predictionData.choiceFillingSheet?.length > 0 && (
                  <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-4">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          Recommended Choice-Filling Preference Order
                        </h3>
                        <p className="text-xs text-slate-500">
                          Ordered sequence (Dream &rarr; Target &rarr; Safe Anchor) for MCC &amp; State counselling rounds.
                        </p>
                      </div>

                      <button
                        onClick={handleAddAllRecommended}
                        className="gradient-btn flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer self-start sm:self-auto"
                      >
                        <Plus size={14} /> Add Top 10 to Choice Sheet
                      </button>
                    </div>

                    {batchActionMsg && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 size={15} /> {batchActionMsg}
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-sky-100 bg-sky-50/60 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                            <th className="py-2.5 px-3 rounded-l-lg">Pref #</th>
                            <th className="py-2.5 px-3">Tier</th>
                            <th className="py-2.5 px-3">College &amp; Quota</th>
                            <th className="py-2.5 px-3">Closing Rank</th>
                            <th className="py-2.5 px-3">Probability</th>
                            <th className="py-2.5 px-3 text-right rounded-r-lg">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sky-100/70">
                          {predictionData.choiceFillingSheet.map((item, idx) => {
                            const c = item.college
                            const cid = c.collegeId?._id || c.collegeId
                            const isAdded = isInChoiceList(cid, c.quota, c.course)
                            const isAdding = addingChoiceId === cid

                            return (
                              <tr key={idx} className="hover:bg-sky-50/40 transition-colors">
                                <td className="py-3 px-3 font-semibold text-slate-900">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50 border border-sky-100 text-sky-700 text-[11px] font-bold">
                                    {item.preferenceOrder}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                      item.type === 'SAFE'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : item.type === 'TARGET'
                                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    {item.type}
                                  </span>
                                </td>
                                <td className="py-3 px-3 max-w-[260px]">
                                  <p className="font-semibold text-slate-900 truncate">
                                    {c.collegeName || c.collegeId?.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                    <span>{c.collegeState || c.collegeId?.state}</span>
                                    <span>&bull;</span>
                                    <span className="font-medium text-sky-700">{c.quota}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-700 font-semibold tabular-nums">
                                  #{Number(c.closingRank).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-semibold text-slate-900 text-xs">{item.probability}</span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {isAdded ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-lg">
                                      <CheckCircle2 size={12} /> Added
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleAddRecommendedChoice(c)}
                                      disabled={isAdding}
                                      className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-700 px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      <Plus size={12} /> {isAdding ? 'Adding...' : 'Add'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Eligible College Grid with Filter Bar */}
                <div className="space-y-4">
                  <div className="glass-bar rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        Eligible Medical Colleges for AIR #{user?.air}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Showing {filteredRecords.length} of {predictionData.records?.length || 0} matched records
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'ALL', label: `All (${predictionData.records?.length || 0})` },
                        { id: 'SAFE', label: `Safe (${predictionData.summaryStats?.safeCount || 0})` },
                        { id: 'TARGET', label: `Target (${predictionData.summaryStats?.targetCount || 0})` },
                        { id: 'AMBITIOUS', label: `Dream (${predictionData.summaryStats?.ambitiousCount || 0})` },
                        { id: 'AIQ', label: `AIQ (${predictionData.summaryStats?.aiqCount || 0})` },
                        { id: 'STATE', label: `State (${predictionData.summaryStats?.stateCount || 0})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setTierFilter(tab.id)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                            tierFilter === tab.id
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'bg-white/80 border border-sky-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}

                      <button
                        onClick={exportPredictedCollegesCSV}
                        className="glass-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-white transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet size={13} /> Export CSV
                      </button>
                    </div>
                  </div>

                  <CollegeGrid
                    records={filteredRecords}
                    onToggleCompare={toggleCompare}
                    selectedIds={selectedForCompare.map((r) => r.collegeId?._id || r.collegeId)}
                    showWhyShown={true}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: CHOICE FILLING SHEET */}
        {activeTab === 'choices' && (
          <div className="space-y-4">
            <div className="glass-bar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">My Counselling Choice Filling Sheet</h3>
                <p className="text-xs text-slate-500">
                  Prioritize your college preferences for MCC All India &amp; State Counselling rounds.
                </p>
              </div>
              <button
                onClick={exportChoiceListCSV}
                disabled={choiceList.length === 0}
                className="gradient-btn flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer self-start sm:self-auto"
              >
                <FileSpreadsheet size={14} /> Download Preference Sheet (CSV)
              </button>
            </div>

            {choiceList.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center space-y-3">
                <Bookmark size={32} className="mx-auto text-sky-300" />
                <h4 className="text-sm font-bold text-slate-800">Your choice list is empty</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Browse predicted colleges and click the bookmark button to build your choice sheet.
                </p>
                <button
                  onClick={() => setActiveTab('predict')}
                  className="gradient-btn rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Find Eligible Colleges
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {choiceList.map((item, idx) => (
                  <div
                    key={item._id || idx}
                    className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200/70">
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          {item.collegeId?.name || 'Medical College'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>{item.collegeId?.state || ''}</span>
                          <span>&bull;</span>
                          <span>{item.course || 'MBBS'}</span>
                          <span>&bull;</span>
                          <span className="font-semibold text-sky-700">{item.quota || 'AIQ'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <div className="flex items-center border border-sky-100 rounded-xl overflow-hidden bg-white/80">
                        <button
                          onClick={() => moveChoice(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 disabled:opacity-30 transition cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={() => moveChoice(idx, 'down')}
                          disabled={idx === choiceList.length - 1}
                          className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 disabled:opacity-30 transition cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromChoiceList(item._id)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Remove from Choice List"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EDIT CANDIDATE PROFILE */}
        {activeTab === 'edit' && (
          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Candidate Profile &amp; Counselling Preferences</h3>
              <p className="text-xs text-slate-500">
                Updating your profile calibrates all predictions, state quotas, and counselling chat responses.
              </p>
            </div>

            {saveSuccessMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} /> {saveSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-sky-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NEET AIR (All India Rank) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.air}
                    onChange={(e) => setForm({ ...form, air: e.target.value })}
                    required
                    placeholder="e.g. 12500"
                    className="w-full rounded-xl border border-sky-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NEET Score (0-720)</label>
                  <input
                    type="number"
                    value={form.score}
                    onChange={(e) => setForm({ ...form, score: e.target.value })}
                    placeholder="e.g. 640"
                    className="w-full rounded-xl border border-sky-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reservation Category</label>
                  <CategorySelect
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Domicile State (85% State Quota)
                  </label>
                  <select
                    value={form.domicileState}
                    onChange={(e) => setForm({ ...form, domicileState: e.target.value })}
                    className="w-full rounded-xl border border-sky-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="">Select Domicile State</option>
                    {ALL_STATES.filter((s) => s !== 'All India').map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quota Preference</label>
                  <select
                    value={form.quota}
                    onChange={(e) => setForm({ ...form, quota: e.target.value })}
                    className="w-full rounded-xl border border-sky-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="All Quotas">All Quotas (AIQ + State)</option>
                    <option value="AIQ">All India Quota (AIQ) Only</option>
                    <option value="State Quota">State Quota (Home State) Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Type</label>
                  <select
                    value={form.collegeType}
                    onChange={(e) => setForm({ ...form, collegeType: e.target.value })}
                    className="w-full rounded-xl border border-sky-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="All">All Types (Govt / Private / Deemed)</option>
                    <option value="Government">Government Colleges Only</option>
                    <option value="Private">Private / Trust Colleges</option>
                    <option value="Deemed">Deemed Universities</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Annual Budget / Fees (₹)</label>
                  <input
                    type="number"
                    value={form.maxFees}
                    onChange={(e) => setForm({ ...form, maxFees: e.target.value })}
                    placeholder="Leave blank for no limit"
                    className="w-full rounded-xl border border-sky-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sky-100">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="gradient-btn rounded-xl px-6 py-2.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? 'Saving Changes...' : 'Save & Update Profile'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Glassy Floating Comparison Bar */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-5 left-4 right-4 z-40 max-w-4xl mx-auto glass-bar rounded-2xl p-4 animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-white font-bold text-xs">
                {selectedForCompare.length}
              </span>
              <span className="text-xs font-bold text-slate-900">
                Colleges Selected for Side-by-Side Comparison
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCompareExpanded(!isCompareExpanded)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 cursor-pointer"
              >
                {isCompareExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                {isCompareExpanded ? 'Collapse' : 'Expand'}
              </button>
              <button
                onClick={() => setSelectedForCompare([])}
                className="rounded-lg p-1 text-slate-400 hover:bg-sky-50 hover:text-slate-700 cursor-pointer"
                title="Clear selected"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {isCompareExpanded ? (
            <div className="max-h-72 overflow-y-auto">
              <ComparisonTable records={selectedForCompare} />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5 text-xs">
                {selectedForCompare.map((r, i) => (
                  <span key={i} className="rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800 border border-sky-200/70">
                    {r.collegeName}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setIsCompareExpanded(true)}
                className="gradient-btn rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                Compare ({selectedForCompare.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
