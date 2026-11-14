const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_EXTENSIONS = new Set(['xlsx', 'xls', 'csv', 'pdf']);
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

function fileFilter(req, file, cb) {
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(new ApiError(400, `Unsupported file type ".${ext}". Allowed: xlsx, xls, csv, pdf.`));
    return;
  }
  cb(null, true);
}

// Memory storage: files are small enough (<=50MB) to parse in-process and
// we never need to execute or serve the raw upload back to a client.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

module.exports = upload;
