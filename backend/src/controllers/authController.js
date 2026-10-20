const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
}

exports.register = async (req, res) => {
  try {
    const { email, password, name, phone, gender, date_of_birth, city } = req.body;

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, phone, gender, date_of_birth, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, phone, gender, date_of_birth, city, role, subscription_plan, created_at`,
      [email, passwordHash, name, phone || null, gender || null, date_of_birth || null, city || null]
    );
    await db.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT DO NOTHING', [result.rows[0].id]);

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, login_as = 'user' } = req.body;

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Role-based access control
    if (login_as === 'admin') {
      if (user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admin credentials required.' });
      }
    } else if (login_as === 'professional') {
      const proCheck = await db.query('SELECT id, is_banned FROM professionals WHERE user_id = $1', [user.id]);
      if (!proCheck.rows.length) {
        return res.status(403).json({ success: false, message: 'No professional account found for this email.' });
      }
      if (proCheck.rows[0].is_banned) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been banned by admin. Please contact support@arpitvarta.com for assistance.',
          code: 'ACCOUNT_BANNED',
        });
      }
    } else {
      // login_as === 'user'
      if (user.role === 'admin') {
        return res.status(403).json({ success: false, message: 'Admin accounts must use the admin portal.' });
      }
      if (user.role === 'professional') {
        return res.status(403).json({ success: false, message: 'Professional accounts must use the professional portal.' });
      }
    }

    const token = generateToken(user.id);
    delete user.password_hash;

    res.json({ success: true, data: { user, token } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, name, avatar_url, phone, gender, date_of_birth, city, role,
              subscription_plan, created_at, must_change_password
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, gender, date_of_birth, city, avatar_url } = req.body;

    const result = await db.query(
      `UPDATE users SET name=COALESCE($1, name), phone=COALESCE($2, phone), gender=COALESCE($3, gender),
       date_of_birth=COALESCE($4, date_of_birth), city=COALESCE($5, city),
       avatar_url=COALESCE($6, avatar_url), updated_at=NOW()
       WHERE id=$7 RETURNING id, email, name, avatar_url, phone, gender, date_of_birth, city, role, subscription_plan`,
      [name || null, phone || null, gender || null, date_of_birth || null, city || null, avatar_url || null, req.user.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const avatarUrl = `${process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/uploads/avatars/${req.file.filename}`;

    await db.query('UPDATE users SET avatar_url=$1, updated_at=NOW() WHERE id=$2', [avatarUrl, req.user.id]);
    // Keep professionals table in sync so a.* returns the correct avatar
    await db.query('UPDATE professionals SET avatar_url=$1 WHERE user_id=$2', [avatarUrl, req.user.id]);

    res.json({ success: true, avatar_url: avatarUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2',
      [newHash, req.user.id]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
