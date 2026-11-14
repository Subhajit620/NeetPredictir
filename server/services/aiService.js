const OpenAI = require('openai');
const env = require('../config/env');
const { CLASSIFICATION } = require('../config/constants');
const queryUnderstanding = require('./queryUnderstandingService');

let client = null;
function getClient() {
  if (!env.ai.apiKey) return null;
  if (!client) {
    client = new OpenAI({ apiKey: env.ai.apiKey, baseURL: env.ai.baseUrl });
  }
  return client;
}

const KNOWN_STATES_MAP = queryUnderstanding.KNOWN_STATES_MAP;

async function extractIntent({ message, context = {}, history = [] }) {
  const analysis = await queryUnderstanding.analyzeUserQuery({ message, conversationContext: context, history });
  const profile = analysis.studentProfile || {};
  const search = analysis.searchContext || {};

  return {
    intent: analysis.intent,
    studentName: profile.studentName,
    name: profile.studentName,
    air: profile.air,
    rank: profile.air,
    neetScore: profile.neetScore,
    score: profile.neetScore,
    percentile: profile.percentile,
    categoryRank: profile.categoryRank,
    category: profile.category,
    domicileState: profile.domicileState,
    pwd: profile.pwd,
    ews: profile.ews,
    minority: profile.minority,
    nri: profile.nri,
    defence: profile.defence,
    specialCategory: profile.specialCategory,
    gender: profile.gender,
    targetStates: search.targetStates || [],
    targetState: search.targetStates?.[0] || null,
    state: search.targetStates?.[0] || null,
    course: search.course || 'MBBS',
    quota: search.quota,
    year: search.year,
    round: search.round,
    collegeType: search.collegeType,
    maxFees: search.maxFees,
    targetColleges: search.targetColleges || [],
    targetCategories: search.targetCategories || [],
    targetQuotas: search.targetQuotas || [],
    targetRounds: search.targetRounds || [],
    targetYears: search.targetYears || [],
    clearFields: search.clearFields || [],
    resolvedReferences: analysis.resolvedReferences || {},
    analysisRequirements: analysis.analysisRequirements || {},
    operations: analysis.operations || [],
    isGreetingOrOffTopic: analysis.isGreetingOrOffTopic || false,
    isInvalidNoise: analysis.isInvalidNoise || false,
  };
}

function deterministicExtractIntent(message, context = {}) {
  const analysis = queryUnderstanding.deterministicAnalyzeQuery(message, context);
  const profile = analysis.studentProfile || {};
  const search = analysis.searchContext || {};

  return {
    intent: analysis.intent,
    studentName: profile.studentName,
    name: profile.studentName,
    air: profile.air,
    rank: profile.air,
    neetScore: profile.neetScore,
    score: profile.neetScore,
    percentile: profile.percentile,
    categoryRank: profile.categoryRank,
    category: profile.category,
    domicileState: profile.domicileState,
    pwd: profile.pwd,
    ews: profile.ews,
    minority: profile.minority,
    nri: profile.nri,
    defence: profile.defence,
    specialCategory: profile.specialCategory,
    gender: profile.gender,
    targetStates: search.targetStates || [],
    targetState: search.targetStates?.[0] || null,
    state: search.targetStates?.[0] || null,
    course: search.course || 'MBBS',
    quota: search.quota,
    year: search.year,
    round: search.round,
    collegeType: search.collegeType,
    maxFees: search.maxFees,
    targetColleges: search.targetColleges || [],
    targetCategories: search.targetCategories || [],
    targetQuotas: search.targetQuotas || [],
    targetRounds: search.targetRounds || [],
    targetYears: search.targetYears || [],
    clearFields: search.clearFields || [],
    resolvedReferences: analysis.resolvedReferences || {},
    analysisRequirements: analysis.analysisRequirements || {},
    operations: analysis.operations || [],
    isGreetingOrOffTopic: analysis.isGreetingOrOffTopic || false,
    isInvalidNoise: analysis.isInvalidNoise || false,
  };
}

const COUNSELLING_MENTOR_SYSTEM_PROMPT = `You are the Lead NEET UG Counselling Mentor & Medical Admissions Strategist for the NEET College Predictor platform.
Your mission is to provide deep, query-aware, intelligent counselling analysis based on verified historical NEET datasets.

CORE PRINCIPLES:
1. QUERY-SPECIFIC REASONING:
   - Carefully analyze the student's exact question and give a direct, tailored answer.
   - If they ask "which college is suitable for me?", analyze the best matching institutions in the retrieved data, highlighting why their AIR fits the opening-closing window.
   - If they ask a comparison, explain the factual differences in closing ranks, quota cutoffs, or tuition fees.
   - If they ask about counselling rules, explain MCC / State counselling procedures (Free Exit, Upgradation, Security Deposit forfeiture) accurately.
2. STRICT FACTUAL GROUNDING:
   - Rely strictly on the retrieved database records and analytics provided in the prompt.
   - Never invent colleges, cutoffs, seat numbers, or fees.
   - If no records match, explain clearly what was searched and suggest alternative categories, states, or quotas to explore.
3. NO PROBABILISTIC OVERPROMISES:
   - Do NOT use terms like "90% chance", "Guaranteed", "Sure-shot".
   - Use factual historical status labels: "Within Historical Range", "Better than Historical Opening", "Beyond Historical Closing".
4. FORMATTING:
   - Format cleanly using markdown (bold headings, bullet points).
   - If the student's name is known, greet them personally.
   - End with a short factual disclaimer that counselling cutoffs vary by year and seat availability.`;

/**
 * Generate intelligent grounded response based on intent and database query results.
 */
async function generateIntelligentResponse({ intent, userMessage, filters, queryResult, context }) {
  const openai = getClient();
  const studentName = filters?.studentName || filters?.name || context?.studentName || context?.name || null;

  const deterministicResponse = buildDeterministicSummary({ intent, userMessage, filters, queryResult, studentName });

  if (!openai) {
    return deterministicResponse;
  }

  const promptPayload = {
    studentName,
    userMessage,
    intent,
    appliedFilters: filters,
    data: queryResult,
  };

  const userPrompt = `Student Name: ${studentName || 'Student'}
Student's Specific Query: "${userMessage}"
Identified Intent: ${intent}
Active Search Context: ${JSON.stringify(filters || {})}

Retrieved Verified Database Data (SOURCE OF TRUTH):
${JSON.stringify(promptPayload.data)}

Instructions for your response:
1. Directly answer the student's specific question: "${userMessage}".
2. Provide thoughtful analysis of the retrieved colleges, cutoffs, ranks, and trends relevant to their question.
3. Highlight top suitable options or key factual findings (e.g. historical opening/closing cutoff gaps, tuition fees, quota differences).
4. Keep the explanation engaging, professional, and grounded in the data above.`;

  try {
    const completion = await openai.chat.completions.create({
      model: env.ai.model,
      messages: [
        { role: 'system', content: COUNSELLING_MENTOR_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 900,
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    let finalExplanation = text || deterministicResponse.explanation;
    if (finalExplanation && !finalExplanation.includes('Active Counselling Filters')) {
      finalExplanation = `${renderActiveFiltersBlock(filters)}\n${finalExplanation}`;
    }
    return {
      explanation: finalExplanation,
      suggestedFollowUps: deterministicResponse.suggestedFollowUps,
    };
  } catch (err) {
    console.error('[aiService] generateIntelligentResponse failed, using fallback:', err.message);
    return deterministicResponse;
  }
}

function renderActiveFiltersBlock(filters = {}) {
  const name = filters.studentName || filters.name;
  const rank = filters.air || filters.rank;
  const rankType = filters.rankType || 'UNSPECIFIED';
  const category = filters.category || 'All Categories';
  const targetState = filters.targetStates?.length > 1 ? filters.targetStates.join(', ') : (filters.targetState || filters.state || 'All India');
  const domicile = filters.domicileState || 'Not Specified';
  const course = filters.course || 'MBBS';
  const quota = filters.quota || 'All Quotas (AIQ & State)';
  const round = filters.round || null;
  const year = filters.year || null;

  let block = `### 🎯 Active Counselling Filters\n`;
  if (name) block += `• **Candidate Name**: ${name}\n`;
  if (rank) {
    const rankLabel = rankType === 'AIR' ? 'All India Rank (AIR)' : (rankType === 'CATEGORY_RANK' ? 'Category Rank' : 'Unspecified (Please confirm)');
    block += `• **NEET Rank**: ${rank.toLocaleString('en-IN')} (Type: **${rankLabel}**)\n`;
  }
  block += `• **Category**: ${category}\n`;
  block += `• **Target State**: ${targetState}\n`;
  block += `• **Domicile State**: ${domicile}\n`;
  block += `• **Course**: ${course}\n`;
  block += `• **Quota**: ${quota}\n`;
  if (round) block += `• **Round**: ${round}\n`;
  if (year) block += `• **Year**: ${year}\n`;

  return block;
}

/**
 * Deterministic explanation builder for each intent.
 */
function buildDeterministicSummary({ intent, userMessage, filters, queryResult, studentName }) {
  const followUps = [];
  const filtersBlock = renderActiveFiltersBlock(filters);

  switch (intent) {
    case 'COLLEGE_SEARCH':
    case 'COLLEGE_PREDICTION':
    case 'BEST_MATCH_ANALYSIS':
    case 'SAFE_RANGE_ANALYSIS':
    case 'STRETCH_RANGE_ANALYSIS': {
      const records = queryResult?.records || [];
      const total = queryResult?.totalFiltered || records.length;
      const rank = filters?.air || filters?.rank;
      const state = filters?.targetStates?.length > 1 ? filters.targetStates.join(', ') : (filters?.targetState || filters?.state || 'All India');
      const category = filters?.category || 'General';
      const course = filters?.course || 'MBBS';
      const coverage = queryResult?.coverage;
      const isBroaderView = queryResult?.isBroaderView || false;

      let expl = `${filtersBlock}\n`;

      // 1. Disambiguation Notices
      if (queryResult?.needsRankTypeClarification) {
        expl += `⚠️ **Rank Disambiguation Needed**: You mentioned **Rank ${rank?.toLocaleString('en-IN')}**. Please specify whether this is your **NEET All India Rank (AIR)** or **Category Rank**, as official MCC cutoffs are recorded strictly by All India Rank.\n\n`;
      }
      if (queryResult?.needsDomicileClarification && state !== 'All India') {
        expl += `🏛️ **State Quota & Domicile Eligibility**: State Quota (85%) seats in **${state}** require **${state} Domicile**. For candidates without ${state} domicile, only **15% All India Quota (AIQ)** seats are applicable.\n\n`;
      }

      // 2. Dataset Coverage Notice
      if (coverage && !coverage.hasCoverage) {
        const missingReasons = coverage.missingFilters.map((m) => `• ${m.reason}`).join('\n');
        expl += `📌 **Dataset Coverage Notice**:\n${missingReasons}\n\n*Available states currently published in the database*: ${coverage.availableStates.join(', ')}.\n\n`;
      }

      // 3. Results Section
      const eligibleRecords = records.filter((r) => r.eligible === true || r.isWithinHistoricalRange || r.isBetterThanOpening);

      if (eligibleRecords.length === 0) {
        expl += `No historically eligible colleges found for AIR **${rank?.toLocaleString('en-IN')}** under **${category}** in **${state}** (all historical closing cutoffs were tighter than your rank).\n\nTry exploring:\n• All India Quota (AIQ) across other states\n• Other published states (${coverage?.availableStates?.slice(0, 5).join(', ') || 'AIQ States'})\n• Private or Deemed institutions`;
        followUps.push('Show All India Quota (AIQ)', 'Show Round 2', 'Try another state', 'Compare States');
        return { explanation: expl, suggestedFollowUps: followUps };
      }

      if (isBroaderView) {
        expl += `🌐 **Broader View (Historically Eligible AIQ Options across Available States)**:\n`;
        expl += `Since direct state cutoffs are not on file for **${state}**, here are verified **AIQ (15%)** medical colleges from published states where an AIR of **${rank?.toLocaleString('en-IN')}** is **historically eligible** (within closing cutoffs) for **${category}**:\n\n`;
      } else {
        expl += `Found **${eligibleRecords.length}** historically eligible medical colleges for **${state}** (${category}):\n\n`;
      }

      // Format eligible records
      eligibleRecords.slice(0, 8).forEach((r, i) => {
        const opStr = r.openingRank ? `AIR ${r.openingRank.toLocaleString('en-IN')}` : 'N/A';
        const clStr = r.closingRank ? `AIR ${r.closingRank.toLocaleString('en-IN')}` : 'N/A';

        expl += `${i + 1}. **${r.collegeName}** (${r.state})\n`;
        expl += `   • **Quota & Category**: ${r.quota || 'AIQ'} • ${r.category}\n`;
        expl += `   • **Round & Year**: ${r.round || 'Round 1'} (${r.year || 2025})\n`;
        expl += `   • **Cutoff Range**: ${opStr} → ${clStr}\n`;
        expl += `   • **Eligibility Status**: 🟢 **${r.statusLabel || 'Historically Eligible (Within Closing)'}**\n`;
        if (r.whyShown) {
          expl += `   • **Why Eligible**: ${r.whyShown}\n`;
        }
        if (r.source || r.sourceFile) expl += `   • **Source**: \`${r.source || r.sourceFile}\`\n`;
        expl += `\n`;
      });

      expl += `*Disclaimer: These comparisons are historical estimates based on previously published allotments, not admission guarantees.*`;

      followUps.push('Show only AIQ', 'Show State Quota', 'Show Round 2', 'Compare the first 3');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'RANK_ANALYSIS': {
      const stats = queryResult?.stats || {};
      const rank = queryResult?.rank || filters?.air || filters?.rank;
      let expl = `${filtersBlock}\n### 📊 Historical NEET Rank Analysis (AIR ${rank?.toLocaleString('en-IN')})\n\n`;
      expl += `Factual breakdown against historical counselling records:\n\n`;
      expl += `• **Within Historical Range**: ${stats.withinRangeCount || 0} records (Your AIR is between opening and closing cutoffs)\n`;
      expl += `• **Better than Historical Opening**: ${stats.betterThanOpeningCount || 0} records (Your AIR is numerically better than opening cutoff)\n`;
      expl += `• **Beyond Historical Closing**: ${stats.beyondClosingCount || 0} records (Historical closing cutoff was lower than your AIR)\n`;
      if (stats.eligibleGovernmentColleges > 0) {
        expl += `• **Government Seats on File**: ${stats.eligibleGovernmentColleges} matching records\n`;
      }
      expl += `\nThese figures are based strictly on previous year published counselling datasets.`;

      followUps.push('Show only AIQ', 'Show State Quota', 'Show Round 2', 'Compare the first 3');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'STATE_COMPARISON': {
      const states = queryResult?.states || [];
      let expl = `${filtersBlock}\n### 🌐 Inter-State Counselling Comparison\n\n`;
      states.forEach((st) => {
        expl += `#### 📍 **${st.state}**\n`;
        if (st.totalColleges > 0) {
          expl += `• **Colleges Available**: ${st.totalColleges} institutions (${st.totalCutoffRecords} cutoffs)\n`;
          expl += `• **Closing Rank Range**: AIR ${st.mostCompetitiveClosingRank?.toLocaleString('en-IN')} to AIR ${st.easiestClosingRank?.toLocaleString('en-IN')}\n`;
          expl += `• **Average Closing Rank**: AIR ${st.averageClosingRank?.toLocaleString('en-IN') || 'N/A'}\n`;
          if (st.eligibleRecordsCount > 0) {
            expl += `• **Eligible Allotment Records**: ${st.eligibleRecordsCount} choices match your rank.\n`;
          }
        } else {
          expl += `• *No published records in current dataset.*\n`;
        }
        expl += `\n`;
      });
      followUps.push('Show only AIQ', 'Show State Quota', 'Compare first 3');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'CATEGORY_COMPARISON': {
      const cats = queryResult?.categories || [];
      const targetState = queryResult?.targetState || 'All India';
      let expl = `${filtersBlock}\n### 🏷️ Category Cutoff Comparison (${targetState})\n\n`;
      cats.forEach((c) => {
        expl += `• **${c.category}**: Cutoffs ranged from AIR **${c.openingCutoff?.toLocaleString('en-IN') || 'N/A'}** to **${c.closingCutoff?.toLocaleString('en-IN') || 'N/A'}** (Avg: AIR ${c.averageClosingRank?.toLocaleString('en-IN') || 'N/A'})\n`;
      });
      expl += `\n*Note: Reserved category candidates are also eligible for unreserved (UR/General) merit seats if their rank qualifies.*`;
      followUps.push('Show only AIQ', 'Show State Quota', 'Show Round 2');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'QUOTA_COMPARISON': {
      const quotas = queryResult?.quotas || [];
      let expl = `${filtersBlock}\n### 🏛️ Quota Cutoff Comparison\n\n`;
      quotas.forEach((q) => {
        expl += `• **${q.quota}**: Historical cutoffs spanned AIR **${q.openingCutoff?.toLocaleString('en-IN') || 'N/A'}** to **${q.closingCutoff?.toLocaleString('en-IN') || 'N/A'}** (Avg: AIR ${q.averageClosingRank?.toLocaleString('en-IN') || 'N/A'})\n`;
      });
      followUps.push('Show only AIQ', 'Show State Quota', 'Show Round 2');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'ROUND_COMPARISON': {
      const rounds = queryResult?.rounds || [];
      let expl = `${filtersBlock}\n### 🔄 Round-wise Cutoff Movement\n\n`;
      rounds.forEach((r) => {
        expl += `• **${r.round}**: Closing rank moved up to AIR **${r.maxClosing?.toLocaleString('en-IN') || 'N/A'}** (Average closing: AIR ${r.avgClosing?.toLocaleString('en-IN') || 'N/A'})\n`;
      });
      followUps.push('Show Round 1', 'Show Round 2', 'Show only AIQ');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'COLLEGE_DETAILS': {
      const col = queryResult;
      let expl = `${filtersBlock}\n### 🏥 ${col?.collegeName || 'College Information'}\n\n`;
      expl += `• **State**: ${col?.state || 'N/A'}\n`;
      expl += `• **Tuition Fees**: ${col?.summary?.fees ? `₹${col.summary.fees.toLocaleString('en-IN')}` : 'Refer prospectus / Government rate'}\n`;
      expl += `• **Historical Cutoff Range**: AIR ${col?.summary?.lowestClosing?.toLocaleString('en-IN')} to AIR ${col?.summary?.highestClosing?.toLocaleString('en-IN')}\n`;
      expl += `• **Available Data Years**: ${col?.summary?.years?.join(', ') || 'N/A'}\n`;
      expl += `• **Categories on File**: ${col?.summary?.categories?.join(', ') || 'N/A'}\n\n`;
      expl += `Review the detailed cutoff history table below for round-by-round closing ranks.`;
      followUps.push('Compare with another college', 'Show other colleges in this state');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'WHAT_IF_ANALYSIS': {
      const records = queryResult?.records || [];
      const total = queryResult?.totalFiltered || records.length;
      const simRank = queryResult?.simulatedRank;
      const currRank = queryResult?.currentRank;
      let expl = `${filtersBlock}\n### 🔮 What-If Simulation Analysis\n\n`;
      expl += `• **Simulated AIR**: ${simRank?.toLocaleString('en-IN') || 'N/A'}\n`;
      if (currRank) expl += `• **Your Saved AIR**: ${currRank?.toLocaleString('en-IN')} *(preserved in your profile)*\n`;
      expl += `\nWith a simulated rank of **AIR ${simRank?.toLocaleString('en-IN')}**, I found **${total}** matching historical counselling records:\n\n`;
      expl += `• **${queryResult?.withinRange || 0}** within historical cutoff range\n`;
      expl += `• **${queryResult?.betterThanOpening || 0}** better than historical opening rank\n`;
      expl += `• **${queryResult?.beyondClosing || 0}** beyond historical closing rank\n\n`;
      expl += `Explore the simulated matching colleges below.`;
      followUps.push('Show only AIQ', 'Show State Quota', 'Compare first 3');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'TREND_ANALYSIS': {
      const res = queryResult || {};
      let expl = `${filtersBlock}\n### 📈 Multi-Year Historical Cutoff Trend Analysis\n\n`;
      expl += `Analyzed **${res.totalCollegesAnalyzed || 0}** institutions across published years.\n\n`;
      if (res.easierColleges?.length > 0) {
        expl += `#### 🟢 Colleges Where Historical Cutoffs Relaxed (Closing Rank Shifted Higher):\n`;
        res.easierColleges.slice(0, 5).forEach((c) => {
          expl += `• **${c.collegeName}** (${c.state}): Closing rank moved from AIR ${c.firstClosing?.toLocaleString('en-IN')} (${c.firstYear}) to AIR ${c.lastClosing?.toLocaleString('en-IN')} (${c.lastYear}) [Shift: +${c.closingChange.toLocaleString('en-IN')} ranks]\n`;
        });
        expl += `\n`;
      }
      if (res.competitiveColleges?.length > 0) {
        expl += `#### 🔴 Colleges That Became More Competitive (Closing Rank Tightened):\n`;
        res.competitiveColleges.slice(0, 5).forEach((c) => {
          expl += `• **${c.collegeName}** (${c.state}): Closing rank tightened from AIR ${c.firstClosing?.toLocaleString('en-IN')} (${c.firstYear}) to AIR ${c.lastClosing?.toLocaleString('en-IN')} (${c.lastYear})\n`;
        });
      }
      followUps.push('Show only AIQ', 'Show State Quota', 'Compare first 3');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'HISTORICAL_ANALYSIS': {
      let expl = `${filtersBlock}\n### 🔍 Historical Analysis & Cutoff Evidence\n\n`;
      expl += `This college is shown based on verified previous year counselling records:\n\n`;
      expl += `• **State**: ${filters?.targetState || filters?.state || 'All States'}\n`;
      expl += `• **Course**: ${filters?.course || 'MBBS'}\n`;
      if (filters?.category) expl += `• **Category**: ${filters.category}\n`;
      if (filters?.quota) expl += `• **Quota**: ${filters.quota}\n`;
      expl += `• **Evidence**: Your AIR falls within or is competitive against the historical opening and closing cutoffs on record.\n`;
      followUps.push('Show only AIQ', 'Show State Quota', 'Compare first 3');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'UPDATE_PROFILE': {
      let expl = `${filtersBlock}\n${studentName ? `Got it, **${studentName}**! ` : 'Got it! '}I have updated your profile context:\n\n`;
      const pAir = filters?.air || filters?.rank;
      if (pAir) expl += `• **NEET Rank**: ${pAir.toLocaleString('en-IN')}\n`;
      if (filters?.score || filters?.neetScore) expl += `• **NEET Score**: ${filters.score || filters.neetScore} marks\n`;
      if (filters?.category && filters.category !== 'All Categories') expl += `• **Category**: ${filters.category}\n`;
      if (filters?.domicileState) expl += `• **Domicile State**: ${filters.domicileState}\n`;
      if (filters?.targetState) expl += `• **Target State**: ${filters.targetState}\n`;
      if (filters?.quota) expl += `• **Quota**: ${filters.quota}\n`;
      if (filters?.course) expl += `• **Course**: ${filters.course}\n`;
      expl += `\nYou can now ask me about colleges matching your rank, cutoffs, quotas, states, rounds, or counselling rules.`;
      followUps.push('Show colleges for my rank', 'Show only AIQ', 'Compare states');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'GREETING': {
      let expl = `Hello${studentName ? `, **${studentName}**` : ''}! 👋 I am your **NEET UG AI Counselling Assistant**.\n\n`;
      expl += `I can help you with:\n`;
      expl += `• **College Predictor & Rank Fit**: Find which colleges match your AIR\n`;
      expl += `• **Cutoff & Trend Analysis**: Explore previous year closing ranks by state, quota, round, and category\n`;
      expl += `• **MCC & State Rules**: Understand Free Exit, Upgradation, and Bond policies\n\n`;
      expl += `How can I help you today?`;
      followUps.push('My name is Subhajit and my rank is 1520', 'Show colleges in Kerala', 'What is AIQ?');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'YEAR_COMPARISON': {
      const years = queryResult?.years || [];
      let expl = `${filtersBlock}\n### 📅 Year-over-Year Cutoff Comparison\n\n`;
      if (years.length > 0) {
        years.forEach((y) => {
          expl += `• **Year ${y.year}**: Closing cutoffs averaged AIR **${y.averageClosingRank?.toLocaleString('en-IN') || 'N/A'}** across ${y.totalRecords || 0} records.\n`;
        });
      } else {
        expl += `Cutoff data across published years is available in the verified dataset. Review the table below for exact year-by-year closing metrics.`;
      }
      followUps.push('Show Round 1', 'Show Round 2', 'Show only AIQ');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'COLLEGE_COMPARISON': {
      let expl = `${filtersBlock}\n### ⚖️ Medical College Comparison\n\n`;
      const comp = queryResult?.colleges || [];
      if (comp.length > 0) {
        comp.forEach((c) => {
          expl += `#### 🏥 **${c.collegeName}** (${c.state || 'N/A'})\n`;
          expl += `• **Historical Cutoff Range**: AIR ${c.lowestClosing?.toLocaleString('en-IN')} to AIR ${c.highestClosing?.toLocaleString('en-IN')}\n`;
          if (c.fees) expl += `• **Tuition Fees**: ₹${c.fees.toLocaleString('en-IN')}\n`;
          expl += `\n`;
        });
      } else {
        expl += `Side-by-side comparison of selected institutions based on historical closing ranks and quotas.\n`;
      }
      followUps.push('Show more colleges', 'Show only AIQ', 'Compare with another college');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    case 'GENERAL_NEET_QUESTION':
    case 'COUNSELLING_EXPLANATION': {
      let expl = `${filtersBlock}\n### 📋 NEET UG Counselling Information\n\n`;
      if (/aiq/i.test(userMessage)) {
        expl += `• **All India Quota (AIQ - 15%)**: Conducted by the Medical Counselling Committee (MCC) for 15% of seats in all government medical and dental colleges across India. Any candidate meeting NEET eligibility criteria can participate irrespective of domicile state.\n`;
      } else if (/state quota/i.test(userMessage)) {
        expl += `• **State Quota (85%)**: Conducted by respective State Counselling Authorities for 85% of seats in government colleges and 100% of seats in private colleges within the state, strictly subject to state domicile eligibility.\n`;
      } else if (/opening rank/i.test(userMessage)) {
        expl += `• **Opening Rank**: The All India Rank (AIR) of the very first candidate who was allotted a seat in a specific college, quota, and category during a counselling round.\n`;
      } else if (/closing rank/i.test(userMessage)) {
        expl += `• **Closing Rank (Cutoff)**: The All India Rank (AIR) of the last candidate who secured admission to that specific college, quota, and category in that round.\n`;
      } else {
        expl += `1. **Free Exit (Round 1)**: If allotted a seat in Round 1 AIQ/State, you can choose not to join without losing your security deposit.\n`;
        expl += `2. **Upgradation (Round 1 to Round 2)**: You can accept Round 1 seat and submit willingness to upgrade for Round 2. If upgraded, your previous seat is automatically cancelled.\n`;
        expl += `3. **Exit with Forfeiture (Round 2)**: If allotted in Round 2 and you do not join, you forfeit your security deposit but remain eligible for subsequent rounds with re-registration.\n`;
        expl += `4. **Round 3 / Mop-Up**: Fresh choice filling is allowed. Once joined in Round 3, candidates cannot vacate or participate further.\n`;
      }
      followUps.push('Show colleges for my rank', 'Show only AIQ', 'Show State Quota');
      return { explanation: expl, suggestedFollowUps: followUps };
    }

    default: {
      let expl = `${filtersBlock}\nGot it${studentName ? `, **${studentName}**` : ''}! `;
      expl += `I can assist you with college predictions, historical closing cutoffs, round movements, and counselling rules.\n\n`;
      expl += `Feel free to ask any question or specify your rank and target state to explore matching institutions.`;
      followUps.push('Show colleges for my rank', 'Show colleges in Kerala', 'What is AIQ?');
      return { explanation: expl, suggestedFollowUps: followUps };
    }
  }
}

module.exports = {
  extractIntent,
  generateIntelligentResponse,
  deterministicExtractIntent,
  CLASSIFICATION,
};
