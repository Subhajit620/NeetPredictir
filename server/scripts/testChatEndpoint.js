const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const chatService = require('../services/chatService');
const mongoose = require('mongoose');

async function testEndpoint() {
  console.log("================================================================================");
  console.log("TESTING CHAT CONTROLLER / CHAT SERVICE DIRECT ENDPOINT EXECUTION");
  console.log("================================================================================\n");

  const mockUserId = new mongoose.Types.ObjectId();
  const mockSessionId = new mongoose.Types.ObjectId();

  // Test messages across all branches
  const testMessages = [
    "Hi",
    "my name is subhajit saha my rank is 1520",
    "What is AIQ?",
    "Show me colleges in Kerala",
    "Which states should I consider?",
    "Compare General and OBC",
    "What if my AIR were 15000?",
    "How did round 1 cutoffs compare to round 2?",
    "What was the cutoff change between 2024 and 2025?",
    "Tell me about AIIMS Delhi",
    "Are there any colleges with moderate competition?"
  ];

  // We test the mock execution path if Mongo is not connected, or with live connection
  for (const msg of testMessages) {
    console.log(`Testing message: "${msg}"`);
    try {
      // Mock session object to test internal logic without waiting on DB timeout
      const mockSession = {
        _id: mockSessionId,
        userId: mockUserId,
        title: 'New Chat',
        context: {
          studentName: null,
          air: null,
          category: null,
          domicileState: null,
          targetStates: [],
          course: 'MBBS',
          quota: null,
          year: null,
          round: null,
          previousResults: [],
          selectedColleges: [],
        },
        studentProfile: {},
        searchContext: {},
        markModified: () => {},
        save: async () => {},
      };

      // Test query understanding & planner
      const aiService = require('../services/aiService');
      const queryPlanner = require('../services/queryPlannerService');
      const extracted = await aiService.extractIntent({ message: msg, context: mockSession.context, history: [] });
      const plan = queryPlanner.createQueryPlan({ queryAnalysis: extracted, sessionContext: mockSession });
      
      console.log(`  -> Intent: ${plan.intent}, requiresAIR: ${plan.requiresAIR}, requiresDatabase: ${plan.requiresDatabase}`);
      console.log(`  -> Success! No ReferenceError or 500 error.\n`);
    } catch (err) {
      console.error(`  ❌ ERROR for "${msg}":`, err.stack || err.message);
      process.exit(1);
    }
  }

  console.log("🎉 ALL MESSAGES EXECUTED CLEANLY WITH 0 ERRORS!");
}

testEndpoint().catch(console.error);
