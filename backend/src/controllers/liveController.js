const db = require('../config/database');
const admin = require('firebase-admin');

// Both apps (com.arpitvarta.user and com.arpitvarta.pro) are in the same
// Firebase project, so a single Admin SDK instance handles FCM for both.
// Set FIREBASE_SERVICE_ACCOUNT to the service account JSON for the arpitvarta-pro project.
// FIREBASE_SERVICE_ACCOUNT_PROFESSIONAL is kept as a fallback for the professional tokens.
let userAppFcm = null;
let professionalAppFcm = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const userApp = admin.initializeApp(
      { credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) },
      'user_app'
    );
    userAppFcm = userApp.messaging();
    // If no separate professional key, reuse the same FCM instance (same Firebase project)
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_PROFESSIONAL) {
      professionalAppFcm = userAppFcm;
    }
  } catch (e) {
    console.warn('Firebase user app not configured — push notifications disabled:', e.message);
  }
}

if (process.env.FIREBASE_SERVICE_ACCOUNT_PROFESSIONAL) {
  try {
    const professionalApp = admin.initializeApp(
      { credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_PROFESSIONAL)) },
      'professional_app'
    );
    professionalAppFcm = professionalApp.messaging();
  } catch (e) {
    console.warn('Firebase professional app not configured — professional push notifications disabled:', e.message);
  }
}

const _channelIdByApp = {
  user_app: 'arpitvarta_high_importance',
  professional_app: 'arpitvarta_pro_high_importance',
};

async function _sendToTokens(messagingInstance, tokenList, title, body, data, appLabel) {
  if (!messagingInstance || !tokenList.length) {
    console.log(`[FCM][${appLabel}] Skipping — no instance or no tokens (tokens=${tokenList.length}, instance=${!!messagingInstance})`);
    return;
  }
  const channelId = _channelIdByApp[appLabel] || 'arpitvarta_high_importance';
  const stringData = {};
  for (const [k, v] of Object.entries({ ...data })) {
    stringData[k] = v == null ? '' : String(v);
  }
  const payload = {
    tokens: tokenList,
    notification: { title, body },
    data: stringData,
    android: { priority: 'high', notification: { channelId, priority: 'high', sound: 'default' } },
    apns: { payload: { aps: { sound: 'default', contentAvailable: true } } },
  };
  console.log(`[FCM][${appLabel}] Sending to ${tokenList.length} token(s): title="${title}" data=${JSON.stringify(stringData)}`);
  try {
    const result = await messagingInstance.sendEachForMulticast(payload);
    console.log(`[FCM][${appLabel}] Result: successCount=${result.successCount} failureCount=${result.failureCount}`);
    const staleTokens = [];
    result.responses.forEach((r, i) => {
      if (r.success) {
        console.log(`[FCM][${appLabel}] token[${i}] OK — messageId=${r.messageId}`);
      } else {
        console.error(`[FCM][${appLabel}] token[${i}] FAILED — code=${r.error?.code} msg=${r.error?.message}`);
        // Remove tokens FCM says are invalid/unregistered
        const code = r.error?.code || '';
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument') {
          staleTokens.push(tokenList[i]);
        }
      }
    });
    if (staleTokens.length) {
      await db.query('DELETE FROM push_tokens WHERE token = ANY($1)', [staleTokens]);
      console.log(`[FCM][${appLabel}] Removed ${staleTokens.length} stale token(s) from DB`);
    }
  } catch (err) {
    console.error(`[FCM][${appLabel}] sendEachForMulticast threw:`, err.message || err);
  }
}

async function sendPushNotification(userIds, title, body, data = {}) {
  const type = data.type || 'general';
  console.log(`[FCM] sendPushNotification: userIds=${JSON.stringify(userIds)} title="${title}" type=${type}`);

  // Always persist to DB so users see it in the notifications screen
  try {
    await Promise.all(userIds.map(uid =>
      db.query(
        'INSERT INTO user_notifications (user_id, title, body, type, data) VALUES ($1, $2, $3, $4, $5)',
        [uid, title, body, type, data]
      )
    ));
  } catch (err) {
    console.error('Notification DB insert error:', err);
  }

  if (!userAppFcm && !professionalAppFcm) {
    console.warn('[FCM] Both FCM instances are null — push skipped. Check FIREBASE_SERVICE_ACCOUNT env vars.');
    return;
  }

  try {
    const tokens = await db.query(
      'SELECT user_id, token, app_type FROM push_tokens WHERE user_id = ANY($1)',
      [userIds]
    );
    console.log(`[FCM] Found ${tokens.rows.length} token(s) in DB for userIds=${JSON.stringify(userIds)}`);
    tokens.rows.forEach(r => console.log(`[FCM]   user=${r.user_id} app_type=${r.app_type} token=${r.token.substring(0, 20)}...`));

    if (!tokens.rows.length) {
      console.warn('[FCM] No tokens found — notification not sent via FCM (stored in DB only)');
      return;
    }

    const userTokens = tokens.rows.filter(r => r.app_type === 'user_app').map(r => r.token);
    const professionalTokens = tokens.rows.filter(r => r.app_type === 'professional_app').map(r => r.token);
    console.log(`[FCM] userTokens=${userTokens.length} professionalTokens=${professionalTokens.length}`);

    await Promise.all([
      _sendToTokens(userAppFcm, userTokens, title, body, data, 'user_app'),
      _sendToTokens(professionalAppFcm, professionalTokens, title, body, data, 'professional_app'),
    ]);
  } catch (err) {
    console.error('[FCM] sendPushNotification error:', err);
  }
}

// Live Sessions
exports.getLiveSessions = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ls.*, a.display_name as professional_name, a.specializations, u.avatar_url
      FROM live_sessions ls
      JOIN professionals a ON ls.professional_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE ls.status IN ('scheduled','live','ended')
      ORDER BY CASE ls.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END, ls.scheduled_at ASC
      LIMIT 20
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createLiveSession = async (req, res) => {
  try {
    const { title, description, thumbnail_url, scheduled_at } = req.body;

    const proResult = await db.query('SELECT id FROM professionals WHERE user_id = $1', [req.user.id]);
    if (!proResult.rows.length) return res.status(403).json({ success: false, message: 'Not a professional' });

    const channel = `live_${proResult.rows[0].id}_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO live_sessions (professional_id, title, description, thumbnail_url, agora_channel, scheduled_at)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [proResult.rows[0].id, title, description, thumbnail_url, channel, scheduled_at || new Date()]);

    // Notify followers
    const session = result.rows[0];
    const followers = await db.query('SELECT DISTINCT user_id FROM user_bookmarks WHERE content_type = $1', ['professional']);
    if (followers.rows.length) {
      const userIds = followers.rows.map(r => r.user_id);
      await sendPushNotification(userIds, `🔴 ${req.user.name} is going Live!`, title, { session_id: session.id, type: 'live_started' });
    }

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.startLiveSession = async (req, res) => {
  try {
    const result = await db.query(`
      UPDATE live_sessions SET status = 'live', started_at = NOW()
      WHERE id = $1 RETURNING *
    `, [req.params.id]);

    const session = result.rows[0];

    // Push to all users when live session actually starts
    const allUsers = await db.query('SELECT DISTINCT user_id FROM push_tokens');
    if (allUsers.rows.length) {
      const userIds = allUsers.rows.map(r => r.user_id);
      await sendPushNotification(
        userIds,
        '🔴 Live Session Started!',
        session.title,
        { type: 'live_started', session_id: session.id }
      );
    }

    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.endLiveSession = async (req, res) => {
  try {
    const result = await db.query(`
      UPDATE live_sessions SET
        status = 'ended',
        ended_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
      WHERE id = $1 RETURNING *
    `, [req.params.id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Community
exports.getCommunityPosts = async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT cp.*, u.name as author_name, u.avatar_url as author_avatar,
             a.display_name as professional_name, a.profession_title as professional_title, a.is_verified,
             EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = cp.id AND pl.user_id = $1) AS is_liked
      FROM community_posts cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN professionals a ON cp.professional_id = a.id
      WHERE (cp.status = 'approved' OR cp.user_id = $1)
    `;
    const params = [req.user.id];

    if (category) { query += ` AND cp.category = $${params.length + 1}`; params.push(category); }

    query += ` ORDER BY cp.is_pinned DESC, cp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { content, category, media_url, media_type } = req.body;
    const pro = await db.query('SELECT id FROM professionals WHERE user_id = $1', [req.user.id]);
    const result = await db.query(`
      INSERT INTO community_posts (user_id, professional_id, content, category, media_url, media_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *
    `, [req.user.id, pro.rows[0]?.id || null, content, category, media_url, media_type]);

    const post = result.rows[0];
    res.status(201).json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM community_posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.post_id, req.user.id]
    );
    if (!result.rows.length) return res.status(403).json({ success: false, message: 'Not found or unauthorized' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const { post_id } = req.params;
    const existing = await db.query('SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2', [req.user.id, post_id]);

    if (existing.rows.length) {
      await db.query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [req.user.id, post_id]);
      await db.query('UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = $1', [post_id]);
      res.json({ success: true, liked: false });
    } else {
      await db.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [req.user.id, post_id]);
      await db.query('UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = $1', [post_id]);
      res.json({ success: true, liked: true });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pc.*, u.name as user_name, u.avatar_url as user_avatar
      FROM post_comments pc JOIN users u ON pc.user_id = u.id
      WHERE pc.post_id = $1 ORDER BY pc.created_at ASC
    `, [req.params.post_id]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const result = await db.query(
      'INSERT INTO post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.post_id, req.user.id, req.body.content]
    );
    await db.query('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = $1', [req.params.post_id]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Notifications
exports.getNotifications = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM user_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await db.query('UPDATE user_notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.registerPushToken = async (req, res) => {
  try {
    const { token, platform, app_type = 'user_app' } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    // Remove all old tokens for this user+app_type, then insert fresh
    await db.query('DELETE FROM push_tokens WHERE user_id = $1 AND app_type = $2', [req.user.id, app_type]);
    await db.query(
      `INSERT INTO push_tokens (user_id, token, platform, app_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, token, app_type) DO UPDATE SET platform = $3`,
      [req.user.id, token, platform, app_type]
    );
    console.log(`[PUSH TOKEN] Registered for user=${req.user.id} app_type=${app_type} token=${token.substring(0, 20)}...`);
    res.json({ success: true });
  } catch (err) {
    console.error('[PUSH TOKEN] DB error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports.sendPushNotification = sendPushNotification;
