const { Router } = require("express");
const { z } = require("zod");
const {
  all,
  createId,
  get,
  getDefaultTemplate,
  now,
  run,
  transaction,
} = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { hashPassword } = require("../utils/auth");

const router = Router();

router.use(authenticate);
router.use(requireRole("ADMIN"));

router.get("/dashboard", async (req, res) => {
  const schools = all(
    `
      SELECT
        s.id,
        s.name,
        s.email,
        s.city,
        s.country,
        s.active,
        s.subscription_id AS subscriptionId,
        sub.id AS subscription_id,
        sub.name AS subscription_name,
        sub.description AS subscription_description,
        sub.monthly_price AS subscription_monthlyPrice,
        sub.max_students AS subscription_maxStudents
      FROM schools s
      LEFT JOIN subscriptions sub ON sub.id = s.subscription_id
      ORDER BY s.created_at DESC
    `,
  ).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    city: row.city,
    country: row.country,
    active: Boolean(row.active),
    subscriptionId: row.subscriptionId || null,
    subscription: row.subscription_id
      ? {
          id: row.subscription_id,
          name: row.subscription_name,
          description: row.subscription_description,
          monthlyPrice: Number(row.subscription_monthlyPrice),
          maxStudents: Number(row.subscription_maxStudents),
        }
      : null,
  }));

  const subscriptions = all(
    `
      SELECT
        id,
        name,
        description,
        monthly_price AS monthlyPrice,
        max_students AS maxStudents
      FROM subscriptions
      ORDER BY monthly_price ASC
    `,
  );
  const certificates = get(`SELECT COUNT(*) AS count FROM certificates`);
  const users = get(`SELECT COUNT(*) AS count FROM users WHERE role = 'SCHOOL'`);

  return res.json({
    stats: {
      schools: schools.length,
      activeSchools: schools.filter((school) => school.active).length,
      subscriptions: subscriptions.length,
      certificates: Number(certificates.count),
      schoolUsers: Number(users.count),
    },
    schools,
    subscriptions,
  });
});

router.get("/schools", async (req, res) => {
  const schoolRows = all(
    `
      SELECT
        s.id,
        s.name,
        s.email,
        s.city,
        s.country,
        s.active,
        s.subscription_id AS subscriptionId,
        sub.id AS subscription_id,
        sub.name AS subscription_name,
        sub.description AS subscription_description,
        sub.monthly_price AS subscription_monthlyPrice,
        sub.max_students AS subscription_maxStudents
      FROM schools s
      LEFT JOIN subscriptions sub ON sub.id = s.subscription_id
      ORDER BY s.created_at DESC
    `,
  );
  const userRows = all(
    `
      SELECT
        id,
        first_name AS firstName,
        last_name AS lastName,
        email,
        username,
        school_id AS schoolId
      FROM users
      WHERE school_id IS NOT NULL
    `,
  );

  const schools = schoolRows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    city: row.city,
    country: row.country,
    active: Boolean(row.active),
    subscriptionId: row.subscriptionId || null,
    subscription: row.subscription_id
      ? {
          id: row.subscription_id,
          name: row.subscription_name,
          description: row.subscription_description,
          monthlyPrice: Number(row.subscription_monthlyPrice),
          maxStudents: Number(row.subscription_maxStudents),
        }
      : null,
    users: userRows.filter((user) => user.schoolId === row.id),
  }));

  return res.json({ schools });
});

const schoolSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  city: z.string().optional(),
  country: z.string().optional(),
  active: z.boolean().optional(),
  subscriptionId: z.string().nullable().optional(),
  manager: z
    .object({
      firstName: z.string().min(2),
      lastName: z.string().min(2),
      username: z.string().min(3),
      password: z.string().min(8),
    })
    .optional(),
});

router.post("/schools", async (req, res) => {
  const payload = schoolSchema.parse(req.body);

  const existingSchool = get(
    `
      SELECT id
      FROM schools
      WHERE email = @email
      LIMIT 1
    `,
    { email: payload.email },
  );

  if (existingSchool) {
    return res.status(400).json({ message: "Cette ecole existe deja." });
  }

  const managerPasswordHash = payload.manager
    ? await hashPassword(payload.manager.password)
    : null;
  const schoolId = createId();
  const timestamp = now();
  const result = transaction(() => {
    run(
      `
        INSERT INTO schools (
          id, name, email, city, country, active, subscription_id, created_at, updated_at
        ) VALUES (
          @id, @name, @email, @city, @country, @active, @subscriptionId, @createdAt, @updatedAt
        )
      `,
      {
        id: schoolId,
        name: payload.name,
        email: payload.email,
        city: payload.city || null,
        country: payload.country || "France",
        active: payload.active === false ? 0 : 1,
        subscriptionId: payload.subscriptionId || null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    );

    if (payload.manager) {
      run(
        `
          INSERT INTO users (
            id, email, username, password_hash, first_name, last_name, role, is_active, school_id, created_at, updated_at
          ) VALUES (
            @id, @email, @username, @passwordHash, @firstName, @lastName, 'SCHOOL', 1, @schoolId, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          email: payload.email,
          username: payload.manager.username,
          passwordHash: managerPasswordHash,
          firstName: payload.manager.firstName,
          lastName: payload.manager.lastName,
          schoolId,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      );
    }

    return get(
      `
        SELECT
          id,
          name,
          email,
          city,
          country,
          active,
          subscription_id AS subscriptionId
        FROM schools
        WHERE id = @id
        LIMIT 1
      `,
      { id: schoolId },
    );
  });

  return res.status(201).json({ school: result });
});

router.put("/schools/:id", async (req, res) => {
  const payload = schoolSchema.partial().parse(req.body);

  const school = get(
    `
      SELECT id
      FROM schools
      WHERE id = @id
      LIMIT 1
    `,
    { id: req.params.id },
  );

  if (!school) {
    return res.status(404).json({ message: "Ecole introuvable." });
  }

  run(
    `
      UPDATE schools
      SET name = COALESCE(@name, name),
          email = COALESCE(@email, email),
          city = COALESCE(@city, city),
          country = COALESCE(@country, country),
          active = CASE
            WHEN @activeProvided = 1 THEN @active
            ELSE active
          END,
          subscription_id = CASE
            WHEN @subscriptionProvided = 1 THEN @subscriptionId
            ELSE subscription_id
          END,
          updated_at = @updatedAt
      WHERE id = @id
    `,
    {
      id: school.id,
      name: payload.name ?? null,
      email: payload.email ?? null,
      city: payload.city ?? null,
      country: payload.country ?? null,
      activeProvided: payload.active === undefined ? 0 : 1,
      active: payload.active ? 1 : 0,
      subscriptionProvided: payload.subscriptionId === undefined ? 0 : 1,
      subscriptionId: payload.subscriptionId || null,
      updatedAt: now(),
    },
  );

  const updated = get(
    `
      SELECT
        id,
        name,
        email,
        city,
        country,
        active,
        subscription_id AS subscriptionId
      FROM schools
      WHERE id = @id
      LIMIT 1
    `,
    { id: school.id },
  );

  return res.json({ school: updated });
});

router.delete("/schools/:id", async (req, res) => {
  const school = get(
    `
      SELECT id
      FROM schools
      WHERE id = @id
      LIMIT 1
    `,
    { id: req.params.id },
  );

  if (!school) {
    return res.status(404).json({ message: "Ecole introuvable." });
  }

  run(`DELETE FROM schools WHERE id = @id`, { id: school.id });

  return res.json({ message: "Ecole supprimee." });
});

router.get("/subscriptions", async (req, res) => {
  const subscriptions = all(
    `
      SELECT
        id,
        name,
        description,
        monthly_price AS monthlyPrice,
        max_students AS maxStudents
      FROM subscriptions
      ORDER BY monthly_price ASC
    `,
  );

  return res.json({ subscriptions });
});

const subscriptionSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  monthlyPrice: z.coerce.number().min(0),
  maxStudents: z.coerce.number().int().min(1),
});

router.post("/subscriptions", async (req, res) => {
  const payload = subscriptionSchema.parse(req.body);

  const id = createId();
  const timestamp = now();

  run(
    `
      INSERT INTO subscriptions (
        id, name, description, monthly_price, max_students, created_at, updated_at
      ) VALUES (
        @id, @name, @description, @monthlyPrice, @maxStudents, @createdAt, @updatedAt
      )
    `,
    {
      id,
      name: payload.name,
      description: payload.description || null,
      monthlyPrice: payload.monthlyPrice,
      maxStudents: payload.maxStudents,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  );

  const subscription = get(
    `
      SELECT
        id,
        name,
        description,
        monthly_price AS monthlyPrice,
        max_students AS maxStudents
      FROM subscriptions
      WHERE id = @id
      LIMIT 1
    `,
    { id },
  );

  return res.status(201).json({ subscription });
});

router.put("/subscriptions/:id", async (req, res) => {
  const payload = subscriptionSchema.partial().parse(req.body);

  const subscription = get(
    `SELECT id FROM subscriptions WHERE id = @id LIMIT 1`,
    { id: req.params.id },
  );

  if (!subscription) {
    return res.status(404).json({ message: "Abonnement introuvable." });
  }

  run(
    `
      UPDATE subscriptions
      SET name = COALESCE(@name, name),
          description = COALESCE(@description, description),
          monthly_price = COALESCE(@monthlyPrice, monthly_price),
          max_students = COALESCE(@maxStudents, max_students),
          updated_at = @updatedAt
      WHERE id = @id
    `,
    {
      id: subscription.id,
      name: payload.name ?? null,
      description: payload.description ?? null,
      monthlyPrice: payload.monthlyPrice ?? null,
      maxStudents: payload.maxStudents ?? null,
      updatedAt: now(),
    },
  );

  const updated = get(
    `
      SELECT
        id,
        name,
        description,
        monthly_price AS monthlyPrice,
        max_students AS maxStudents
      FROM subscriptions
      WHERE id = @id
      LIMIT 1
    `,
    { id: subscription.id },
  );

  return res.json({ subscription: updated });
});

router.delete("/subscriptions/:id", async (req, res) => {
  const subscription = get(
    `SELECT id FROM subscriptions WHERE id = @id LIMIT 1`,
    { id: req.params.id },
  );

  if (!subscription) {
    return res.status(404).json({ message: "Abonnement introuvable." });
  }

  run(`DELETE FROM subscriptions WHERE id = @id`, { id: subscription.id });

  return res.json({ message: "Abonnement supprime." });
});

router.get("/templates", async (req, res) => {
  const templates = all(
    `
      SELECT
        id,
        name,
        title,
        signer_name AS signerName,
        signer_role AS signerRole,
        footer_text AS footerText,
        accent_color AS accentColor,
        is_default AS isDefault
      FROM certificate_templates
      ORDER BY is_default DESC, name ASC
    `,
  ).map((template) => ({
    ...template,
    isDefault: Boolean(template.isDefault),
  }));

  return res.json({ templates });
});

const templateSchema = z.object({
  name: z.string().min(2).optional(),
  title: z.string().min(2),
  signerName: z.string().min(2),
  signerRole: z.string().min(2),
  footerText: z.string().min(2),
  accentColor: z.string().min(4),
  isDefault: z.boolean().optional(),
});

router.put("/templates/default", async (req, res) => {
  const payload = templateSchema.parse(req.body);

  const currentDefault = getDefaultTemplate();

  if (!currentDefault) {
    const id = createId();
    const timestamp = now();
    run(
      `
        INSERT INTO certificate_templates (
          id, name, title, signer_name, signer_role, footer_text, accent_color, is_default, created_at, updated_at
        ) VALUES (
          @id, @name, @title, @signerName, @signerRole, @footerText, @accentColor, 1, @createdAt, @updatedAt
        )
      `,
      {
        id,
        name: payload.name || "default",
        title: payload.title,
        signerName: payload.signerName,
        signerRole: payload.signerRole,
        footerText: payload.footerText,
        accentColor: payload.accentColor,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    );

    const created = get(
      `
        SELECT
          id,
          name,
          title,
          signer_name AS signerName,
          signer_role AS signerRole,
          footer_text AS footerText,
          accent_color AS accentColor,
          is_default AS isDefault
        FROM certificate_templates
        WHERE id = @id
        LIMIT 1
      `,
      { id },
    );

    return res.json({ template: created });
  }

  run(
    `
      UPDATE certificate_templates
      SET name = COALESCE(@name, name),
          title = @title,
          signer_name = @signerName,
          signer_role = @signerRole,
          footer_text = @footerText,
          accent_color = @accentColor,
          is_default = CASE
            WHEN @isDefaultProvided = 1 THEN @isDefault
            ELSE is_default
          END,
          updated_at = @updatedAt
      WHERE id = @id
    `,
    {
      id: currentDefault.id,
      name: payload.name ?? null,
      title: payload.title,
      signerName: payload.signerName,
      signerRole: payload.signerRole,
      footerText: payload.footerText,
      accentColor: payload.accentColor,
      isDefaultProvided: payload.isDefault === undefined ? 0 : 1,
      isDefault: payload.isDefault ? 1 : 0,
      updatedAt: now(),
    },
  );

  const updated = get(
    `
      SELECT
        id,
        name,
        title,
        signer_name AS signerName,
        signer_role AS signerRole,
        footer_text AS footerText,
        accent_color AS accentColor,
        is_default AS isDefault
      FROM certificate_templates
      WHERE id = @id
      LIMIT 1
    `,
    { id: currentDefault.id },
  );

  return res.json({ template: updated });
});

module.exports = router;
