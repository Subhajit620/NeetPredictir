const OpenAI = require('openai');
const env = require('../config/env');
const { normalizeState, normalizeCategory } = require('./normalizationService');

let client = null;
function getClient() {
  if (!env.ai.apiKey) return null;
  if (!client) {
    client = new OpenAI({ apiKey: env.ai.apiKey, baseURL: env.ai.baseUrl });
  }
  return client;
}

const KNOWN_STATES_MAP = {
  'uttar pradesh': 'Uttar Pradesh', 'up': 'Uttar Pradesh', 'u.p.': 'Uttar Pradesh',
  'bihar': 'Bihar', 'delhi': 'Delhi', 'haryana': 'Haryana', 'karnataka': 'Karnataka',
  'maharashtra': 'Maharashtra', 'rajasthan': 'Rajasthan', 'madhya pradesh': 'Madhya Pradesh', 'mp': 'Madhya Pradesh',
  'chhattisgarh': 'Chhattisgarh', 'cg': 'Chhattisgarh', 'west bengal': 'West Bengal', 'wb': 'West Bengal', 'bengal': 'West Bengal',
  'tamil nadu': 'Tamil Nadu', 'tn': 'Tamil Nadu', 'kerala': 'Kerala', 'gujarat': 'Gujarat',
  'jharkhand': 'Jharkhand', 'himachal pradesh': 'Himachal Pradesh', 'hp': 'Himachal Pradesh',
  'punjab': 'Punjab', 'odisha': 'Odisha', 'andhra pradesh': 'Andhra Pradesh', 'ap': 'Andhra Pradesh',
  'telangana': 'Telangana', 'assam': 'Assam', 'uttarakhand': 'Uttarakhand', 'uk': 'Uttarakhand',
  'jammu and kashmir': 'Jammu and Kashmir', 'j&k': 'Jammu and Kashmir', 'goa': 'Goa',
  'tripura': 'Tripura', 'meghalaya': 'Meghalaya', 'manipur': 'Manipur', 'mizoram': 'Mizoram',
  'nagaland': 'Nagaland', 'arunachal pradesh': 'Arunachal Pradesh', 'sikkim': 'Sikkim',
  'pondicherry': 'Puducherry', 'puducherry': 'Puducherry', 'chandigarh': 'Chandigarh',
  'all india': 'All India', 'all states': 'All India'
};

const QUERY_UNDERSTANDING_SYSTEM_PROMPT = `You are the Lead Query Understanding & Reasoning Layer for an intelligent NEET UG Medical Counselling System.
Analyze the user's latest message in conjunction with the conversation context and message history.

Supported Intents:
1. "COLLEGE_SEARCH": User wants to search/filter colleges matching criteria.
2. "COLLEGE_PREDICTION": User asks where they can get admission based on AIR/profile.
3. "RANK_ANALYSIS": User asks what their rank can get them, or evaluates chances for a rank.
4. "CUTOFF_ANALYSIS": User asks general cutoff trends or closing rank queries.
5. "COLLEGE_DETAILS": User asks for historical cutoffs, fees, or info on a specific college.
6. "COLLEGE_COMPARISON": User wants to compare 2 or more colleges (e.g. AIIMS vs VMMC, or "compare the first three").
7. "STATE_COMPARISON": User wants to compare cutoffs between states (e.g. UP vs Bihar, or "which states should I consider?").
8. "CATEGORY_COMPARISON": User compares cutoffs between categories (e.g. Gen vs OBC vs SC vs ST).
9. "QUOTA_COMPARISON": User asks about AIQ (15%) vs State Quota (85%) differences or cutoffs.
10. "ROUND_COMPARISON": User asks how cutoffs change across counselling rounds (Round 1 vs Round 2 vs Round 3).
11. "YEAR_COMPARISON": User asks how cutoffs changed between years (2023 vs 2024 vs 2025).
12. "HISTORICAL_ANALYSIS": User asks why a college was shown or how historical cutoffs were calculated.
13. "TREND_ANALYSIS": User asks about cutoff movement trends.
14. "BEST_MATCH_ANALYSIS": User asks for best fitting colleges across all states ("I don't care about state, show best match").
15. "SAFE_RANGE_ANALYSIS": User asks for colleges where their rank is comfortably better than opening/closing.
16. "STRETCH_RANGE_ANALYSIS": User asks for ambitious or border-case colleges.
17. "DATASET_STATISTICS": User asks what data/states/years/colleges exist in this system.
18. "GENERAL_NEET_QUESTION": General questions regarding MCC rules, free exit, bonds, counselling flowchart, eligibility.
19. "FOLLOW_UP": Follow-up refinement on existing search (e.g. "now private", "fees under 5L", "only AIQ").
20. "PROFILE_UPDATE": User updating their details (e.g. "my name is Subhajit", "my rank is 4000", "I am OBC").
21. "CLARIFICATION": User responding to a specific question.
22. "UNKNOWN": Input is not understandable or purely invalid.

CRITICAL RULES:
- Discard invalid numeric noise (e.g. concatenated digits or numbers > 2,500,000). Set air: null for invalid numbers.
- Separate domicileState ("from Bengal") from targetStates ("colleges in UP").
- Pronoun / Relative References: Resolve "the first one", "top 3", "these colleges", "same state", "what about Bihar?".
- Output ONLY valid JSON matching the schema below.

JSON Schema:
{
  "intent": string,
  "studentProfile": {
    "studentName": string | null,
    "air": number | null,
    "neetScore": number | null,
    "percentile": number | null,
    "categoryRank": number | null,
    "category": string | null,
    "domicileState": string | null,
    "pwd": boolean | null,
    "ews": boolean | null,
    "minority": boolean | null,
    "nri": boolean | null,
    "defence": boolean | null,
    "specialCategory": string | null,
    "gender": string | null
  },
  "searchContext": {
    "targetStates": string[],
    "course": string | null,
    "quota": string | null,
    "year": number | null,
    "round": string | null,
    "collegeType": string | null,
    "maxFees": number | null,
    "targetColleges": string[],
    "targetCategories": string[],
    "targetQuotas": string[],
    "targetRounds": string[],
    "targetYears": number[],
    "clearFields": string[]
  },
  "resolvedReferences": {
    "referencedCollegeNames": string[],
    "referencedIndices": number[]
  },
  "analysisRequirements": {
    "needsDatabase": boolean,
    "needsHistoricalAnalysis": boolean,
    "needsRankComparison": boolean,
    "needsStateComparison": boolean,
    "needsTrendAnalysis": boolean,
    "needsPrediction": boolean
  },
  "operations": string[]
}`;

function safeParseJson(text) {
  if (!text) return {};
  const cleaned = text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return {};
  }
}

/**
 * Deterministic NLU baseline: Extracts known patterns, numbers, states, categories, and references.
 */
function deterministicAnalyzeQuery(message, conversationContext = {}) {
  const text = (message || '').trim();
  const lower = text.toLowerCase();

  const prevProfile = conversationContext.studentProfile || conversationContext.context || {};
  const prevSearch = conversationContext.searchContext || conversationContext.context || {};
  const previousResults = conversationContext.previousResults || [];

  const analysis = {
    intent: 'COLLEGE_SEARCH',
    studentProfile: {
      studentName: null,
      air: null,
      neetScore: null,
      percentile: null,
      categoryRank: null,
      category: null,
      domicileState: null,
      pwd: null,
      ews: null,
      minority: null,
      nri: null,
      defence: null,
      specialCategory: null,
      gender: null,
    },
    searchContext: {
      targetStates: [],
      course: null,
      quota: null,
      year: null,
      round: null,
      collegeType: null,
      maxFees: null,
      targetColleges: [],
      targetCategories: [],
      targetQuotas: [],
      targetRounds: [],
      targetYears: [],
      clearFields: [],
    },
    resolvedReferences: {
      referencedCollegeNames: [],
      referencedIndices: [],
    },
    analysisRequirements: {
      needsDatabase: true,
      needsHistoricalAnalysis: true,
      needsRankComparison: false,
      needsStateComparison: false,
      needsTrendAnalysis: false,
      needsPrediction: false,
    },
    operations: ['FILTER_DATABASE'],
    isInvalidNoise: false,
    isGreetingOrOffTopic: false,
  };

  // Check for invalid concatenated numeric noise (e.g. 850480012000250004500065000120000)
  if (/^\d{8,}$/.test(text) && parseInt(text, 10) > 2500000) {
    analysis.isInvalidNoise = true;
    analysis.intent = 'UNKNOWN';
    analysis.operations = [];
    return analysis;
  }

  // 1. Greetings / Small talk
  if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|namaste|hola)(\s+there)?$/i.test(lower) || (/^(hi|hello|hey)\b/i.test(lower) && text.split(/\s+/).length <= 2)) {
    analysis.intent = 'GREETING';
    analysis.isGreetingOrOffTopic = true;
    analysis.analysisRequirements.needsDatabase = false;
    analysis.operations = ['EXPLAIN_COUNSELLING_OVERVIEW'];
  }

  // Scan mentioned states
  const foundStates = [];
  for (const [alias, canonical] of Object.entries(KNOWN_STATES_MAP)) {
    const reg = new RegExp(`\\b${alias.replace('.', '\\.')}\\b`, 'i');
    if (reg.test(text)) {
      if (!foundStates.includes(canonical)) foundStates.push(canonical);
    }
  }

  // 2. Intent Heuristics
  if (/^(what is|what are|explain|meaning of|define|tell me about)\s+(aiq|state quota|opening rank|closing rank|round \d|obc|ews|pwd|counselling|cutoff|historical cutoff)/i.test(lower) || /^(what is aiq|what is opening rank|what is closing rank|what is state quota)\??$/i.test(lower)) {
    analysis.intent = 'GENERAL_NEET_QUESTION';
    analysis.analysisRequirements.needsDatabase = false;
    analysis.analysisRequirements.needsHistoricalAnalysis = false;
    analysis.operations = ['EXPLAIN_COUNSELLING_CONCEPT'];
  } else if (/what if (my )?(air|rank|score) (is|was|were)|what if i (changed|change|switched)/i.test(lower)) {
    analysis.intent = 'WHAT_IF_ANALYSIS';
    analysis.isWhatIf = true;
    analysis.operations = ['TEMPORARY_RANK_ANALYSIS'];
  } else if (/why (is this college shown|is this shown|was this shown|shown|why is it shown)/i.test(lower)) {
    analysis.intent = 'HISTORICAL_ANALYSIS';
    analysis.operations = ['EXPLAIN_WHY_SHOWN'];
  } else if (/(which colleges became easier|easier over the|cutoff change over the years|trends? over years?|colleges became more competitive|historically easier)/i.test(lower)) {
    analysis.intent = 'TREND_ANALYSIS';
    analysis.operations = ['ANALYZE_HISTORICAL_TRENDS'];
  } else if (/(which states?|what states?|compare states?|states? comparison|suggest states?|states should i consider)/i.test(lower) || (/(compare|vs|versus)\b/i.test(lower) && foundStates.length > 1)) {
    analysis.intent = 'STATE_COMPARISON';
    analysis.analysisRequirements.needsStateComparison = true;
    analysis.operations = ['COMPARE_STATES'];
  } else if (/(compare|vs|versus|difference)\b/i.test(lower) && /(category|categories|gen(eral)?\s*(vs|and|\&|to)\s*obc|obc\s*(vs|and|\&|to)\s*sc|sc\s*(vs|and|\&|to)\s*st|ur\s*(vs|and|\&|to)\s*ews|cutoff difference)/i.test(lower)) {
    analysis.intent = 'CATEGORY_COMPARISON';
    analysis.operations = ['COMPARE_CATEGORIES'];
  } else if (/(compare|vs|versus)\b/i.test(lower) && /(quota|quotas|aiq vs state|state vs aiq|aiq \(15%\) vs state quota)/i.test(lower)) {
    analysis.intent = 'QUOTA_COMPARISON';
    analysis.operations = ['COMPARE_QUOTAS'];
  } else if (/(round\s*1\s*(vs|and|compared? to|compare to)\s*round\s*2|compare rounds|round-wise|rounds movement|round\s*\d\s*cutoffs?\s*compare)/i.test(lower)) {
    analysis.intent = 'ROUND_COMPARISON';
    analysis.operations = ['COMPARE_ROUNDS'];
  } else if (/(between\s+202[0-9]\s+and\s+202[0-9]|202[0-9]\s*(vs|and)\s*202[0-9]|compare years|year comparison|year-wise|cutoff change between|cutoff inflation)/i.test(lower)) {
    analysis.intent = 'YEAR_COMPARISON';
    analysis.operations = ['COMPARE_YEARS'];
  } else if (/(free exit|upgradation|security deposit|bond policy|seat forfeiture|mcc rule|counselling rules?|counselling process|documents? required|what documents|what happens if i do not join|not join in round)/i.test(lower)) {
    analysis.intent = 'GENERAL_NEET_QUESTION';
    analysis.analysisRequirements.needsDatabase = false;
    analysis.analysisRequirements.needsHistoricalAnalysis = false;
    analysis.operations = ['EXPLAIN_COUNSELLING_RULE'];
  } else if (/(match(es|ing)? (my )?(rank|air)|fit(s)? (my )?(rank|air)|for my (rank|air))/i.test(lower)) {
    analysis.intent = 'RANK_ANALYSIS';
    analysis.analysisRequirements.needsRankComparison = true;
    analysis.analysisRequirements.needsDatabase = true;
    analysis.operations = ['FILTER_DATABASE', 'COMPARE_AIR_WITH_CUTOFF'];
  } else if (/(compare|vs|versus)\b/i.test(lower) || /(compare (these|first|top))/i.test(lower)) {
    analysis.intent = 'COLLEGE_COMPARISON';
    analysis.operations = ['COMPARE_COLLEGES'];
  } else if (/(tell me about|info on|details of|fees and cutoffs for|cutoffs for)\s+([A-Za-z\s]+)/i.test(lower) && !/colleges? in/i.test(lower)) {
    analysis.intent = 'COLLEGE_DETAILS';
    analysis.operations = ['FETCH_COLLEGE_DETAILS'];
  } else if (/(what datasets?|what states? are available|available datasets?|dataset stats)/i.test(lower)) {
    analysis.intent = 'DATASET_STATISTICS';
    analysis.operations = ['FETCH_DATASET_STATISTICS'];
  } else if (/(free exit|upgradation|security deposit|bond policy|seat forfeiture|mcc rule|counselling process|documents required)/i.test(lower)) {
    analysis.intent = 'GENERAL_NEET_QUESTION';
    analysis.analysisRequirements.needsDatabase = false;
    analysis.operations = ['EXPLAIN_COUNSELLING_RULE'];
  } else if (/(best match|fit best|where my rank fits best|don't care about state|any state)/i.test(lower)) {
    analysis.intent = 'BEST_MATCH_ANALYSIS';
    analysis.searchContext.targetStates = ['All India'];
    analysis.analysisRequirements.needsRankComparison = true;
    analysis.operations = ['FILTER_DATABASE', 'COMPARE_AIR_WITH_CUTOFF', 'RANK_BEST_MATCHES'];
  } else if (/(can i get|what are my chances|chance of getting|where can i get|chances for|eligible colleges?|colleges for (my )?(rank|air)|which colleges can i get|give me eligible)/i.test(lower)) {
    analysis.intent = 'COLLEGE_PREDICTION';
    analysis.analysisRequirements.needsRankComparison = true;
    analysis.analysisRequirements.needsPrediction = true;
    analysis.operations = ['FILTER_DATABASE', 'COMPARE_AIR_WITH_CUTOFF', 'GENERATE_PREDICTION'];
  }

  // 3. Pronoun / Reference Resolution
  if (/(the first one|first college|top 1)\b/i.test(lower) && previousResults.length > 0) {
    const colName = previousResults[0]?.collegeName || previousResults[0]?.name;
    if (colName) {
      analysis.resolvedReferences.referencedCollegeNames.push(colName);
      analysis.resolvedReferences.referencedIndices.push(0);
      analysis.searchContext.targetColleges.push(colName);
    }
  } else if (/(the second one|second college)\b/i.test(lower) && previousResults.length > 1) {
    const colName = previousResults[1]?.collegeName || previousResults[1]?.name;
    if (colName) {
      analysis.resolvedReferences.referencedCollegeNames.push(colName);
      analysis.resolvedReferences.referencedIndices.push(1);
      analysis.searchContext.targetColleges.push(colName);
    }
  } else if (/(these three|first three|top 3|first 3)\b/i.test(lower) && previousResults.length >= 2) {
    for (let i = 0; i < Math.min(3, previousResults.length); i++) {
      const colName = previousResults[i]?.collegeName || previousResults[i]?.name;
      if (colName) {
        analysis.resolvedReferences.referencedCollegeNames.push(colName);
        analysis.resolvedReferences.referencedIndices.push(i);
        analysis.searchContext.targetColleges.push(colName);
      }
    }
  }

  // 4. Student Name extraction
  const nameMatch = text.match(/(?:my name is|call me|name is)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i) || text.match(/(?:i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (nameMatch) {
    const rawParts = nameMatch[1].trim().split(/\s+/);
    const stopWords = ['my', 'and', 'i', 'with', 'got', 'the', 'is', 'rank', 'air', 'from', 'want', 'am', 'score', 'marks', 'general', 'obc', 'sc', 'st', 'ews', 'pwd', 'ur', 'student', 'looking', 'interested', 'fine', 'here', 'an', 'candidate'];
    const validParts = [];
    for (const p of rawParts) {
      if (stopWords.includes(p.toLowerCase()) || KNOWN_STATES_MAP[p.toLowerCase()]) break;
      validParts.push(p);
    }
    if (validParts.length > 0) {
      analysis.studentProfile.studentName = validParts.join(' ');
    }
  }

  // 5. Score vs Category Rank vs AIR vs Percentile
  const categoryRankMatch = text.match(/(?:category rank|cat rank|caste rank|category merit)\s*(?:is|of|=|:)?\s*(\d{1,7})\b/i);
  if (categoryRankMatch) {
    analysis.studentProfile.categoryRank = parseInt(categoryRankMatch[1], 10);
    analysis.studentProfile.rankType = 'CATEGORY_RANK';
  }

  const scoreMatch = text.match(/(?:score|marks|scored)\s*(?:is|of|=|:)?\s*(\d{2,3})\b/i) || text.match(/\b(\d{2,3})\s*(?:marks|score)\b/i);
  if (scoreMatch) {
    analysis.studentProfile.neetScore = parseInt(scoreMatch[1], 10);
  }

  const percentileMatch = text.match(/\b(\d{1,2}(?:\.\d+)?)\s*(?:percentile|%)\b/i);
  if (percentileMatch) {
    analysis.studentProfile.percentile = parseFloat(percentileMatch[1]);
  }

  const textWithoutCommas = text.replace(/(\d+),(\d+)/g, '$1$2');

  // Check for explicit rankType declarations like "It is AIR", "It's AIR", "AIR rank", "category rank"
  if (/\b(?:it is|it's|its|i mean|my rank is|it is my)?\s*(?:air|all\s*india\s*rank|overall\s*rank)\b/i.test(text)) {
    analysis.studentProfile.rankType = 'AIR';
  } else if (/\b(?:it is|it's|its|i mean)?\s*(?:category\s*rank|cat\s*rank|caste\s*rank)\b/i.test(text)) {
    analysis.studentProfile.rankType = 'CATEGORY_RANK';
  }

  // Only parse AIR if not explicitly designated as a category rank
  if (!categoryRankMatch) {
    // Handle "4 thousand" / "20 thousand" / "40 thousand"
    const thousandMatch = textWithoutCommas.match(/\b(\d{1,3}(?:\.\d+)?)\s*(?:thousand)\b/i);
    if (thousandMatch) {
      analysis.studentProfile.air = Math.round(parseFloat(thousandMatch[1]) * 1000);
      if (!analysis.studentProfile.rankType) analysis.studentProfile.rankType = 'AIR';
    }

    // Handle "4k" / "20k" / "40k" / "40 K"
    const kRankMatch = textWithoutCommas.match(/\b(\d{1,3}(?:\.\d+)?)\s*k\b/i);
    if (kRankMatch && !analysis.studentProfile.air) {
      analysis.studentProfile.air = Math.round(parseFloat(kRankMatch[1]) * 1000);
      if (!analysis.studentProfile.rankType) analysis.studentProfile.rankType = 'AIR';
    }

    // Handle explicit AIR pattern (e.g. "air 400", "air is 400", "neet air 400")
    const explicitAirMatch = textWithoutCommas.match(/\b(?:air|neet air|all india rank)\s*(?:is|of|=|:)?\s*(\d{1,7})\b/i);
    if (explicitAirMatch && !analysis.studentProfile.air) {
      const parsed = parseInt(explicitAirMatch[1], 10);
      if (parsed > 0 && parsed <= 2500000 && parsed !== analysis.studentProfile.neetScore) {
        analysis.studentProfile.air = parsed;
        analysis.studentProfile.rankType = 'AIR';
      }
    }

    // Handle generic rank patterns (e.g. "rank 400", "rank is 400", "my rank is 400")
    const genericRankMatch = textWithoutCommas.match(/\b(?:rank|merit|got rank|rank is|actually my rank is)\s*(?:is|of|=|:)?\s*(\d{1,7})\b/i);
    if (genericRankMatch && !analysis.studentProfile.air) {
      const parsed = parseInt(genericRankMatch[1], 10);
      if (parsed > 0 && parsed <= 2500000 && parsed !== analysis.studentProfile.neetScore) {
        analysis.studentProfile.air = parsed;
        if (!analysis.studentProfile.rankType) {
          analysis.studentProfile.rankType = 'UNSPECIFIED';
        }
      }
    }

    // Standalone digits e.g. "400" / "4000" / "40000"
    const standaloneDigitsMatch = textWithoutCommas.match(/\b\d{2,7}\b/);
    if (standaloneDigitsMatch && !analysis.studentProfile.air && !analysis.studentProfile.neetScore && !scoreMatch) {
      const parsed = parseInt(standaloneDigitsMatch[0], 10);
      if (parsed > 0 && parsed <= 2500000 && !/202[0-9]/.test(standaloneDigitsMatch[0])) {
        analysis.studentProfile.air = parsed;
        if (!analysis.studentProfile.rankType) {
          analysis.studentProfile.rankType = 'UNSPECIFIED';
        }
      }
    }
  }

  // 6. Domicile & Target States Detection

  // Detect explicit domicile: "from West Bengal", "domicile is UP", "home state Kerala", "I have Kerala domicile"
  const domicileMatch = text.match(/(?:from|domicile(?: is| in)?|living in|home state(?: is)?|i have|holding)\s+([A-Za-z\s]+?)(?:domicile|and|\.|\,|$|\bwant\b|\blooking\b|\bcolleges\b|\bwith\b|\bin\b)/i);
  if (domicileMatch) {
    const candidate = domicileMatch[1].trim().toLowerCase();
    if (KNOWN_STATES_MAP[candidate]) {
      analysis.studentProfile.domicileState = KNOWN_STATES_MAP[candidate];
    }
  }
  if (/\b(?:kerala\s*domicile|domicile\s*(?:is|in)?\s*kerala)\b/i.test(lower)) {
    analysis.studentProfile.domicileState = 'Kerala';
  }

  // Detect Target States
  const nonDomicileStates = foundStates.filter((s) => s !== analysis.studentProfile.domicileState);
  if (nonDomicileStates.length > 0) {
    analysis.searchContext.targetStates = nonDomicileStates;
  } else if (foundStates.length === 1 && !analysis.studentProfile.domicileState) {
    analysis.searchContext.targetStates = [foundStates[0]];
  }

  // "which states should I consider" -> All India
  if (/which states? should i consider|suggest (me )?states?|all states?|across india/i.test(lower)) {
    analysis.searchContext.targetStates = ['All India'];
    analysis.intent = 'STATE_COMPARISON';
    analysis.operations = ['COMPARE_STATES'];
  }

  // 7. Category Detection (preserving specific source subcategories)
  if (/\b(obc-ncl|obc\s*ncl|obcncl)\b/i.test(lower)) {
    analysis.studentProfile.category = 'OBC-NCL';
  } else if (/\b(obc|o\.b\.c\.|other\s*backward\s*class|obc\s*candidate|i\s*am\s*an?\s*obc)\b/i.test(lower)) {
    analysis.studentProfile.category = 'OBC';
  } else if (/\b(sebc)\b/i.test(lower)) {
    analysis.studentProfile.category = 'SEBC';
  } else if (/\b(ezhava|ez)\b/i.test(lower)) {
    analysis.studentProfile.category = 'EZ';
  } else if (/\b(muslim|mu)\b/i.test(lower)) {
    analysis.studentProfile.category = 'MU';
  } else if (/\b(backward\s*hindu|bh)\b/i.test(lower)) {
    analysis.studentProfile.category = 'BH';
  } else if (/\b(latin\s*catholic|la)\b/i.test(lower)) {
    analysis.studentProfile.category = 'LA';
  } else if (/\b(dheevara|dv)\b/i.test(lower)) {
    analysis.studentProfile.category = 'DV';
  } else if (/\b(viswakarma|vk)\b/i.test(lower)) {
    analysis.studentProfile.category = 'VK';
  } else if (/\b(kudumbi|kn)\b/i.test(lower)) {
    analysis.studentProfile.category = 'KN';
  } else if (/\b(sc|s\.c\.|scheduled\s*caste)\b/i.test(lower)) {
    analysis.studentProfile.category = 'SC';
  } else if (/\b(st|s\.t\.|scheduled\s*tribe)\b/i.test(lower)) {
    analysis.studentProfile.category = 'ST';
  } else if (/\b(ews|e\.w\.s\.|economically\s*weaker)\b/i.test(lower)) {
    analysis.studentProfile.category = 'EWS';
    analysis.studentProfile.ews = true;
  } else if (/\b(general|gen|ur|unreserved|open|state\s*merit|sm)\b/i.test(lower)) {
    analysis.studentProfile.category = 'General';
  } else if (/\b(pwd|physically\s*handicapped|ph|divyang)\b/i.test(lower)) {
    analysis.studentProfile.category = 'PwD';
    analysis.studentProfile.pwd = true;
  }

  // 8. Quota Detection
  if (/\b(only aiq|show only aiq|aiq only|show aiq|through aiq|via aiq|in aiq|under aiq|all\s*india(\s*quota)?|\baiq\b)\b/i.test(lower)) {
    analysis.searchContext.quota = 'AIQ';
  } else if (/\b(show state quota|state quota only|only state quota|state\s*quota|state\s*counselling)\b/i.test(lower)) {
    analysis.searchContext.quota = 'State';
  } else if (/\b(management|mgmt|nri|deemed)\b/i.test(lower)) {
    const qMatch = text.match(/\b(management|nri|deemed)\b/i);
    analysis.searchContext.quota = qMatch ? qMatch[0] : null;
    if (/nri/i.test(lower)) analysis.studentProfile.nri = true;
  }

  // 9. Course Detection
  if (/\b(bds|dental)\b/i.test(lower)) analysis.searchContext.course = 'BDS';
  else if (/\b(bams|ayurveda)\b/i.test(lower)) analysis.searchContext.course = 'BAMS';
  else if (/\b(bhms|homeopathy)\b/i.test(lower)) analysis.searchContext.course = 'BHMS';
  else if (/\b(bums)\b/i.test(lower)) analysis.searchContext.course = 'BUMS';
  else if (/\b(mbbs|medical)\b/i.test(lower)) analysis.searchContext.course = 'MBBS';

  // 10. College Type & Budget
  if (/\b(government|govt|gmc)\b/i.test(lower)) analysis.searchContext.collegeType = 'Government';
  else if (/\b(private)\b/i.test(lower)) analysis.searchContext.collegeType = 'Private';
  else if (/\b(deemed)\b/i.test(lower)) analysis.searchContext.collegeType = 'Deemed';

  const feeMatch = text.match(/fees?\s*(?:under|below|<=|<|less than)?\s*₹?\s*(\d+)\s*(lakhs?|l|k|cr)?/i);
  if (feeMatch) {
    let amount = parseFloat(feeMatch[1]);
    const unit = (feeMatch[2] || '').toLowerCase();
    if (unit.startsWith('l')) amount *= 100000;
    else if (unit.startsWith('k')) amount *= 1000;
    else if (unit.startsWith('cr')) amount *= 10000000;
    analysis.searchContext.maxFees = Math.round(amount);
  }

  // 11. Round & Year
  const roundMatch = text.match(/\b(?:round|r)\s*([1-5]|mop-?up|stray)\b/i);
  if (roundMatch) {
    const rVal = roundMatch[1].toLowerCase();
    if (rVal === '1') analysis.searchContext.round = 'Round 1';
    else if (rVal === '2') analysis.searchContext.round = 'Round 2';
    else if (rVal === '3' || rVal.includes('mop')) analysis.searchContext.round = 'Round 3';
    else if (rVal.includes('stray')) analysis.searchContext.round = 'Stray Round';
  }

  const yearMatch = text.match(/\b(202[0-6])\b/);
  if (yearMatch) {
    analysis.searchContext.year = parseInt(yearMatch[1], 10);
  }

  // 12. Determine Analysis Operations & Intent Refinements
  const isExplicitSearchOrPrediction = /(colleges?|cutoff|predict|chances?|suitable|compare|versus|trend|best match|where can i get|can i get|find|list|show\s+colleges?|give me eligible)/i.test(lower);
  const isProfileUpdate = (
    analysis.studentProfile.studentName ||
    analysis.studentProfile.air ||
    analysis.studentProfile.categoryRank ||
    analysis.studentProfile.neetScore ||
    analysis.studentProfile.category ||
    analysis.studentProfile.domicileState ||
    (analysis.studentProfile.rankType && !analysis.studentProfile.air)
  ) &&
    !analysis.searchContext.targetStates?.length &&
    !isExplicitSearchOrPrediction;

  if (isProfileUpdate && (analysis.intent === 'COLLEGE_SEARCH' || analysis.intent === 'UNKNOWN')) {
    analysis.intent = 'UPDATE_PROFILE';
    analysis.analysisRequirements.needsDatabase = false;
    analysis.operations = ['UPDATE_STUDENT_PROFILE'];
  } else if (!isExplicitSearchOrPrediction && (analysis.searchContext.quota || analysis.searchContext.round || analysis.searchContext.year || (analysis.searchContext.targetStates?.length === 1 && /^(now|only|show)\s+/i.test(lower)))) {
    if (analysis.intent === 'COLLEGE_SEARCH' && !/colleges?/i.test(lower)) {
      analysis.intent = 'FOLLOW_UP';
    }
  }

  if (analysis.studentProfile.air || prevProfile.air) {
    analysis.analysisRequirements.needsRankComparison = true;
    if (!analysis.operations.includes('COMPARE_AIR_WITH_CUTOFF')) {
      analysis.operations.push('COMPARE_AIR_WITH_CUTOFF');
    }
  }

  return analysis;
}

/**
 * Main query analysis function combining deterministic analysis and Groq LLM understanding.
 */
async function analyzeUserQuery({ message, conversationContext = {}, history = [] }) {
  const deterministicResult = deterministicAnalyzeQuery(message, conversationContext);

  if (deterministicResult.isInvalidNoise || deterministicResult.isGreetingOrOffTopic) {
    return deterministicResult;
  }

  const openai = getClient();
  if (!openai) {
    return deterministicResult;
  }

  const historyText = (history || [])
    .slice(-6)
    .map((h) => `${h.role}: ${h.text}`)
    .join('\n');

  const userPrompt = `Current Student Profile: ${JSON.stringify(conversationContext.studentProfile || {})}
Current Search Context: ${JSON.stringify(conversationContext.searchContext || {})}
Previous Search Results Count: ${(conversationContext.previousResults || []).length}
Recent Conversation:
${historyText}

Latest User Message: "${message}"`;

  try {
    const completion = await openai.chat.completions.create({
      model: env.ai.model,
      messages: [
        { role: 'system', content: QUERY_UNDERSTANDING_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 700,
      temperature: 0,
    });

    const parsed = safeParseJson(completion.choices[0]?.message?.content);

    const mergedStudentProfile = {
      studentName: deterministicResult.studentProfile.studentName || parsed.studentProfile?.studentName || null,
      air: deterministicResult.studentProfile.air ?? parsed.studentProfile?.air ?? null,
      rankType: deterministicResult.studentProfile.rankType || parsed.studentProfile?.rankType || 'UNSPECIFIED',
      neetScore: deterministicResult.studentProfile.neetScore ?? parsed.studentProfile?.neetScore ?? null,
      percentile: deterministicResult.studentProfile.percentile ?? parsed.studentProfile?.percentile ?? null,
      categoryRank: deterministicResult.studentProfile.categoryRank ?? parsed.studentProfile?.categoryRank ?? null,
      category: deterministicResult.studentProfile.category || parsed.studentProfile?.category || null,
      domicileState: deterministicResult.studentProfile.domicileState || parsed.studentProfile?.domicileState || null,
      pwd: deterministicResult.studentProfile.pwd ?? parsed.studentProfile?.pwd ?? null,
      ews: deterministicResult.studentProfile.ews ?? parsed.studentProfile?.ews ?? null,
      minority: deterministicResult.studentProfile.minority ?? parsed.studentProfile?.minority ?? null,
      nri: deterministicResult.studentProfile.nri ?? parsed.studentProfile?.nri ?? null,
      defence: deterministicResult.studentProfile.defence ?? parsed.studentProfile?.defence ?? null,
      specialCategory: deterministicResult.studentProfile.specialCategory || parsed.studentProfile?.specialCategory || null,
      gender: deterministicResult.studentProfile.gender || parsed.studentProfile?.gender || null,
    };

    const targetStates = deterministicResult.searchContext.targetStates?.length > 0
      ? deterministicResult.searchContext.targetStates
      : parsed.searchContext?.targetStates || [];

    const mergedSearchContext = {
      targetStates,
      course: deterministicResult.searchContext.course || parsed.searchContext?.course || null,
      quota: deterministicResult.searchContext.quota || parsed.searchContext?.quota || null,
      year: deterministicResult.searchContext.year ?? parsed.searchContext?.year ?? null,
      round: deterministicResult.searchContext.round || parsed.searchContext?.round || null,
      collegeType: deterministicResult.searchContext.collegeType || parsed.searchContext?.collegeType || null,
      maxFees: deterministicResult.searchContext.maxFees ?? parsed.searchContext?.maxFees ?? null,
      targetColleges: deterministicResult.searchContext.targetColleges?.length > 0
        ? deterministicResult.searchContext.targetColleges
        : parsed.searchContext?.targetColleges || [],
      targetCategories: parsed.searchContext?.targetCategories || [],
      targetQuotas: parsed.searchContext?.targetQuotas || [],
      targetRounds: parsed.searchContext?.targetRounds || [],
      targetYears: parsed.searchContext?.targetYears || [],
      clearFields: parsed.searchContext?.clearFields || [],
    };

    return {
      intent: parsed.intent || deterministicResult.intent,
      studentProfile: mergedStudentProfile,
      searchContext: mergedSearchContext,
      resolvedReferences: parsed.resolvedReferences || deterministicResult.resolvedReferences,
      analysisRequirements: parsed.analysisRequirements || deterministicResult.analysisRequirements,
      operations: parsed.operations || deterministicResult.operations,
    };
  } catch (err) {
    console.error('[queryUnderstandingService] LLM analysis failed, using deterministic:', err.message);
    return deterministicResult;
  }
}

module.exports = {
  analyzeUserQuery,
  deterministicAnalyzeQuery,
  KNOWN_STATES_MAP,
};
