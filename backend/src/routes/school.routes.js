const { Router } = require("express");
const { z } = require("zod");
const { all, get, getSchoolById, getUserById, now, run } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { comparePassword, hashPassword, sanitizeUser } = require("../utils/auth");

const router = Router();

router.use(authenticate);
router.use(requireRole("SCHOOL", "ADMIN"));

router.get("/dashboard", async (req, res) => {
  const schoolId =
    req.user.role === "ADMIN"
      ? req.query.schoolId || req.user.schoolId
      : req.user.schoolId;

  if (!schoolId) {
    return res
      .status(400)
      .json({ message: "Un schoolId est requis pour ce dashboard." });
  }

  const school = getSchoolById(schoolId);

  const formations = all(
    `
      SELECT
        id,
        name,
        code,
        year,
        school_id AS schoolId
      FROM formations
      WHERE school_id = @schoolId
      ORDER BY name ASC
    `,
    { schoolId },
  );

  const students = all(
    `
      SELECT
        id,
        first_name AS firstName,
        last_name AS lastName,
        email,
        formation_id AS formationId,
        status,
        passed,
        certified,
        graduation_year AS graduationYear
      FROM students
      WHERE school_id = @schoolId
      ORDER BY created_at DESC
    `,
    { schoolId },
  );

  const certificates = get(
    `
      SELECT COUNT(*) AS count
      FROM certificates
      WHERE school_id = @schoolId
    `,
    { schoolId },
  );

  const admitted = students.filter((student) => student.status === "ADMITTED").length;
  const failed = students.filter((student) => student.status === "FAILED").length;
  const pending = students.filter((student) => student.status === "PENDING").length;
  const certified = students.filter((student) => student.certified).length;
  const growthRate = students.length
    ? Math.round((admitted / students.length) * 100)
    : 0;

  const formationStats = formations.map((formation) => {
    const formationStudents = students.filter(
      (student) => student.formationId === formation.id,
    );

    return {
      id: formation.id,
      name: formation.name,
      total: formationStudents.length,
      admitted: formationStudents.filter((student) => student.status === "ADMITTED").length,
      certified: formationStudents.filter((student) => student.certified).length,
    };
  });

  return res.json({
    school,
    stats: {
      students: students.length,
      formations: formations.length,
      certificates: Number(certificates.count),
      admitted,
      failed,
      pending,
      certified,
      growthRate,
    },
    formationStats,
  });
});

const profileSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  username: z.string().min(3).max(30),
  email: z.email(),
  schoolName: z.string().min(2),
  city: z.string().optional(),
});

router.put("/settings/profile", async (req, res) => {
  if (req.user.role !== "SCHOOL" || !req.user.schoolId) {
    return res
      .status(403)
      .json({ message: "Seul un compte ecole peut modifier son profil." });
  }

  const payload = profileSchema.parse(req.body);

  const existingUser = get(
    `
      SELECT id
      FROM users
      WHERE (email = @email OR username = @username)
        AND id != @id
      LIMIT 1
    `,
    {
      email: payload.email,
      username: payload.username,
      id: req.user.id,
    },
  );

  if (existingUser) {
    return res
      .status(400)
      .json({ message: "Email ou nom d'utilisateur deja utilise." });
  }

  const existingSchool = get(
    `
      SELECT id
      FROM schools
      WHERE email = @email
        AND id != @id
      LIMIT 1
    `,
    {
      email: payload.email,
      id: req.user.schoolId,
    },
  );

  if (existingSchool) {
    return res.status(400).json({ message: "Email ecole deja utilise." });
  }

  const timestamp = now();

  run(
    `
      UPDATE users
      SET first_name = @firstName,
          last_name = @lastName,
          username = @username,
          email = @email,
          updated_at = @updatedAt
      WHERE id = @id
    `,
    {
      id: req.user.id,
      firstName: payload.firstName,
      lastName: payload.lastName,
      username: payload.username,
      email: payload.email,
      updatedAt: timestamp,
    },
  );

  run(
    `
      UPDATE schools
      SET name = @name,
          email = @email,
          city = @city,
          updated_at = @updatedAt
      WHERE id = @id
    `,
    {
      id: req.user.schoolId,
      name: payload.schoolName,
      email: payload.email,
      city: payload.city || null,
      updatedAt: timestamp,
    },
  );

  const user = getUserById(req.user.id);

  return res.json({ user: sanitizeUser(user) });
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir des lettres.")
    .regex(/[0-9]/, "Le mot de passe doit contenir des chiffres."),
});

router.put("/settings/password", async (req, res) => {
  const payload = passwordSchema.parse(req.body);
  const user = get(
    `
      SELECT id, password_hash AS passwordHash
      FROM users
      WHERE id = @id
      LIMIT 1
    `,
    { id: req.user.id },
  );

  const isValid = await comparePassword(payload.currentPassword, user.passwordHash);

  if (!isValid) {
    return res.status(400).json({ message: "Mot de passe actuel invalide." });
  }

  const passwordHash = await hashPassword(payload.newPassword);

  run(
    `
      UPDATE users
      SET password_hash = @passwordHash,
          updated_at = @updatedAt
      WHERE id = @id
    `,
    {
      id: req.user.id,
      passwordHash,
      updatedAt: now(),
    },
  );

  return res.json({ message: "Mot de passe mis a jour." });
});

module.exports = router;
