import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../api";
import { useSession } from "../session";
import type { User } from "../types";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, setSession } = useSession();
  const [form, setForm] = useState({
    schoolName: "Web Sprint School",
    firstName: "Pierre",
    lastName: "Martin",
    username: "pierre-martin",
    email: "pierre.school@test.local",
    password: "Test1234",
    city: "Paris",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/school"} replace />;
  }

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{ token: string; user: User }>(
        "/auth/register-school",
        form,
      );

      setSession(response.data.token, response.data.user);
      navigate("/school");
    } catch (requestError: unknown) {
      setError("Inscription impossible. Change l'email ou le username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell compact-shell">
      <section className="auth-panel auth-panel-form wide-panel">
        <p className="eyebrow">Simulation inscription</p>
        <h1>Creer une ecole</h1>
        <form className="stack-form grid-form" onSubmit={submit}>
          <label>
            Nom de l'ecole
            <input
              value={form.schoolName}
              onChange={(event) => updateField("schoolName", event.target.value)}
            />
          </label>
          <label>
            Ville
            <input value={form.city} onChange={(event) => updateField("city", event.target.value)} />
          </label>
          <label>
            Prenom
            <input
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
            />
          </label>
          <label>
            Nom
            <input
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
            />
          </label>
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
            />
          </label>
          <label>
            Email
            <input
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>
          <label className="full-span">
            Mot de passe
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
            />
          </label>
          {error ? <p className="error-text full-span">{error}</p> : null}
          <button type="submit" className="primary-button full-span" disabled={loading}>
            {loading ? "Creation..." : "Creer le compte"}
          </button>
        </form>
        <Link to="/login" className="secondary-link">
          Retour a la connexion
        </Link>
      </section>
    </main>
  );
}
