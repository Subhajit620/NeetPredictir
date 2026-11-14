import React, { useState } from 'react'
import { Stethoscope, User, Copy, Check, ChevronDown, ChevronUp, Cpu, AlertTriangle, ShieldCheck, Info, Compass, CheckCircle2, XCircle } from 'lucide-react'

/**
 * Lightweight formatting helper for markdown elements (bold, italic, headers, bullets, numbers, code, alerts).
 */
function renderFormattedText(text) {
  if (!text) return ''

  const lines = text.split('\n')
  const elements = []
  let listItems = []

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="my-2.5 list-disc space-y-1 pl-5 text-slate-700">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">{parseInline(item)}</li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  const parseInline = (str) => {
    const parts = []
    const boldRegex = /\*\*(.*?)\*\*/g
    let match
    let lastIdx = 0

    while ((match = boldRegex.exec(str)) !== null) {
      if (match.index > lastIdx) {
        parts.push(str.substring(lastIdx, match.index))
      }
      const boldText = match[1]

      // Format eligibility statuses with colored badges
      if (/historically within closing|within historical range|better than opening|eligible/i.test(boldText)) {
        parts.push(
          <span key={match.index} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800 border border-emerald-200/90 shadow-2xs">
            <CheckCircle2 size={11} className="text-emerald-600" />
            {boldText}
          </span>
        )
      } else if (/near historical closing|borderline/i.test(boldText)) {
        parts.push(
          <span key={match.index} className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-extrabold text-amber-900 border border-amber-200/90 shadow-2xs">
            <AlertTriangle size={11} className="text-amber-600" />
            {boldText}
          </span>
        )
      } else if (/outside historical closing|not eligible|beyond historical closing/i.test(boldText)) {
        parts.push(
          <span key={match.index} className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-800 border border-rose-200/90 shadow-2xs">
            <XCircle size={11} className="text-rose-600" />
            {boldText}
          </span>
        )
      } else {
        parts.push(
          <strong key={match.index} className="font-semibold text-slate-900">
            {boldText}
          </strong>
        )
      }
      lastIdx = match.index + match[0].length
    }

    if (lastIdx < str.length) {
      parts.push(str.substring(lastIdx))
    }

    return parts.length > 0 ? parts : str
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    // Callout Box: Rank Disambiguation Warning
    if (trimmed.startsWith('⚠️ **Rank Disambiguation') || trimmed.startsWith('⚠️')) {
      flushList(idx)
      elements.push(
        <div key={idx} className="my-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 flex items-start gap-2 shadow-2xs">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{parseInline(trimmed)}</div>
        </div>
      )
      return
    }

    // Callout Box: Domicile / Quota Info
    if (trimmed.startsWith('🏛️ **State Quota') || trimmed.startsWith('🏛️')) {
      flushList(idx)
      elements.push(
        <div key={idx} className="my-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-950 flex items-start gap-2 shadow-2xs">
          <ShieldCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{parseInline(trimmed)}</div>
        </div>
      )
      return
    }

    // Callout Box: Dataset Coverage Notice
    if (trimmed.startsWith('📌 **Dataset Coverage') || trimmed.startsWith('📌')) {
      flushList(idx)
      elements.push(
        <div key={idx} className="my-2.5 rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs text-purple-950 flex items-start gap-2 shadow-2xs">
          <Info size={16} className="text-purple-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{parseInline(trimmed)}</div>
        </div>
      )
      return
    }

    // Callout Box: Broader View
    if (trimmed.startsWith('🌐 **Broader View') || trimmed.startsWith('🌐')) {
      flushList(idx)
      elements.push(
        <div key={idx} className="my-2.5 rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-950 flex items-start gap-2 shadow-2xs">
          <Compass size={16} className="text-teal-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{parseInline(trimmed)}</div>
        </div>
      )
      return
    }

    // Header 4
    if (trimmed.startsWith('#### ')) {
      flushList(idx)
      elements.push(
        <h5 key={idx} className="mt-3 mb-1 text-xs font-bold uppercase tracking-wider text-brand-700">
          {parseInline(trimmed.substring(5))}
        </h5>
      )
      return
    }

    // Header 3 (including Active Filters)
    if (trimmed.startsWith('### ')) {
      flushList(idx)
      const title = trimmed.substring(4)
      const isActiveFilters = title.includes('Active Counselling Filters')
      elements.push(
        <h4 key={idx} className={`mt-3.5 mb-1.5 text-sm font-bold flex items-center gap-1.5 ${isActiveFilters ? 'text-brand-800' : 'text-slate-900'}`}>
          {parseInline(title)}
        </h4>
      )
      return
    }

    // Header 2
    if (trimmed.startsWith('## ')) {
      flushList(idx)
      elements.push(
        <h3 key={idx} className="mt-4 mb-2 text-base font-bold text-slate-900 border-b border-slate-100 pb-1">
          {parseInline(trimmed.substring(3))}
        </h3>
      )
      return
    }

    // Bullet points (• or - or *)
    if (/^[•\-*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[•\-*]\s+/, ''))
      return
    }

    // Numbered list items (1. 2.)
    if (/^\d+\.\s+/.test(trimmed)) {
      flushList(idx)
      const content = trimmed.replace(/^\d+\.\s+/, '')
      const num = trimmed.match(/^(\d+)\./)[1]
      elements.push(
        <div key={idx} className="my-1.5 flex items-start gap-2 pl-1">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700 mt-0.5 border border-brand-200/60">
            {num}
          </span>
          <span className="text-slate-700 leading-relaxed">{parseInline(content)}</span>
        </div>
      )
      return
    }

    // Empty line
    if (!trimmed) {
      flushList(idx)
      elements.push(<div key={idx} className="h-1.5" />)
      return
    }

    // Normal paragraph
    flushList(idx)
    elements.push(
      <p key={idx} className="my-1 leading-relaxed text-slate-700">
        {parseInline(trimmed)}
      </p>
    )
  })

  flushList('final')
  return elements
}

export default function ChatMessage({ role, text, meta }) {
  const isUser = role === 'user'
  const [copied, setCopied] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 group pl-8 sm:pl-16 animate-fade-in-up">
        <div className="flex flex-col items-end">
          <div className="rounded-2xl rounded-tr-xs bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 px-4.5 py-3 text-xs sm:text-sm font-medium text-white shadow-md shadow-brand-500/10 hover:shadow-lg transition-all duration-200 leading-relaxed">
            {text}
          </div>
        </div>
        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 shadow-xs border border-white">
          <User size={15} />
        </div>
      </div>
    )
  }

  const intent = meta?.intent

  return (
    <div className="flex justify-start gap-3 group pr-4 sm:pr-12 animate-fade-in-up">
      {/* Assistant Avatar */}
      <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-sky-600 text-white shadow-xs ring-2 ring-white">
        <Stethoscope size={15} />
      </div>

      <div className="flex-1 space-y-2">
        {/* Reasoning / Execution Trace Badge */}
        {intent && intent !== 'GREETING' && (
          <div className="inline-block">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/80 backdrop-blur-xs px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100/90 hover:text-slate-900 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            >
              <Cpu size={12} className="text-sky-600" />
              <span>Pipeline: <strong className="text-sky-700">{intent.replace(/_/g, ' ')}</strong></span>
              {showReasoning ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showReasoning && (
              <div className="mt-2 rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/70 to-slate-50 p-3.5 text-[11px] text-slate-600 space-y-1.5 shadow-2xs animate-fade-in-up">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-sky-600" />
                  Deterministic Query Execution Trace:
                </div>
                <p>• Intent Identified: <strong className="text-sky-700">{intent}</strong></p>
                {meta?.total !== undefined && <p>• Verified Records Evaluated: <strong className="text-slate-900">{meta.total}</strong> published records</p>}
                <p>• Strategy: Grounded Rank Fit Analysis (Zero ML Guessing / Zero Speculative Probabilities)</p>
              </div>
            )}
          </div>
        )}

        {/* Message Content Bubble */}
        <div className="relative rounded-2xl rounded-tl-xs border border-slate-200/90 bg-white/95 backdrop-blur-md p-4 sm:p-5 text-xs sm:text-sm shadow-xs transition-all duration-300 hover:shadow-md card-hover-effect">
          {renderFormattedText(text)}

          {/* Action Footer Bar */}
          <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Grounded NEET Medical Intelligence
            </span>
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-150 cursor-pointer active:scale-90"
              title="Copy response"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-600 stroke-[3]" />
                  <span className="text-emerald-700 font-extrabold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

