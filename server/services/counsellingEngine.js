const Cutoff = require('../models/Cutoff');
const College = require('../models/College');
const { CLASSIFICATION, NEAR_BAND_PCT } = require('../config/constants');
const { normalizeState, normalizeCategory, getCategoryDetails } = require('./normalizationService');
const ApiError = require('../utils/ApiError');

const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 10000;

function isAllStates(state) {
  if (!state) return true;
  const s = String(state).trim().toLowerCase();
  return /^(all(\s+india|\s+states|\s+uploaded\s+states)?|all\s+india\s*[\/\-]\s*all\s+(states|uploaded\s+states)|india|\*)$/i.test(s);
}

function isAllCategories(category) {
  if (!category) return true;
  const c = String(category).trim().toLowerCase();
  return /^(all(\s+categories)?|\*)$/i.test(c);
}

function isAllQuotas(quota) {
  if (!quota) return true;
  const q = String(quota).trim().toLowerCase();
  return /^(all(\s+quotas)?|\*)$/i.test(q);
}

function isAllCourses(course) {
  if (!course) return true;
  const c = String(course).trim().toLowerCase();
  return /^(all(\s+courses)?|\*)$/i.test(c);
}

function isAllYears(year) {
  if (!year) return true;
  const y = String(year).trim().toLowerCase();
  return /^(all(\s+years)?|\*)$/i.test(y);
}

function isAllRounds(round) {
  if (!round) return true;
  const r = String(round).trim().toLowerCase();
  return /^(all(\s+rounds)?|\*)$/i.test(r);
}

// Deterministic classification of Quota & Domicile eligibility
function classifyQuotaAndDomicile(recordQuota, recordState, candidateDomicile) {
  const normRecordQuota = String(recordQuota || '').trim();
  const normRecordState = normalizeState(recordState) || String(recordState || '').trim();
  const normCandidateDomicile = candidateDomicile ? (normalizeState(candidateDomicile) || String(candidateDomicile).trim()) : null;

  const isAiq = /^(aiq|all\s*india|all\s*india\s*quota|15%\s*aiq)$/i.test(normRecordQuota);
  const isDeemedMgmt = /^(deemed|management|mgmt|nri|central|paid|ip|institutional)$/i.test(normRecordQuota);
  const isStateQuota = /^(state|state\s*quota|85%\s*state\s*quota|sq|home\s*state|hs)$/i.test(normRecordQuota) || (!isAiq && !isDeemedMgmt);

  if (isAiq) {
    return {
      quotaType: 'AIQ',
      domicileType: 'AIQ_15',
      isDomicileEligible: true,
      domicileBadge: '15% All India Quota (Open to All States)',
      domicileExplanation: 'MCC 15% All India Quota seat — 100% open to qualified candidates from all Indian States & UTs without state domicile requirement.',
      quotaLabel: '15% All India Quota (AIQ)',
    };
  }

  if (isDeemedMgmt) {
    return {
      quotaType: 'DEEMED_MGMT',
      domicileType: 'OPEN_DEEMED',
      isDomicileEligible: true,
      domicileBadge: 'Deemed / Management Quota',
      domicileExplanation: 'Deemed University / Management Quota seat — open merit allotment under MCC / State counselling.',
      quotaLabel: 'Deemed / Management Quota',
    };
  }

  // 85% State Quota Seat
  if (normCandidateDomicile && normCandidateDomicile.toLowerCase() === normRecordState.toLowerCase()) {
    return {
      quotaType: 'STATE_QUOTA',
      domicileType: 'HOME_STATE_85',
      isDomicileEligible: true,
      domicileBadge: `85% Home State Quota (${normRecordState})`,
      domicileExplanation: `Eligible under 85% Home State Quota for bona fide domicile certificate holders of ${normRecordState}.`,
      quotaLabel: `85% State Quota (${normRecordState})`,
    };
  } else if (normCandidateDomicile && normCandidateDomicile.toLowerCase() !== normRecordState.toLowerCase()) {
    return {
      quotaType: 'STATE_QUOTA',
      domicileType: 'NON_DOMICILE_STATE',
      isDomicileEligible: false,
      domicileBadge: `85% State Quota (${normRecordState} Domicile Required)`,
      domicileExplanation: `This 85% State Quota seat requires ${normRecordState} Domicile. Candidates with ${normCandidateDomicile} domicile cannot claim State Quota seats in ${normRecordState}, but are eligible for 15% AIQ seats in ${normRecordState}.`,
      quotaLabel: `85% State Quota (${normRecordState} Domicile Required)`,
    };
  } else {
    // Domicile not specified by candidate
    return {
      quotaType: 'STATE_QUOTA',
      domicileType: 'UNSPECIFIED_DOMICILE',
      isDomicileEligible: true,
      domicileBadge: `85% State Quota (${normRecordState} Domicile)`,
      domicileExplanation: `State Quota seat in ${normRecordState}. Requires valid ${normRecordState} Domicile / Residence Certificate at time of state counselling verification.`,
      quotaLabel: `85% State Quota (${normRecordState})`,
    };
  }
}

// Deterministic rank comparison against historical opening and closing cutoffs
function analyzeRankFit(studentRank, openingRank, closingRank, context = {}) {
  const hasOpening = openingRank !== null && openingRank !== undefined && Number.isFinite(openingRank);
  const hasClosing = closingRank !== null && closingRank !== undefined && Number.isFinite(closingRank);
  const rank = Number(studentRank);

  const quota = context.quota || 'AIQ';
  const category = context.category || 'General';

  if (!Number.isFinite(rank) || (!hasOpening && !hasClosing)) {
    return {
      status: 'HISTORICAL_DATA_UNAVAILABLE',
      classification: CLASSIFICATION.HISTORICAL_DATA_UNAVAILABLE,
      eligible: false,
      isBetterThanOpening: false,
      isWithinHistoricalRange: false,
      isNearHistoricalClosing: false,
      isBeyondHistoricalClosing: false,
      statusLabel: 'Historical Data Unavailable',
      rankDifference: null,
      whyShown: 'Historical cutoff data is not available for this record.',
    };
  }

  // PwD Horizontal Reservation Check (5% Sub-quota gives significant cutoff relaxation)
  const isCandidatePwd = context.isPwd || /^(pwd|ph)$/i.test(category);
  const effectiveClosing = isCandidatePwd && hasClosing ? Math.max(closingRank * 3, 50000) : closingRank;

  // Case 1: AIR is better than historical opening rank (e.g. AIR 400 < Opening 450)
  if (hasOpening && rank < openingRank) {
    const diff = openingRank - rank;
    return {
      status: 'BETTER_THAN_OPENING',
      classification: CLASSIFICATION.HISTORICALLY_WITHIN_CLOSING,
      eligible: true,
      isBetterThanOpening: true,
      isWithinHistoricalRange: false,
      isNearHistoricalClosing: false,
      isBeyondHistoricalClosing: false,
      statusLabel: isCandidatePwd ? 'Historically Eligible (Guaranteed PwD Quota)' : 'Historically Eligible (Better than Opening Cutoff)',
      rankDifference: diff,
      whyShown: isCandidatePwd
        ? `Your AIR ${rank.toLocaleString('en-IN')} is comfortably within the historical opening cutoff of AIR ${openingRank.toLocaleString('en-IN')} with PwD horizontal reservation for ${quota}.`
        : `Your AIR ${rank.toLocaleString('en-IN')} is better than the historical opening cutoff of AIR ${openingRank.toLocaleString('en-IN')} by ${diff.toLocaleString('en-IN')} ranks for ${quota} (${category}).`,
    };
  }

  // Case 2: AIR is within historical range (Opening <= AIR <= Closing)
  if (hasOpening && hasClosing && rank >= openingRank && rank <= closingRank) {
    const diff = closingRank - rank;
    return {
      status: 'WITHIN_HISTORICAL_RANGE',
      classification: CLASSIFICATION.HISTORICALLY_WITHIN_CLOSING,
      eligible: true,
      isBetterThanOpening: false,
      isWithinHistoricalRange: true,
      isNearHistoricalClosing: false,
      isBeyondHistoricalClosing: false,
      statusLabel: isCandidatePwd ? 'Historically Eligible (Open Merit + PwD)' : 'Historically Eligible (Within Cutoff Window)',
      rankDifference: diff,
      whyShown: `Your AIR ${rank.toLocaleString('en-IN')} falls within the historical allotment window of AIR ${openingRank.toLocaleString('en-IN')} to ${closingRank.toLocaleString('en-IN')} (${diff.toLocaleString('en-IN')} ranks before closing for ${quota} ${category}).`,
    };
  }

  // Fallback when opening is missing but AIR <= Closing
  if (!hasOpening && hasClosing && rank <= closingRank) {
    const diff = closingRank - rank;
    return {
      status: 'WITHIN_HISTORICAL_RANGE',
      classification: CLASSIFICATION.HISTORICALLY_WITHIN_CLOSING,
      eligible: true,
      isBetterThanOpening: false,
      isWithinHistoricalRange: true,
      isNearHistoricalClosing: false,
      isBeyondHistoricalClosing: false,
      statusLabel: isCandidatePwd ? 'Historically Eligible (Open Merit + PwD)' : 'Historically Eligible (Within Closing Cutoff)',
      rankDifference: diff,
      whyShown: `Your AIR ${rank.toLocaleString('en-IN')} is within the historical closing cutoff of AIR ${closingRank.toLocaleString('en-IN')} for ${quota} (${category}).`,
    };
  }

  // Case 2b: PwD Horizontal Reservation Cutoff Extension (Closing < AIR <= PwD Effective Closing)
  if (isCandidatePwd && hasClosing && rank <= effectiveClosing) {
    const diff = effectiveClosing - rank;
    return {
      status: 'WITHIN_HISTORICAL_RANGE',
      classification: CLASSIFICATION.HISTORICALLY_WITHIN_CLOSING,
      eligible: true,
      isBetterThanOpening: false,
      isWithinHistoricalRange: true,
      isNearHistoricalClosing: false,
      isBeyondHistoricalClosing: false,
      statusLabel: 'Historically Eligible (5% PwD Horizontal Quota)',
      rankDifference: diff,
      whyShown: `Your AIR ${rank.toLocaleString('en-IN')} qualifies under 5% PwD Horizontal Reservation (General closing was AIR ${closingRank.toLocaleString('en-IN')}, PwD sub-quota safe window up to AIR ${effectiveClosing.toLocaleString('en-IN')}) for ${quota}.`,
    };
  }

  // Case 3: Near historical closing rank (Borderline: closingRank < rank <= closingRank * (1 + NEAR_BAND_PCT))
  const nearLimit = effectiveClosing ? Math.round(effectiveClosing * (1 + NEAR_BAND_PCT)) : null;
  if (hasClosing && rank > effectiveClosing && nearLimit && rank <= nearLimit) {
    const diff = rank - effectiveClosing;
    return {
      status: 'NEAR_HISTORICAL_CLOSING',
      classification: CLASSIFICATION.NEAR_HISTORICAL_CLOSING,
      eligible: false,
      isBetterThanOpening: false,
      isWithinHistoricalRange: false,
      isNearHistoricalClosing: true,
      isBeyondHistoricalClosing: true,
      statusLabel: 'Borderline (Within 5% of Historical Closing)',
      rankDifference: diff,
      whyShown: `Historical closing cutoff was AIR ${closingRank.toLocaleString('en-IN')}. Your AIR ${rank.toLocaleString('en-IN')} is within 5% (+${diff.toLocaleString('en-IN')} ranks) of the closing cutoff for ${quota} (${category}). This is a borderline estimate, not an eligibility guarantee.`,
    };
  }

  // Case 4: Outside historical closing rank (rank > closingRank * (1 + NEAR_BAND_PCT))
  if (hasClosing && rank > effectiveClosing) {
    const diff = rank - effectiveClosing;
    return {
      status: 'OUTSIDE_HISTORICAL_CLOSING',
      classification: CLASSIFICATION.OUTSIDE_HISTORICAL_CLOSING,
      eligible: false,
      isBetterThanOpening: false,
      isWithinHistoricalRange: false,
      isNearHistoricalClosing: false,
      isBeyondHistoricalClosing: true,
      statusLabel: 'Not Historically Eligible (Outside Closing Cutoff)',
      rankDifference: diff,
      whyShown: `Historical closing cutoff was AIR ${closingRank.toLocaleString('en-IN')}, which is ${diff.toLocaleString('en-IN')} ranks higher than your AIR ${rank.toLocaleString('en-IN')} for ${quota} (${category}).`,
    };
  }

  // Fallback when closing is missing: only eligible if rank <= openingRank
  if (hasOpening && rank <= openingRank) {
    return {
      status: 'BETTER_THAN_OPENING',
      classification: CLASSIFICATION.HISTORICALLY_WITHIN_CLOSING,
      eligible: true,
      isBetterThanOpening: true,
      isWithinHistoricalRange: false,
      isNearHistoricalClosing: false,
      isBeyondHistoricalClosing: false,
      statusLabel: 'Historically Eligible (Matches Opening Rank)',
      rankDifference: openingRank - rank,
      whyShown: `Your AIR ${rank.toLocaleString('en-IN')} is at or better than the historical opening rank of AIR ${openingRank.toLocaleString('en-IN')} for ${quota} (${category}).`,
    };
  }

  return {
    status: 'OUTSIDE_HISTORICAL_CLOSING',
    classification: CLASSIFICATION.OUTSIDE_HISTORICAL_CLOSING,
    eligible: false,
    isBetterThanOpening: false,
    isWithinHistoricalRange: false,
    isNearHistoricalClosing: false,
    isBeyondHistoricalClosing: true,
    statusLabel: 'Not Historically Eligible (Outside Cutoff)',
    rankDifference: hasOpening ? rank - openingRank : null,
    whyShown: 'Your rank is outside the recorded historical allotment rank for this seat.',
  };
}

const classifyRank = analyzeRankFit;

function inferCollegeType(record) {
  const type = record.collegeType || record.collegeId?.collegeType || record.collegeId?.ownership || '';
  if (/gov|central|aiims|jipmer|autonomous/i.test(type)) return 'Government';
  if (/priv|trust|society/i.test(type)) return 'Private';
  if (/deem/i.test(type)) return 'Deemed';

  const name = (record.collegeName || record.collegeId?.name || '').toLowerCase();
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
    return 'Government';
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
    return 'Private';
  }
  return type || 'Government';
}

function escapeRegex(str) {
  return String(str || '')
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Builds the Mongo query for a prediction/filter request.
function buildQuery(filters) {
  const query = {
    published: true,
  };

  const stateInputs = Array.isArray(filters.targetStates) && filters.targetStates.length > 0
    ? filters.targetStates
    : (filters.targetState ? [filters.targetState] : (filters.state ? [filters.state] : []));

  const validStates = stateInputs.map((s) => String(s || '').trim()).filter((s) => s && !isAllStates(s));
  if (validStates.length > 0) {
    const normStates = validStates.map((st) => normalizeState(st) || st);
    const patterns = [];
    for (const st of normStates) {
      patterns.push(escapeRegex(st));
      const firstWord = st.split(/[\s_-]+/)[0];
      if (firstWord && firstWord.length >= 4) {
        patterns.push(escapeRegex(firstWord));
      }
    }
    const stateRegex = new RegExp(`(${patterns.join('|')})`, 'i');
    query.$or = [
      { state: { $regex: stateRegex } },
      { sourceFile: { $regex: stateRegex } },
      { counsellingAuthority: { $regex: stateRegex } },
    ];
  }

  const rawCategory = (filters.category || '').trim();
  if (!isAllCategories(rawCategory)) {
    const normCategory = normalizeCategory(rawCategory) || rawCategory;
    const isGeneral = /^(general|gen|ur|open|unreserved|open\s*merit|non-apst|non\s*apst|oc)$/i.test(normCategory);
    const isCandidatePwd = /^(pwd|ph|handicapped|divyang)$/i.test(normCategory) || filters.isPwd === true || filters.isPwd === 'true';

    const patterns = [];
    // General / Open merit seats (including NON-APST, OC) are open to ALL categories unless explicitly excluded
    if (isGeneral || (filters.includeGeneral !== false && filters.includeGeneral !== 'false')) {
      patterns.push('(general|gen|ur|open|opno|gn|unreserved|general\\s*\\/\\s*ur|general-ur|open\\s*merit|non-apst|non\\s*apst|oc)');
    }

    if (/^(obc|obc-ncl|obcncl|sebc|bca|bcb|bcc|bcd|bce)$/i.test(normCategory)) {
      patterns.push('(obc|obc-ncl|obc\\s*ncl|obc\\s*\\(ncl\\)|obc-no|bc|bc-a|bc-b|bc-c|bc-d|bc-e|bca|bcb|bcc|bcd|bce|sebc|obc\\s*\\/.*|obc\\s*\\(non-creamy.*\\)|other\\s*backward.*)');
    }
    if (/^(ews|gen-ews)$/i.test(normCategory)) {
      patterns.push('(ews|gen-ews|general-ews|ews-no|economically\\s*weaker.*)');
    }
    if (/^(sc|sc1|sc2|sc3)$/i.test(normCategory)) {
      patterns.push('(sc|sc-no|scheduled\\s*caste|sc1|sc2|sc3)');
    }
    if (/^(st|st1|st2|apst)$/i.test(normCategory)) {
      patterns.push('(st|st-no|scheduled\\s*tribe|st1|st2|apst|ap\\s*st|arunachal\\s*pradesh\\s*scheduled\\s*tribe)');
    }
    if (/^(pwd|ph)$/i.test(normCategory) || isCandidatePwd) {
      patterns.push('(pwd|ph|handicapped|divyang|.*-pwd|.*-ph|.*pwd.*|.*ph.*)');
    }

    if (!isGeneral) {
      patterns.push(escapeRegex(rawCategory));
      patterns.push(escapeRegex(normCategory));
    }

    query.category = { $regex: new RegExp(`^(${patterns.join('|')})$`, 'i') };
  }

  const course = (filters.course || '').trim();
  if (!isAllCourses(course)) {
    query.course = { $regex: new RegExp(`^${escapeRegex(course)}$`, 'i') };
  }

  const quota = (filters.quota || '').trim();
  if (!isAllQuotas(quota)) {
    let quotaPattern = `^${escapeRegex(quota)}`;
    if (/^aiq$/i.test(quota) || /all\s*india/i.test(quota)) {
      quotaPattern = '^(aiq|all\\s*india\\s*quota|all\\s*india)$';
    } else if (/^state/i.test(quota)) {
      quotaPattern = '^(state|state\\s*quota|state\\s*counselling|sq|home\\s*state)$';
    } else if (/^management/i.test(quota)) {
      quotaPattern = '^(management|mgmt|management\\s*quota)$';
    } else if (/^nri/i.test(quota)) {
      quotaPattern = '^(nri|nri\\s*quota)$';
    } else if (/^deemed/i.test(quota)) {
      quotaPattern = '^(deemed|deemed\\s*university)$';
    }
    query.quota = { $regex: new RegExp(quotaPattern, 'i') };
  }

  const round = (filters.round || '').trim();
  if (!isAllRounds(round)) {
    query.round = { $regex: new RegExp(`^${escapeRegex(round)}$`, 'i') };
  }

  const year = filters.year;
  if (!isAllYears(year)) {
    const y = Number(year);
    if (Number.isFinite(y)) query.year = y;
  }

  // Note: We perform collegeType filtering post-population to support name-based & College-model inference
  if (filters.maxFees !== undefined && filters.maxFees !== null && filters.maxFees !== '') {
    query.fees = { $lte: Number(filters.maxFees) };
  }

  return query;
}

// Deterministic core of the app: filters published Cutoff records against
// the user's criteria (state, category, quota, course, year, round) BEFORE rank comparison.
// Rank comparison classifies each matching record without excluding it.
async function predict(filters) {
  const rank = Number(filters.rank || filters.air);
  if (!Number.isFinite(rank) || rank <= 0) {
    throw new ApiError(400, 'A valid positive NEET rank is required.');
  }

  const query = buildQuery(filters);
  const limit = Math.min(Number(filters.limit) || DEFAULT_LIMIT, MAX_LIMIT);

  const total = await Cutoff.countDocuments(query);

  const cutoffs = await Cutoff.find(query)
    .populate('collegeId', 'name state city district collegeType ownership website facilities courses')
    .lean();

  const isGeneralCategory = /^(general|gen|ur|open|opno|gn|unreserved|general\s*\/\s*ur)$/i.test((filters.category || '').trim());

  const candidateDomicile = filters.domicileState || filters.userDomicile || null;

  const withClassification = cutoffs.map((c) => {
    const opening = Number.isFinite(c.openingRank) ? c.openingRank : null;
    const allotted = Number.isFinite(c.allottedRank) ? c.allottedRank : (Number.isFinite(c.allotmentRank) ? c.allotmentRank : null);
    const closing = Number.isFinite(c.closingRank) ? c.closingRank : allotted;

    const isCandidatePwd = filters.isPwd || /^(pwd|ph)$/i.test(filters.category || '');
    const {
      status,
      classification,
      eligible,
      isBetterThanOpening,
      isWithinHistoricalRange,
      isNearHistoricalClosing,
      isBeyondHistoricalClosing,
      statusLabel,
      whyShown,
    } = classifyRank(rank, opening, closing, { quota: c.quota, category: c.category, isPwd: isCandidatePwd });

    const quotaDomicile = classifyQuotaAndDomicile(c.quota, c.state, candidateDomicile);

    const isGeneralRecord = /^(general|gen|ur|open|opno|gn|unreserved|general\s*\/\s*ur)$/i.test(c.category || '');
    const isGeneralMeritSeat = !isGeneralCategory && isGeneralRecord;
    const detectedCollegeType = inferCollegeType(c);

    return {
      ...c,
      collegeType: detectedCollegeType,
      studentRank: rank,
      yourRank: rank,
      openingRank: opening,
      closingRank: closing,
      allottedRank: allotted,
      source: c.sourceFile || 'Published Counselling Dataset',
      sourceFile: c.sourceFile || 'Published Counselling Dataset',
      status,
      classification,
      eligible,
      isBetterThanOpening,
      isWithinHistoricalRange,
      isNearHistoricalClosing: isNearHistoricalClosing || false,
      isBeyondHistoricalClosing,
      withinHistoricalRange: isWithinHistoricalRange || isBetterThanOpening,
      statusLabel,
      whyShown,
      isGeneralMeritSeat,
      ...quotaDomicile,
    };
  });

  // Apply collegeType filter if specified
  const collegeTypeFilter = (filters.collegeType || '').trim();
  const filteredByCollegeType = (collegeTypeFilter && !/^(all|all\s+types)$/i.test(collegeTypeFilter))
    ? withClassification.filter((r) => {
        if (/^gov/i.test(collegeTypeFilter)) return r.collegeType === 'Government' || r.collegeType === 'Central';
        if (/^priv/i.test(collegeTypeFilter)) return r.collegeType === 'Private';
        if (/^deem/i.test(collegeTypeFilter)) return r.collegeType === 'Deemed';
        return true;
      })
    : withClassification;

  // Enforce strict domicile filtering when searching across All India or in Profile Prediction,
  // but allow exploring a specific Target State when explicitly chosen by the user.
  const enforceDomicileFilter = filters.strictDomicile === true || isAllStates(filters.state || filters.targetState);

  // Filter strictly to eligible records (Better than Opening or Within Historical Cutoff Range)
  const eligibleRecords = filteredByCollegeType.filter(
    (r) =>
      (r.eligible === true || r.isWithinHistoricalRange || r.isBetterThanOpening) &&
      (!enforceDomicileFilter || r.isDomicileEligible !== false)
  );

  // Calculate dashboard stats from eligible results
  const totalFiltered = eligibleRecords.length;
  const withinRange = eligibleRecords.filter((r) => r.isWithinHistoricalRange).length;
  const betterThanOpening = eligibleRecords.filter((r) => r.isBetterThanOpening).length;
  const nearClosing = 0;
  const beyondClosing = 0;
  const unavailable = 0;

  const aiqCount = eligibleRecords.filter((r) => r.domicileType === 'AIQ_15').length;
  const homeStateCount = eligibleRecords.filter((r) => r.domicileType === 'HOME_STATE_85').length;
  const nonDomicileStateCount = 0;
  const deemedCount = eligibleRecords.filter((r) => r.domicileType === 'OPEN_DEEMED').length;

  // Sort order: Better than Opening -> Within Historical Range -> Most recent year -> Lowest closing rank
  eligibleRecords.sort((a, b) => {
    if (a.isBetterThanOpening !== b.isBetterThanOpening) return a.isBetterThanOpening ? -1 : 1;
    if (a.year !== b.year) return b.year - a.year;
    const closeA = a.closingRank ?? Infinity;
    const closeB = b.closingRank ?? Infinity;
    return closeA - closeB;
  });

  const records = eligibleRecords.slice(0, limit);
  const datasetIds = [...new Set(records.map((r) => String(r.sourceDatasetId)))];

  // Construct grouped historical colleges strictly from eligible records
  const groupedByCollege = {};
  for (const item of eligibleRecords) {
    const key = `${item.collegeName}|${item.state}|${item.course || 'MBBS'}|${item.category}|${item.quota || ''}`;
    if (!groupedByCollege[key]) {
      groupedByCollege[key] = {
        collegeName: item.collegeName,
        state: item.state,
        course: item.course,
        category: item.category,
        quota: item.quota,
        collegeId: item.collegeId,
        history: [],
        bestClassification: item.classification,
        bestStatus: item.status,
        hasEligible: true,
      };
    }
    groupedByCollege[key].history.push({
      year: item.year,
      round: item.round,
      openingRank: item.openingRank,
      closingRank: item.closingRank,
      allottedRank: item.allottedRank,
      status: item.status,
      classification: item.classification,
      statusLabel: item.statusLabel,
      eligible: item.eligible,
      isBetterThanOpening: item.isBetterThanOpening,
      isWithinHistoricalRange: item.isWithinHistoricalRange,
      isNearHistoricalClosing: false,
      isBeyondHistoricalClosing: false,
      withinHistoricalRange: true,
      studentRank: rank,
      source: item.source,
      whyShown: item.whyShown,
    });
  }

  const colleges = Object.values(groupedByCollege);

  return {
    rank,
    filters: {
      rank,
      state: filters.state || filters.targetState || 'All India',
      category: filters.category || 'All Categories',
      quota: filters.quota || 'All Quotas',
      course: filters.course || 'All Courses',
      year: filters.year || 'All Years',
      round: filters.round || 'All Rounds',
    },
    counts: {
      totalFiltered,
      withinRange,
      betterThanOpening,
      nearClosing,
      beyondClosing,
      unavailable,
      aiqCount,
      homeStateCount,
      nonDomicileStateCount,
      deemedCount,
    },
    quotaStats: {
      aiqCount,
      homeStateCount,
      nonDomicileStateCount,
      deemedCount,
    },
    totalFiltered,
    withinRange,
    betterThanOpening,
    nearClosing,
    beyondClosing,
    records,
    results: records,
    colleges,
    total,
    datasetIds,
  };
}

async function searchCutoffs(filters) {
  const query = buildQuery(filters);
  const limit = Math.min(Number(filters.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const rank = Number(filters.rank || filters.air);
  const hasRank = Number.isFinite(rank) && rank > 0;
  const candidateDomicile = filters.domicileState || filters.userDomicile || null;

  const total = await Cutoff.countDocuments(query);
  const cutoffs = await Cutoff.find(query)
    .populate('collegeId', 'name state city district collegeType ownership website facilities courses')
    .limit(limit)
    .lean();

  const isGeneralCategory = /^(general|gen|ur|open|opno|gn|unreserved|general\s*\/\s*ur)$/i.test((filters.category || '').trim());

  const processed = cutoffs.map((c) => {
    const opening = Number.isFinite(c.openingRank) ? c.openingRank : null;
    const allotted = Number.isFinite(c.allottedRank) ? c.allottedRank : (Number.isFinite(c.allotmentRank) ? c.allotmentRank : null);
    const closing = Number.isFinite(c.closingRank) ? c.closingRank : allotted;

    const fit = hasRank
      ? classifyRank(rank, opening, closing, { quota: c.quota, category: c.category })
      : {
          status: 'HISTORICAL_DATA_AVAILABLE',
          classification: CLASSIFICATION.HISTORICAL_DATA_UNAVAILABLE,
          eligible: true,
          statusLabel: 'Historical Allotment',
          whyShown: `Historical opening: ${opening ? `AIR ${opening.toLocaleString('en-IN')}` : 'N/A'}, closing: ${closing ? `AIR ${closing.toLocaleString('en-IN')}` : 'N/A'} for ${c.quota || 'AIQ'} (${c.category}).`,
        };

    const quotaDomicile = classifyQuotaAndDomicile(c.quota, c.state, candidateDomicile);

    const isGeneralRecord = /^(general|gen|ur|open|opno|gn|unreserved|general\s*\/\s*ur)$/i.test(c.category || '');
    const isGeneralMeritSeat = !isGeneralCategory && isGeneralRecord;

    return {
      ...c,
      studentRank: hasRank ? rank : null,
      yourRank: hasRank ? rank : null,
      openingRank: opening,
      closingRank: closing,
      allottedRank: allotted,
      source: c.sourceFile || 'Published Counselling Dataset',
      sourceFile: c.sourceFile || 'Published Counselling Dataset',
      status: fit.status,
      classification: fit.classification,
      eligible: fit.eligible,
      isBetterThanOpening: fit.isBetterThanOpening || false,
      isWithinHistoricalRange: fit.isWithinHistoricalRange || false,
      isNearHistoricalClosing: fit.isNearHistoricalClosing || false,
      isBeyondHistoricalClosing: fit.isBeyondHistoricalClosing || false,
      withinHistoricalRange: fit.isWithinHistoricalRange || fit.isBetterThanOpening || false,
      statusLabel: fit.statusLabel,
      whyShown: fit.whyShown,
      isGeneralMeritSeat,
      ...quotaDomicile,
    };
  });

  const eligibleRecords = hasRank && filters.includeBeyondClosing !== true
    ? processed.filter((r) => r.eligible === true || r.isWithinHistoricalRange || r.isBetterThanOpening)
    : processed;

  return {
    records: eligibleRecords,
    totalFiltered: total,
    total,
  };
}

async function checkFilterCoverage(filters = {}) {
  const distinctStates = await Cutoff.distinct('state', { published: true });
  const distinctCategories = await Cutoff.distinct('category', { published: true });
  const distinctYears = await Cutoff.distinct('year', { published: true });
  const distinctQuotas = await Cutoff.distinct('quota', { published: true });

  const missingFilters = [];
  const reqState = filters.targetState || filters.state;
  if (reqState && !isAllStates(reqState)) {
    const norm = normalizeState(reqState) || reqState;
    const hasState = distinctStates.some((s) => s.toLowerCase() === norm.toLowerCase() || s.toLowerCase().includes(norm.toLowerCase()));
    if (!hasState) {
      missingFilters.push({
        filter: 'state',
        value: reqState,
        reason: `No published counselling records for "${reqState}" in the database.`,
      });
    }
  }

  const reqCat = filters.category;
  if (reqCat && !isAllCategories(reqCat)) {
    const normCat = normalizeCategory(reqCat) || reqCat;
    const isGen = /^(general|ur|open|state merit|sm)$/i.test(normCat);
    const hasCat = distinctCategories.some((c) => c.toLowerCase() === normCat.toLowerCase());
    if (!hasCat && !isGen) {
      missingFilters.push({
        filter: 'category',
        value: reqCat,
        reason: `No published cutoffs for category "${reqCat}" in the database.`,
      });
    }
  }

  return {
    hasCoverage: missingFilters.length === 0,
    missingFilters,
    availableStates: distinctStates,
    availableCategories: distinctCategories,
    availableYears: distinctYears,
    availableQuotas: distinctQuotas,
  };
}

async function getBroaderAIQOptions(filters = {}, limit = 10) {
  const rank = Number(filters.rank || filters.air);
  const cat = filters.category || 'General';
  const course = filters.course || 'MBBS';

  const broaderQuery = {
    published: true,
    quota: { $regex: /^(aiq|all\s*india)/i },
    course: { $regex: new RegExp(`^${escapeRegex(course)}$`, 'i') },
  };

  const normCat = normalizeCategory(cat) || cat;
  if (!isAllCategories(normCat)) {
    broaderQuery.category = { $regex: new RegExp(`^(${escapeRegex(normCat)}|general|ur|open)`, 'i') };
  }

  const cutoffs = await Cutoff.find(broaderQuery)
    .populate('collegeId', 'name state city district collegeType ownership website facilities courses')
    .lean();

  const classified = cutoffs.map((c) => {
    const opening = Number.isFinite(c.openingRank) ? c.openingRank : null;
    const allotted = Number.isFinite(c.allottedRank) ? c.allottedRank : (Number.isFinite(c.allotmentRank) ? c.allotmentRank : null);
    const closing = Number.isFinite(c.closingRank) ? c.closingRank : allotted;
    const fit = Number.isFinite(rank) && rank > 0
      ? classifyRank(rank, opening, closing, { quota: c.quota, category: c.category })
      : { eligible: true, statusLabel: 'AIQ Historical Allotment', whyShown: 'Historical AIQ Seat' };

    return {
      ...c,
      studentRank: rank,
      openingRank: opening,
      closingRank: closing,
      source: c.sourceFile || 'Published AIQ Counselling Dataset',
      sourceFile: c.sourceFile || 'Published AIQ Counselling Dataset',
      ...fit,
      isBroaderView: true,
      broaderViewReason: `All India Quota (15%) Seat in ${c.state} (Open to all candidates without state domicile)`,
    };
  });

  const eligible = classified.filter((r) => r.eligible === true || r.isWithinHistoricalRange || r.isBetterThanOpening);
  eligible.sort((a, b) => (a.closingRank || Infinity) - (b.closingRank || Infinity));

  return eligible.slice(0, limit);
}

module.exports = {
  predict,
  searchCutoffs,
  classifyRank,
  analyzeRankFit,
  classifyQuotaAndDomicile,
  buildQuery,
  checkFilterCoverage,
  getBroaderAIQOptions,
  isAllStates,
  isAllCategories,
};

