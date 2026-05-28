const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      schoolId: user.schoolId || null,
    },
    JWT_SECRET,
    { expiresIn: "12h" },
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    schoolId: user.schoolId || null,
    isActive: user.isActive,
    school: user.school || null,
  };
}

module.exports = {
  comparePassword,
  createToken,
  hashPassword,
  sanitizeUser,
};
