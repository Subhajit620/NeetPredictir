import { useEffect, useRef, useState } from 'react'
import ChatMessage from './ChatMessage.jsx'
import AnalyticsCard from './AnalyticsCard.jsx'
import CollegeGrid from '../CollegeCard/CollegeGrid.jsx'
import ComparisonTable from '../Comparison/ComparisonTable.jsx'
import LoadingState from '../Loading/LoadingState.jsx'
import { MessageSquare, Compass, MapPin, Layers, BookOpen, ArrowRight } from 'lucide-react'
import api from '../../services/api'

const DEFAULT_QUICK_RANKS = ['850', '4800', '12000', '25000', '45000', '65000', '120000']
const DEFAULT_CATEGORIES = ['General', 'OBC', 'EWS', 'SC', 'ST']

export default function ChatWindow({ messages, loading, onQuickReply, onCompareToggle, selectedIds }) {
  const bottomRef = useRef(null)
  const [availableStates, setAvailableStates] = useState(['All India', 'Uttar Pradesh', 'Bihar', 'Delhi', 'Haryana', 'Karnataka'])

  useEffect(() => {
    api
      .get('/predict/states')
      .then((res) => {
        if (res.data?.states && res.data.states.length > 0) {
          setAvailableStates(res.data.states)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const getQuickReplies = (askFor) => {
    if (askFor === 'rank') return DEFAULT_QUICK_RANKS
    if (askFor === 'state') return availableStates
    if (askFor === 'category') return DEFAULT_CATEGORIES
    return []
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-3 sm:px-6 py-6 max-w-5xl mx-auto w-full">
      {messages.length === 0 && !loading && (
        <div className="pt-4 sm:pt-8 pb-4 space-y-6">
          {/* Welcome Hero */}
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/20">
              <MessageSquare size={26} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl">
              NEET Counselling Assistant
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Ask any NEET counselling question naturally. Queries are matched directly against verified historical cutoff datasets to provide factual admission insights.
            </p>
          </div>

          {/* Categorized Starter Prompts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-2.5 shadow-2xs hover:border-brand-300 hover:shadow-md transition">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-700">
                <Compass size={16} />
                <span>Rank Viability & Predictor</span>
              </div>
              <div className="space-y-1.5">
                {[
                  'My name is Subhajit, AIR 20000, OBC from WB, want UP colleges',
                  'Show MBBS colleges for AIR 15,000 in Kerala',
                  'What colleges fit AIR 5,666 in Delhi?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onQuickReply(prompt)}
                    className="group flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition cursor-pointer"
                  >
                    <span className="truncate pr-2">{prompt}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 shrink-0 text-brand-600 transition" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-2.5 shadow-2xs hover:border-brand-300 hover:shadow-md transition">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                <MapPin size={16} />
                <span>Inter-State & Quota Comparison</span>
              </div>
              <div className="space-y-1.5">
                {[
                  'Compare cutoffs between UP, Bihar and Jharkhand',
                  'Compare AIQ (15%) vs State Quota (85%) cutoffs',
                  'Which states should I consider with AIR 30,000?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onQuickReply(prompt)}
                    className="group flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer"
                  >
                    <span className="truncate pr-2">{prompt}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 shrink-0 text-indigo-600 transition" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-2.5 shadow-2xs hover:border-brand-300 hover:shadow-md transition">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
                <Layers size={16} />
                <span>Category Relaxation & Trends</span>
              </div>
              <div className="space-y-1.5">
                {[
                  'Compare General vs OBC cutoff difference',
                  'Which colleges became historically easier over the years?',
                  'How did round 1 cutoffs compare to round 2?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onQuickReply(prompt)}
                    className="group flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition cursor-pointer"
                  >
                    <span className="truncate pr-2">{prompt}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 shrink-0 text-purple-600 transition" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-2.5 shadow-2xs hover:border-brand-300 hover:shadow-md transition">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                <BookOpen size={16} />
                <span>MCC Counselling Rules</span>
              </div>
              <div className="space-y-1.5">
                {[
                  'Explain Free Exit and Upgradation rules',
                  'What happens if I do not join in Round 2?',
                  'What documents are required for NEET counselling?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onQuickReply(prompt)}
                    className="group flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                  >
                    <span className="truncate pr-2">{prompt}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 shrink-0 text-emerald-600 transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {messages.map((m, idx) => (
        <div key={idx} className="space-y-3.5">
          <ChatMessage role={m.role} text={m.text} meta={m.meta || { intent: m.intent, total: m.total }} />

          {/* Guided quick reply buttons for Missing Parameters */}
          {m.role === 'assistant' && m.askFor && getQuickReplies(m.askFor)?.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-11">
              {getQuickReplies(m.askFor).map((label) => (
                <button
                  key={label}
                  onClick={() => onQuickReply(label)}
                  className="rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 hover:border-sky-300 transition shadow-2xs cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Analytics / Comparison Cards */}
          {m.role === 'assistant' && (m.comparisonData || m.analyticsData) && (
            <div className="pl-11">
              <AnalyticsCard comparisonData={m.comparisonData} analyticsData={m.analyticsData} />
            </div>
          )}

          {/* College Cards Grid */}
          {m.role === 'assistant' && m.records && m.records.length > 0 && (
            <div className="pl-11 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                <span>Matching Historical Allotments ({m.records.length} shown)</span>
                <span className="text-[11px] text-slate-400">Select checkboxes to compare side-by-side</span>
              </div>
              <CollegeGrid records={m.records} onCompareToggle={onCompareToggle} selectedIds={selectedIds} />
            </div>
          )}

          {/* Comparison Table */}
          {m.role === 'assistant' && m.comparison && m.comparison.length > 0 && (
            <div className="pl-11">
              <ComparisonTable records={m.comparison} />
            </div>
          )}

          {/* Suggested Follow-up chips */}
          {m.role === 'assistant' && m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-11 pt-1">
              {m.suggestedFollowUps.map((chip, chipIdx) => (
                <button
                  key={chipIdx}
                  onClick={() => onQuickReply(chip)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 hover:shadow-2xs transition cursor-pointer"
                >
                  <ArrowRight size={12} className="text-sky-500" />
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {loading && <LoadingState label="Analyzing counselling datasets..." />}
      <div ref={bottomRef} />
    </div>
  )
}

