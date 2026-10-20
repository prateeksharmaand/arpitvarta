const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../../uploads/chat');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (/image/.test(file.mimetype) || file.mimetype === 'application/octet-stream') cb(null, true);
    else cb(new Error('Only images are allowed'));
  },
});

router.post('/upload-image', authenticate, (req, res, next) => {
  chatUpload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image received' });
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  res.json({ success: true, data: { url: `${baseUrl}/uploads/chat/${req.file.filename}` } });
});

// Added for the website's user portal — no user-facing "list my
// consultations" endpoint existed before (only the professional-side
// equivalent in professionalController.getConsultationHistory). Read-only,
// reuses the existing consultations table, scoped to the caller's own id.
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [result, countResult] = await Promise.all([
      db.query(
        `SELECT c.*, a.display_name AS professional_name, a.avatar_url AS professional_avatar_url
         FROM consultations c
         JOIN professionals a ON a.id = c.professional_id
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM consultations WHERE user_id = $1`, [req.user.id]),
    ]);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id/end', authenticate, async (req, res) => {
  try {
    await db.query(
      `UPDATE consultations SET status = 'completed', ended_at = NOW() WHERE id = $1 AND user_id = $2 AND status != 'completed'`,
      [req.params.id, req.user.id]
    );
    await db.query(
      `UPDATE consultation_queue SET status = 'cancelled' WHERE consultation_id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
