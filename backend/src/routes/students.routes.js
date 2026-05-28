const { Router } = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { z } = require("zod");
const { all, createId, get, now, run } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { requireScopedSchoolId } = require("../utils/scope");

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const studentSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.email(),
  formationId: z.string().nullable().optional(),
  status: z.enum(["PENDING", "ADMITTED", "FAILED"]).default("PENDING"),
  passed: z.boolean().optional(),
  certified: z.boolean().optional(),
  graduationYear: z.string().default("2026"),
  schoolId: z.string().optional(),
});

function normalizeRow(row) {
  return {
    firstName: String(row.firstName || row.firstname || row.prenom || "").trim(),
    lastName: String(row.lastName || row.lastname || row.nom || "").trim(),
    email: String(row.email || "").trim().toLowerCase(),
    formationCode: String(
      row.formationCode || row.formation || row.formation_code || "",
    )
      .trim()
      .toUpperCase(),
    status: String(row.status || "PENDING")
      .trim()
      .toUpperCase(),
    graduationYear: String(row.graduationYear || row.year || "2026").trim(),
  };
}

function mapStudentRow(row) {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    schoolId: row.schoolId,
    formationId: row.formationId || null,
    status: row.status,
    passed: Boolean(row.passed),
    certified: Boolean(row.certified),
    graduationYear: row.graduationYear,
    formation: row.formation_id
      ? {
          id: row.formation_id,
          name: row.formation_name,
          code: row.formation_code,
        }
      : null,
    certificates: row.certificate_code
      ? [
          {
            code: row.certificate_code,
            issuedAt: row.certificate_issuedAt,
          },
        ]
      : [],
  };
}

function getStudentById(id, schoolId) {
  const row = get(
    `
      SELECT
        s.id,
        s.first_name AS firstName,
        s.last_name AS lastName,
        s.email,
        s.school_id AS schoolId,
        s.formation_id AS formationId,
        s.status,
        s.passed,
        s.certified,
        s.graduation_year AS graduationYear,
        f.id AS formation_id,
        f.name AS formation_name,
        f.code AS formation_code,
        c.code AS certificate_code,
        c.issued_at AS certificate_issuedAt
      FROM students s
      LEFT JOIN formations f ON f.id = s.formation_id
      LEFT JOIN certificates c
        ON c.id = (
          SELECT c2.id
          FROM certificates c2
          WHERE c2.student_id = s.id
          ORDER BY c2.issued_at DESC
          LIMIT 1
        )
      WHERE s.id = @id
        AND s.school_id = @schoolId
      LIMIT 1
    `,
    {
      id,
      schoolId,
    },
  );

  return row ? mapStudentRow(row) : null;
}

router.use(authenticate);
router.use(requireRole("SCHOOL", "ADMIN"));

router.get("/", async (req, res) => {
  const schoolId = requireScopedSchoolId(req);
  const search = req.query.search?.trim();
  const formationId = req.query.formationId?.trim();
  const status = req.query.status?.trim();
  const certified = req.query.certified?.trim();

  const conditions = ["s.school_id = @schoolId"];
  const params = { schoolId };

  if (formationId) {
    conditions.push("s.formation_id = @formationId");
    params.formationId = formationId;
  }

  if (status) {
    conditions.push("s.status = @status");
    params.status = status;
  }

  if (certified === "true") {
    conditions.push("s.certified = 1");
  }

  if (certified === "false") {
    conditions.push("s.certified = 0");
  }

  if (search) {
    conditions.push(
      "(s.first_name LIKE @search OR s.last_name LIKE @search OR s.email LIKE @search)",
    );
    params.search = `%${search}%`;
  }

  const students = all(
    `
      SELECT
        s.id,
        s.first_name AS firstName,
        s.last_name AS lastName,
        s.email,
        s.school_id AS schoolId,
        s.formation_id AS formationId,
        s.status,
        s.passed,
        s.certified,
        s.graduation_year AS graduationYear,
        f.id AS formation_id,
        f.name AS formation_name,
        f.code AS formation_code,
        c.code AS certificate_code,
        c.issued_at AS certificate_issuedAt
      FROM students s
      LEFT JOIN formations f ON f.id = s.formation_id
      LEFT JOIN certificates c
        ON c.id = (
          SELECT c2.id
          FROM certificates c2
          WHERE c2.student_id = s.id
          ORDER BY c2.issued_at DESC
          LIMIT 1
        )
      WHERE ${conditions.join(" AND ")}
      ORDER BY s.created_at DESC
    `,
    params,
  ).map(mapStudentRow);

  return res.json({ students });
});

router.get("/template", async (req, res) => {
  const csv = [
    "firstName,lastName,email,formationCode,status,graduationYear",
    "Ada,Lovelace,ada@school.test,M1WEB,ADMITTED,2026",
    "Alan,Turing,alan@school.test,M1DATA,PENDING,2026",
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="students-import-template.csv"',
  );

  return res.status(200).send(csv);
});

router.post("/", async (req, res) => {
  const payload = studentSchema.parse(req.body);
  const schoolId = req.user.role === "ADMIN" ? payload.schoolId : req.user.schoolId;

  if (!schoolId) {
    return res.status(400).json({ message: "Un schoolId est requis." });
  }

  const id = createId();
  const timestamp = now();

  run(
    `
      INSERT INTO students (
        id, first_name, last_name, email, school_id, formation_id, status, passed, certified, graduation_year, created_at, updated_at
      ) VALUES (
        @id, @firstName, @lastName, @email, @schoolId, @formationId, @status, @passed, @certified, @graduationYear, @createdAt, @updatedAt
      )
    `,
    {
      id,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email.toLowerCase(),
      schoolId,
      formationId: payload.formationId || null,
      status: payload.status,
      passed:
        payload.passed === undefined
          ? payload.status === "ADMITTED"
            ? 1
            : 0
          : payload.passed
            ? 1
            : 0,
      certified: payload.certified ? 1 : 0,
      graduationYear: payload.graduationYear,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  );

  const student = getStudentById(id, schoolId);

  return res.status(201).json({ student });
});

router.put("/:id", async (req, res) => {
  const payload = studentSchema.partial().parse(req.body);
  const schoolId = requireScopedSchoolId(req);

  const student = get(
    `
      SELECT id
      FROM students
      WHERE id = @id
        AND school_id = @schoolId
      LIMIT 1
    `,
    {
      id: req.params.id,
      schoolId,
    },
  );

  if (!student) {
    return res.status(404).json({ message: "Etudiant introuvable." });
  }

  run(
    `
      UPDATE students
      SET first_name = COALESCE(@firstName, first_name),
          last_name = COALESCE(@lastName, last_name),
          email = COALESCE(@email, email),
          formation_id = CASE
            WHEN @formationProvided = 0 THEN formation_id
            ELSE @formationId
          END,
          status = COALESCE(@status, status),
          passed = CASE
            WHEN @passedProvided = 1 THEN @passed
            WHEN @status = 'ADMITTED' THEN 1
            WHEN @status = 'FAILED' THEN 0
            ELSE passed
          END,
          certified = CASE
            WHEN @certifiedProvided = 1 THEN @certified
            ELSE certified
          END,
          graduation_year = COALESCE(@graduationYear, graduation_year),
          updated_at = @updatedAt
      WHERE id = @id
    `,
    {
      id: student.id,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      email: payload.email?.toLowerCase() ?? null,
      formationProvided: payload.formationId === undefined ? 0 : 1,
      formationId: payload.formationId || null,
      status: payload.status ?? null,
      passedProvided: payload.passed === undefined ? 0 : 1,
      passed: payload.passed ? 1 : 0,
      certifiedProvided: payload.certified === undefined ? 0 : 1,
      certified: payload.certified ? 1 : 0,
      graduationYear: payload.graduationYear ?? null,
      updatedAt: now(),
    },
  );

  const updated = getStudentById(student.id, schoolId);

  return res.json({ student: updated });
});

router.delete("/:id", async (req, res) => {
  const schoolId = requireScopedSchoolId(req);

  const student = get(
    `
      SELECT id
      FROM students
      WHERE id = @id
        AND school_id = @schoolId
      LIMIT 1
    `,
    {
      id: req.params.id,
      schoolId,
    },
  );

  if (!student) {
    return res.status(404).json({ message: "Etudiant introuvable." });
  }

  run(
    `
      DELETE FROM students
      WHERE id = @id
    `,
    { id: student.id },
  );

  return res.json({ message: "Etudiant supprime." });
});

router.post("/bulk-delete", async (req, res) => {
  const schoolId = requireScopedSchoolId(req);
  const payload = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);

  const placeholders = payload.ids.map((_, index) => `@id${index}`);
  const params = payload.ids.reduce(
    (accumulator, value, index) => ({ ...accumulator, [`id${index}`]: value }),
    { schoolId },
  );

  const result = run(
    `
      DELETE FROM students
      WHERE school_id = @schoolId
        AND id IN (${placeholders.join(", ")})
    `,
    params,
  );

  return res.json({
    message: `${result.changes} etudiant(s) supprime(s).`,
  });
});

router.post("/import", upload.single("file"), async (req, res) => {
  const schoolId = requireScopedSchoolId(req);

  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier n'a ete envoye." });
  }

  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const formations = all(
    `
      SELECT id, code
      FROM formations
      WHERE school_id = @schoolId
    `,
    { schoolId },
  );

  const formationsByCode = new Map(
    formations.map((formation) => [formation.code.toUpperCase(), formation.id]),
  );

  const preparedRows = rows
    .map(normalizeRow)
    .filter((row) => row.firstName && row.lastName && row.email);

  const created = [];
  const timestamp = now();

  for (const row of preparedRows) {
    const existing = get(
      `
        SELECT id
        FROM students
        WHERE school_id = @schoolId
          AND email = @email
        LIMIT 1
      `,
      {
        schoolId,
        email: row.email,
      },
    );

    const statusValue = ["PENDING", "ADMITTED", "FAILED"].includes(row.status)
      ? row.status
      : "PENDING";

    if (existing) {
      run(
        `
          UPDATE students
          SET first_name = @firstName,
              last_name = @lastName,
              formation_id = @formationId,
              status = @status,
              passed = @passed,
              graduation_year = @graduationYear,
              updated_at = @updatedAt
          WHERE id = @id
        `,
        {
          id: existing.id,
          firstName: row.firstName,
          lastName: row.lastName,
          formationId: formationsByCode.get(row.formationCode) || null,
          status: statusValue,
          passed: statusValue === "ADMITTED" ? 1 : 0,
          graduationYear: row.graduationYear,
          updatedAt: timestamp,
        },
      );

      created.push(existing.id);
      continue;
    }

    const id = createId();

    run(
      `
        INSERT INTO students (
          id, first_name, last_name, email, school_id, formation_id, status, passed, certified, graduation_year, created_at, updated_at
        ) VALUES (
          @id, @firstName, @lastName, @email, @schoolId, @formationId, @status, @passed, 0, @graduationYear, @createdAt, @updatedAt
        )
      `,
      {
        id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        schoolId,
        formationId: formationsByCode.get(row.formationCode) || null,
        status: statusValue,
        passed: statusValue === "ADMITTED" ? 1 : 0,
        graduationYear: row.graduationYear,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    );

    created.push(id);
  }

  return res.json({
    message: `${created.length} etudiant(s) traite(s) avec succes.`,
    count: created.length,
  });
});

module.exports = router;
