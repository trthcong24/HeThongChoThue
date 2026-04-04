const { verifyToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Thiếu token hoặc token không hợp lệ" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
}

function attachUserIfPresent(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    try {
      req.user = verifyToken(token);
    } catch (error) {
      req.user = null;
    }
  }

  return next();
}

function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  attachUserIfPresent,
  requireRole
};
