const {
  all,
  createId,
  get,
  now,
  run,
  transaction,
} = require("../src/db");
const { hashPassword } = require("../src/utils/auth");

async function main() {
  const timestamp = now();
  const adminPasswordHash = await hashPassword("Admin1234");
  const schoolPasswordHash = await hashPassword("School1234");

  transaction(() => {
    const starter = get(
      `SELECT id FROM subscriptions WHERE name = 'Starter' LIMIT 1`,
    );

    if (!starter) {
      run(
        `
          INSERT INTO subscriptions (
            id, name, description, monthly_price, max_students, created_at, updated_at
          ) VALUES (
            @id, 'Starter', 'Pour demarrer rapidement avec une petite promotion.', 29, 150, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      );
    }

    const growth = get(
      `SELECT id FROM subscriptions WHERE name = 'Growth' LIMIT 1`,
    );

    if (!growth) {
      run(
        `
          INSERT INTO subscriptions (
            id, name, description, monthly_price, max_students, created_at, updated_at
          ) VALUES (
            @id, 'Growth', 'Pour les ecoles qui automatisent leurs envois.', 79, 800, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      );
    }

    const template = get(
      `SELECT id FROM certificate_templates WHERE name = 'default' LIMIT 1`,
    );

    if (!template) {
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

    const growthSubscription = get(
      `SELECT id FROM subscriptions WHERE name = 'Growth' LIMIT 1`,
    );
    const demoSchool = get(
      `SELECT id FROM schools WHERE email = 'school@certicampus.test' LIMIT 1`,
    );

    if (!demoSchool) {
      run(
        `
          INSERT INTO schools (
            id, name, email, city, country, active, subscription_id, created_at, updated_at
          ) VALUES (
            @id, 'CertiCampus Academy', 'school@certicampus.test', 'Paris', 'France', 1, @subscriptionId, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          subscriptionId: growthSubscription?.id || null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      );
    }

    const school = get(
      `SELECT id FROM schools WHERE email = 'school@certicampus.test' LIMIT 1`,
    );

    const admin = get(
      `SELECT id FROM users WHERE email = 'admin@certicampus.test' LIMIT 1`,
    );

    if (!admin) {
      run(
        `
          INSERT INTO users (
            id, email, username, password_hash, first_name, last_name, role, is_active, school_id, created_at, updated_at
          ) VALUES (
            @id, 'admin@certicampus.test', 'admin-certi', @passwordHash, 'Admin', 'CertiCampus', 'ADMIN', 1, NULL, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          passwordHash: adminPasswordHash,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      );
    }

    const schoolManager = get(
      `SELECT id FROM users WHERE email = 'school@certicampus.test' LIMIT 1`,
    );

    if (!schoolManager) {
      run(
        `
          INSERT INTO users (
            id, email, username, password_hash, first_name, last_name, role, is_active, school_id, created_at, updated_at
          ) VALUES (
            @id, 'school@certicampus.test', 'school-manager', @passwordHash, 'Sophie', 'Martin', 'SCHOOL', 1, @schoolId, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          passwordHash: schoolPasswordHash,
          schoolId: school.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      );
    }

    const formationWeb = get(
      `
        SELECT id
        FROM formations
        WHERE school_id = @schoolId
          AND code = 'M1WEB'
          AND year = '2025-2026'
        LIMIT 1
      `,
      { schoolId: school.id },
    );

    if (!formationWeb) {
      run(
        `
          INSERT INTO formations (
            id, name, code, year, school_id, created_at, updated_at
          ) VALUES (
            @id, 'Master Web', 'M1WEB', '2025-2026', @schoolId, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          schoolId: school.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      );
    }

    const formationData = get(
      `
        SELECT id
        FROM formations
        WHERE school_id = @schoolId
          AND code = 'M1DATA'
          AND year = '2025-2026'
        LIMIT 1
      `,
      { schoolId: school.id },
    );

    if (!formationData) {
      run(
        `
          INSERT INTO formations (
            id, name, code, year, school_id, created_at, updated_at
          ) VALUES (
            @id, 'Master Data', 'M1DATA', '2025-2026', @schoolId, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          schoolId: school.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      );
    }
  });

  const school = get(
    `SELECT id FROM schools WHERE email = 'school@certicampus.test' LIMIT 1`,
  );
  const formationRows = all(
    `
      SELECT id, code
      FROM formations
      WHERE school_id = @schoolId
    `,
    { schoolId: school.id },
  );
  const formationMap = new Map(formationRows.map((formation) => [formation.code, formation.id]));

  const students = [
    {
      firstName: "Lea",
      lastName: "Durand",
      email: "lea.durand@certicampus.test",
      formationId: formationMap.get("M1WEB"),
      status: "ADMITTED",
      passed: true,
      certified: false,
    },
    {
      firstName: "Yanis",
      lastName: "Petit",
      email: "yanis.petit@certicampus.test",
      formationId: formationMap.get("M1WEB"),
      status: "FAILED",
      passed: false,
      certified: false,
    },
    {
      firstName: "Nina",
      lastName: "Robert",
      email: "nina.robert@certicampus.test",
      formationId: formationMap.get("M1DATA"),
      status: "PENDING",
      passed: false,
      certified: false,
    },
  ];

  for (const student of students) {
    const existing = get(
      `
        SELECT id
        FROM students
        WHERE school_id = @schoolId
          AND email = @email
        LIMIT 1
      `,
      {
        schoolId: school.id,
        email: student.email,
      },
    );

    if (existing) {
      run(
        `
          UPDATE students
          SET first_name = @firstName,
              last_name = @lastName,
              formation_id = @formationId,
              status = @status,
              passed = @passed,
              certified = @certified,
              updated_at = @updatedAt
          WHERE id = @id
        `,
        {
          id: existing.id,
          firstName: student.firstName,
          lastName: student.lastName,
          formationId: student.formationId,
          status: student.status,
          passed: student.passed ? 1 : 0,
          certified: student.certified ? 1 : 0,
          updatedAt: now(),
        },
      );

      continue;
    }

    run(
      `
        INSERT INTO students (
          id, first_name, last_name, email, school_id, formation_id, status, passed, certified, graduation_year, created_at, updated_at
        ) VALUES (
          @id, @firstName, @lastName, @email, @schoolId, @formationId, @status, @passed, @certified, '2026', @createdAt, @updatedAt
        )
      `,
      {
        id: createId(),
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        schoolId: school.id,
        formationId: student.formationId,
        status: student.status,
        passed: student.passed ? 1 : 0,
        certified: student.certified ? 1 : 0,
        createdAt: now(),
        updatedAt: now(),
      },
    );
  }

  const starter = get(`SELECT id FROM subscriptions WHERE name = 'Starter' LIMIT 1`);
  const starterSchool = get(
    `SELECT id FROM schools WHERE email = 'starter@certicampus.test' LIMIT 1`,
  );

  if (!starterSchool) {
    run(
      `
        INSERT INTO schools (
          id, name, email, city, country, active, subscription_id, created_at, updated_at
        ) VALUES (
          @id, 'Starter School', 'starter@certicampus.test', 'Lyon', 'France', 1, @subscriptionId, @createdAt, @updatedAt
        )
      `,
      {
        id: createId(),
        subscriptionId: starter.id,
        createdAt: now(),
        updatedAt: now(),
      },
    );
  }

  console.log("Seed completed.");
  console.log("Admin: admin@certicampus.test / Admin1234");
  console.log("School: school@certicampus.test / School1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
