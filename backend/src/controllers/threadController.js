const db = require('../config/database');

// Get or create a thread for user<>professional pair
async function ensureThread(userId, professionalId) {
  const { rows } = await db.query(
    `INSERT INTO chat_threads (user_id, professional_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, professional_id) DO UPDATE SET last_message_at = chat_threads.last_message_at
     RETURNING *`,
    [userId, professionalId]
  );
  return rows[0];
}

// GET /api/threads — list all professional threads for the logged-in user
exports.listThreads = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         ct.id,
         ct.last_message,
         ct.last_message_at,
         ct.unread_count,
         a.id          AS professional_id,
         u.name        AS professional_name,
         u.avatar_url  AS professional_avatar,
         a.rating,
         a.specializations
       FROM chat_threads ct
       JOIN professionals a ON a.id = ct.professional_id
       JOIN users u       ON u.id = a.user_id
       WHERE ct.user_id = $1
       ORDER BY ct.last_message_at DESC`,
      [req.user.id]
    );
    res.json({ threads: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/threads/:professionalId/messages?before=<cursor>&limit=50
exports.getMessages = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const limit  = Math.min(parseInt(req.query.limit || 50), 100);
    const before = req.query.before; // ISO timestamp cursor for pagination

    const thread = await ensureThread(req.user.id, professionalId);

    const { rows } = await db.query(
      `SELECT
         tm.id,
         tm.thread_id,
         tm.consultation_id,
         tm.sender_id,
         tm.sender_role,
         tm.message,
         tm.message_type,
         tm.created_at,
         u.name       AS sender_name,
         u.avatar_url AS sender_avatar
       FROM thread_messages tm
       JOIN users u ON u.id = tm.sender_id
       WHERE tm.thread_id = $1
         ${before ? 'AND tm.created_at < $3' : ''}
       ORDER BY tm.created_at ASC
       LIMIT $2`,
      before ? [thread.id, limit, before] : [thread.id, limit]
    );

    // Reset unread count when user loads messages
    await db.query(
      `UPDATE chat_threads SET unread_count = 0 WHERE id = $1`,
      [thread.id]
    );

    res.json({ thread_id: thread.id, messages: rows, has_more: rows.length === limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Called internally when a message is sent (from socket handler)
exports.saveMessage = async ({ userId, professionalId, consultationId, senderId, senderRole, message, messageType = 'text' }) => {
  const thread = await ensureThread(userId, professionalId);

  const { rows } = await db.query(
    `INSERT INTO thread_messages
       (thread_id, consultation_id, sender_id, sender_role, message, message_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [thread.id, consultationId, senderId, senderRole, message, messageType]
  );

  // Update thread metadata
  const isIncoming = senderRole === 'professional';
  await db.query(
    `UPDATE chat_threads
     SET last_message = $1,
         last_message_at = NOW(),
         unread_count = unread_count + $2
     WHERE id = $3`,
    [message, isIncoming ? 1 : 0, thread.id]
  );

  return { ...rows[0], thread_id: thread.id };
};

// Called when a new consultation session starts — inserts a divider message
exports.insertSessionDivider = async ({ userId, professionalId, consultationId, label }) => {
  const thread = await ensureThread(userId, professionalId);
  await db.query(
    `INSERT INTO thread_messages
       (thread_id, consultation_id, sender_id, sender_role, message, message_type)
     VALUES ($1, $2, $3, 'system', $4, 'session_start')`,
    [thread.id, consultationId, userId, label]
  );
};
