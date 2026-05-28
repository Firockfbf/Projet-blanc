const { Router } = require("express");
const { z } = require("zod");
const { all, createId, get, now, run } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { requireScopedSchoolId } = require("../utils/scope");

const router = Router();

const formationSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  year: z.string().min(4).default("2025-2026"),
  schoolId: z.string().optional(),
});

router.use(authenticate);
router.use(requireRole("SCHOOL", "ADMIN"));

router.get("/", async (req, res) => {
  const schoolId = requireScopedSchoolId(req);
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
      ORDER BY created_at DESC
    `,
    { schoolId },
  );

  return res.json({ formations });
});

router.post("/", async (req, res) => {
  const payload = formationSchema.parse(req.body);
  const schoolId = req.user.role === "ADMIN" ? payload.schoolId : req.user.schoolId;

  if (!schoolId) {
    return res.status(400).json({ message: "Un schoolId est requis." });
  }

  const id = createId();
  const timestamp = now();

  run(
    `
      INSERT INTO formations (
        id, name, code, year, school_id, created_at, updated_at
      ) VALUES (
        @id, @name, @code, @year, @schoolId, @createdAt, @updatedAt
      )
    `,
    {
      id,
      name: payload.name,
      code: payload.code.toUpperCase(),
      year: payload.year,
      schoolId,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  );

  const formation = get(
    `
      SELECT
        id,
        name,
        code,
        year,
        school_id AS schoolId
      FROM formations
      WHERE id = @id
      LIMIT 1
    `,
    { id },
  );

  return res.status(201).json({ formation });
});

router.put("/:id", async (req, res) => {
  const payload = formationSchema.partial().parse(req.body);
  const schoolId = requireScopedSchoolId(req);

  const formation = get(
    `
      SELECT id
      FROM formations
      WHERE id = @id
        AND school_id = @schoolId
      LIMIT 1
    `,
    {
      id: req.params.id,
      schoolId,
    },
  );

  if (!formation) {
    return res.status(404).json({ message: "Formation introuvable." });
  }

  run(
    `
      UPDATE formations
      SET name = COALESCE(@name, name),
          code = COALESCE(@code, code),
          year = COALESCE(@year, year),
          updated_at = @updatedAt
      WHERE id = @id
    `,
    {
      id: formation.id,
      name: payload.name ?? null,
      code: payload.code ? payload.code.toUpperCase() : null,
      year: payload.year ?? null,
      updatedAt: now(),
    },
  );

  const updated = get(
    `
      SELECT
        id,
        name,
        code,
        year,
        school_id AS schoolId
      FROM formations
      WHERE id = @id
      LIMIT 1
    `,
    { id: formation.id },
  );

  return res.json({ formation: updated });
});

router.delete("/:id", async (req, res) => {
  const schoolId = requireScopedSchoolId(req);

  const formation = get(
    `
      SELECT id
      FROM formations
      WHERE id = @id
        AND school_id = @schoolId
      LIMIT 1
    `,
    {
      id: req.params.id,
      schoolId,
    },
  );

  if (!formation) {
    return res.status(404).json({ message: "Formation introuvable." });
  }

  run(
    `
      DELETE FROM formations
      WHERE id = @id
    `,
    { id: formation.id },
  );

  return res.json({ message: "Formation supprimee." });
});

module.exports = router;
