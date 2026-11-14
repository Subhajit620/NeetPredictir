import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Trash2,
  Sparkles,
  User,
  MapPin,
  Award,
  Layers,
  BookOpen,
  X,
  Maximize2,
  Minimize2,
  Share2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Compass,
  Building2,
  Scale,
  RefreshCw,
  HelpCircle
} from 'lucide-react'
import Navbar from '../components/Navbar/Navbar.jsx'
import { useStudentAuth } from '../context/StudentAuthContext.jsx'
import ChatWindow from '../components/Chat/ChatWindow.jsx'
import ChatInput from '../components/Chat/ChatInput.jsx'
import ComparisonTable from '../components/Comparison/ComparisonTable.jsx'
import ErrorMessage from '../components/Loading/ErrorMessage.jsx'
import api, { apiErrorMessage } from '../services/api'

export default function Chat() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sessionId, setSessionId] = useState(null)
  const sessionIdRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [sessions, setSessions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState([])
  const [isCompareExpanded, setIsCompareExpanded] = useState(false)
  const [sessionProfile, setSessionProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [copiedTranscript, setCopiedTranscript] = useState(false)

  // Profile Modal State
  const [profileForm, setProfileForm] = useState({
    name: '',
    air: '',
    category: 'General',
    domicileState: '',
    targetState: 'All India',
    quota: 'All Quotas',
  })

  const initialSentRef = useRef(false)

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const loadHistory = useCallback(() => {
    api
      .get('/chat/history')
      .then((res) => setSessions(res.data.sessions || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const { user } = useStudentAuth()

  // Sync profileForm with sessionProfile or fallback to user profile
  useEffect(() => {
    if (sessionProfile) {
      setProfileForm((prev) => ({
        name: sessionProfile.name || sessionProfile.studentName || prev.name,
        air: sessionProfile.air || sessionProfile.rank || prev.air,
        category: sessionProfile.category || prev.category,
        domicileState: sessionProfile.domicileState || prev.domicileState,
        targetState: sessionProfile.targetState || sessionProfile.state || prev.targetState,
        quota: sessionProfile.quota || prev.quota,
      }))
    } else if (user) {
      setProfileForm((prev) => ({
        name: user.name || prev.name,
        air: user.air || prev.air,
        category: user.category || prev.category,
        domicileState: user.domicileState || prev.domicileState,
        targetState: user.targetStates?.[0] || prev.targetState,
        quota: user.quota && user.quota !== 'All Quotas' ? user.quota : prev.quota,
      }))
    }
  }, [sessionProfile, user])

  const send = useCallback(
    async (text) => {
      setError('')
      setMessages((prev) => [...prev, { role: 'user', text }])
      setLoading(true)
      try {
        const currentSessionId = sessionIdRef.current || sessionId
        const res = await api.post('/chat', { sessionId: currentSessionId, message: text })
        sessionIdRef.current = res.data.sessionId
        setSessionId(res.data.sessionId)
        if (res.data.session?.context) {
          setSessionProfile(res.data.session.context)
        }
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: res.data.reply,
            askFor: res.data.askFor,
            records: res.data.records,
            total: res.data.total,
            comparisonData: res.data.comparisonData,
            analyticsData: res.data.analyticsData,
            suggestedFollowUps: res.data.suggestedFollowUps,
            meta: {
              intent: res.data.meta?.intent || res.data.intent,
              total: res.data.total,
            },
          },
        ])
        loadHistory()
      } catch (err) {
        setError(apiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [sessionId, loadHistory]
  )

  useEffect(() => {
    const initialMessage = location.state?.initialMessage
    if (initialMessage && !initialSentRef.current) {
      initialSentRef.current = true
      send(initialMessage)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, send])

  const startNewChat = () => {
    sessionIdRef.current = null
    setSessionId(null)
    setMessages([])
    setSelected([])
    setSessionProfile(null)
    setError('')
  }

  const openSession = async (id) => {
    setLoading(true)
    try {
      const res = await api.get(`/chat/${id}`)
      sessionIdRef.current = res.data.session._id
      setSessionId(res.data.session._id)
      setSessionProfile(res.data.session.context || null)
      setMessages(
        res.data.messages.map((m) => ({
          role: m.role,
          text: m.text,
          records: m.meta?.records || [],
          comparisonData: m.meta?.comparisonData || null,
          analyticsData: m.meta?.analyticsData || null,
          suggestedFollowUps: m.meta?.suggestedFollowUps || [],
          meta: m.meta || {},
        }))
      )
      setSelected([])
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const deleteSession = async (id, e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    try {
      await api.delete(`/chat/${id}`)
      setSessions((prev) => prev.filter((s) => String(s._id) !== String(id)))
      if (String(sessionId) === String(id) || String(sessionIdRef.current) === String(id)) {
        startNewChat()
      }
    } catch (err) {
      setError(apiErrorMessage(err) || 'Failed to delete conversation')
    }
  }

  const toggleCompare = (record) => {
    const id = record.collegeId?._id || record.collegeId
    setSelected((prev) => {
      const exists = prev.find((r) => (r.collegeId?._id || r.collegeId) === id)
      if (exists) return prev.filter((r) => (r.collegeId?._id || r.collegeId) !== id)
      if (prev.length >= 4) return prev
      return [...prev, record]
    })
  }

  const handleProfileFormSubmit = (e) => {
    e.preventDefault()
    setIsProfileModalOpen(false)
    let promptParts = []
    if (profileForm.name) promptParts.push(`My name is ${profileForm.name}`)
    if (profileForm.air) promptParts.push(`my AIR is ${profileForm.air}`)
    if (profileForm.category) promptParts.push(`category is ${profileForm.category}`)
    if (profileForm.domicileState) promptParts.push(`from ${profileForm.domicileState}`)
    if (profileForm.targetState && profileForm.targetState !== 'All India') promptParts.push(`interested in ${profileForm.targetState} colleges`)
    if (profileForm.quota && profileForm.quota !== 'All Quotas') promptParts.push(`quota ${profileForm.quota}`)

    const generatedPrompt = promptParts.join(', ') + '. Show eligible colleges for me.'
    send(generatedPrompt)
  }

  const copyTranscript = () => {
    if (messages.length === 0) return
    const text = messages.map((m) => `${m.role === 'user' ? 'Candidate' : 'NEET Assistant'}:\n${m.text}\n`).join('\n---\n\n')
    navigator.clipboard.writeText(text)
    setCopiedTranscript(true)
    setTimeout(() => setCopiedTranscript(false), 2000)
  }

  const filteredSessions = sessions.filter((s) =>
    (s.title || 'New Chat').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeAir = sessionProfile?.air || sessionProfile?.rank
  const activeCategory = sessionProfile?.category
  const activeState = sessionProfile?.targetState || sessionProfile?.state || (sessionProfile?.targetStates?.[0])
  const activeDomicile = sessionProfile?.domicileState
  const activeQuota = sessionProfile?.quota
  const activeCourse = sessionProfile?.course || 'MBBS'

  return (
    <div className="flex h-screen flex-col bg-slate-950/2 text-slate-900 font-sans">
      <Navbar onNewChat={startNewChat} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Premium Collapsible Sidebar */}
        <aside
          className={`shrink-0 flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 shadow-sm z-10 ${
            sidebarOpen ? 'w-72 md:w-80' : 'w-0 overflow-hidden border-none'
          }`}
        >
          <div className="p-3.5 space-y-3 flex-1 flex flex-col overflow-hidden">
            {/* New Chat Button */}
            <button
              onClick={startNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-brand-500/20 hover:opacity-95 hover:scale-[1.01] active:scale-95 transition cursor-pointer"
            >
              <Plus size={16} className="stroke-[3]" />
              New Counselling Chat
            </button>

            {/* Candidate Profile Quick Capsule */}
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <User size={12} className="text-brand-600" />
                  Candidate Profile
                </span>
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="font-bold text-brand-600 hover:text-brand-800 text-[10px] flex items-center gap-0.5 cursor-pointer underline decoration-brand-300 underline-offset-2"
                >
                  <SlidersHorizontal size={10} />
                  {activeAir ? 'Edit Details' : 'Set Profile'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="rounded-lg bg-white/90 p-1.5 border border-slate-100/90 shadow-2xs">
                  <span className="text-slate-400 block font-medium">NEET Rank</span>
                  <strong className="text-slate-800 font-bold text-[11px] truncate block">
                    {activeAir ? `AIR ${activeAir.toLocaleString('en-IN')}` : 'Not set'}
                  </strong>
                </div>
                <div className="rounded-lg bg-white/90 p-1.5 border border-slate-100/90 shadow-2xs">
                  <span className="text-slate-400 block font-medium">Category</span>
                  <strong className="text-slate-800 font-bold text-[11px] truncate block">
                    {activeCategory || 'General'}
                  </strong>
                </div>
                <div className="rounded-lg bg-white/90 p-1.5 border border-slate-100/90 shadow-2xs">
                  <span className="text-slate-400 block font-medium">Target State</span>
                  <strong className="text-slate-800 font-bold text-[11px] truncate block">
                    {activeState || 'All India'}
                  </strong>
                </div>
                <div className="rounded-lg bg-white/90 p-1.5 border border-slate-100/90 shadow-2xs">
                  <span className="text-slate-400 block font-medium">Quota</span>
                  <strong className="text-slate-800 font-bold text-[11px] truncate block">
                    {activeQuota || 'AIQ & State'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Tool Navigation Hub */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block">Quick Tools</span>
              <div className="grid grid-cols-2 gap-1.5">
                <Link
                  to="/"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50/60 p-2 text-[11px] font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition"
                >
                  <Compass size={13} className="text-brand-600 shrink-0" />
                  <span className="truncate">Predictor</span>
                </Link>
                <Link
                  to="/cutoffs"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50/60 p-2 text-[11px] font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition"
                >
                  <Layers size={13} className="text-indigo-600 shrink-0" />
                  <span className="truncate">Cutoffs</span>
                </Link>
                <Link
                  to="/compare"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50/60 p-2 text-[11px] font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition"
                >
                  <Scale size={13} className="text-purple-600 shrink-0" />
                  <span className="truncate">Compare</span>
                </Link>
                <button
                  onClick={() => send('Explain Free Exit, Upgradation, and Round 2 Security Deposit forfeiture rules in detail')}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50/60 p-2 text-[11px] font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition text-left cursor-pointer"
                >
                  <BookOpen size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate">MCC Rules</span>
                </button>
              </div>
            </div>

            {/* Search Chat Sessions */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search history..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none transition shadow-inner"
              />
            </div>

            {/* Conversation List */}
            <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-1">
              <span>Past Chats</span>
              <span>{filteredSessions.length}</span>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
              {filteredSessions.map((s) => (
                <div
                  key={s._id}
                  onClick={() => openSession(s._id)}
                  className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition cursor-pointer border ${
                    s._id === sessionId
                      ? 'bg-brand-50/80 text-brand-800 font-bold border-brand-200 shadow-2xs'
                      : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 hover:border-slate-200/60'
                  }`}
                >
                  <span className="truncate pr-2">{s.title || 'New Counselling Chat'}</span>
                  <button
                    onClick={(e) => deleteSession(s._id, e)}
                    className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete Chat"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {filteredSessions.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-slate-400">No past conversations</p>
              )}
            </div>
          </div>
        </aside>

        {/* Sidebar Toggle Tab Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-8 w-5 items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-slate-500 shadow-sm hover:text-brand-600 hover:bg-slate-50 transition cursor-pointer"
          title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Main Chat Workspace */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-50/40">
          {/* Top Live Context Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white/90 px-4 py-2 text-xs backdrop-blur-md shadow-2xs z-10">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Verified 2026 Round 1 Counselling Dataset
              </span>

              {activeAir && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 border border-brand-200/80 shadow-2xs">
                  AIR: {activeAir.toLocaleString('en-IN')}
                </span>
              )}
              {activeCategory && (
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200/80 shadow-2xs">
                  Category: {activeCategory}
                </span>
              )}
              {activeState && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/80 shadow-2xs">
                  State: {activeState}
                </span>
              )}
              {activeDomicile && (
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200/80 shadow-2xs">
                  Domicile: {activeDomicile}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              >
                <SlidersHorizontal size={11} className="text-brand-600" />
                <span>Candidate Filter</span>
              </button>

              {messages.length > 0 && (
                <button
                  onClick={copyTranscript}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                  title="Copy full transcript"
                >
                  {copiedTranscript ? (
                    <>
                      <Check size={11} className="text-emerald-600 stroke-[3]" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Export Transcript</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={startNewChat}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-rose-600 hover:border-rose-200 transition shadow-2xs cursor-pointer"
              >
                <RefreshCw size={11} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Chat Messages and Visual Cards */}
          <ChatWindow
            messages={messages}
            loading={loading}
            onQuickReply={send}
            onCompareToggle={toggleCompare}
            selectedIds={selected.map((r) => r.collegeId?._id || r.collegeId)}
          />

          {/* Floating Comparison Dock */}
          {selected.length >= 2 && (
            <div className="absolute bottom-28 left-4 right-4 z-20 max-w-4xl mx-auto rounded-2xl border border-brand-300 bg-white/95 p-4 shadow-2xl ring-1 ring-brand-500/20 backdrop-blur-md animate-fade-in-up">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white font-extrabold text-xs">
                    {selected.length}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    Colleges Selected for Side-by-Side Comparison Matrix
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCompareExpanded(!isCompareExpanded)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    {isCompareExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    {isCompareExpanded ? 'Collapse' : 'Expand Matrix'}
                  </button>
                  <button
                    onClick={() => setSelected([])}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                    title="Clear selected"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {isCompareExpanded ? (
                <div className="max-h-72 overflow-y-auto">
                  <ComparisonTable records={selected} />
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700">
                    {selected.map((r, i) => (
                      <span key={i} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-800 border border-slate-200/70">
                        {r.collegeName}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsCompareExpanded(true)}
                    className="rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-brand-700 transition cursor-pointer"
                  >
                    View Full Matrix ({selected.length})
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="px-4 pb-2">
              <ErrorMessage message={error} />
            </div>
          )}

          {/* Chat Input */}
          <ChatInput onSend={send} disabled={loading} placeholder="Ask any question about NEET cutoffs, colleges, or counselling..." />
        </div>
      </div>

      {/* Profile Setup / Edit Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-fade-in-up">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/60">
                  <SlidersHorizontal size={16} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Configure Candidate Profile</h3>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProfileFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Candidate Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="e.g. Subhajit Saha"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NEET AIR (All India Rank)</label>
                  <input
                    type="number"
                    value={profileForm.air}
                    onChange={(e) => setProfileForm({ ...profileForm, air: e.target.value })}
                    placeholder="e.g. 400"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={profileForm.category}
                    onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    <option value="General">General / UR</option>
                    <option value="OBC">OBC</option>
                    <option value="OBC-NCL">OBC-NCL</option>
                    <option value="EWS">EWS</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="PwD">PwD</option>
                    <option value="EZ">EZ (Ezhava - Kerala)</option>
                    <option value="MU">MU (Muslim - Kerala)</option>
                    <option value="BH">BH (Backward Hindu)</option>
                    <option value="LA">LA (Latin Catholic)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Domicile State</label>
                  <input
                    type="text"
                    value={profileForm.domicileState}
                    onChange={(e) => setProfileForm({ ...profileForm, domicileState: e.target.value })}
                    placeholder="e.g. West Bengal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target State</label>
                  <input
                    type="text"
                    value={profileForm.targetState}
                    onChange={(e) => setProfileForm({ ...profileForm, targetState: e.target.value })}
                    placeholder="e.g. Kerala / Uttar Pradesh"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Counselling Quota</label>
                <select
                  value={profileForm.quota}
                  onChange={(e) => setProfileForm({ ...profileForm, quota: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none cursor-pointer"
                >
                  <option value="All Quotas">All Quotas (AIQ 15% + State 85%)</option>
                  <option value="AIQ">All India Quota (15%)</option>
                  <option value="State">State Quota (85%)</option>
                  <option value="Management">Management / NRI</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-2 font-extrabold text-white shadow-md hover:opacity-95 cursor-pointer"
                >
                  Apply & Predict
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


