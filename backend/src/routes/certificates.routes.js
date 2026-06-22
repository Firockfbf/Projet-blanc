const { Router } = require("express");
const { z } = require("zod");
const {
  all,
  createId,
  get,
  getDefaultTemplate,
  getSchoolById,
  getTemplateById,
  now,
  run,
  transaction,
} = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { buildCertificatePayload } = require("../utils/certificates");
const { requireScopedSchoolId } = require("../utils/scope");

const router = Router();

function mapCertificateRow(row) {
  return {
    id: row.id,
    code: row.code,
    verificationUrl: row.verificationUrl,
    qrCodeDataUrl: row.qrCodeDataUrl,
    issuedAt: row.issuedAt,
    publishedAt: row.publishedAt || null,
    school: row.school_id
      ? {
          id: row.school_id,
          name: row.school_name,
          email: row.school_email,
        }
      : null,
    student: {
      id: row.student_id,
      firstName: row.student_firstName,
      lastName: row.student_lastName,
      email: row.student_email,
      formation: row.formation_id
        ? {
            id: row.formation_id,
            name: row.formation_name,
            code: row.formation_code,
          }
        : null,
    },
    template: row.template_id
      ? {
          id: row.template_id,
          name: row.template_name,
          title: row.template_title,
          signerName: row.template_signerName,
          signerRole: row.template_signerRole,
          footerText: row.template_footerText,
          accentColor: row.template_accentColor,
        }
      : null,
  };
}

router.get("/verify/:code", async (req, res) => {
  const row = get(
    `
      SELECT
        c.id,
        c.code,
        c.verification_url AS verificationUrl,
        c.qr_code_data_url AS qrCodeDataUrl,
        c.issued_at AS issuedAt,
        c.published_at AS publishedAt,
        st.id AS student_id,
        st.first_name AS student_firstName,
        st.last_name AS student_lastName,
        st.email AS student_email,
        f.id AS formation_id,
        f.name AS formation_name,
        f.code AS formation_code,
        s.id AS school_id,
        s.name AS school_name,
        s.email AS school_email,
        t.id AS template_id,
        t.name AS template_name,
        t.title AS template_title,
        t.signer_name AS template_signerName,
        t.signer_role AS template_signerRole,
        t.footer_text AS template_footerText,
        t.accent_color AS template_accentColor
      FROM certificates c
      JOIN students st ON st.id = c.student_id
      LEFT JOIN formations f ON f.id = st.formation_id
      JOIN schools s ON s.id = c.school_id
      LEFT JOIN certificate_templates t ON t.id = c.template_id
      WHERE c.code = @code
        AND c.published_at IS NOT NULL
      LIMIT 1
    `,
    { code: req.params.code },
  );

  if (!row) {
    return res.status(404).json({ message: "Certificat introuvable." });
  }

  return res.json({ certificate: mapCertificateRow(row) });
});

router.use(authenticate);
router.use(requireRole("SCHOOL", "ADMIN"));

router.get("/", async (req, res) => {
  const schoolId = requireScopedSchoolId(req);
  const published = req.query.published?.trim();
  const conditions = ["c.school_id = @schoolId"];

  if (published === "true") {
    conditions.push("c.published_at IS NOT NULL");
  }

  if (published === "false") {
    conditions.push("c.published_at IS NULL");
  }

  const certificates = all(
    `
      SELECT
        c.id,
        c.code,
        c.verification_url AS verificationUrl,
        c.qr_code_data_url AS qrCodeDataUrl,
        c.issued_at AS issuedAt,
        c.published_at AS publishedAt,
        st.id AS student_id,
        st.first_name AS student_firstName,
        st.last_name AS student_lastName,
        st.email AS student_email,
        f.id AS formation_id,
        f.name AS formation_name,
        f.code AS formation_code,
        t.id AS template_id,
        t.name AS template_name,
        t.title AS template_title,
        t.signer_name AS template_signerName,
        t.signer_role AS template_signerRole,
        t.footer_text AS template_footerText,
        t.accent_color AS template_accentColor
      FROM certificates c
      JOIN students st ON st.id = c.student_id
      LEFT JOIN formations f ON f.id = st.formation_id
      LEFT JOIN certificate_templates t ON t.id = c.template_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY c.issued_at DESC
    `,
    { schoolId },
  ).map(mapCertificateRow);

  return res.json({ certificates });
});

router.get("/preview/:studentId", async (req, res) => {
  const schoolId = requireScopedSchoolId(req);

  const student = get(
    `
      SELECT
        s.id,
        s.first_name AS firstName,
        s.last_name AS lastName,
        s.email,
        s.status,
        s.passed,
        s.certified,
        s.graduation_year AS graduationYear,
        f.id AS formation_id,
        f.name AS formation_name,
        f.code AS formation_code
      FROM students s
      LEFT JOIN formations f ON f.id = s.formation_id
      WHERE s.id = @id
        AND s.school_id = @schoolId
      LIMIT 1
    `,
    {
      id: req.params.studentId,
      schoolId,
    },
  );
  const school = getSchoolById(schoolId);
  const template = getDefaultTemplate();

  if (!student || !school || !template) {
    return res
      .status(404)
      .json({ message: "Impossible de generer un apercu de certificat." });
  }

  const preview = await buildCertificatePayload(
    {
      ...student,
      formation: student.formation_id
        ? {
            id: student.formation_id,
            name: student.formation_name,
            code: student.formation_code,
          }
        : null,
    },
    school,
    template,
  );

  return res.json({ preview });
});

router.post("/generate", async (req, res) => {
  const schoolId = requireScopedSchoolId(req);
  const payload = z
    .object({
      studentIds: z.array(z.string()).min(1),
      templateId: z.string().optional(),
    })
    .parse(req.body);

  const school = getSchoolById(schoolId);
  const studentPlaceholders = payload.studentIds.map((_, index) => `@id${index}`);
  const studentParams = payload.studentIds.reduce(
    (accumulator, value, index) => ({ ...accumulator, [`id${index}`]: value }),
    { schoolId },
  );
  const students = all(
    `
      SELECT
        s.id,
        s.first_name AS firstName,
        s.last_name AS lastName,
        s.email,
        s.status,
        s.passed,
        s.certified,
        s.graduation_year AS graduationYear,
        f.id AS formation_id,
        f.name AS formation_name,
        f.code AS formation_code
      FROM students s
      LEFT JOIN formations f ON f.id = s.formation_id
      WHERE s.school_id = @schoolId
        AND s.certified = 0
        AND s.id IN (${studentPlaceholders.join(", ")})
    `,
    studentParams,
  ).map((student) => ({
    ...student,
    formation: student.formation_id
      ? {
          id: student.formation_id,
          name: student.formation_name,
          code: student.formation_code,
        }
      : null,
  }));
  const template = payload.templateId
    ? getTemplateById(payload.templateId)
    : getDefaultTemplate();

  if (!school || !template) {
    return res.status(404).json({ message: "Template ou ecole introuvable." });
  }

  const certificates = [];

  for (const student of students) {
    const payloadData = await buildCertificatePayload(student, school, template);
    const timestamp = now();
    const certificateId = createId();

    transaction(() => {
      run(
        `
          INSERT INTO certificates (
            id, code, student_id, school_id, template_id, verification_url, qr_code_data_url, issued_at
          ) VALUES (
            @id, @code, @studentId, @schoolId, @templateId, @verificationUrl, @qrCodeDataUrl, @issuedAt
          )
        `,
        {
          id: certificateId,
          code: payloadData.code,
          studentId: student.id,
          schoolId,
          templateId: template.id,
          verificationUrl: payloadData.verificationUrl,
          qrCodeDataUrl: payloadData.qrCodeDataUrl,
          issuedAt: timestamp,
        },
      );

      run(
        `
          UPDATE students
          SET certified = 1,
              status = @status,
              passed = @passed,
              updated_at = @updatedAt
          WHERE id = @id
        `,
        {
          id: student.id,
          status: student.status === "PENDING" ? "ADMITTED" : student.status,
          passed: student.status !== "FAILED" ? 1 : 0,
          updatedAt: timestamp,
        },
      );
    });

    const certificateRow = get(
      `
        SELECT
          c.id,
          c.code,
          c.verification_url AS verificationUrl,
          c.qr_code_data_url AS qrCodeDataUrl,
          c.issued_at AS issuedAt,
          c.published_at AS publishedAt,
          st.id AS student_id,
          st.first_name AS student_firstName,
          st.last_name AS student_lastName,
          st.email AS student_email,
          f.id AS formation_id,
          f.name AS formation_name,
          f.code AS formation_code,
          t.id AS template_id,
          t.name AS template_name,
          t.title AS template_title,
          t.signer_name AS template_signerName,
          t.signer_role AS template_signerRole,
          t.footer_text AS template_footerText,
          t.accent_color AS template_accentColor
        FROM certificates c
        JOIN students st ON st.id = c.student_id
        LEFT JOIN formations f ON f.id = st.formation_id
        LEFT JOIN certificate_templates t ON t.id = c.template_id
        WHERE c.id = @id
        LIMIT 1
      `,
      { id: certificateId },
    );

    certificates.push(mapCertificateRow(certificateRow));
  }

  return res.status(201).json({
    message: `${certificates.length} certificat(s) genere(s).`,
    certificates,
  });
});

router.post("/publish", async (req, res) => {
  const schoolId = requireScopedSchoolId(req);
  const payload = z
    .object({
      certificateIds: z.array(z.string()).min(1),
    })
    .parse(req.body);

  const placeholders = payload.certificateIds.map((_, index) => `@id${index}`);
  const params = payload.certificateIds.reduce(
    (accumulator, value, index) => ({ ...accumulator, [`id${index}`]: value }),
    {
      schoolId,
      publishedAt: now(),
    },
  );

  const result = run(
    `
      UPDATE certificates
      SET published_at = COALESCE(published_at, @publishedAt)
      WHERE school_id = @schoolId
        AND id IN (${placeholders.join(", ")})
    `,
    params,
  );

  return res.json({
    message: `${result.changes} certificat(s) publie(s).`,
    count: result.changes,
  });
});

module.exports = router;
