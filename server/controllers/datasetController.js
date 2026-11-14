const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const datasetService = require('../services/datasetService');

const uploadDataset = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded. Attach a file under the "file" field.');
  }

  const { year, round, counsellingType, state, autoPublish } = req.body;

  const result = await datasetService.uploadDataset({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    meta: { year, round, counsellingType, state },
    adminId: req.admin._id,
    autoPublish: autoPublish === true || autoPublish === 'true',
  });

  res.status(201).json({
    success: true,
    ...result,
    columnMapping: result.dataset?.columnMapping || {},
  });
});

const seedSample = asyncHandler(async (req, res) => {
  const result = await datasetService.seedSampleData(req.admin._id);
  res.status(201).json({
    success: true,
    message: 'Sample NEET counselling data loaded and published successfully.',
    ...result,
  });
});

const listDatasets = asyncHandler(async (req, res) => {
  const datasets = await datasetService.listDatasets(req.query);
  res.json({ success: true, datasets });
});

const getDataset = asyncHandler(async (req, res) => {
  const { errorRows, previewRows, dataset, detectedHeaders } = await datasetService.getValidationReport(req.params.id);
  res.json({ success: true, dataset, errorRows, previewRows, detectedHeaders });
});

const updateMapping = asyncHandler(async (req, res) => {
  const { mapping } = req.body;
  if (!mapping || typeof mapping !== 'object') {
    throw new ApiError(400, 'mapping object is required.');
  }
  const { dataset, summary } = await datasetService.updateMapping(req.params.id, mapping);
  res.json({ success: true, dataset, summary });
});

const validateDataset = asyncHandler(async (req, res) => {
  const report = await datasetService.getValidationReport(req.params.id);
  res.json({ success: true, ...report });
});

const importDataset = asyncHandler(async (req, res) => {
  const dataset = await datasetService.importDataset(req.params.id);
  res.json({ success: true, dataset });
});

const publishDataset = asyncHandler(async (req, res) => {
  const dataset = await datasetService.publishDataset(req.params.id);
  res.json({ success: true, dataset });
});

const archiveDataset = asyncHandler(async (req, res) => {
  const dataset = await datasetService.archiveDataset(req.params.id);
  res.json({ success: true, dataset });
});

const deleteDataset = asyncHandler(async (req, res) => {
  const confirmPublished = String(req.query.confirm) === 'true';
  await datasetService.deleteDataset(req.params.id, { confirmPublished });
  res.json({ success: true, message: 'Dataset deleted.' });
});

module.exports = {
  uploadDataset,
  seedSample,
  listDatasets,
  getDataset,
  updateMapping,
  validateDataset,
  importDataset,
  publishDataset,
  archiveDataset,
  deleteDataset,
};
