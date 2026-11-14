import { Link } from 'react-router-dom'
import { Check, Plus, ExternalLink, MapPin, BookOpen, Clock, Building2, Bookmark, ShieldCheck, Globe, AlertTriangle } from 'lucide-react'
import { useStudentAuth } from '../../context/StudentAuthContext'

const CLASSIFICATION_CONFIG = {
  BETTER_THAN_OPENING: {
    label: 'Eligible (Better than Opening)',
    statusType: 'ELIGIBLE',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20 shadow-2xs font-extrabold',
    dotClass: 'bg-emerald-500 animate-pulse',
    accentBorder: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
    barColor: 'progress-bar-emerald',
    glowClass: 'card-emerald-glow',
    reasonBoxClass: 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950',
    reasonTitle: 'Why Historically Eligible:',
    reasonTitleColor: 'text-emerald-800',
  },
  HISTORICALLY_WITHIN_CLOSING: {
    label: 'Historically Eligible (Within Closing)',
    statusType: 'ELIGIBLE',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20 shadow-2xs font-extrabold',
    dotClass: 'bg-emerald-500 animate-pulse',
    accentBorder: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
    barColor: 'progress-bar-emerald',
    glowClass: 'card-emerald-glow',
    reasonBoxClass: 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950',
    reasonTitle: 'Why Historically Eligible:',
    reasonTitleColor: 'text-emerald-800',
  },
  WITHIN_HISTORICAL_RANGE: {
    label: 'Historically Eligible (Within Range)',
    statusType: 'ELIGIBLE',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20 shadow-2xs font-extrabold',
    dotClass: 'bg-emerald-500 animate-pulse',
    accentBorder: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
    barColor: 'progress-bar-emerald',
    glowClass: 'card-emerald-glow',
    reasonBoxClass: 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950',
    reasonTitle: 'Why Historically Eligible:',
    reasonTitleColor: 'text-emerald-800',
  },
  NEAR_HISTORICAL_CLOSING: {
    label: 'Borderline (Within 5% of Closing)',
    statusType: 'BORDERLINE',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-500/25 shadow-2xs font-extrabold',
    dotClass: 'bg-amber-500 animate-pulse',
    accentBorder: 'bg-gradient-to-r from-amber-500 to-orange-500',
    barColor: 'progress-bar-amber',
    glowClass: '',
    reasonBoxClass: 'bg-amber-50/90 border-amber-200/90 text-amber-950',
    reasonTitle: 'Borderline Condition:',
    reasonTitleColor: 'text-amber-800',
  },
  OUTSIDE_HISTORICAL_CLOSING: {
    label: 'Not Historically Eligible',
    statusType: 'NOT_ELIGIBLE',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-500/20 shadow-2xs font-extrabold',
    dotClass: 'bg-rose-500',
    accentBorder: 'bg-gradient-to-r from-rose-500 to-red-600',
    barColor: 'bg-rose-500',
    glowClass: '',
    reasonBoxClass: 'bg-rose-50/90 border-rose-200/90 text-rose-950',
    reasonTitle: 'Why Not Eligible:',
    reasonTitleColor: 'text-rose-800',
  },
  BEYOND_HISTORICAL_CLOSING: {
    label: 'Not Historically Eligible',
    statusType: 'NOT_ELIGIBLE',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-500/20 shadow-2xs font-extrabold',
    dotClass: 'bg-rose-500',
    accentBorder: 'bg-gradient-to-r from-rose-500 to-red-600',
    barColor: 'bg-rose-500',
    glowClass: '',
    reasonBoxClass: 'bg-rose-50/90 border-rose-200/90 text-rose-950',
    reasonTitle: 'Why Not Eligible:',
    reasonTitleColor: 'text-rose-800',
  },
  INSUFFICIENT_DATA: {
    label: 'Historical Reference Seat',
    statusType: 'INFO',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 font-bold',
    dotClass: 'bg-slate-400',
    accentBorder: 'bg-slate-300',
    barColor: 'bg-slate-300',
    glowClass: '',
    reasonBoxClass: 'bg-slate-50 border-slate-200 text-slate-700',
    reasonTitle: 'Seat Details:',
    reasonTitleColor: 'text-slate-800',
  },
  HISTORICAL_DATA_UNAVAILABLE: {
    label: 'Data Unavailable',
    statusType: 'INFO',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 font-bold',
    dotClass: 'bg-slate-400',
    accentBorder: 'bg-slate-300',
    barColor: 'bg-slate-300',
    glowClass: '',
    reasonBoxClass: 'bg-slate-50 border-slate-200 text-slate-700',
    reasonTitle: 'Status:',
    reasonTitleColor: 'text-slate-800',
  },
}

function formatRank(rank) {
  if (rank === null || rank === undefined || !Number.isFinite(Number(rank))) return 'N/A'
  return Number(rank).toLocaleString('en-IN')
}

function formatFees(fees) {
  if (fees === null || fees === undefined || !Number.isFinite(Number(fees))) return null
  return `₹${Number(fees).toLocaleString('en-IN')}`
}

function getCollegeType(record) {
  const type = record.collegeType || record.collegeId?.collegeType || record.collegeId?.ownership || ''
  if (/gov|central|aiims|jipmer|autonomous/i.test(type)) return 'Government'
  if (/priv|trust|society/i.test(type)) return 'Private'
  if (/deem/i.test(type)) return 'Deemed'

  // Infer from college name
  const name = (record.collegeName || record.collegeId?.name || '').toLowerCase()
  if (
    name.includes('government') ||
    name.includes('govt') ||
    name.includes('aiims') ||
    name.includes('jipmer') ||
    name.includes('gmc') ||
    name.includes('institute of pg') ||
    name.includes('medical college,') ||
    name.includes('medical college and hospital') ||
    name.includes('trihms') ||
    name.includes('rims')
  ) {
    return 'Government'
  }
  if (
    name.includes('private') ||
    name.includes('society') ||
    name.includes('trust') ||
    name.includes('kpc') ||
    name.includes('iq city') ||
    name.includes('icare') ||
    name.includes('gouri devi') ||
    name.includes('jagannath') ||
    name.includes('santiniketan') ||
    name.includes('sks') ||
    name.includes('jis school')
  ) {
    return 'Private'
  }
  return type || 'Government'
}

export default function CollegeCard({ record, onCompareToggle, isSelectedForCompare }) {
  const { user, isChoiceSaved, addToChoiceList, removeFromChoiceList } = useStudentAuth()
  const status = CLASSIFICATION_CONFIG[record.status] || CLASSIFICATION_CONFIG[record.classification] || CLASSIFICATION_CONFIG.INSUFFICIENT_DATA
  const collegeId = record.collegeId?._id || record.collegeId
  const isSaved = isChoiceSaved(collegeId, record.quota, record.course)

  const collegeType = getCollegeType(record)
  const isGovt = collegeType === 'Government' || collegeType === 'Central'
  const isPrivate = collegeType === 'Private'
  const isDeemed = collegeType === 'Deemed'

  const handleToggleChoice = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!collegeId) return
    if (isSaved) {
      const savedItem = isChoiceSaved(collegeId, record.quota, record.course, true)
      await removeFromChoiceList(savedItem?._id || collegeId)
    } else {
      await addToChoiceList({
        collegeId,
        cutoffId: record._id || record.cutoffId,
        quota: record.quota,
        category: record.category,
        course: record.course || 'MBBS',
        round: record.round || '',
        openingRank: record.openingRank ?? null,
        closingRank: record.closingRank ?? null,
        fees: record.fees ?? null,
      })
    }
  }

  const opening = Number(record.openingRank) || 0
  const closing = Number(record.closingRank) || 0
  const yourRank = Number(record.yourRank) || 0

  let progressPercent = 50
  if (closing > 0 && yourRank > 0) {
    if (yourRank <= closing) {
      progressPercent = Math.min(100, Math.max(12, Math.round((yourRank / closing) * 100)))
    } else {
      progressPercent = 100
    }
  }

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 card-hover-effect ${status.glowClass} ${
        isSelectedForCompare
          ? 'border-brand-500 bg-brand-50/30 shadow-lg ring-2 ring-brand-500/30'
          : 'border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs hover:border-slate-300'
      }`}
    >
      {/* Top Gradient Accent Strip */}
      <div className={`h-1.5 w-full ${status.accentBorder}`} />

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header: Name, Location & Match Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <MapPin size={12} className="text-slate-400 shrink-0" />
                <span className="font-bold text-slate-600">{record.state}</span>
                {record.city && <span>• {record.city}</span>}
              </div>
              <h3 className="mt-1.5 text-base font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors duration-200 leading-snug">
                {record.collegeName}
              </h3>
            </div>

            {/* Classification Status Badge */}
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${status.badgeClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
              {status.label}
            </span>
          </div>

          {/* Tags Row */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs">
            {/* Prominent Government vs Private Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black border shadow-2xs ${
                isGovt
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300/90 ring-1 ring-emerald-500/20'
                  : isPrivate
                  ? 'bg-purple-50 text-purple-900 border-purple-300/90 ring-1 ring-purple-500/20'
                  : 'bg-indigo-50 text-indigo-900 border-indigo-300/90 ring-1 ring-indigo-500/20'
              }`}
            >
              <Building2 size={12} className={isGovt ? 'text-emerald-700' : isPrivate ? 'text-purple-700' : 'text-indigo-700'} />
              <span>{isGovt ? 'Government' : isPrivate ? 'Private' : 'Deemed'}</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50/80 px-2.5 py-1 font-bold text-indigo-700 border border-indigo-100 shadow-2xs">
              <BookOpen size={12} />
              {record.course || 'MBBS'}
            </span>
            <span className={`rounded-lg px-2.5 py-1 font-semibold border shadow-2xs ${
              record.isGeneralMeritSeat
                ? 'bg-amber-50 text-amber-900 border-amber-200 font-bold'
                : 'bg-slate-50 text-slate-700 border-slate-200/80'
            }`}>
              Category: <strong className="text-slate-900 font-bold">{record.category}</strong>
              {record.isGeneralMeritSeat && <span className="ml-1 text-[10px] text-amber-700 font-extrabold">(Open Merit)</span>}
            </span>

            {/* Dynamic Quota & Domicile Badge */}
            {record.domicileType === 'HOME_STATE_85' || (user?.domicileState && record.state && user.domicileState.toLowerCase() === record.state.toLowerCase() && !String(record.quota || '').toUpperCase().includes('AIQ')) ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                <span>85% Home State Quota</span>
              </span>
            ) : record.domicileType === 'AIQ_15' || String(record.quota || '').toUpperCase().includes('AIQ') || String(record.quota || '').toUpperCase().includes('ALL INDIA') ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 font-bold text-blue-800 border border-blue-200 shadow-2xs">
                <Globe size={12} className="text-blue-600 shrink-0" />
                <span>15% All India Quota</span>
              </span>
            ) : record.domicileType === 'NON_DOMICILE_STATE' || (user?.domicileState && record.state && user.domicileState.toLowerCase() !== record.state.toLowerCase() && String(record.quota || '').toUpperCase().includes('STATE')) ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 font-bold text-amber-900 border border-amber-200 shadow-2xs" title={`${record.state} Domicile Required`}>
                <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                <span>85% State Quota ({record.state} Domicile Req.)</span>
              </span>
            ) : (
              <span className="rounded-lg bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 border border-slate-200/80 shadow-2xs">
                Quota: <strong className="text-slate-900 font-bold">{record.quota || 'State/AIQ'}</strong>
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 border border-slate-200/80 shadow-2xs">
              <Clock size={12} className="text-slate-400" />
              {record.year} • {record.round}
            </span>
          </div>

          {/* Rank Metrics Card */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50/90 to-slate-100/50 p-3.5 space-y-3 shadow-2xs">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-white/90 p-2 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 block">Historical Opening:</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">AIR {formatRank(record.openingRank)}</p>
              </div>
              <div className="rounded-lg bg-white/90 p-2 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 block">Historical Closing:</span>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">AIR {formatRank(record.closingRank)}</p>
              </div>
            </div>

            {/* Visual Rank Bar with Pulse Animation */}
            {closing > 0 && yourRank > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                  <span className="text-slate-400">Top Rank 1</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold border ${
                    status.statusType === 'NOT_ELIGIBLE'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : status.statusType === 'BORDERLINE'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    Your AIR: {formatRank(yourRank)}
                  </span>
                  <span>Closing: {formatRank(closing)}</span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out shadow-xs ${status.barColor}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Allotted Rank or Fees if present */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 pt-2 text-[11px]">
              {(record.allottedRank != null || record.allotmentRank != null) && (
                <span className="text-slate-500 font-medium">
                  Allotted Merit: <strong className="text-slate-900 font-bold">AIR {formatRank(record.allottedRank ?? record.allotmentRank)}</strong>
                </span>
              )}
              {formatFees(record.fees) && (
                <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                  Tuition: {formatFees(record.fees)}/yr
                </span>
              )}
            </div>

            {/* Advanced Smart Indicators: Admission Probability & Category Cutoff Lift */}
            {record.admissionProbability != null && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/95 p-2.5 border border-slate-200/80 text-[11px]">
                <div className="flex items-center gap-1.5 font-extrabold text-slate-800">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    record.admissionProbability >= 90 ? 'bg-emerald-500 animate-pulse' : record.admissionProbability >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                  }`} />
                  <span>Admission Probability: <strong className={
                    record.admissionProbability >= 90 ? 'text-emerald-700 font-black' : record.admissionProbability >= 70 ? 'text-blue-700 font-black' : 'text-amber-700 font-black'
                  }>{record.admissionProbability}%</strong></span>
                </div>
                {record.categoryAdvantage > 0 && (
                  <span className="rounded-md bg-accent-50 text-accent-700 px-2 py-0.5 text-[10px] font-extrabold border border-accent-200/60">
                    +{record.categoryAdvantage.toLocaleString('en-IN')} Cutoff Advantage ({record.category})
                  </span>
                )}
              </div>
            )}

            {/* Multi-Round Counselling Progression */}
            {record.roundProgression && record.roundProgression.length > 1 && (
              <div className="rounded-xl bg-slate-50/90 p-2 border border-slate-200/60 space-y-1 text-[10px]">
                <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9px]">
                  Round-by-Round Allotment Trajectory:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {record.roundProgression.map((rp, i) => (
                    <span
                      key={i}
                      className={`rounded-md px-2 py-0.5 font-bold border ${
                        rp.isEligible
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {rp.round}: AIR {rp.closingRank?.toLocaleString('en-IN') || '—'} {rp.isEligible ? '✓' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Factual Rank Analysis Evidence */}
            {record.whyShown && (
              <div className={`mt-2 rounded-xl border p-2.5 text-[11px] shadow-2xs leading-relaxed ${status.reasonBoxClass}`}>
                <span className={`font-bold ${status.reasonTitleColor}`}>{status.reasonTitle}</span> {record.whyShown}
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          {collegeId ? (
            <Link
              to={`/college/${collegeId}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors group/link"
            >
              <span>Cutoff History</span>
              <ExternalLink size={13} className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
            </Link>
          ) : (
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <ShieldCheck size={11} className="text-sky-600" />
              Verified Historical Data
            </span>
          )}

          <div className="flex items-center gap-1.5">
            {collegeId && (
              <button
                type="button"
                onClick={handleToggleChoice}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isSaved
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 ring-1 ring-amber-400/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 active:scale-95'
                }`}
                title={isSaved ? 'In your Choice List (Click to remove)' : 'Add to your Choice List'}
              >
                <Bookmark size={13} className={isSaved ? 'fill-amber-500 text-amber-600' : ''} />
                <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Choice'}</span>
              </button>
            )}

            {onCompareToggle && (
              <button
                type="button"
                onClick={() => onCompareToggle(record)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isSelectedForCompare
                    ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-400/50 hover:bg-brand-700 scale-[1.02]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 active:scale-95'
                }`}
              >
                {isSelectedForCompare ? (
                  <>
                    <Check size={13} className="stroke-[3]" />
                    Selected
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    Compare
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
