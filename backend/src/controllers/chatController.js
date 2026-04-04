const pool = require("../config/db");
const { emitToUser } = require("../services/socket");

function toDirectKey(a, b) {
  const [first, second] = [Number(a), Number(b)].sort((x, y) => x - y);
  return `${first}:${second}`;
}

async function getChatContacts(req, res, next) {
  try {
    const isAdmin = req.user.role === "admin";
    const query = isAdmin
      ? `SELECT id, full_name, email, role
         FROM users
         WHERE id <> ?
         ORDER BY role DESC, full_name ASC`
      : `SELECT id, full_name, email, role
         FROM users
         WHERE role = 'admin'
         ORDER BY full_name ASC`;

    const [rows] = isAdmin ? await pool.query(query, [req.user.id]) : await pool.query(query);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function getMyRooms(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT r.id,
              MAX(cm.created_at) AS room_created_at,
              MAX(m.created_at) AS last_message_at,
              SUBSTRING_INDEX(GROUP_CONCAT(m.content ORDER BY m.created_at DESC SEPARATOR '||'), '||', 1) AS last_message,
              MAX(CASE WHEN cm.user_id <> ? THEN u.full_name END) AS peer_name
       FROM chat_room_members crm
       JOIN chat_rooms r ON r.id = crm.room_id
       LEFT JOIN chat_messages m ON m.room_id = r.id
       LEFT JOIN chat_room_members cm ON cm.room_id = r.id
       LEFT JOIN users u ON u.id = cm.user_id
       WHERE crm.user_id = ?
       GROUP BY r.id
       ORDER BY COALESCE(MAX(m.created_at), MAX(cm.created_at)) DESC`,
      [req.user.id, req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function getRoomMessages(req, res, next) {
  try {
    const roomId = Number(req.params.roomId);
    const [memberRows] = await pool.query(
      `SELECT id FROM chat_room_members WHERE room_id = ? AND user_id = ?`,
      [roomId, req.user.id]
    );

    if (memberRows.length === 0) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập phòng chat này" });
    }

    const [messages] = await pool.query(
      `SELECT m.id, m.room_id, m.sender_id, m.content, m.created_at, u.full_name AS sender_name
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.room_id = ?
       ORDER BY m.created_at ASC`,
      [roomId]
    );

    return res.json(messages);
  } catch (error) {
    return next(error);
  }
}

async function findOrCreateDirectRoom(connection, userId, participantId) {
  const directKey = toDirectKey(userId, participantId);
  const [rooms] = await connection.query(
    `SELECT id FROM chat_rooms WHERE room_type = 'direct' AND direct_key = ? LIMIT 1`,
    [directKey]
  );

  if (rooms.length > 0) {
    return rooms[0].id;
  }

  const [createResult] = await connection.query(
    `INSERT INTO chat_rooms (room_type, direct_key, booking_id, created_by)
     VALUES ('direct', ?, NULL, ?)`,
    [directKey, userId]
  );

  const roomId = createResult.insertId;
  await connection.query(
    `INSERT INTO chat_room_members (room_id, user_id)
     VALUES (?, ?), (?, ?)`,
    [roomId, userId, roomId, participantId]
  );

  return roomId;
}

async function sendMessage(req, res, next) {
  const connection = await pool.getConnection();

  try {
    const senderId = req.user.id;
    const { roomId, participantId, content } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: "Nội dung tin nhắn là bắt buộc" });
    }

    await connection.beginTransaction();

    let targetRoomId = Number(roomId) || null;

    if (targetRoomId) {
      const [memberRows] = await connection.query(
        `SELECT id FROM chat_room_members WHERE room_id = ? AND user_id = ?`,
        [targetRoomId, senderId]
      );

      if (memberRows.length === 0) {
        await connection.rollback();
        return res.status(403).json({ message: "Bạn không có quyền truy cập phòng chat này" });
      }
    } else {
      const normalizedParticipantId = Number(participantId);
      if (!normalizedParticipantId) {
        await connection.rollback();
        return res.status(400).json({ message: "Cần participantId khi chưa có roomId" });
      }

      const [users] = await connection.query(`SELECT id FROM users WHERE id = ?`, [normalizedParticipantId]);
      if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Không tìm thấy người nhận" });
      }

      targetRoomId = await findOrCreateDirectRoom(connection, senderId, normalizedParticipantId);
    }

    const [result] = await connection.query(
      `INSERT INTO chat_messages (room_id, sender_id, content)
       VALUES (?, ?, ?)`,
      [targetRoomId, senderId, String(content).trim()]
    );

    await connection.commit();

    const [messages] = await pool.query(
      `SELECT m.id, m.room_id, m.sender_id, m.content, m.created_at, u.full_name AS sender_name
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.id = ?`,
      [result.insertId]
    );

    const message = messages[0];
    const [members] = await pool.query(`SELECT user_id FROM chat_room_members WHERE room_id = ?`, [targetRoomId]);
    for (const member of members) {
      emitToUser(member.user_id, "chat:message", message);
    }

    return res.status(201).json({ roomId: targetRoomId, message });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_rollbackError) {
      // no-op
    }
    return next(error);
  } finally {
    connection.release();
  }
}

module.exports = {
  getChatContacts,
  getMyRooms,
  getRoomMessages,
  sendMessage
};
