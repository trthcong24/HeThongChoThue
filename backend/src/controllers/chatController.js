const pool = require("../config/db");
const { getSocket } = require("../services/socket");
const { createNotification } = require("../services/notificationService");

async function getChatContacts(req, res, next) {
  try {
    const isAdmin = req.user.role === "admin";
    const query = isAdmin
      ? `SELECT id, name, email, role FROM users WHERE id <> ? ORDER BY role DESC, name ASC`
      : `SELECT id, name, email, role FROM users WHERE role = 'admin' ORDER BY name ASC`;

    const [rows] = isAdmin ? await pool.query(query, [req.user.id]) : await pool.query(query);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function getOrCreateConversation(req, res, next) {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }

    // Get messages between sender and receiver
    const [exist] = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at DESC`,
      [senderId, receiverId, receiverId, senderId]
    );

    if (exist.length === 0) {
      // No existing conversation
      return res.json({ exists: false, receiverId, messages: [] });
    }

    return res.json({ exists: true, receiverId, messages: exist });
  } catch (error) {
    return next(error);
  }
}

async function getConversation(req, res, next) {
  try {
    const { receiverId } = req.params;
    const senderId = req.user.id;

    const [messages] = await pool.query(
      `SELECT m.*, 
              CASE WHEN m.sender_id = ? THEN 'sent' ELSE 'received' END as direction,
              u.name as sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [senderId, senderId, receiverId, receiverId, senderId]
    );

    // Mark received messages as read
    await pool.query(
      `UPDATE messages SET is_read = 1 
       WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
      [receiverId, senderId]
    );

    return res.json(messages);
  } catch (error) {
    return next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !message || !String(message).trim()) {
      return res.status(400).json({ message: "receiverId and message content are required" });
    }

    // Check if receiver exists
    const [receiverExists] = await pool.query(
      `SELECT id FROM users WHERE id = ?`,
      [receiverId]
    );

    if (receiverExists.length === 0) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Insert message
    const [result] = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message, is_read)
       VALUES (?, ?, ?, 0)`,
      [senderId, receiverId, String(message).trim()]
    );

    const [newMessage] = await pool.query(
      `SELECT m.*, u.name as sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.id = ?`,
      [result.insertId]
    );

    const msg = newMessage[0];

    // Emit to receiver in real-time
    const io = getSocket();
    if (io) {
      io.to(`user:${receiverId}`).emit("chat:newMessage", msg);
    }

    // Send notification to receiver
    const [receiver] = await pool.query(`SELECT name FROM users WHERE id = ?`, [receiverId]);
    if (receiver.length > 0) {
      await createNotification({
        userId: receiverId,
        type: "message",
        title: `Tin nhắn từ ${msg.sender_name}`,
        content: msg.message.substring(0, 50)
      });
    }

    return res.status(201).json(msg);
  } catch (error) {
    return next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const [result] = await pool.query(
      `SELECT COUNT(*) as unread_count FROM messages 
       WHERE receiver_id = ? AND is_read = 0`,
      [req.user.id]
    );

    return res.json({ unread: result[0].unread_count });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getChatContacts,
  getOrCreateConversation,
  getConversation,
  sendMessage,
  getUnreadCount
};
