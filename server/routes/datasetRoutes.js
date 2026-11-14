const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/datasetController');

const router = express.Router();

router.use(requireAdmin);

router.post('/upload', upload.single('file'), ctrl.uploadDataset);
router.post('/seed-sample', ctrl.seedSample);
router.get('/', ctrl.listDatasets);
router.get('/:id', ctrl.getDataset);
router.put('/:id/mapping', ctrl.updateMapping);
router.post('/:id/validate', ctrl.validateDataset);
router.post('/:id/import', ctrl.importDataset);
router.post('/:id/publish', ctrl.publishDataset);
router.post('/:id/archive', ctrl.archiveDataset);
router.delete('/:id', ctrl.deleteDataset);

module.exports = router;
