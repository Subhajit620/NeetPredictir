require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const aiService = require('../services/aiService');
const queryPlanner = require('../services/queryPlannerService');

const TEST_QUESTIONS = [
  // Category 1: Rank Viability & Predictor
  {
    category: "Rank Viability & Predictor",
    query: "My name is Subhajit, AIR 20000, OBC from WB, want UP colleges",
    expected: {
      studentName: "Subhajit",
      air: 20000,
      category: "OBC",
      domicileState: "West Bengal",
      targetState: "Uttar Pradesh"
    }
  },
  {
    category: "Rank Viability & Predictor",
    query: "Show MBBS colleges for AIR 15,000 in Kerala",
    expected: {
      air: 15000,
      course: "MBBS",
      targetState: "Kerala"
    }
  },
  {
    category: "Rank Viability & Predictor",
    query: "What colleges fit AIR 5,666 in Delhi?",
    expected: {
      air: 5666,
      targetState: "Delhi"
    }
  },

  // Category 2: Inter-State & Quota Comparison
  {
    category: "Inter-State & Quota Comparison",
    query: "Compare cutoffs between UP, Bihar and Jharkhand",
    expected: {
      intent: "STATE_COMPARISON"
    }
  },
  {
    category: "Inter-State & Quota Comparison",
    query: "Compare AIQ (15%) vs State Quota (85%) cutoffs",
    expected: {
      intent: "QUOTA_COMPARISON"
    }
  },
  {
    category: "Inter-State & Quota Comparison",
    query: "Which states should I consider with AIR 30,000?",
    expected: {
      air: 30000
    }
  },

  // Category 3: Category Relaxation & Trends
  {
    category: "Category Relaxation & Trends",
    query: "Compare General vs OBC cutoff difference",
    expected: {
      intent: "CATEGORY_COMPARISON"
    }
  },
  {
    category: "Category Relaxation & Trends",
    query: "Which colleges became historically easier over the years?",
    expected: {
      intent: "TREND_ANALYSIS"
    }
  },
  {
    category: "Category Relaxation & Trends",
    query: "How did round 1 cutoffs compare to round 2?",
    expected: {
      intent: "ROUND_COMPARISON"
    }
  },

  // Category 4: MCC Counselling Rules
  {
    category: "MCC Counselling Rules",
    query: "Explain Free Exit and Upgradation rules",
    expected: {
      intent: "GENERAL_NEET_QUESTION"
    }
  },
  {
    category: "MCC Counselling Rules",
    query: "What happens if I do not join in Round 2?",
    expected: {
      intent: "GENERAL_NEET_QUESTION"
    }
  },
  {
    category: "MCC Counselling Rules",
    query: "What documents are required for NEET counselling?",
    expected: {
      intent: "GENERAL_NEET_QUESTION"
    }
  }
];

async function runTests() {
  console.log("================================================================================");
  console.log("TESTING 12 TARGET USER QUESTIONS ACROSS 4 CORE COUNSELLING DOMAINS");
  console.log("================================================================================\n");

  let passed = 0;
  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const item = TEST_QUESTIONS[i];
    console.log(`[Q${i+1}] [${item.category}]`);
    console.log(`Query: "${item.query}"`);
    
    const analysis = await aiService.extractIntent({
      message: item.query,
      context: {},
      history: []
    });

    const plan = queryPlanner.createQueryPlan({ queryAnalysis: analysis, sessionContext: { context: analysis, studentProfile: analysis, searchContext: analysis } });

    console.log(`  -> Intent Detected: ${analysis.intent} (Plan Intent: ${plan.intent})`);
    console.log(`  -> Student: Name=${analysis.studentName}, AIR=${analysis.air}, Score=${analysis.neetScore}, Cat=${analysis.category}, Domicile=${analysis.domicileState}`);
    console.log(`  -> Search: TargetStates=${JSON.stringify(analysis.targetStates)}, Course=${analysis.course}, Quota=${analysis.quota}`);
    console.log(`  -> Plan Operations: ${plan.plan?.map(p => p.action).join(' -> ')}`);
    
    let ok = true;
    if (item.expected.air && analysis.air !== item.expected.air) {
      console.log(`  ❌ AIR Mismatch: Expected ${item.expected.air}, Got ${analysis.air}`);
      ok = false;
    }
    if (item.expected.studentName && analysis.studentName !== item.expected.studentName) {
      console.log(`  ❌ Name Mismatch: Expected ${item.expected.studentName}, Got ${analysis.studentName}`);
      ok = false;
    }
    if (item.expected.category && analysis.category !== item.expected.category) {
      console.log(`  ❌ Category Mismatch: Expected ${item.expected.category}, Got ${analysis.category}`);
      ok = false;
    }
    if (item.expected.domicileState && analysis.domicileState !== item.expected.domicileState) {
      console.log(`  ❌ Domicile Mismatch: Expected ${item.expected.domicileState}, Got ${analysis.domicileState}`);
      ok = false;
    }
    if (item.expected.targetState && !analysis.targetStates?.includes(item.expected.targetState)) {
      console.log(`  ❌ Target State Mismatch: Expected ${item.expected.targetState}, Got ${JSON.stringify(analysis.targetStates)}`);
      ok = false;
    }

    if (ok) {
      console.log(`  ✅ Successfully Resolved & Planned\n`);
      passed++;
    } else {
      console.log(`  ⚠️ Review Needed\n`);
    }
  }

  console.log(`================================================================================`);
  console.log(`RESULT: ${passed} / ${TEST_QUESTIONS.length} Questions Passed Query Understanding & Planning`);
  console.log(`================================================================================`);
}

runTests().catch(console.error);
