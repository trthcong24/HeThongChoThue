const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { signToken } = require("../utils/jwt");

async function register(req, res, next) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email, password are required" });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
      [fullName, email, passwordHash]
    );

    const token = signToken({ id: result.insertId, email, role: "user", fullName });

    return res.status(201).json({
      message: "Register success",
      token,
      user: { id: result.insertId, fullName, email, role: "user" }
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const [rows] = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = rows[0];
    const matched = await bcrypt.compare(password, user.password);
    if (!matched) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.name
    });

    return res.json({
      message: "Login success",
      token,
      user: {
        id: user.id,
        fullName: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login
};
