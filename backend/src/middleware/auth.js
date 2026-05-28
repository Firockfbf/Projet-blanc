const jwt = require("jsonwebtoken");
const { getUserById } = require("../db");
const { sanitizeUser } = require("../utils/auth");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const token = header.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getUserById(decoded.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Utilisateur invalide." });
    }

    req.user = sanitizeUser(user);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Session invalide ou expiree." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acces interdit." });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};
