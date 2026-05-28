const { Router } = require("express");
const { z } = require("zod");
const {
  all,
  createId,
  get,
  getDefaultTemplate,
  getSchoolByEmail,
  getUserByEmail,
  getUserById,
  now,
  run,
  transaction,
} = require("../db");
const {
  comparePassword,
  createToken,
  hashPassword,
  sanitizeUser,
} = require("../utils/auth");
const { authenticate } = require("../middleware/auth");

const router = Router();

const registerSchema = z.object({
  schoolName: z.string().min(2),
  email: z.email(),
  username: z.string().min(3).max(30),
  password: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir des lettres.")
    .regex(/[0-9]/, "Le mot de passe doit contenir des chiffres."),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  city: z.string().min(2).optional(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

router.post("/register-school", async (req, res) => {
  const payload = registerSchema.parse(req.body);

  const existing = get(
    `
      SELECT id
      FROM users
      WHERE email = @email OR username = @username
      LIMIT 1
    `,
    {
      email: payload.email,
      username: payload.username,
    },
  );

  if (existing) {
    return res
      .status(400)
      .json({ message: "Cet email ou ce nom d'utilisateur existe deja." });
  }

  const existingSchool = getSchoolByEmail(payload.email);

  if (existingSchool) {
    return res
      .status(400)
      .json({ message: "Une ecole avec cet email existe deja." });
  }

  const passwordHash = await hashPassword(payload.password);

  const result = transaction(() => {
    const starterSubscription = get(
      `
        SELECT id
        FROM subscriptions
        ORDER BY monthly_price ASC
        LIMIT 1
      `,
    );

    const schoolId = createId();
    const userId = createId();
    const timestamp = now();

    run(
      `
        INSERT INTO schools (
          id, name, email, city, country, active, subscription_id, created_at, updated_at
        ) VALUES (
          @id, @name, @email, @city, 'France', 1, @subscriptionId, @createdAt, @updatedAt
        )
      `,
      {
        id: schoolId,
        name: payload.schoolName,
        email: payload.email,
        city: payload.city || null,
        subscriptionId: starterSubscription?.id || null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    );

    run(
      `
        INSERT INTO users (
          id, email, username, password_hash, first_name, last_name, role, is_active, school_id, created_at, updated_at
        ) VALUES (
          @id, @email, @username, @passwordHash, @firstName, @lastName, 'SCHOOL', 1, @schoolId, @createdAt, @updatedAt
        )
      `,
      {
        id: userId,
        email: payload.email,
        username: payload.username,
        passwordHash,
        firstName: payload.firstName,
        lastName: payload.lastName,
        schoolId,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    );

    const templateCount = get(
      `
        SELECT COUNT(*) AS count
        FROM certificate_templates
      `,
    );

    if (Number(templateCount.count) === 0) {
      run(
        `
          INSERT INTO certificate_templates (
            id, name, title, signer_name, signer_role, footer_text, accent_color, is_default, created_at, updated_at
          ) VALUES (
            @id, 'default', 'Certificat de reussite', 'Direction pedagogique', 'Directeur des etudes',
            'Document numerique genere par CertiCampus.', '#14532d', 1, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      );
    }

    return getUserById(userId);
  });

  return res.status(201).json({
    token: createToken(result),
    user: sanitizeUser(result),
  });
});

router.post("/login", async (req, res) => {
  const payload = loginSchema.parse(req.body);

  const user = getUserByEmail(payload.email);

  if (!user) {
    return res.status(401).json({ message: "Email ou mot de passe invalide." });
  }

  const validPassword = await comparePassword(payload.password, user.passwordHash);

  if (!validPassword) {
    return res.status(401).json({ message: "Email ou mot de passe invalide." });
  }

  return res.json({
    token: createToken(user),
    user: sanitizeUser(user),
  });
});

router.get("/me", authenticate, async (req, res) => {
  const user = getUserById(req.user.id);

  return res.json({ user: sanitizeUser(user) });
});

module.exports = router;
