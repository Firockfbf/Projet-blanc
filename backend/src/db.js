const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const rawDatabaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const relativePath = rawDatabaseUrl.startsWith("file:")
  ? rawDatabaseUrl.slice(5)
  : rawDatabaseUrl;
const databasePath = path.isAbsolute(relativePath)
  ? relativePath
  : path.resolve(__dirname, "..", relativePath);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);

db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    monthly_price REAL NOT NULL,
    max_students INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    city TEXT,
    country TEXT NOT NULL DEFAULT 'France',
    active INTEGER NOT NULL DEFAULT 1,
    subscription_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    school_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS formations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    year TEXT NOT NULL,
    school_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE(school_id, code, year)
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    school_id TEXT NOT NULL,
    formation_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    passed INTEGER NOT NULL DEFAULT 0,
    certified INTEGER NOT NULL DEFAULT 0,
    graduation_year TEXT NOT NULL DEFAULT '2026',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY(formation_id) REFERENCES formations(id) ON DELETE SET NULL,
    UNIQUE(school_id, email)
  );

  CREATE TABLE IF NOT EXISTS certificate_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    signer_name TEXT NOT NULL,
    signer_role TEXT NOT NULL,
    footer_text TEXT NOT NULL,
    accent_color TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    student_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    template_id TEXT,
    verification_url TEXT NOT NULL,
    qr_code_data_url TEXT NOT NULL,
    issued_at TEXT NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY(template_id) REFERENCES certificate_templates(id) ON DELETE SET NULL
  );
`);

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

ensureColumn("certificates", "published_at", "TEXT");

function now() {
  return new Date().toISOString();
}

function createId() {
  return randomUUID();
}

function run(sql, params = {}) {
  return db.prepare(sql).run(params);
}

function get(sql, params = {}) {
  return db.prepare(sql).get(params) || null;
}

function all(sql, params = {}) {
  return db.prepare(sql).all(params);
}

function transaction(callback) {
  db.exec("BEGIN");

  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function mapSubscriptionRow(row, prefix = "") {
  if (!row || !row[`${prefix}id`]) {
    return null;
  }

  return {
    id: row[`${prefix}id`],
    name: row[`${prefix}name`],
    description: row[`${prefix}description`],
    monthlyPrice: Number(row[`${prefix}monthlyPrice`]),
    maxStudents: Number(row[`${prefix}maxStudents`]),
  };
}

function mapSchoolRow(row, prefix = "") {
  if (!row || !row[`${prefix}id`]) {
    return null;
  }

  const subscription = mapSubscriptionRow(row, `${prefix}subscription_`);

  return {
    id: row[`${prefix}id`],
    name: row[`${prefix}name`],
    email: row[`${prefix}email`],
    city: row[`${prefix}city`],
    country: row[`${prefix}country`],
    active: Boolean(row[`${prefix}active`]),
    subscriptionId: row[`${prefix}subscriptionId`] || null,
    subscription,
  };
}

function userSelectSql(whereClause) {
  return `
    SELECT
      u.id,
      u.email,
      u.username,
      u.password_hash AS passwordHash,
      u.first_name AS firstName,
      u.last_name AS lastName,
      u.role,
      u.is_active AS isActive,
      u.school_id AS schoolId,
      s.id AS school_id,
      s.name AS school_name,
      s.email AS school_email,
      s.city AS school_city,
      s.country AS school_country,
      s.active AS school_active,
      s.subscription_id AS school_subscriptionId,
      sub.id AS school_subscription_id,
      sub.name AS school_subscription_name,
      sub.description AS school_subscription_description,
      sub.monthly_price AS school_subscription_monthlyPrice,
      sub.max_students AS school_subscription_maxStudents
    FROM users u
    LEFT JOIN schools s ON s.id = u.school_id
    LEFT JOIN subscriptions sub ON sub.id = s.subscription_id
    WHERE ${whereClause}
    LIMIT 1
  `;
}

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.passwordHash,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    isActive: Boolean(row.isActive),
    schoolId: row.schoolId || null,
    school: mapSchoolRow(row, "school_"),
  };
}

function getUserByEmail(email) {
  return mapUserRow(get(userSelectSql("u.email = @email"), { email }));
}

function getUserById(id) {
  return mapUserRow(get(userSelectSql("u.id = @id"), { id }));
}

function getSchoolById(id) {
  const row = get(
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
      WHERE s.id = @id
      LIMIT 1
    `,
    { id },
  );

  return mapSchoolRow(row);
}

function getSchoolByEmail(email) {
  const row = get(
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
      WHERE s.email = @email
      LIMIT 1
    `,
    { email },
  );

  return mapSchoolRow(row);
}

function getDefaultTemplate() {
  return get(
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
      WHERE is_default = 1
      LIMIT 1
    `,
  );
}

function getTemplateById(id) {
  return get(
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
}

module.exports = {
  all,
  createId,
  db,
  get,
  getDefaultTemplate,
  getSchoolByEmail,
  getSchoolById,
  getTemplateById,
  getUserByEmail,
  getUserById,
  now,
  run,
  transaction,
};
