const { verifyToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token is invalid or expired" });
  }
}

function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission" });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
