const pool = require("../config/db");
const { emitToUser } = require("../services/socket");

function toDirectKey(a, b) {
  const [first, second] = [Number(a), Number(b)].sort((x, y) => x - y);
  return `${first}:${second}`;
}

async function getUserById(executor, userId) {
  const [rows] = await executor.query(
    `SELECT id, full_name, role FROM users WHERE id = ? LIMIT 1`,
    [Number(userId)]
  );
  return rows[0] || null;
}

async function getDirectRoomPeerRole(executor, roomId, userId) {
  const [rows] = await executor.query(
    `SELECT r.id, r.room_type, peer.user_id AS peer_id, u.role AS peer_role
     FROM chat_rooms r
     JOIN chat_room_members me ON me.room_id = r.id AND me.user_id = ?
     JOIN chat_room_members peer ON peer.room_id = r.id AND peer.user_id <> ?
     JOIN users u ON u.id = peer.user_id
     WHERE r.id = ?
     LIMIT 1`,
    [userId, userId, roomId]
  );

  return rows[0] || null;
}

async function assertPrivateRoomPermission(executor, roomId, currentUser) {
  const room = await getDirectRoomPeerRole(executor, roomId, currentUser.id);
  if (!room) {
    const error = new Error("You do not have permission");
    error.statusCode = 403;
    throw error;
  }

  if (room.room_type !== "direct") {
    const error = new Error("Only private direct rooms are supported");
    error.statusCode = 403;
    throw error;
  }

  if (currentUser.role === "user" && room.peer_role !== "admin") {
    const error = new Error("User can only chat privately with admin");
    error.statusCode = 403;
    throw error;
  }

  return room;
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
    const whereForRole = req.user.role === "user" ? "AND u.role = 'admin'" : "";
    const [rows] = await pool.query(
      `SELECT r.id,
              r.created_at AS room_created_at,
              last_message.created_at AS last_message_at,
              last_message.content AS last_message,
              u.id AS peer_id,
              u.full_name AS peer_name,
              u.role AS peer_role
       FROM chat_room_members me
       JOIN chat_rooms r ON r.id = me.room_id
       JOIN chat_room_members peer ON peer.room_id = r.id AND peer.user_id <> me.user_id
       JOIN users u ON u.id = peer.user_id
       LEFT JOIN chat_messages last_message ON last_message.id = (
         SELECT m2.id
         FROM chat_messages m2
         WHERE m2.room_id = r.id
         ORDER BY m2.created_at DESC
         LIMIT 1
       )
       WHERE me.user_id = ?
         AND r.room_type = 'direct'
         ${whereForRole}
       ORDER BY COALESCE(last_message.created_at, r.created_at) DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function getRoomMessages(req, res, next) {
  try {
    const roomId = Number(req.params.roomId);
    await assertPrivateRoomPermission(pool, roomId, req.user);

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
      return res.status(400).json({ message: "content is required" });
    }

    await connection.beginTransaction();

    let targetRoomId = Number(roomId) || null;

    if (targetRoomId) {
      await assertPrivateRoomPermission(connection, targetRoomId, req.user);
    } else {
      const normalizedParticipantId = Number(participantId);
      if (!normalizedParticipantId) {
        await connection.rollback();
        return res.status(400).json({ message: "participantId is required when roomId is missing" });
      }

      if (normalizedParticipantId === senderId) {
        await connection.rollback();
        return res.status(400).json({ message: "Không thể tự chat với chính mình" });
      }

      const participant = await getUserById(connection, normalizedParticipantId);
      if (!participant) {
        await connection.rollback();
        return res.status(404).json({ message: "Participant not found" });
      }

      if (req.user.role === "user" && participant.role !== "admin") {
        await connection.rollback();
        return res.status(403).json({ message: "User chỉ được chat riêng với admin" });
      }

      if (req.user.role === "admin" && participant.role !== "user") {
        await connection.rollback();
        return res.status(403).json({ message: "Admin chỉ được mở phòng riêng với user" });
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
