import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../api";
import FieldError from "../components/FieldError";
import useFormFeedback from "../hooks/useFormFeedback";
import { useSession } from "../session";
import type { User } from "../types";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, setSession } = useSession();
  const registerFeedback = useFormFeedback();
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
    registerFeedback.clearFieldError(key);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    registerFeedback.resetFeedback();

    try {
      const response = await api.post<{ token: string; user: User }>(
        "/auth/register-school",
        form,
      );

      setSession(response.data.token, response.data.user);
      navigate("/school");
    } catch (requestError: unknown) {
      registerFeedback.applyApiError(requestError);
      setError(
        "Inscription impossible. Corrige les champs signales ou change l'email / le username.",
      );
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
              required
              minLength={2}
              className={registerFeedback.fieldErrors.schoolName ? "field-invalid" : undefined}
              value={form.schoolName}
              onChange={(event) => updateField("schoolName", event.target.value)}
            />
            <FieldError message={registerFeedback.fieldErrors.schoolName} />
          </label>
          <label>
            Ville
            <input
              minLength={2}
              className={registerFeedback.fieldErrors.city ? "field-invalid" : undefined}
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
            />
            <FieldError message={registerFeedback.fieldErrors.city} />
          </label>
          <label>
            Prenom
            <input
              required
              minLength={2}
              className={registerFeedback.fieldErrors.firstName ? "field-invalid" : undefined}
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
            />
            <FieldError message={registerFeedback.fieldErrors.firstName} />
          </label>
          <label>
            Nom
            <input
              required
              minLength={2}
              className={registerFeedback.fieldErrors.lastName ? "field-invalid" : undefined}
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
            />
            <FieldError message={registerFeedback.fieldErrors.lastName} />
          </label>
          <label>
            Username
            <input
              required
              minLength={3}
              maxLength={30}
              className={registerFeedback.fieldErrors.username ? "field-invalid" : undefined}
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
            />
            <FieldError message={registerFeedback.fieldErrors.username} />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              className={registerFeedback.fieldErrors.email ? "field-invalid" : undefined}
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
            <FieldError message={registerFeedback.fieldErrors.email} />
          </label>
          <label className="full-span">
            Mot de passe
            <input
              type="password"
              required
              minLength={8}
              className={registerFeedback.fieldErrors.password ? "field-invalid" : undefined}
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
            />
            <FieldError message={registerFeedback.fieldErrors.password} />
          </label>
          {registerFeedback.formError ? (
            <p className="error-text full-span">{registerFeedback.formError}</p>
          ) : error ? (
            <p className="error-text full-span">{error}</p>
          ) : null}
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
