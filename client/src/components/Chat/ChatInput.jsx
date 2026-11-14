import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Command, ArrowUp, X, Compass, MapPin, Award, Building2, BookOpen } from 'lucide-react'

const QUICK_PROMPT_PILLS = [
  { icon: Compass, label: 'AIR 400 in Kerala', text: 'My name is Subhajit, AIR 400, OBC. Show eligible colleges in Kerala' },
  { icon: MapPin, label: 'Colleges in UP', text: 'Show eligible MBBS colleges in Uttar Pradesh for my rank' },
  { icon: Award, label: 'I am OBC', text: 'I am an OBC candidate. Rerun predictions for me' },
  { icon: Building2, label: 'Only AIQ', text: 'Show only 15% All India Quota (AIQ) options' },
  { icon: BookOpen, label: 'Free Exit Rules', text: 'Explain Free Exit and Round 2 Upgradation rules for MCC NEET counselling' },
]

export default function ChatInput({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
    }
  }, [value])

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const handlePillClick = (pillText) => {
    if (disabled) return
    onSend(pillText)
  }

  return (
    <div className="border-t border-slate-200/80 bg-white/95 p-3 sm:p-4 backdrop-blur-md shadow-lg z-10 space-y-2.5">
      <div className="mx-auto max-w-4xl space-y-2">
        {/* Floating Quick Action Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">Quick Ask:</span>
          {QUICK_PROMPT_PILLS.map((pill, idx) => {
            const Icon = pill.icon
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handlePillClick(pill.text)}
                disabled={disabled}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200/90 bg-slate-50/80 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 transition shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Icon size={11} className="text-brand-600 shrink-0" />
                <span>{pill.label}</span>
              </button>
            )
          })}
        </div>

        {/* Input Box */}
        <div className="relative flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-2 shadow-inner focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Ask any NEET counselling question or enter rank & state...'}
            disabled={disabled}
            className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 leading-relaxed"
          />

          {value && (
            <button
              type="button"
              onClick={() => setValue('')}
              className="mb-1 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
              title="Clear text"
            >
              <X size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={disabled || !value.trim()}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all cursor-pointer ${
              value.trim() && !disabled
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md hover:opacity-90 hover:scale-105 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <ArrowUp size={18} className="stroke-[2.5]" />
          </button>
        </div>

        <div className="flex items-center justify-between px-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1 font-medium">
            <Sparkles size={11} className="text-brand-500" />
            AI extracts Rank, Category, Quota & Domicile with Zero Speculation
          </span>
          <span className="hidden sm:inline-block">Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-600 border border-slate-200">↵ Enter</kbd> to send</span>
        </div>
      </div>
    </div>
  )
}


