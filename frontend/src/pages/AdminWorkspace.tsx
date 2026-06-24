import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import api from "../api";
import FieldError from "../components/FieldError";
import SimpleModal from "../components/SimpleModal";
import useFormFeedback from "../hooks/useFormFeedback";
import { useSession } from "../session";
import type { CertificateTemplate, School, Subscription } from "../types";

type AdminDashboardResponse = {
  stats: {
    schools: number;
    activeSchools: number;
    subscriptions: number;
    certificates: number;
    schoolUsers: number;
  };
  schools: School[];
  subscriptions: Subscription[];
};

const emptySubscriptionEditForm = {
  name: "",
  description: "",
  monthlyPrice: "39",
  maxStudents: "250",
};

const schoolFieldAliases = {
  "manager.firstName": "managerFirstName",
  "manager.lastName": "managerLastName",
  "manager.username": "managerUsername",
  "manager.password": "managerPassword",
};

export default function AdminWorkspace() {
  const { clearSession } = useSession();
  const schoolFeedback = useFormFeedback();
  const subscriptionFeedback = useFormFeedback();
  const templateFeedback = useFormFeedback();
  const subscriptionEditFeedback = useFormFeedback();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [subscriptionEditForm, setSubscriptionEditForm] = useState(
    emptySubscriptionEditForm,
  );
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    email: "",
    city: "",
    country: "France",
    subscriptionId: "",
    managerFirstName: "",
    managerLastName: "",
    managerUsername: "",
    managerPassword: "",
  });
  const [subscriptionForm, setSubscriptionForm] = useState({
    name: "",
    description: "",
    monthlyPrice: "39",
    maxStudents: "250",
  });
  const [templateForm, setTemplateForm] = useState({
    title: "Certificat de reussite",
    signerName: "Direction pedagogique",
    signerRole: "Directeur des etudes",
    footerText: "Document numerique genere par CertiCampus.",
    accentColor: "#14532d",
  });
  const hasManagerDraft = Boolean(
    schoolForm.managerFirstName ||
      schoolForm.managerLastName ||
      schoolForm.managerUsername ||
      schoolForm.managerPassword,
  );

  const loadAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardResponse, schoolsResponse, subscriptionsResponse, templatesResponse] =
        await Promise.all([
          api.get<AdminDashboardResponse>("/admin/dashboard"),
          api.get<{ schools: School[] }>("/admin/schools"),
          api.get<{ subscriptions: Subscription[] }>("/admin/subscriptions"),
          api.get<{ templates: CertificateTemplate[] }>("/admin/templates"),
        ]);

      setDashboard(dashboardResponse.data);
      setSchools(schoolsResponse.data.schools);
      setSubscriptions(subscriptionsResponse.data.subscriptions);
      setTemplates(templatesResponse.data.templates);

      const defaultTemplate =
        templatesResponse.data.templates.find((template) => template.isDefault) ??
        templatesResponse.data.templates[0];

      if (defaultTemplate) {
        setTemplateForm({
          title: defaultTemplate.title,
          signerName: defaultTemplate.signerName,
          signerRole: defaultTemplate.signerRole,
          footerText: defaultTemplate.footerText,
          accentColor: defaultTemplate.accentColor,
        });
      }
    } catch (requestError: unknown) {
      setError("Impossible de charger l'espace admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const submitSchool = async (event: FormEvent) => {
    event.preventDefault();
    schoolFeedback.resetFeedback();
    setNotice(null);

    try {
      await api.post("/admin/schools", {
        name: schoolForm.name,
        email: schoolForm.email,
        city: schoolForm.city,
        country: schoolForm.country,
        subscriptionId: schoolForm.subscriptionId || null,
        manager: schoolForm.managerUsername
          ? {
              firstName: schoolForm.managerFirstName,
              lastName: schoolForm.managerLastName,
              username: schoolForm.managerUsername,
              password: schoolForm.managerPassword,
            }
          : undefined,
      });
      setSchoolForm({
        name: "",
        email: "",
        city: "",
        country: "France",
        subscriptionId: "",
        managerFirstName: "",
        managerLastName: "",
        managerUsername: "",
        managerPassword: "",
      });
      setNotice("Ecole ajoutee.");
      await loadAll();
    } catch (requestError: unknown) {
      schoolFeedback.applyApiError(requestError, schoolFieldAliases);
    }
  };

  const submitSubscription = async (event: FormEvent) => {
    event.preventDefault();
    subscriptionFeedback.resetFeedback();
    setNotice(null);

    try {
      await api.post("/admin/subscriptions", {
        ...subscriptionForm,
        monthlyPrice: Number(subscriptionForm.monthlyPrice),
        maxStudents: Number(subscriptionForm.maxStudents),
      });
      setSubscriptionForm({
        name: "",
        description: "",
        monthlyPrice: "39",
        maxStudents: "250",
      });
      setNotice("Abonnement ajoute.");
      await loadAll();
    } catch (requestError: unknown) {
      subscriptionFeedback.applyApiError(requestError);
    }
  };

  const saveTemplate = async (event: FormEvent) => {
    event.preventDefault();
    templateFeedback.resetFeedback();
    setNotice(null);

    try {
      await api.put("/admin/templates/default", templateForm);
      setNotice("Template mis a jour.");
      await loadAll();
    } catch (requestError: unknown) {
      templateFeedback.applyApiError(requestError);
    }
  };

  const deleteSchool = async (schoolId: string) => {
    await api.delete(`/admin/schools/${schoolId}`);
    setNotice("Ecole supprimee.");
    await loadAll();
  };

  const toggleSchool = async (school: School) => {
    await api.put(`/admin/schools/${school.id}`, { active: !school.active });
    setNotice("Ecole mise a jour.");
    await loadAll();
  };

  const openSubscriptionModal = (subscription: Subscription) => {
    subscriptionEditFeedback.resetFeedback();
    setEditingSubscription(subscription);
    setSubscriptionEditForm({
      name: subscription.name,
      description: subscription.description ?? "",
      monthlyPrice: String(subscription.monthlyPrice),
      maxStudents: String(subscription.maxStudents),
    });
  };

  const saveSubscriptionEdit = async (event: FormEvent) => {
    event.preventDefault();

    if (!editingSubscription) {
      return;
    }

    subscriptionEditFeedback.resetFeedback();
    setNotice(null);

    try {
      await api.put(`/admin/subscriptions/${editingSubscription.id}`, {
        name: subscriptionEditForm.name,
        description: subscriptionEditForm.description,
        monthlyPrice: Number(subscriptionEditForm.monthlyPrice),
        maxStudents: Number(subscriptionEditForm.maxStudents),
      });

      setEditingSubscription(null);
      setSubscriptionEditForm(emptySubscriptionEditForm);
      setNotice("Abonnement modifie.");
      await loadAll();
    } catch (requestError: unknown) {
      subscriptionEditFeedback.applyApiError(requestError);
    }
  };

  const deleteSubscription = async (subscriptionId: string) => {
    await api.delete(`/admin/subscriptions/${subscriptionId}`);
    setNotice("Abonnement supprime.");
    await loadAll();
  };

  if (loading) {
    return <div className="screen-center">Chargement du dashboard admin...</div>;
  }

  return (
    <>
      <main className="workspace-shell">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>Control tower</h1>
            <p className="muted-text">
              Gestion globale des ecoles, abonnements et template de certificat.
            </p>
          </div>
          <button className="ghost-button" onClick={() => clearSession()}>
            Deconnexion
          </button>
        </header>

        <nav className="tab-row">
          {["overview", "schools", "subscriptions", "templates"].map((tab) => (
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
          <section className="stats-grid">
            <article className="stat-card">
              <span>Ecoles</span>
              <strong>{dashboard?.stats.schools ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Ecoles actives</span>
              <strong>{dashboard?.stats.activeSchools ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Abonnements</span>
              <strong>{dashboard?.stats.subscriptions ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Certificats</span>
              <strong>{dashboard?.stats.certificates ?? 0}</strong>
            </article>
          </section>
        ) : null}

        {activeTab === "schools" ? (
          <section className="panel-stack">
            <section className="data-card">
              <h2>Ajouter une ecole</h2>
              <form className="grid-form" onSubmit={submitSchool}>
                <label>
                  Nom
                  <input
                    required
                    minLength={2}
                    className={schoolFeedback.fieldErrors.name ? "field-invalid" : undefined}
                    value={schoolForm.name}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={schoolFeedback.fieldErrors.name} />
                </label>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    className={schoolFeedback.fieldErrors.email ? "field-invalid" : undefined}
                    value={schoolForm.email}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={schoolFeedback.fieldErrors.email} />
                </label>
                <label>
                  Ville
                  <input
                    minLength={2}
                    className={schoolFeedback.fieldErrors.city ? "field-invalid" : undefined}
                    value={schoolForm.city}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={schoolFeedback.fieldErrors.city} />
                </label>
                <label>
                  Abonnement
                  <select
                    className={
                      schoolFeedback.fieldErrors.subscriptionId ? "field-invalid" : undefined
                    }
                    value={schoolForm.subscriptionId}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        subscriptionId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Sans abonnement</option>
                    {subscriptions.map((subscription) => (
                      <option key={subscription.id} value={subscription.id}>
                        {subscription.name}
                      </option>
                    ))}
                  </select>
                  <FieldError message={schoolFeedback.fieldErrors.subscriptionId} />
                </label>
                <label>
                  Manager prenom
                  <input
                    required={hasManagerDraft}
                    minLength={2}
                    className={
                      schoolFeedback.fieldErrors.managerFirstName ? "field-invalid" : undefined
                    }
                    value={schoolForm.managerFirstName}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        managerFirstName: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={schoolFeedback.fieldErrors.managerFirstName} />
                </label>
                <label>
                  Manager nom
                  <input
                    required={hasManagerDraft}
                    minLength={2}
                    className={
                      schoolFeedback.fieldErrors.managerLastName ? "field-invalid" : undefined
                    }
                    value={schoolForm.managerLastName}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        managerLastName: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={schoolFeedback.fieldErrors.managerLastName} />
                </label>
                <label>
                  Manager username
                  <input
                    required={hasManagerDraft}
                    minLength={3}
                    className={
                      schoolFeedback.fieldErrors.managerUsername ? "field-invalid" : undefined
                    }
                    value={schoolForm.managerUsername}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        managerUsername: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={schoolFeedback.fieldErrors.managerUsername} />
                </label>
                <label>
                  Manager password
                  <input
                    type="password"
                    required={hasManagerDraft}
                    minLength={8}
                    className={
                      schoolFeedback.fieldErrors.managerPassword ? "field-invalid" : undefined
                    }
                    value={schoolForm.managerPassword}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        managerPassword: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={schoolFeedback.fieldErrors.managerPassword} />
                </label>
                {schoolFeedback.formError ? (
                  <p className="error-text full-span">{schoolFeedback.formError}</p>
                ) : null}
                <button type="submit" className="primary-button full-span">
                  Ajouter l'ecole
                </button>
              </form>
            </section>

            <section className="data-card">
              <h2>Ecoles existantes</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Abonnement</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map((school) => (
                      <tr key={school.id}>
                        <td>{school.name}</td>
                        <td>{school.subscription?.name ?? "Aucun"}</td>
                        <td>{school.active ? "Active" : "Inactive"}</td>
                        <td className="table-actions">
                          <button onClick={() => void toggleSchool(school)}>
                            {school.active ? "Desactiver" : "Activer"}
                          </button>
                          <button onClick={() => void deleteSchool(school.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === "subscriptions" ? (
          <section className="panel-stack">
            <section className="data-card">
              <h2>Ajouter un abonnement</h2>
              <form className="grid-form" onSubmit={submitSubscription}>
                <label>
                  Nom
                  <input
                    required
                    minLength={2}
                    className={subscriptionFeedback.fieldErrors.name ? "field-invalid" : undefined}
                    value={subscriptionForm.name}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={subscriptionFeedback.fieldErrors.name} />
                </label>
                <label>
                  Description
                  <input
                    className={
                      subscriptionFeedback.fieldErrors.description ? "field-invalid" : undefined
                    }
                    value={subscriptionForm.description}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={subscriptionFeedback.fieldErrors.description} />
                </label>
                <label>
                  Prix mensuel
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    className={
                      subscriptionFeedback.fieldErrors.monthlyPrice ? "field-invalid" : undefined
                    }
                    value={subscriptionForm.monthlyPrice}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        monthlyPrice: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={subscriptionFeedback.fieldErrors.monthlyPrice} />
                </label>
                <label>
                  Max etudiants
                  <input
                    required
                    type="number"
                    min={1}
                    step="1"
                    className={
                      subscriptionFeedback.fieldErrors.maxStudents ? "field-invalid" : undefined
                    }
                    value={subscriptionForm.maxStudents}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        maxStudents: event.target.value,
                      }))
                    }
                  />
                  <FieldError message={subscriptionFeedback.fieldErrors.maxStudents} />
                </label>
                {subscriptionFeedback.formError ? (
                  <p className="error-text full-span">{subscriptionFeedback.formError}</p>
                ) : null}
                <button type="submit" className="primary-button full-span">
                  Creer l'abonnement
                </button>
              </form>
            </section>

            <section className="data-card">
              <h2>Plans disponibles</h2>
              <div className="list-grid">
                {subscriptions.map((subscription) => (
                  <article key={subscription.id} className="mini-card">
                    <h3>{subscription.name}</h3>
                    <p>{subscription.monthlyPrice} EUR / mois</p>
                    <p>{subscription.maxStudents} etudiants max</p>
                    <div className="inline-actions">
                      <button onClick={() => openSubscriptionModal(subscription)}>Edit</button>
                      <button onClick={() => void deleteSubscription(subscription.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === "templates" ? (
          <section className="data-card">
            <h2>Template de certificat</h2>
            <p className="muted-text">{templates.length} template(s) charge(s)</p>
            <form className="grid-form" onSubmit={saveTemplate}>
              <label>
                Titre
                <input
                  required
                  minLength={2}
                  className={templateFeedback.fieldErrors.title ? "field-invalid" : undefined}
                  value={templateForm.title}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
                <FieldError message={templateFeedback.fieldErrors.title} />
              </label>
              <label>
                Signataire
                <input
                  required
                  minLength={2}
                  className={
                    templateFeedback.fieldErrors.signerName ? "field-invalid" : undefined
                  }
                  value={templateForm.signerName}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      signerName: event.target.value,
                    }))
                  }
                />
                <FieldError message={templateFeedback.fieldErrors.signerName} />
              </label>
              <label>
                Role
                <input
                  required
                  minLength={2}
                  className={
                    templateFeedback.fieldErrors.signerRole ? "field-invalid" : undefined
                  }
                  value={templateForm.signerRole}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      signerRole: event.target.value,
                    }))
                  }
                />
                <FieldError message={templateFeedback.fieldErrors.signerRole} />
              </label>
              <label>
                Couleur
                <input
                  required
                  minLength={4}
                  className={
                    templateFeedback.fieldErrors.accentColor ? "field-invalid" : undefined
                  }
                  value={templateForm.accentColor}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      accentColor: event.target.value,
                    }))
                  }
                />
                <FieldError message={templateFeedback.fieldErrors.accentColor} />
              </label>
              <label className="full-span">
                Footer
                <textarea
                  required
                  minLength={2}
                  className={
                    templateFeedback.fieldErrors.footerText ? "field-invalid" : undefined
                  }
                  value={templateForm.footerText}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      footerText: event.target.value,
                    }))
                  }
                />
                <FieldError message={templateFeedback.fieldErrors.footerText} />
              </label>
              {templateFeedback.formError ? (
                <p className="error-text full-span">{templateFeedback.formError}</p>
              ) : null}
              <button type="submit" className="primary-button full-span">
                Sauvegarder le template
              </button>
            </form>
          </section>
        ) : null}
      </main>

      <SimpleModal
        open={Boolean(editingSubscription)}
        title="Modifier un abonnement"
        onClose={() => {
          setEditingSubscription(null);
          subscriptionEditFeedback.resetFeedback();
        }}
      >
        <form className="grid-form" onSubmit={saveSubscriptionEdit}>
          <label>
            Nom
            <input
              required
              minLength={2}
              className={
                subscriptionEditFeedback.fieldErrors.name ? "field-invalid" : undefined
              }
              value={subscriptionEditForm.name}
              onChange={(event) =>
                setSubscriptionEditForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            <FieldError message={subscriptionEditFeedback.fieldErrors.name} />
          </label>
          <label>
            Description
            <input
              className={
                subscriptionEditFeedback.fieldErrors.description ? "field-invalid" : undefined
              }
              value={subscriptionEditForm.description}
              onChange={(event) =>
                setSubscriptionEditForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <FieldError message={subscriptionEditFeedback.fieldErrors.description} />
          </label>
          <label>
            Prix mensuel
            <input
              required
              type="number"
              min={0}
              step="0.01"
              className={
                subscriptionEditFeedback.fieldErrors.monthlyPrice ? "field-invalid" : undefined
              }
              value={subscriptionEditForm.monthlyPrice}
              onChange={(event) =>
                setSubscriptionEditForm((current) => ({
                  ...current,
                  monthlyPrice: event.target.value,
                }))
              }
            />
            <FieldError message={subscriptionEditFeedback.fieldErrors.monthlyPrice} />
          </label>
          <label>
            Max etudiants
            <input
              required
              type="number"
              min={1}
              step="1"
              className={
                subscriptionEditFeedback.fieldErrors.maxStudents ? "field-invalid" : undefined
              }
              value={subscriptionEditForm.maxStudents}
              onChange={(event) =>
                setSubscriptionEditForm((current) => ({
                  ...current,
                  maxStudents: event.target.value,
                }))
              }
            />
            <FieldError message={subscriptionEditFeedback.fieldErrors.maxStudents} />
          </label>
          {subscriptionEditFeedback.formError ? (
            <p className="error-text full-span">{subscriptionEditFeedback.formError}</p>
          ) : null}
          <div className="modal-actions full-span">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setEditingSubscription(null);
                subscriptionEditFeedback.resetFeedback();
              }}
            >
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
