const request = require("supertest");
const { createId, get, now, run } = require("../src/db");
const app = require("../src/app");
const { hashPassword } = require("../src/utils/auth");

describe("CertiCampus API", () => {
  beforeAll(async () => {
    const starter = get(`SELECT id FROM subscriptions WHERE name = 'Starter' LIMIT 1`);

    if (!starter) {
      run(
        `
          INSERT INTO subscriptions (
            id, name, description, monthly_price, max_students, created_at, updated_at
          ) VALUES (
            @id, 'Starter', 'Plan de test', 10, 100, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          createdAt: now(),
          updatedAt: now(),
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
            @id, 'default', 'Certificat de reussite', 'Direction', 'Responsable', 'Template de test', '#14532d', 1, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          createdAt: now(),
          updatedAt: now(),
        },
      );
    }
  });

  beforeEach(async () => {
    run(`DELETE FROM certificates`);
    run(`DELETE FROM students`);
    run(`DELETE FROM formations`);
    run(`DELETE FROM users WHERE role = 'SCHOOL'`);
    run(`DELETE FROM schools`);
  });

  it("registers a school account and returns a token", async () => {
    const response = await request(app).post("/api/auth/register-school").send({
      schoolName: "Ecole Test",
      email: "test@school.test",
      username: "ecole-test",
      password: "Test1234",
      firstName: "Jean",
      lastName: "Dupont",
      city: "Paris",
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.role).toBe("SCHOOL");
  });

  it("allows a school user to create a formation and a student", async () => {
    const register = await request(app).post("/api/auth/register-school").send({
      schoolName: "Ecole Test",
      email: "manager@school.test",
      username: "manager-school",
      password: "Test1234",
      firstName: "Nina",
      lastName: "Martin",
      city: "Lyon",
    });

    const token = register.body.token;

    const formationResponse = await request(app)
      .post("/api/formations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Master Web",
        code: "M1WEB",
        year: "2025-2026",
      });

    expect(formationResponse.status).toBe(201);

    const studentResponse = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@school.test",
        formationId: formationResponse.body.formation.id,
        status: "ADMITTED",
        graduationYear: "2026",
      });

    expect(studentResponse.status).toBe(201);
    expect(studentResponse.body.student.status).toBe("ADMITTED");

    const dashboardResponse = await request(app)
      .get("/api/school/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.stats.students).toBe(1);
    expect(dashboardResponse.body.stats.formations).toBe(1);
  });

  it("allows an admin to view schools", async () => {
    const passwordHash = await hashPassword("Admin1234");

    const existingAdmin = get(
      `SELECT id FROM users WHERE email = 'admin@test.local' LIMIT 1`,
    );

    if (!existingAdmin) {
      run(
        `
          INSERT INTO users (
            id, email, username, password_hash, first_name, last_name, role, is_active, school_id, created_at, updated_at
          ) VALUES (
            @id, 'admin@test.local', 'admin-local', @passwordHash, 'Admin', 'Local', 'ADMIN', 1, NULL, @createdAt, @updatedAt
          )
        `,
        {
          id: createId(),
          passwordHash,
          createdAt: now(),
          updatedAt: now(),
        },
      );
    }

    await request(app).post("/api/auth/register-school").send({
      schoolName: "Ecole Admin",
      email: "ecole-admin@test.local",
      username: "ecole-admin",
      password: "Test1234",
      firstName: "Paul",
      lastName: "Henry",
      city: "Paris",
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "admin@test.local",
      password: "Admin1234",
    });

    const response = await request(app)
      .get("/api/admin/schools")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.schools.length).toBeGreaterThan(0);
  });
});
