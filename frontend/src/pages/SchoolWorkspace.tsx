import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import api from "../api";
import { useSession } from "../session";
import type {
  Certificate,
  CertificatePreview,
  DashboardStats,
  Formation,
  FormationStat,
  Student,
} from "../types";

type SchoolDashboardResponse = {
  school: {
    id: string;
    name: string;
    email: string;
    city: string | null;
    country: string | null;
    active: boolean;
    subscription?: {
      name: string;
      monthlyPrice: number;
    } | null;
  };
  stats: DashboardStats;
  formationStats: FormationStat[];
};

export default function SchoolWorkspace() {
  const { clearSession, refreshUser, user } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<SchoolDashboardResponse | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<CertificatePreview | null>(null);
  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    formationId: "",
    status: "PENDING",
    graduationYear: "2026",
  });
  const [formationForm, setFormationForm] = useState({
    name: "",
    code: "",
    year: "2025-2026",
  });
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    schoolName: user?.school?.name ?? "",
    city: user?.school?.city ?? "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const certifiedCount = useMemo(
    () => students.filter((student) => student.certified).length,
    [students],
  );

  const loadAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardResponse, formationsResponse, studentsResponse, certificatesResponse] =
        await Promise.all([
          api.get<SchoolDashboardResponse>("/school/dashboard"),
          api.get<{ formations: Formation[] }>("/formations"),
          api.get<{ students: Student[] }>("/students"),
          api.get<{ certificates: Certificate[] }>("/certificates"),
        ]);

      setDashboard(dashboardResponse.data);
      setFormations(formationsResponse.data.formations);
      setStudents(studentsResponse.data.students);
      setCertificates(certificatesResponse.data.certificates);
    } catch (requestError: unknown) {
      setError("Impossible de charger l'espace ecole.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    setProfileForm({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      username: user?.username ?? "",
      email: user?.email ?? "",
      schoolName: user?.school?.name ?? "",
      city: user?.school?.city ?? "",
    });
  }, [user]);

  const toggleSelection = (studentId: string) => {
    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((value) => value !== studentId)
        : [...current, studentId],
    );
  };

  const submitFormation = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/formations", formationForm);
    setFormationForm({ name: "", code: "", year: "2025-2026" });
    setNotice("Formation ajoutee.");
    await loadAll();
  };

  const submitStudent = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/students", {
      ...studentForm,
      formationId: studentForm.formationId || null,
    });
    setStudentForm({
      firstName: "",
      lastName: "",
      email: "",
      formationId: "",
      status: "PENDING",
      graduationYear: "2026",
    });
    setNotice("Etudiant ajoute.");
    await loadAll();
  };

  const removeStudent = async (studentId: string) => {
    await api.delete(`/students/${studentId}`);
    setNotice("Etudiant supprime.");
    await loadAll();
  };

  const removeFormation = async (formationId: string) => {
    await api.delete(`/formations/${formationId}`);
    setNotice("Formation supprimee.");
    await loadAll();
  };

  const editStudent = async (student: Student) => {
    const firstName = window.prompt("Prenom", student.firstName);
    if (!firstName) {
      return;
    }

    const lastName = window.prompt("Nom", student.lastName);
    if (!lastName) {
      return;
    }

    const status = window.prompt(
      "Statut (PENDING, ADMITTED, FAILED)",
      student.status,
    );

    await api.put(`/students/${student.id}`, {
      firstName,
      lastName,
      status,
    });

    setNotice("Etudiant modifie.");
    await loadAll();
  };

  const editFormation = async (formation: Formation) => {
    const name = window.prompt("Nom de la formation", formation.name);
    if (!name) {
      return;
    }

    const code = window.prompt("Code", formation.code);
    if (!code) {
      return;
    }

    await api.put(`/formations/${formation.id}`, { name, code });
    setNotice("Formation modifiee.");
    await loadAll();
  };

  const generateCertificates = async (studentIds: string[]) => {
    if (!studentIds.length) {
      return;
    }

    await api.post("/certificates/generate", { studentIds });
    setSelectedIds([]);
    setNotice("Certificats generes.");
    await loadAll();
  };

  const loadPreview = async (studentId: string) => {
    const response = await api.get<{ preview: CertificatePreview }>(
      `/certificates/preview/${studentId}`,
    );
    setPreview(response.data.preview);
    setActiveTab("certificates");
  };

  const importStudents = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    await api.post("/students/import", formData);
    setNotice("Import termine.");
    await loadAll();
  };

  const updateProfile = async (event: FormEvent) => {
    event.preventDefault();
    await api.put("/school/settings/profile", profileForm);
    await refreshUser();
    setNotice("Profil mis a jour.");
  };

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    await api.put("/school/settings/password", passwordForm);
    setPasswordForm({ currentPassword: "", newPassword: "" });
    setNotice("Mot de passe modifie.");
  };

  if (loading) {
    return <div className="screen-center">Chargement du dashboard ecole...</div>;
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Espace ecole</p>
          <h1>{dashboard?.school.name ?? user?.school?.name}</h1>
          <p className="muted-text">
            Parcours complets: etudiants, formations, import Excel, certificats,
            settings.
          </p>
        </div>
        <div className="header-actions">
          <span className="pill">
            {dashboard?.school.subscription?.name ?? "Starter"} plan
          </span>
          <button className="ghost-button" onClick={() => clearSession()}>
            Deconnexion
          </button>
        </div>
      </header>

      <nav className="tab-row">
        {["overview", "students", "formations", "certificates", "settings"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {error ? <p className="error-text">{error}</p> : null}
      {notice ? <p className="success-text">{notice}</p> : null}

      {activeTab === "overview" ? (
        <section className="panel-stack">
          <section className="stats-grid">
            <article className="stat-card">
              <span>Etudiants</span>
              <strong>{dashboard?.stats.students ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Formations</span>
              <strong>{dashboard?.stats.formations ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Certificats</span>
              <strong>{dashboard?.stats.certificates ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Taux de reussite</span>
              <strong>{dashboard?.stats.growthRate ?? 0}%</strong>
            </article>
          </section>

          <section className="data-card">
            <h2>Statistiques par formation</h2>
            <div className="list-grid">
              {dashboard?.formationStats.map((formation) => (
                <article key={formation.id} className="mini-card">
                  <h3>{formation.name}</h3>
                  <p>{formation.total} etudiants</p>
                  <p>{formation.admitted} admis</p>
                  <p>{formation.certified} certifies</p>
                </article>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === "students" ? (
        <section className="panel-stack">
          <section className="data-card">
            <div className="card-head">
              <h2>Ajouter un etudiant</h2>
              <a href="/api/students/template" className="secondary-link">
                Telecharger le template CSV
              </a>
            </div>
            <form className="grid-form" onSubmit={submitStudent}>
              <label>
                Prenom
                <input
                  value={studentForm.firstName}
                  onChange={(event) =>
                    setStudentForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Nom
                <input
                  value={studentForm.lastName}
                  onChange={(event) =>
                    setStudentForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  value={studentForm.email}
                  onChange={(event) =>
                    setStudentForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Formation
                <select
                  value={studentForm.formationId}
                  onChange={(event) =>
                    setStudentForm((current) => ({
                      ...current,
                      formationId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sans formation</option>
                  {formations.map((formation) => (
                    <option key={formation.id} value={formation.id}>
                      {formation.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Statut
                <select
                  value={studentForm.status}
                  onChange={(event) =>
                    setStudentForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="PENDING">PENDING</option>
                  <option value="ADMITTED">ADMITTED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </label>
              <label>
                Promotion
                <input
                  value={studentForm.graduationYear}
                  onChange={(event) =>
                    setStudentForm((current) => ({
                      ...current,
                      graduationYear: event.target.value,
                    }))
                  }
                />
              </label>
              <button type="submit" className="primary-button full-span">
                Ajouter l'etudiant
              </button>
            </form>

            <label className="upload-box">
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void importStudents(file);
                  }
                }}
              />
            </label>
          </section>

          <section className="data-card">
            <div className="card-head">
              <h2>Liste des etudiants</h2>
              <div className="header-actions">
                <span className="pill">{certifiedCount} certifies</span>
                <button
                  className="primary-button"
                  onClick={() => void generateCertificates(selectedIds)}
                >
                  Certifier la selection
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th />
                    <th>Nom</th>
                    <th>Formation</th>
                    <th>Statut</th>
                    <th>Certifie</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(student.id)}
                          onChange={() => toggleSelection(student.id)}
                        />
                      </td>
                      <td>
                        {student.firstName} {student.lastName}
                      </td>
                      <td>{student.formation?.name ?? "Sans formation"}</td>
                      <td>{student.status}</td>
                      <td>{student.certified ? "Oui" : "Non"}</td>
                      <td className="table-actions">
                        <button onClick={() => void editStudent(student)}>Edit</button>
                        <button onClick={() => void removeStudent(student.id)}>Delete</button>
                        <button onClick={() => void loadPreview(student.id)}>Preview</button>
                        <button onClick={() => void generateCertificates([student.id])}>
                          Certify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === "formations" ? (
        <section className="panel-stack">
          <section className="data-card">
            <h2>Ajouter une formation</h2>
            <form className="grid-form" onSubmit={submitFormation}>
              <label>
                Nom
                <input
                  value={formationForm.name}
                  onChange={(event) =>
                    setFormationForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Code
                <input
                  value={formationForm.code}
                  onChange={(event) =>
                    setFormationForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Annee
                <input
                  value={formationForm.year}
                  onChange={(event) =>
                    setFormationForm((current) => ({
                      ...current,
                      year: event.target.value,
                    }))
                  }
                />
              </label>
              <button type="submit" className="primary-button full-span">
                Ajouter la formation
              </button>
            </form>
          </section>

          <section className="data-card">
            <h2>Formations existantes</h2>
            <div className="list-grid">
              {formations.map((formation) => (
                <article key={formation.id} className="mini-card">
                  <h3>{formation.name}</h3>
                  <p>{formation.code}</p>
                  <p>{formation.year}</p>
                  <div className="inline-actions">
                    <button onClick={() => void editFormation(formation)}>Edit</button>
                    <button onClick={() => void removeFormation(formation.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === "certificates" ? (
        <section className="panel-stack double-layout">
          <section className="data-card">
            <h2>Certificats generes</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Etudiant</th>
                    <th>Formation</th>
                    <th>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((certificate) => (
                    <tr key={certificate.id}>
                      <td>{certificate.code}</td>
                      <td>
                        {certificate.student.firstName} {certificate.student.lastName}
                      </td>
                      <td>{certificate.student.formation?.name ?? "Sans formation"}</td>
                      <td>
                        <a href={certificate.verificationUrl} target="_blank" rel="noreferrer">
                          Ouvrir
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="data-card">
            <h2>Apercu certificat</h2>
            {preview ? (
              <article
                className="certificate-preview"
                style={{ borderColor: preview.accentColor }}
              >
                <p className="eyebrow">Apercu dynamique</p>
                <h3>{preview.title}</h3>
                <p>
                  Certifie que <strong>{preview.studentName}</strong> a valide la
                  formation <strong>{preview.formationName}</strong> au sein de{" "}
                  <strong>{preview.schoolName}</strong>.
                </p>
                <img src={preview.qrCodeDataUrl} alt="QR code certificat" />
                <p>{preview.footerText}</p>
                <small>
                  {preview.signerName} - {preview.signerRole}
                </small>
              </article>
            ) : (
              <p className="muted-text">
                Clique sur "Preview" depuis la liste des etudiants pour generer
                l'apercu.
              </p>
            )}
          </section>
        </section>
      ) : null}

      {activeTab === "settings" ? (
        <section className="panel-stack double-layout">
          <section className="data-card">
            <h2>Profil</h2>
            <form className="grid-form" onSubmit={updateProfile}>
              <label>
                Prenom
                <input
                  value={profileForm.firstName}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Nom
                <input
                  value={profileForm.lastName}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Username
                <input
                  value={profileForm.username}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Ecole
                <input
                  value={profileForm.schoolName}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      schoolName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Ville
                <input
                  value={profileForm.city}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </label>
              <button type="submit" className="primary-button full-span">
                Mettre a jour
              </button>
            </form>
          </section>

          <section className="data-card">
            <h2>Mot de passe</h2>
            <form className="stack-form" onSubmit={updatePassword}>
              <label>
                Mot de passe actuel
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Nouveau mot de passe
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                />
              </label>
              <button type="submit" className="primary-button">
                Changer le mot de passe
              </button>
            </form>
          </section>
        </section>
      ) : null}
    </main>
  );
}
