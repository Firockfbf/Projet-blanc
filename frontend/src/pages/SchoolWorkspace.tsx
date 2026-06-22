import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import api from "../api";
import SimpleModal from "../components/SimpleModal";
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

type StudentFilters = {
  search: string;
  status: "ALL" | Student["status"];
  formationId: string;
  certified: "ALL" | "true" | "false";
};

const emptyStudentForm = {
  firstName: "",
  lastName: "",
  email: "",
  formationId: "",
  status: "PENDING" as Student["status"],
  graduationYear: "2026",
};

const emptyFormationForm = {
  name: "",
  code: "",
  year: "2025-2026",
};

const emptyStudentFilters: StudentFilters = {
  search: "",
  status: "ALL",
  formationId: "",
  certified: "ALL",
};

export default function SchoolWorkspace() {
  const { clearSession, refreshUser, user } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<SchoolDashboardResponse | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedFormationIds, setSelectedFormationIds] = useState<string[]>([]);
  const [selectedCertificateIds, setSelectedCertificateIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<CertificatePreview | null>(null);
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [formationForm, setFormationForm] = useState(emptyFormationForm);
  const [studentFilters, setStudentFilters] = useState<StudentFilters>(emptyStudentFilters);
  const [certificatePublishedFilter, setCertificatePublishedFilter] = useState<
    "ALL" | "true" | "false"
  >("ALL");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentEditForm, setStudentEditForm] = useState(emptyStudentForm);
  const [editingFormation, setEditingFormation] = useState<Formation | null>(null);
  const [formationEditForm, setFormationEditForm] = useState(emptyFormationForm);
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

  const publishedCertificatesCount = useMemo(
    () => certificates.filter((certificate) => certificate.publishedAt).length,
    [certificates],
  );
  const selectableCertificateIds = useMemo(
    () =>
      certificates
        .filter((certificate) => !certificate.publishedAt)
        .map((certificate) => certificate.id),
    [certificates],
  );

  const allStudentsSelected = students.length > 0 && selectedStudentIds.length === students.length;
  const allFormationsSelected =
    formations.length > 0 && selectedFormationIds.length === formations.length;
  const allCertificatesSelected =
    selectableCertificateIds.length > 0 &&
    selectedCertificateIds.length === selectableCertificateIds.length;

  const loadDashboard = async () => {
    const response = await api.get<SchoolDashboardResponse>("/school/dashboard");
    setDashboard(response.data);
  };

  const loadFormations = async () => {
    const response = await api.get<{ formations: Formation[] }>("/formations");
    const nextFormations = response.data.formations;

    setFormations(nextFormations);
    setSelectedFormationIds((current) =>
      current.filter((id) => nextFormations.some((formation) => formation.id === id)),
    );
  };

  const loadStudents = async (filters: StudentFilters = studentFilters) => {
    setStudentsLoading(true);

    try {
      const params: Record<string, string> = {};

      if (filters.search.trim()) {
        params.search = filters.search.trim();
      }

      if (filters.status !== "ALL") {
        params.status = filters.status;
      }

      if (filters.formationId) {
        params.formationId = filters.formationId;
      }

      if (filters.certified !== "ALL") {
        params.certified = filters.certified;
      }

      const response = await api.get<{ students: Student[] }>("/students", { params });
      const nextStudents = response.data.students;

      setStudents(nextStudents);
      setSelectedStudentIds((current) =>
        current.filter((id) => nextStudents.some((student) => student.id === id)),
      );
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadCertificates = async (
    publishedFilter: "ALL" | "true" | "false" = certificatePublishedFilter,
  ) => {
    setCertificatesLoading(true);

    try {
      const params =
        publishedFilter === "ALL" ? undefined : { published: publishedFilter };
      const response = await api.get<{ certificates: Certificate[] }>("/certificates", {
        params,
      });
      const nextCertificates = response.data.certificates;

      setCertificates(nextCertificates);
      setSelectedCertificateIds((current) =>
        current.filter((id) => nextCertificates.some((certificate) => certificate.id === id)),
      );
    } finally {
      setCertificatesLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadDashboard(),
        loadFormations(),
        loadStudents(studentFilters),
        loadCertificates(certificatePublishedFilter),
      ]);
    } catch (requestError: unknown) {
      setError("Impossible de charger l'espace ecole.");
    } finally {
      setLoading(false);
    }
  };

  const refreshStudentArea = async () => {
    await Promise.all([
      loadDashboard(),
      loadStudents(studentFilters),
      loadCertificates(certificatePublishedFilter),
    ]);
  };

  const refreshFormationArea = async () => {
    await Promise.all([
      loadDashboard(),
      loadFormations(),
      loadStudents(studentFilters),
      loadCertificates(certificatePublishedFilter),
    ]);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!loading) {
      void loadStudents(studentFilters);
    }
  }, [studentFilters]);

  useEffect(() => {
    if (!loading) {
      void loadCertificates(certificatePublishedFilter);
    }
  }, [certificatePublishedFilter]);

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

  const submitFormation = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/formations", formationForm);
    setFormationForm(emptyFormationForm);
    setNotice("Formation ajoutee.");
    await refreshFormationArea();
  };

  const submitStudent = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/students", {
      ...studentForm,
      formationId: studentForm.formationId || null,
    });
    setStudentForm(emptyStudentForm);
    setNotice("Etudiant ajoute.");
    await refreshStudentArea();
  };

  const removeStudent = async (studentId: string) => {
    const shouldDelete = window.confirm("Supprimer cet etudiant ?");

    if (!shouldDelete) {
      return;
    }

    await api.delete(`/students/${studentId}`);
    setNotice("Etudiant supprime.");
    await refreshStudentArea();
  };

  const bulkDeleteStudents = async () => {
    if (!selectedStudentIds.length) {
      return;
    }

    const shouldDelete = window.confirm(
      `Supprimer ${selectedStudentIds.length} etudiant(s) selectionne(s) ?`,
    );

    if (!shouldDelete) {
      return;
    }

    await api.post("/students/bulk-delete", { ids: selectedStudentIds });
    setSelectedStudentIds([]);
    setNotice("Selection d'etudiants supprimee.");
    await refreshStudentArea();
  };

  const removeFormation = async (formationId: string) => {
    const shouldDelete = window.confirm("Supprimer cette formation ?");

    if (!shouldDelete) {
      return;
    }

    await api.delete(`/formations/${formationId}`);
    setNotice("Formation supprimee.");
    await refreshFormationArea();
  };

  const bulkDeleteFormations = async () => {
    if (!selectedFormationIds.length) {
      return;
    }

    const shouldDelete = window.confirm(
      `Supprimer ${selectedFormationIds.length} formation(s) selectionnee(s) ?`,
    );

    if (!shouldDelete) {
      return;
    }

    await api.post("/formations/bulk-delete", { ids: selectedFormationIds });
    setSelectedFormationIds([]);
    setNotice("Selection de formations supprimee.");
    await refreshFormationArea();
  };

  const openStudentModal = (student: Student) => {
    setEditingStudent(student);
    setStudentEditForm({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      formationId: student.formationId ?? "",
      status: student.status,
      graduationYear: student.graduationYear,
    });
  };

  const saveStudentEdit = async (event: FormEvent) => {
    event.preventDefault();

    if (!editingStudent) {
      return;
    }

    await api.put(`/students/${editingStudent.id}`, {
      ...studentEditForm,
      formationId: studentEditForm.formationId || null,
    });

    setEditingStudent(null);
    setStudentEditForm(emptyStudentForm);
    setNotice("Etudiant modifie.");
    await refreshStudentArea();
  };

  const openFormationModal = (formation: Formation) => {
    setEditingFormation(formation);
    setFormationEditForm({
      name: formation.name,
      code: formation.code,
      year: formation.year,
    });
  };

  const saveFormationEdit = async (event: FormEvent) => {
    event.preventDefault();

    if (!editingFormation) {
      return;
    }

    await api.put(`/formations/${editingFormation.id}`, formationEditForm);
    setEditingFormation(null);
    setFormationEditForm(emptyFormationForm);
    setNotice("Formation modifiee.");
    await refreshFormationArea();
  };

  const generateCertificates = async (studentIds: string[]) => {
    const eligibleStudentIds = studentIds.filter((studentId) => {
      const student = students.find((entry) => entry.id === studentId);
      return student ? !student.certified : true;
    });

    if (!eligibleStudentIds.length) {
      setNotice("Aucun etudiant supplementaire a certifier.");
      return;
    }

    const response = await api.post<{ message: string }>("/certificates/generate", {
      studentIds: eligibleStudentIds,
    });
    setSelectedStudentIds([]);
    setNotice(response.data.message);
    await refreshStudentArea();
  };

  const publishCertificates = async (certificateIds: string[]) => {
    if (!certificateIds.length) {
      return;
    }

    const response = await api.post<{ message: string }>("/certificates/publish", {
      certificateIds,
    });
    setSelectedCertificateIds([]);
    setNotice(response.data.message);
    await loadCertificates(certificatePublishedFilter);
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
    await refreshStudentArea();
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
    <>
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
                        status: event.target.value as Student["status"],
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
                    className="ghost-button"
                    onClick={() => void bulkDeleteStudents()}
                    disabled={!selectedStudentIds.length}
                  >
                    Supprimer la selection
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => void generateCertificates(selectedStudentIds)}
                    disabled={!selectedStudentIds.length}
                  >
                    Generer la selection
                  </button>
                </div>
              </div>

              <div className="filter-grid">
                <label>
                  Recherche
                  <input
                    placeholder="Nom, prenom ou email"
                    value={studentFilters.search}
                    onChange={(event) =>
                      setStudentFilters((current) => ({
                        ...current,
                        search: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Statut
                  <select
                    value={studentFilters.status}
                    onChange={(event) =>
                      setStudentFilters((current) => ({
                        ...current,
                        status: event.target.value as StudentFilters["status"],
                      }))
                    }
                  >
                    <option value="ALL">Tous</option>
                    <option value="PENDING">PENDING</option>
                    <option value="ADMITTED">ADMITTED</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </label>
                <label>
                  Formation
                  <select
                    value={studentFilters.formationId}
                    onChange={(event) =>
                      setStudentFilters((current) => ({
                        ...current,
                        formationId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Toutes</option>
                    {formations.map((formation) => (
                      <option key={formation.id} value={formation.id}>
                        {formation.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Certification
                  <select
                    value={studentFilters.certified}
                    onChange={(event) =>
                      setStudentFilters((current) => ({
                        ...current,
                        certified: event.target.value as StudentFilters["certified"],
                      }))
                    }
                  >
                    <option value="ALL">Toutes</option>
                    <option value="true">Certifies</option>
                    <option value="false">Non certifies</option>
                  </select>
                </label>
              </div>

              <div className="header-actions filter-actions">
                <button
                  className="ghost-button"
                  onClick={() => setStudentFilters(emptyStudentFilters)}
                  disabled={
                    !studentFilters.search &&
                    studentFilters.status === "ALL" &&
                    !studentFilters.formationId &&
                    studentFilters.certified === "ALL"
                  }
                >
                  Reinitialiser les filtres
                </button>
              </div>

              {studentsLoading ? <p className="muted-text">Mise a jour des etudiants...</p> : null}

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={allStudentsSelected}
                          onChange={() =>
                            setSelectedStudentIds(
                              allStudentsSelected ? [] : students.map((student) => student.id),
                            )
                          }
                        />
                      </th>
                      <th>Nom</th>
                      <th>Formation</th>
                      <th>Statut</th>
                      <th>Certifie</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length ? (
                      students.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(student.id)}
                              onChange={() =>
                                setSelectedStudentIds((current) =>
                                  current.includes(student.id)
                                    ? current.filter((value) => value !== student.id)
                                    : [...current, student.id],
                                )
                              }
                            />
                          </td>
                          <td>
                            {student.firstName} {student.lastName}
                          </td>
                          <td>{student.formation?.name ?? "Sans formation"}</td>
                          <td>{student.status}</td>
                          <td>{student.certified ? "Oui" : "Non"}</td>
                          <td className="table-actions">
                            <button onClick={() => openStudentModal(student)}>Edit</button>
                            <button onClick={() => void removeStudent(student.id)}>Delete</button>
                            <button onClick={() => void loadPreview(student.id)}>Preview</button>
                            <button
                              onClick={() => void generateCertificates([student.id])}
                              disabled={student.certified}
                            >
                              {student.certified ? "Deja genere" : "Generer"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="empty-table">
                          Aucun etudiant ne correspond aux filtres.
                        </td>
                      </tr>
                    )}
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
              <div className="card-head">
                <h2>Formations existantes</h2>
                <button
                  className="ghost-button"
                  onClick={() => void bulkDeleteFormations()}
                  disabled={!selectedFormationIds.length}
                >
                  Supprimer la selection
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={allFormationsSelected}
                          onChange={() =>
                            setSelectedFormationIds(
                              allFormationsSelected
                                ? []
                                : formations.map((formation) => formation.id),
                            )
                          }
                        />
                      </th>
                      <th>Nom</th>
                      <th>Code</th>
                      <th>Annee</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formations.length ? (
                      formations.map((formation) => (
                        <tr key={formation.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedFormationIds.includes(formation.id)}
                              onChange={() =>
                                setSelectedFormationIds((current) =>
                                  current.includes(formation.id)
                                    ? current.filter((value) => value !== formation.id)
                                    : [...current, formation.id],
                                )
                              }
                            />
                          </td>
                          <td>{formation.name}</td>
                          <td>{formation.code}</td>
                          <td>{formation.year}</td>
                          <td className="table-actions">
                            <button onClick={() => openFormationModal(formation)}>Edit</button>
                            <button onClick={() => void removeFormation(formation.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty-table">
                          Aucune formation enregistree pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === "certificates" ? (
          <section className="panel-stack double-layout">
            <section className="data-card">
              <div className="card-head">
                <h2>Certificats generes</h2>
                <div className="header-actions">
                  <span className="pill">{publishedCertificatesCount} publies</span>
                  <button
                    className="primary-button"
                    onClick={() => void publishCertificates(selectedCertificateIds)}
                    disabled={!selectedCertificateIds.length}
                  >
                    Publier la selection
                  </button>
                </div>
              </div>

              <div className="filter-grid filter-grid-single">
                <label>
                  Publication
                  <select
                    value={certificatePublishedFilter}
                    onChange={(event) =>
                      setCertificatePublishedFilter(
                        event.target.value as "ALL" | "true" | "false",
                      )
                    }
                  >
                    <option value="ALL">Tous</option>
                    <option value="true">Publies</option>
                    <option value="false">Non publies</option>
                  </select>
                </label>
              </div>

              {certificatesLoading ? (
                <p className="muted-text">Mise a jour des certificats...</p>
              ) : null}

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={allCertificatesSelected}
                          onChange={() =>
                            setSelectedCertificateIds(
                              allCertificatesSelected ? [] : selectableCertificateIds,
                            )
                          }
                        />
                      </th>
                      <th>Code</th>
                      <th>Etudiant</th>
                      <th>Formation</th>
                      <th>Statut</th>
                      <th>Verification</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.length ? (
                      certificates.map((certificate) => (
                        <tr key={certificate.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedCertificateIds.includes(certificate.id)}
                              disabled={Boolean(certificate.publishedAt)}
                              onChange={() =>
                                setSelectedCertificateIds((current) =>
                                  current.includes(certificate.id)
                                    ? current.filter((value) => value !== certificate.id)
                                    : [...current, certificate.id],
                                )
                              }
                            />
                          </td>
                          <td>{certificate.code}</td>
                          <td>
                            {certificate.student.firstName} {certificate.student.lastName}
                          </td>
                          <td>{certificate.student.formation?.name ?? "Sans formation"}</td>
                          <td>
                            <span
                              className={
                                certificate.publishedAt ? "status-pill success" : "status-pill"
                              }
                            >
                              {certificate.publishedAt ? "Publie" : "Genere"}
                            </span>
                          </td>
                          <td>
                            {certificate.publishedAt ? (
                              <a
                                href={certificate.verificationUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Ouvrir
                              </a>
                            ) : (
                              <span className="muted-text">Non publie</span>
                            )}
                          </td>
                          <td className="table-actions">
                            <button
                              onClick={() => void publishCertificates([certificate.id])}
                              disabled={Boolean(certificate.publishedAt)}
                            >
                              {certificate.publishedAt ? "Publie" : "Publier"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="empty-table">
                          Aucun certificat pour ce filtre.
                        </td>
                      </tr>
                    )}
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

      <SimpleModal
        open={Boolean(editingStudent)}
        title="Modifier un etudiant"
        onClose={() => setEditingStudent(null)}
      >
        <form className="grid-form" onSubmit={saveStudentEdit}>
          <label>
            Prenom
            <input
              value={studentEditForm.firstName}
              onChange={(event) =>
                setStudentEditForm((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Nom
            <input
              value={studentEditForm.lastName}
              onChange={(event) =>
                setStudentEditForm((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Email
            <input
              value={studentEditForm.email}
              onChange={(event) =>
                setStudentEditForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Formation
            <select
              value={studentEditForm.formationId}
              onChange={(event) =>
                setStudentEditForm((current) => ({
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
              value={studentEditForm.status}
              onChange={(event) =>
                setStudentEditForm((current) => ({
                  ...current,
                  status: event.target.value as Student["status"],
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
              value={studentEditForm.graduationYear}
              onChange={(event) =>
                setStudentEditForm((current) => ({
                  ...current,
                  graduationYear: event.target.value,
                }))
              }
            />
          </label>
          <div className="modal-actions full-span">
            <button type="button" className="ghost-button" onClick={() => setEditingStudent(null)}>
              Annuler
            </button>
            <button type="submit" className="primary-button">
              Sauvegarder
            </button>
          </div>
        </form>
      </SimpleModal>

      <SimpleModal
        open={Boolean(editingFormation)}
        title="Modifier une formation"
        onClose={() => setEditingFormation(null)}
      >
        <form className="grid-form" onSubmit={saveFormationEdit}>
          <label>
            Nom
            <input
              value={formationEditForm.name}
              onChange={(event) =>
                setFormationEditForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Code
            <input
              value={formationEditForm.code}
              onChange={(event) =>
                setFormationEditForm((current) => ({
                  ...current,
                  code: event.target.value,
                }))
              }
            />
          </label>
          <label className="full-span">
            Annee
            <input
              value={formationEditForm.year}
              onChange={(event) =>
                setFormationEditForm((current) => ({
                  ...current,
                  year: event.target.value,
                }))
              }
            />
          </label>
          <div className="modal-actions full-span">
            <button type="button" className="ghost-button" onClick={() => setEditingFormation(null)}>
              Annuler
            </button>
            <button type="submit" className="primary-button">
              Sauvegarder
            </button>
          </div>
        </form>
      </SimpleModal>
    </>
  );
}
