const multer = require('multer');
const path = require('path');

// Local storage (dev) — swap for S3 in production
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Media upload route handler
const uploadRoute = (req, res) => {
  if (!req.files?.length && !req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const files = req.files || [req.file];
  const urls = files.map(f => `/uploads/${f.filename}`);

  res.json({ urls, count: urls.length });
};

module.exports = { upload, uploadRoute };
