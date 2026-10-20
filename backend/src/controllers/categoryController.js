const db = require('../config/database');

exports.listCategories = async (req, res) => {
  try {
    const includeInactive = req.query.all === 'true';
    const result = await db.query(`
      SELECT c.*,
             COUNT(p.id) FILTER (WHERE p.status = 'approved' AND NOT COALESCE(p.is_banned, FALSE)) AS professional_count,
             COUNT(p.id) FILTER (WHERE p.status = 'approved' AND p.is_online AND NOT COALESCE(p.is_banned, FALSE)) AS online_count
      FROM categories c
      LEFT JOIN professionals p ON p.category_id = c.id
      ${includeInactive ? '' : 'WHERE c.is_active = TRUE'}
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);
    res.json({ success: true, data: result.rows.map(r => ({
      ...r,
      professional_count: parseInt(r.professional_count, 10),
      online_count: parseInt(r.online_count, 10),
    })) });
  } catch (err) {
    console.error('listCategories', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const key = req.params.slug;
    const result = await db.query(
      /^\d+$/.test(key) ? 'SELECT * FROM categories WHERE id = $1' : 'SELECT * FROM categories WHERE slug = $1',
      [key]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Home screen payload for the user app / website: categories, top-rated and
// online professionals, and live sessions, in one round trip.
exports.getHome = async (req, res) => {
  try {
    const proSelect = `
      SELECT a.id, a.display_name, a.profession_title, a.avatar_url, a.experience_years, a.rating, a.review_count,
             a.per_minute_rate_chat, a.per_minute_rate_call, a.per_minute_rate_video, a.is_online, a.is_verified,
             a.languages, a.specializations, a.city, a.total_consultations,
             c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon
      FROM professionals a
      LEFT JOIN categories c ON c.id = a.category_id
      WHERE a.status = 'approved' AND NOT COALESCE(a.is_banned, FALSE)`;

    const [categories, topRated, online, live, wallet] = await Promise.all([
      db.query(`SELECT c.*, COUNT(p.id) FILTER (WHERE p.status = 'approved') AS professional_count
                FROM categories c LEFT JOIN professionals p ON p.category_id = c.id
                WHERE c.is_active GROUP BY c.id ORDER BY c.sort_order`),
      db.query(`${proSelect} ORDER BY a.rating DESC, a.total_consultations DESC LIMIT 10`),
      db.query(`${proSelect} AND a.is_online ORDER BY a.rating DESC LIMIT 10`),
      db.query(`SELECT ls.*, a.display_name AS professional_name, a.avatar_url AS professional_avatar, a.profession_title
                FROM live_sessions ls JOIN professionals a ON a.id = ls.professional_id
                WHERE ls.status = 'live' ORDER BY ls.started_at DESC LIMIT 10`),
      req.user ? db.query('SELECT balance FROM wallets WHERE user_id = $1', [req.user.id]) : Promise.resolve({ rows: [] }),
    ]);

    res.json({
      success: true,
      data: {
        user: req.user || null,
        wallet_balance: parseFloat(wallet.rows[0]?.balance || 0),
        categories: categories.rows.map(r => ({ ...r, professional_count: parseInt(r.professional_count, 10) })),
        top_rated: topRated.rows,
        online_now: online.rows,
        live_sessions: live.rows,
      },
    });
  } catch (err) {
    console.error('getHome', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
