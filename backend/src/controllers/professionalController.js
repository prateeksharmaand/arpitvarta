const db = require('../config/database');

const PUBLIC_FILTER = `(a.is_banned = FALSE OR a.is_banned IS NULL) AND a.status = 'approved'`;

exports.listProfessionals = async (req, res) => {
  try {
    const { category, specialization, language, city, q, sort = 'rating', online_only, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = [PUBLIC_FILTER];
    const params = [];
    const add = (v) => { params.push(v); return `$${params.length}`; };

    if (online_only === 'true') where.push('a.is_online = true');
    if (category) {
      // Accept a category slug or numeric id
      if (/^\d+$/.test(String(category))) where.push(`a.category_id = ${add(parseInt(category, 10))}`);
      else where.push(`c.slug = ${add(category)}`);
    }
    if (specialization) where.push(`${add(specialization)} = ANY(a.specializations)`);
    if (language) where.push(`${add(language)} = ANY(a.languages)`);
    if (city) where.push(`a.city ILIKE ${add(`%${city}%`)}`);
    if (q) {
      const term = add(`%${q}%`);
      where.push(`(a.display_name ILIKE ${term} OR a.profession_title ILIKE ${term} OR a.bio ILIKE ${term}
                   OR c.name ILIKE ${term} OR array_to_string(a.specializations, ' ') ILIKE ${term})`);
    }

    const whereSql = where.join(' AND ');
    const sortMap = { rating: 'a.is_online DESC, a.rating DESC', experience: 'a.experience_years DESC', price_low: 'a.per_minute_rate_chat ASC', price_high: 'a.per_minute_rate_chat DESC', popular: 'a.total_consultations DESC' };

    const result = await db.query(`
      SELECT a.*, u.name, u.email,
             c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon,
             (SELECT COUNT(*) FROM professional_reviews ar WHERE ar.professional_id = a.id) AS review_count_live
      FROM professionals a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN categories c ON c.id = a.category_id
      WHERE ${whereSql}
      ORDER BY ${sortMap[sort] || sortMap.rating}
      LIMIT ${add(limit)} OFFSET ${add(offset)}
    `, params);

    const countResult = await db.query(`
      SELECT COUNT(*) FROM professionals a LEFT JOIN categories c ON c.id = a.category_id WHERE ${whereSql}
    `, params.slice(0, -2));
    res.json({ success: true, data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProfessional = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, u.name, u.email, u.avatar_url AS user_avatar_url,
             c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon,
             COALESCE(json_agg(DISTINCT ar.*) FILTER (WHERE ar.id IS NOT NULL), '[]') AS reviews
      FROM professionals a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN professional_reviews ar ON ar.professional_id = a.id
      WHERE a.id = $1
      GROUP BY a.id, u.name, u.email, u.avatar_url, c.slug, c.name, c.icon
    `, [req.params.id]);

    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Professional not found' });
    const pro = result.rows[0];
    delete pro.license_number; // shown only as "verified" publicly
    delete pro.documents;
    res.json({ success: true, data: pro });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProfessionalReviews = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ar.*, u.name as user_name
      FROM professional_reviews ar
      JOIN users u ON ar.user_id = u.id
      WHERE ar.professional_id = $1
      ORDER BY ar.created_at DESC LIMIT 50
    `, [req.params.id]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.submitReview = async (req, res) => {
  try {
    const { rating, review_text, consultation_id, is_anonymous } = req.body;

    await db.query(`
      INSERT INTO professional_reviews (professional_id, user_id, consultation_id, rating, review_text, is_anonymous)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (professional_id, user_id, consultation_id) DO UPDATE
      SET rating = $4, review_text = $5
    `, [req.params.id, req.user.id, consultation_id, rating, review_text, is_anonymous || false]);

    // Update professional aggregate rating
    await db.query(`
      UPDATE professionals SET
        rating = (SELECT AVG(rating) FROM professional_reviews WHERE professional_id = $1),
        review_count = (SELECT COUNT(*) FROM professional_reviews WHERE professional_id = $1)
      WHERE id = $1
    `, [req.params.id]);

    res.json({ success: true, message: 'Review submitted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getConsultationHistory = async (req, res) => {
  try {
    const proResult = await db.query('SELECT id FROM professionals WHERE user_id = $1', [req.user.id]);
    if (!proResult.rows.length) return res.status(403).json({ success: false, message: 'Not a professional' });
    const result = await db.query(
      `SELECT c.*, u.name as user_name FROM consultations c
       JOIN users u ON c.user_id = u.id
       WHERE c.professional_id = $1
       ORDER BY c.created_at DESC LIMIT 50`,
      [proResult.rows[0].id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getConsultationMessages = async (req, res) => {
  try {
    // Ownership check — without this, any authenticated user could read any
    // consultation's messages by ID (this endpoint has no other access
    // control). A caller must be either the consultation's user or the
    // professional it belongs to.
    const consultation = await db.query(
      `SELECT c.user_id, a.user_id AS professional_user_id
       FROM consultations c
       JOIN professionals a ON a.id = c.professional_id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (!consultation.rows.length) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    const { user_id, professional_user_id } = consultation.rows[0];
    if (req.user.id !== user_id && req.user.id !== professional_user_id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this consultation' });
    }

    const result = await db.query(
      `SELECT * FROM consultation_messages WHERE consultation_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const PROFILE_FIELDS = ['display_name', 'profession_title', 'bio', 'experience_years', 'qualifications', 'license_number',
  'organization', 'city', 'languages', 'specializations', 'expertise_areas', 'category_id',
  'per_minute_rate_chat', 'per_minute_rate_call', 'per_minute_rate_video'];

exports.registerAsProfessional = async (req, res) => {
  try {
    const b = req.body;
    if (!b.display_name) return res.status(400).json({ success: false, message: 'display_name is required' });

    const existing = await db.query('SELECT id FROM professionals WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) return res.status(409).json({ success: false, message: 'Already registered as professional' });

    const result = await db.query(`
      INSERT INTO professionals (user_id, display_name, profession_title, bio, experience_years, qualifications,
        license_number, organization, city, languages, specializations, expertise_areas, category_id,
        per_minute_rate_chat, per_minute_rate_call, per_minute_rate_video)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *
    `, [req.user.id, b.display_name, b.profession_title || null, b.bio || null, parseInt(b.experience_years) || 0,
        b.qualifications || [], b.license_number || null, b.organization || null, b.city || null,
        b.languages || ['English'], b.specializations || [], b.expertise_areas || [],
        b.category_id ? parseInt(b.category_id) : null,
        b.per_minute_rate_chat || 10, b.per_minute_rate_call || 15, b.per_minute_rate_video || 20]);

    // Mark user role as professional so login enforcement works
    await db.query(`UPDATE users SET role = 'professional' WHERE id = $1`, [req.user.id]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('registerAsProfessional', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon
      FROM professionals a LEFT JOIN categories c ON c.id = a.category_id
      WHERE a.user_id = $1`, [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not a professional' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Professionals edit their own public profile. Rates are capped by admin
// via PUT /admin/professionals/:id/rates, so they are editable here too.
exports.updateMyProfile = async (req, res) => {
  try {
    const sets = [];
    const params = [];
    for (const f of PROFILE_FIELDS) {
      if (req.body[f] === undefined) continue;
      let v = req.body[f];
      if (f === 'experience_years' || f === 'category_id') v = v === null || v === '' ? null : parseInt(v, 10);
      params.push(v);
      sets.push(`${f} = $${params.length}`);
    }
    if (!sets.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    params.push(req.user.id);
    const result = await db.query(
      `UPDATE professionals SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not a professional' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('updateMyProfile', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { is_available } = req.body;
    const pro = await db.query('SELECT id, status FROM professionals WHERE user_id = $1', [req.user.id]);
    if (!proRow.rows.length) return res.status(403).json({ success: false, message: 'Not a professional' });
    if (proRow.rows[0].status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Your account is pending approval' });
    }
    await db.query('UPDATE professionals SET is_available = $1, is_online = $1 WHERE user_id = $2', [is_available, req.user.id]);
    res.json({ success: true, message: 'Availability updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProfessionalDashboard = async (req, res) => {
  try {
    const proResult = await db.query('SELECT * FROM professionals WHERE user_id = $1', [req.user.id]);
    if (!proResult.rows.length) return res.status(404).json({ success: false, message: 'Not a professional' });
    const pro = proResult.rows[0];

    const [stats, recent, earnings] = await Promise.all([
      db.query(`SELECT
                  COUNT(*) as total,
                  AVG(duration_seconds) as avg_duration,
                  SUM(professional_earning) as total_revenue
                FROM consultations
                WHERE professional_id = $1 AND status = 'completed'`, [pro.id]),
      db.query(`SELECT c.*, u.name as user_name FROM consultations c JOIN users u ON c.user_id = u.id
                WHERE c.professional_id = $1 ORDER BY c.created_at DESC LIMIT 10`, [pro.id]),
      db.query(`SELECT DATE(c.created_at) as date, SUM(c.professional_earning) as daily_earning
                FROM consultations c
                WHERE c.professional_id = $1
                  AND c.status = 'completed'
                  AND c.created_at > NOW() - INTERVAL '30 days'
                GROUP BY DATE(c.created_at)
                ORDER BY date`, [pro.id]),
    ]);

    res.json({
      success: true,
      data: {
        professional: pro,
        stats: stats.rows[0],
        recent_consultations: recent.rows,
        earnings_chart: earnings.rows,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProfessionalWallet = async (req, res) => {
  try {
    const proResult = await db.query('SELECT * FROM professionals WHERE user_id = $1', [req.user.id]);
    if (!proResult.rows.length) return res.status(404).json({ success: false, message: 'Not a professional' });
    const pro = proResult.rows[0];
    const [totalEarned, thisMonth, thisWeek, today] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(professional_earning), 0) as total FROM consultations WHERE professional_id = $1 AND professional_earning > 0`, [pro.id]),
      db.query(`SELECT COALESCE(SUM(professional_earning), 0) as amount FROM consultations WHERE professional_id = $1 AND professional_earning > 0 AND created_at >= DATE_TRUNC('month', NOW())`, [pro.id]),
      db.query(`SELECT COALESCE(SUM(professional_earning), 0) as amount FROM consultations WHERE professional_id = $1 AND professional_earning > 0 AND created_at >= DATE_TRUNC('week', NOW())`, [pro.id]),
      db.query(`SELECT COALESCE(SUM(professional_earning), 0) as amount FROM consultations WHERE professional_id = $1 AND professional_earning > 0 AND created_at >= DATE_TRUNC('day', NOW())`, [pro.id]),
    ]);
    res.json({ success: true, data: {
      wallet: { balance: parseFloat(pro.wallet_balance || 0), total_earned: parseFloat(totalEarned.rows[0].total) },
      stats: { this_month: parseFloat(thisMonth.rows[0].amount), this_week: parseFloat(thisWeek.rows[0].amount), today: parseFloat(today.rows[0].amount) },
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProfessionalTransactions = async (req, res) => {
  try {
    const proResult = await db.query('SELECT id FROM professionals WHERE user_id = $1', [req.user.id]);
    if (!proResult.rows.length) return res.status(404).json({ success: false, message: 'Not a professional' });
    const proId = proResult.rows[0].id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const result = await db.query(`
      SELECT c.id, c.created_at, c.duration_seconds, c.professional_earning as amount,
             c.type, u.name as user_name, 'credit' as type_label
      FROM consultations c JOIN users u ON c.user_id = u.id
      WHERE c.professional_id = $1 AND c.professional_earning > 0
      ORDER BY c.created_at DESC LIMIT $2 OFFSET $3
    `, [proId, limit, offset]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getChatThreads = async (req, res) => {
  try {
    const proResult = await db.query('SELECT id FROM professionals WHERE user_id = $1', [req.user.id]);
    if (!proResult.rows.length) return res.status(403).json({ success: false, message: 'Not a professional' });
    const proId = proResult.rows[0].id;

    const result = await db.query(`
      SELECT
        ct.id AS thread_id,
        ct.user_id,
        ct.last_message,
        ct.last_message_at,
        u.name AS user_name,
        u.avatar_url AS user_avatar
      FROM chat_threads ct
      JOIN users u ON u.id = ct.user_id
      WHERE ct.professional_id = $1
      ORDER BY ct.last_message_at DESC NULLS LAST
    `, [proId]);

    res.json({ success: true, threads: result.rows });
  } catch (err) {
    console.error('[getChatThreads]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUserThreadMessages = async (req, res) => {
  try {
    const proResult = await db.query('SELECT id FROM professionals WHERE user_id = $1', [req.user.id]);
    if (!proResult.rows.length) return res.status(403).json({ success: false, message: 'Not a professional' });
    const proId = proResult.rows[0].id;

    const userId = req.params.userId;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before;

    const threadResult = await db.query(
      'SELECT id FROM chat_threads WHERE professional_id = $1 AND user_id = $2',
      [proId, userId]
    );
    if (!threadResult.rows.length) {
      return res.json({ success: true, messages: [], has_more: false });
    }
    const threadId = threadResult.rows[0].id;

    const params = [threadId, limit];
    const beforeClause = before ? `AND tm.created_at < $${params.push(before)}` : '';

    const result = await db.query(`
      SELECT * FROM (
        SELECT tm.id, tm.thread_id, tm.consultation_id, tm.sender_id, tm.sender_role,
               tm.message, tm.message_type, tm.created_at
        FROM thread_messages tm
        WHERE tm.thread_id = $1
          ${beforeClause}
        ORDER BY tm.created_at DESC
        LIMIT $2
      ) sub ORDER BY created_at ASC
    `, params);

    const countParams = [threadId];
    const countBefore = before ? `AND tm.created_at < $${countParams.push(before)}` : '';
    const countResult = await db.query(
      `SELECT COUNT(*) FROM thread_messages tm WHERE tm.thread_id = $1 ${countBefore}`,
      countParams
    );

    res.json({
      success: true,
      messages: result.rows,
      has_more: parseInt(countResult.rows[0].count) > limit,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
