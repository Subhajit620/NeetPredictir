const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const chatService = require('../services/chatService');

const sendMessage = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  if (!message || !String(message).trim()) {
    throw new ApiError(400, 'message is required.');
  }

  const result = await chatService.processMessage({
    userId: req.user._id,
    sessionId: sessionId || null,
    message: String(message).trim(),
  });

  res.json({
    success: true,
    sessionId: result.session._id,
    sessionTitle: result.session.title,
    reply: result.message.text,
    askFor: result.askFor,
    records: result.records || [],
    total: result.total || 0,
    comparisonData: result.comparisonData || null,
    analyticsData: result.analyticsData || null,
    suggestedFollowUps: result.suggestedFollowUps || [],
    context: result.session.context,
    studentProfile: result.session.studentProfile,
    searchContext: result.session.searchContext,
  });
});

const listHistory = asyncHandler(async (req, res) => {
  const sessions = await chatService.listSessions(req.user._id);
  res.json({ success: true, sessions });
});

const getSession = asyncHandler(async (req, res) => {
  const result = await chatService.getSessionMessages(req.user._id, req.params.id);
  if (!result) throw new ApiError(404, 'Chat session not found.');
  res.json({ success: true, ...result });
});

const deleteSession = asyncHandler(async (req, res) => {
  const success = await chatService.deleteSession(req.user._id, req.params.id);
  if (!success) throw new ApiError(404, 'Chat session not found.');
  res.json({ success: true, message: 'Chat session deleted successfully.' });
});

module.exports = { sendMessage, listHistory, getSession, deleteSession };
