import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import api from "../api";
import SimpleModal from "../components/SimpleModal";
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

export default function AdminWorkspace() {
  const { clearSession } = useSession();
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
  };

  const submitSubscription = async (event: FormEvent) => {
    event.preventDefault();
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
  };

  const saveTemplate = async (event: FormEvent) => {
    event.preventDefault();
    await api.put("/admin/templates/default", templateForm);
    setNotice("Template mis a jour.");
    await loadAll();
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
                    value={schoolForm.name}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    value={schoolForm.email}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Ville
                  <input
                    value={schoolForm.city}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Abonnement
                  <select
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
                </label>
                <label>
                  Manager prenom
                  <input
                    value={schoolForm.managerFirstName}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        managerFirstName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Manager nom
                  <input
                    value={schoolForm.managerLastName}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        managerLastName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Manager username
                  <input
                    value={schoolForm.managerUsername}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        managerUsername: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Manager password
                  <input
                    type="password"
                    value={schoolForm.managerPassword}
                    onChange={(event) =>
                      setSchoolForm((current) => ({
                        ...current,
                        managerPassword: event.target.value,
                      }))
                    }
                  />
                </label>
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
                    value={subscriptionForm.name}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Description
                  <input
                    value={subscriptionForm.description}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Prix mensuel
                  <input
                    value={subscriptionForm.monthlyPrice}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        monthlyPrice: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Max etudiants
                  <input
                    value={subscriptionForm.maxStudents}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        maxStudents: event.target.value,
                      }))
                    }
                  />
                </label>
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
                  value={templateForm.title}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Signataire
                <input
                  value={templateForm.signerName}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      signerName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Role
                <input
                  value={templateForm.signerRole}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      signerRole: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Couleur
                <input
                  value={templateForm.accentColor}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      accentColor: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="full-span">
                Footer
                <textarea
                  value={templateForm.footerText}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      footerText: event.target.value,
                    }))
                  }
                />
              </label>
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
        onClose={() => setEditingSubscription(null)}
      >
        <form className="grid-form" onSubmit={saveSubscriptionEdit}>
          <label>
            Nom
            <input
              value={subscriptionEditForm.name}
              onChange={(event) =>
                setSubscriptionEditForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Description
            <input
              value={subscriptionEditForm.description}
              onChange={(event) =>
                setSubscriptionEditForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Prix mensuel
            <input
              value={subscriptionEditForm.monthlyPrice}
              onChange={(event) =>
                setSubscriptionEditForm((current) => ({
                  ...current,
                  monthlyPrice: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Max etudiants
            <input
              value={subscriptionEditForm.maxStudents}
              onChange={(event) =>
                setSubscriptionEditForm((current) => ({
                  ...current,
                  maxStudents: event.target.value,
                }))
              }
            />
          </label>
          <div className="modal-actions full-span">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setEditingSubscription(null)}
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
