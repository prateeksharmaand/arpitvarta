const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// ─── Auth ─────────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = null;
    let isSubAdmin = false;

    const adminResult = await db.query(
      "SELECT id, email, name, password_hash, role FROM users WHERE email = $1 AND role = 'admin'",
      [email]
    );
    if (adminResult.rows.length) {
      user = adminResult.rows[0];
    } else {
      const subAdminResult = await db.query(
        "SELECT id, email, name, password_hash, permissions, is_active FROM sub_admins WHERE email = $1 AND is_active = TRUE",
        [email]
      );
      if (subAdminResult.rows.length) {
        user = subAdminResult.rows[0];
        isSubAdmin = true;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const tokenPayload = isSubAdmin ? { subAdminId: user.id, type: 'subadmin' } : { userId: user.id, type: 'admin' };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const adminData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: isSubAdmin ? 'subadmin' : 'superadmin',
    };
    if (isSubAdmin) {
      adminData.permissions = user.permissions;
    }

    res.json({ success: true, data: { token, admin: adminData } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res) => {
  try {
    const [users, professionals, consultations, wallet, pending, dau, mau, revenue, aiQueries] = await Promise.all([
      db.query("SELECT COUNT(*) FROM users WHERE role = 'user'"),
      db.query("SELECT COUNT(*) FROM professionals WHERE status = 'approved'"),
      db.query('SELECT COUNT(*) FROM consultations'),
      db.query('SELECT COALESCE(SUM(balance),0) AS total FROM wallets'),
      db.query("SELECT COUNT(*) FROM professionals WHERE status = 'pending'"),
      db.query("SELECT COUNT(DISTINCT user_id) FROM wallet_transactions WHERE created_at > NOW() - INTERVAL '1 day'"),
      db.query("SELECT COUNT(DISTINCT user_id) FROM wallet_transactions WHERE created_at > NOW() - INTERVAL '30 days'"),
      db.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE type = 'credit'), 0) AS total_revenue,
          COALESCE(SUM(amount) FILTER (WHERE type = 'credit' AND created_at > NOW() - INTERVAL '30 days'), 0) AS revenue_this_month
        FROM wallet_transactions
      `),
      db.query("SELECT COUNT(*) FROM ai_queries WHERE created_at > NOW() - INTERVAL '30 days'"),
    ]);

    const byCategory = await db.query(`
      SELECT c.name, c.icon, COUNT(DISTINCT p.id) AS professionals, COUNT(co.id) AS consultations
      FROM categories c
      LEFT JOIN professionals p ON p.category_id = c.id AND p.status = 'approved'
      LEFT JOIN consultations co ON co.professional_id = p.id
      GROUP BY c.id ORDER BY consultations DESC, professionals DESC
    `);

    const dauChart = await db.query(`
      SELECT DATE(created_at) AS date, COUNT(DISTINCT user_id) AS active_users
      FROM wallet_transactions
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: {
        total_users: parseInt(users.rows[0].count),
        active_professionals: parseInt(professionals.rows[0].count),
        total_consultations: parseInt(consultations.rows[0].count),
        wallet_balance_in_circulation: parseFloat(wallet.rows[0].total),
        pending_professionals: parseInt(pending.rows[0].count),
        ai_queries_30d: parseInt(aiQueries.rows[0].count),
        by_category: byCategory.rows.map(r => ({ ...r, professionals: parseInt(r.professionals), consultations: parseInt(r.consultations) })),
        dau: parseInt(dau.rows[0].count),
        mau: parseInt(mau.rows[0].count),
        total_revenue: parseFloat(revenue.rows[0].total_revenue),
        revenue_this_month: parseFloat(revenue.rows[0].revenue_this_month),
        dau_chart: dauChart.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── User Management ──────────────────────────────────────────────────────────

exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, is_banned } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = "WHERE u.role = 'user' AND NOT EXISTS (SELECT 1 FROM professionals a WHERE a.user_id = u.id)";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    if (is_banned !== undefined) {
      params.push(is_banned === 'true');
      where += ` AND u.is_banned = $${params.length}`;
    }

    params.push(limit, offset);
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.city, u.subscription_plan, u.is_banned, u.created_at,
             COALESCE(w.balance, 0) AS wallet_balance,
             (SELECT COUNT(*) FROM consultations c WHERE c.user_id = u.id) AS consultation_count
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const countResult = await db.query(`SELECT COUNT(*) FROM users u ${where}`, countParams);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [user, wallet, consultations, aiQueries] = await Promise.all([
      db.query('SELECT id, name, email, phone, gender, city, subscription_plan, is_banned, created_at FROM users WHERE id = $1', [id]),
      db.query('SELECT * FROM wallets WHERE user_id = $1', [id]),
      db.query(`
        SELECT c.*, a.display_name AS professional_name
        FROM consultations c
        JOIN professionals a ON c.professional_id = a.id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC LIMIT 20
      `, [id]),
      db.query('SELECT id, query, created_at FROM ai_queries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [id]),
    ]);

    if (!user.rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        ...user.rows[0],
        wallet: wallet.rows[0] || null,
        consultations: consultations.rows,
        ai_queries: aiQueries.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE users SET is_banned = true WHERE id = $1', [id]);
    res.json({ success: true, message: 'User banned' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE users SET is_banned = false WHERE id = $1', [id]);
    res.json({ success: true, message: 'User unbanned' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Professional Management ────────────────────────────────────────────────────

exports.listProfessionals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category_id, search } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (category_id) { params.push(parseInt(category_id)); where += ` AND a.category_id = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (a.display_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR a.profession_title ILIKE $${params.length})`;
    }

    if (status === 'banned') {
      where += ` AND a.is_banned = TRUE`;
    } else if (status) {
      params.push(status);
      where += ` AND a.status = $${params.length} AND (a.is_banned = FALSE OR a.is_banned IS NULL)`;
    }

    params.push(limit, offset);
    const result = await db.query(`
      SELECT a.*, u.name, u.email, u.phone, cat.name AS category_name, cat.icon AS category_icon,
             COALESCE((SELECT SUM(professional_earning) FROM consultations c WHERE c.professional_id = a.id AND c.status = 'completed'), 0) AS total_earnings
      FROM professionals a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN categories cat ON cat.id = a.category_id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const countResult = await db.query(`SELECT COUNT(*) FROM professionals a JOIN users u ON a.user_id = u.id ${where}`, countParams);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.approveProfessional = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "UPDATE professionals SET status = 'approved', is_verified = true WHERE id = $1 RETURNING user_id, display_name",
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Professional not found' });

    const { user_id, display_name } = result.rows[0];

    // Send FCM notification to the professional
    try {
      const tokensRes = await db.query('SELECT token FROM push_tokens WHERE user_id = $1', [user_id]);
      const tokens = tokensRes.rows.map(r => r.token);
      if (tokens.length) {
        await sendFCM(
          tokens,
          '🎉 Profile Approved!',
          'Congratulations! Your professional profile has been approved. You can now go online and start accepting consultations.',
          { type: 'professional_approved' }
        );
      }
      // Persist to notification inbox
      await persistNotifications(
        [user_id],
        '🎉 Profile Approved!',
        'Congratulations! Your professional profile has been approved. You can now go online and start accepting consultations.',
        'professional_approved',
        { type: 'professional_approved' }
      );
    } catch (notifErr) {
      console.error('FCM error (approve):', notifErr);
    }

    res.json({ success: true, message: 'Professional approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rejectProfessional = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await db.query(
      "UPDATE professionals SET status = 'rejected', rejection_reason = $2 WHERE id = $1 RETURNING user_id",
      [id, reason || null]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Professional not found' });

    const { user_id } = result.rows[0];

    // Send FCM notification to the professional
    try {
      const tokensRes = await db.query('SELECT token FROM push_tokens WHERE user_id = $1', [user_id]);
      const tokens = tokensRes.rows.map(r => r.token);
      const rejectMsg = reason
        ? `Your profile was not approved. Reason: ${reason}`
        : 'Your professional profile was not approved. Please contact support for more information.';
      if (tokens.length) {
        await sendFCM(tokens, 'Profile Not Approved', rejectMsg, { type: 'professional_rejected', reason: reason || '' });
      }
      await persistNotifications(
        [user_id],
        'Profile Not Approved',
        rejectMsg,
        'professional_rejected',
        { type: 'professional_rejected', reason: reason || '' }
      );
    } catch (notifErr) {
      console.error('FCM error (reject):', notifErr);
    }

    res.json({ success: true, message: 'Professional rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.setProfessionalRates = async (req, res) => {
  try {
    const { id } = req.params;
    const { per_minute_rate_chat, per_minute_rate_call, per_minute_rate_video } = req.body;
    const updates = [];
    const params = [];

    if (per_minute_rate_chat !== undefined) { params.push(per_minute_rate_chat); updates.push(`per_minute_rate_chat = $${params.length}`); }
    if (per_minute_rate_call !== undefined) { params.push(per_minute_rate_call); updates.push(`per_minute_rate_call = $${params.length}`); }
    if (per_minute_rate_video !== undefined) { params.push(per_minute_rate_video); updates.push(`per_minute_rate_video = $${params.length}`); }

    if (!updates.length) return res.status(400).json({ success: false, message: 'No rates provided' });

    params.push(id);
    await db.query(`UPDATE professionals SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    res.json({ success: true, message: 'Rates updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.toggleProfessionalOnline = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE professionals SET is_online = NOT is_online WHERE id = $1 RETURNING is_online',
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Professional not found' });
    res.json({ success: true, data: { is_online: result.rows[0].is_online } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.banProfessional = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await db.query(
      `UPDATE professionals SET is_banned = TRUE, ban_reason = $1, is_online = FALSE, is_available = FALSE WHERE id = $2 RETURNING id, display_name`,
      [reason || null, id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Professional not found' });
    res.json({ success: true, message: `${result.rows[0].display_name} has been banned` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.unbanProfessional = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE professionals SET is_banned = FALSE, ban_reason = NULL WHERE id = $1 RETURNING id, display_name`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Professional not found' });
    res.json({ success: true, message: `${result.rows[0].display_name} has been unbanned` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProfessionalEarnings = async (req, res) => {
  try {
    const { id } = req.params;
    const [summary, recent] = await Promise.all([
      db.query(`
        SELECT
          COALESCE(SUM(professional_earning), 0) AS total_earnings,
          COALESCE(SUM(professional_earning) FILTER (WHERE ended_at > NOW() - INTERVAL '30 days'), 0) AS earnings_this_month,
          COUNT(*) AS total_consultations
        FROM consultations
        WHERE professional_id = $1 AND status = 'completed'
      `, [id]),
      db.query(`
        SELECT id, type, status, started_at, ended_at, duration_seconds, professional_earning, total_amount
        FROM consultations
        WHERE professional_id = $1 AND status = 'completed'
        ORDER BY ended_at DESC LIMIT 20
      `, [id]),
    ]);

    res.json({ success: true, data: { summary: summary.rows[0], transactions: recent.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Category Management ──────────────────────────────────────────────────────

exports.listCategories = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, COUNT(p.id) AS professional_count,
             COUNT(p.id) FILTER (WHERE p.status = 'pending') AS pending_count
      FROM categories c LEFT JOIN professionals p ON p.category_id = c.id
      GROUP BY c.id ORDER BY c.sort_order, c.name
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const slugify = (str) => String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

exports.createCategory = async (req, res) => {
  try {
    const { name, slug, icon, description, sub_specialities, sort_order, is_active } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const result = await db.query(`
      INSERT INTO categories (name, slug, icon, description, sub_specialities, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [name, slug ? slugify(slug) : slugify(name), icon || '💼', description || null,
        sub_specialities || [], parseInt(sort_order) || 0, is_active !== false]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'A category with this slug already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['name', 'slug', 'icon', 'description', 'sub_specialities', 'sort_order', 'is_active'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] === undefined) continue;
      params.push(f === 'slug' ? slugify(req.body[f]) : req.body[f]);
      updates.push(`${f} = $${params.length}`);
    }
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(id);
    const result = await db.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'A category with this slug already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await db.query('SELECT COUNT(*) FROM professionals WHERE category_id = $1', [id]);
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete — ${check.rows[0].count} professional(s) use this category. Deactivate it instead.` });
    }
    const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.setProfessionalCategory = async (req, res) => {
  try {
    const { category_id } = req.body;
    const result = await db.query('UPDATE professionals SET category_id = $1 WHERE id = $2 RETURNING id', [category_id || null, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Professional not found' });
    res.json({ success: true, message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Wallet & Transactions ────────────────────────────────────────────────────

exports.listTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, user_id, gateway } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (type) { params.push(type); where += ` AND wt.type = $${params.length}`; }
    if (user_id) { params.push(user_id); where += ` AND wt.user_id = $${params.length}`; }
    if (gateway) { params.push(gateway); where += ` AND wt.payment_gateway = $${params.length}`; }

    params.push(limit, offset);
    const result = await db.query(`
      SELECT wt.*, u.name AS user_name, u.email AS user_email
      FROM wallet_transactions wt
      JOIN users u ON wt.user_id = u.id
      ${where}
      ORDER BY wt.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const countResult = await db.query(`SELECT COUNT(*) FROM wallet_transactions wt ${where}`, countParams);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.manualCredit = async (req, res) => {
  try {
    const { user_id, amount, description } = req.body;
    if (!user_id || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'user_id and positive amount required' });
    }

    await db.query('INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [user_id]);
    const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = $1', [user_id]);
    const w = walletRes.rows[0];

    await db.query('UPDATE wallets SET balance = balance + $1, total_added = total_added + $1 WHERE user_id = $2', [amount, user_id]);
    await db.query(`
      INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, status)
      VALUES ($1, $2, 'credit', $3, $4, $5, $6, 'success')
    `, [w.id, user_id, amount, w.balance, parseFloat(w.balance) + parseFloat(amount), description || 'Admin credit']);

    res.json({ success: true, message: `₹${amount} credited to user` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.manualDebit = async (req, res) => {
  try {
    const { user_id, amount, description } = req.body;
    if (!user_id || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'user_id and positive amount required' });
    }

    const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = $1', [user_id]);
    if (!walletRes.rows.length || parseFloat(walletRes.rows[0].balance) < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    const w = walletRes.rows[0];

    await db.query('UPDATE wallets SET balance = balance - $1, total_spent = total_spent + $1 WHERE user_id = $2', [amount, user_id]);
    await db.query(`
      INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, status)
      VALUES ($1, $2, 'debit', $3, $4, $5, $6, 'success')
    `, [w.id, user_id, amount, w.balance, parseFloat(w.balance) - parseFloat(amount), description || 'Admin debit']);

    res.json({ success: true, message: `₹${amount} debited from user` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.refundTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const txRes = await db.query('SELECT * FROM wallet_transactions WHERE id = $1', [id]);
    if (!txRes.rows.length) return res.status(404).json({ success: false, message: 'Transaction not found' });
    const tx = txRes.rows[0];

    if (tx.status === 'refunded') return res.status(400).json({ success: false, message: 'Already refunded' });
    if (tx.type !== 'debit') return res.status(400).json({ success: false, message: 'Only debit transactions can be refunded' });

    const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = $1', [tx.user_id]);
    const w = walletRes.rows[0];

    await db.query('UPDATE wallets SET balance = balance + $1, total_refunded = total_refunded + $1 WHERE user_id = $2', [tx.amount, tx.user_id]);
    await db.query(`
      INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, reference_type, status)
      VALUES ($1, $2, 'refund', $3, $4, $5, $6, 'refund', 'success')
    `, [w.id, tx.user_id, tx.amount, w.balance, parseFloat(w.balance) + parseFloat(tx.amount), reason || `Refund for transaction #${id}`]);

    await db.query("UPDATE wallet_transactions SET status = 'refunded' WHERE id = $1", [id]);

    res.json({ success: true, message: `₹${tx.amount} refunded` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Push Notifications ───────────────────────────────────────────────────────

async function sendFCM(tokens, title, body, data = {}) {
  if (!admin.apps.length) throw new Error('Firebase not initialized');
  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });
}

async function persistNotifications(userIds, title, body, type = 'general', data = {}) {
  if (!userIds.length) return;
  await db.query(
    `INSERT INTO user_notifications (user_id, title, body, type, data)
     SELECT u, $2, $3, $4, $5 FROM UNNEST($1::uuid[]) AS u`,
    [userIds, title, body, type, data]
  );
}

exports.sendBroadcastNotification = async (req, res) => {
  try {
    const { title, body, data } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: 'title and body required' });

    // Persist to all users' notification inboxes
    const usersRes = await db.query('SELECT id FROM users WHERE role = $1', ['user']);
    const userIds = usersRes.rows.map(r => r.id);
    if (userIds.length) await persistNotifications(userIds, title, body, data?.type || 'broadcast', data || {});

    const tokensRes = await db.query('SELECT DISTINCT token FROM push_tokens');
    if (!tokensRes.rows.length) return res.json({ success: true, message: 'No registered devices', sent: 0 });

    const tokens = tokensRes.rows.map(r => r.token);
    for (let i = 0; i < tokens.length; i += 500) {
      await sendFCM(tokens.slice(i, i + 500), title, body, data || {});
    }

    res.json({ success: true, message: 'Broadcast sent', sent: tokens.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
};

exports.sendSegmentedNotification = async (req, res) => {
  try {
    const { title, body, data, segment } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: 'title and body required' });

    let userQuery = 'SELECT DISTINCT u.id FROM users u WHERE u.role = $1';
    const userParams = ['user'];

    if (segment?.user_ids?.length) { userParams.push(segment.user_ids); userQuery += ` AND u.id = ANY($${userParams.length})`; }
    if (segment?.subscription_plan) { userParams.push(segment.subscription_plan); userQuery += ` AND u.subscription_plan = $${userParams.length}`; }
    if (segment?.city) { userParams.push(`%${segment.city}%`); userQuery += ` AND u.city ILIKE $${userParams.length}`; }

    const usersRes = await db.query(userQuery, userParams);
    const userIds = usersRes.rows.map(r => r.id);
    if (userIds.length) await persistNotifications(userIds, title, body, data?.type || 'broadcast', data || {});

    let tokenQuery = 'SELECT DISTINCT pt.token FROM push_tokens pt JOIN users u ON pt.user_id = u.id WHERE 1=1';
    const tokenParams = [];

    if (segment?.user_ids?.length) { tokenParams.push(segment.user_ids); tokenQuery += ` AND pt.user_id = ANY($${tokenParams.length})`; }
    if (segment?.subscription_plan) { tokenParams.push(segment.subscription_plan); tokenQuery += ` AND u.subscription_plan = $${tokenParams.length}`; }
    if (segment?.city) { tokenParams.push(`%${segment.city}%`); tokenQuery += ` AND u.city ILIKE $${tokenParams.length}`; }

    const tokensRes = await db.query(tokenQuery, tokenParams);
    if (!tokensRes.rows.length) return res.json({ success: true, message: 'No matching devices', sent: userIds.length });

    const tokens = tokensRes.rows.map(r => r.token);
    for (let i = 0; i < tokens.length; i += 500) {
      await sendFCM(tokens.slice(i, i + 500), title, body, data || {});
    }

    res.json({ success: true, message: 'Segmented notification sent', sent: tokens.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
};

// ─── Withdrawal Requests ──────────────────────────────────────────────────────

exports.listWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category_id, search } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (category_id) { params.push(parseInt(category_id)); where += ` AND a.category_id = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (a.display_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR a.profession_title ILIKE $${params.length})`;
    }

    if (status) { params.push(status); where += ` AND wr.status = $${params.length}`; }

    params.push(limit, offset);
    const result = await db.query(`
      SELECT wr.*,
             a.display_name AS professional_name,
             u.email AS professional_email,
             apd.method AS payout_method,
             apd.upi_id, apd.paytm_number, apd.bank_account_number, apd.bank_ifsc, apd.bank_account_name, apd.bank_name
      FROM withdrawal_requests wr
      JOIN professionals a ON wr.professional_id = a.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN professional_payout_details apd ON apd.professional_id = wr.professional_id
      ${where}
      ORDER BY wr.requested_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const countResult = await db.query(`SELECT COUNT(*) FROM withdrawal_requests wr ${where}`, countParams);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const wr = await db.query("SELECT * FROM withdrawal_requests WHERE id = $1", [id]);
    if (!wr.rows.length) return res.status(404).json({ success: false, message: 'Request not found' });
    if (wr.rows[0].status !== 'pending') return res.status(400).json({ success: false, message: `Already ${wr.rows[0].status}` });

    await db.query("UPDATE withdrawal_requests SET status = 'processing', process_after = NOW() WHERE id = $1", [id]);
    res.json({ success: true, message: 'Withdrawal approved and queued for processing' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const wr = await db.query('SELECT * FROM withdrawal_requests WHERE id = $1', [id]);
    if (!wr.rows.length) return res.status(404).json({ success: false, message: 'Request not found' });
    if (wr.rows[0].status !== 'pending') return res.status(400).json({ success: false, message: `Already ${wr.rows[0].status}` });

    await db.query("UPDATE withdrawal_requests SET status = 'rejected', remarks = $2 WHERE id = $1", [id, reason || 'Rejected by admin']);

    // Refund amount back to professional wallet
    await db.query(
      'UPDATE professionals SET wallet_balance = wallet_balance + $1, on_hold_amount = GREATEST(on_hold_amount - $1, 0) WHERE id = $2',
      [wr.rows[0].amount, wr.rows[0].professional_id]
    );

    res.json({ success: true, message: 'Withdrawal rejected and amount refunded to professional' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Community Moderation ─────────────────────────────────────────────────────

exports.listCommunityPosts = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    const whereParts = [];
    const params = [];

    if (status) { params.push(status); whereParts.push(`cp.status = $${params.length}`); }
    const where = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '';

    const result = await db.query(`
      SELECT cp.*, u.name as author_name, u.email as author_email, u.avatar_url as author_avatar
      FROM community_posts cp
      JOIN users u ON cp.user_id = u.id
      ${where}
      ORDER BY cp.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    const total = await db.query(
      `SELECT COUNT(*) FROM community_posts cp ${where}`, params
    );
    res.json({ success: true, data: result.rows, total: parseInt(total.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.approvePost = async (req, res) => {
  try {
    const result = await db.query(
      "UPDATE community_posts SET status = 'approved' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rejectPost = async (req, res) => {
  try {
    const result = await db.query(
      "UPDATE community_posts SET status = 'rejected' WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deletePostAdmin = async (req, res) => {
  try {
    await db.query('DELETE FROM community_posts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Sub-admin Management ──────────────────────────────────────────────────────

exports.listSubAdmins = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, permissions, is_active, created_at
      FROM sub_admins
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createSubAdmin = async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(`
      INSERT INTO sub_admins (name, email, password_hash, permissions, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, permissions, is_active, created_at
    `, [name, email, passwordHash, permissions || [], req.admin.id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.message.includes('duplicate')) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, permissions, is_active } = req.body;
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (passwordHash !== null) {
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }
    if (permissions !== undefined) {
      updates.push(`permissions = $${paramIndex++}`);
      values.push(permissions);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const result = await db.query(`
      UPDATE sub_admins SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, permissions, is_active, created_at
    `, values);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Sub-admin not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM sub_admins WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
