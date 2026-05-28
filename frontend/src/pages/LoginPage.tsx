import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../api";
import { useSession } from "../session";
import type { User } from "../types";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, setSession } = useSession();
  const [email, setEmail] = useState("school@certicampus.test");
  const [password, setPassword] = useState("School1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/school"} replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{ token: string; user: User }>("/auth/login", {
        email,
        password,
      });

      setSession(response.data.token, response.data.user);
      navigate(response.data.user.role === "ADMIN" ? "/admin" : "/school");
    } catch (requestError: unknown) {
      setError("Connexion impossible. Verifie tes identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel auth-panel-hero">
        <p className="eyebrow">Projet blanc exam</p>
        <h1>CertiCampus</h1>
        <p className="lede">
          Une base complete pour t'entrainer sur auth, CRUD, import Excel,
          certificats, role admin/ecole, tests et verification.
        </p>
        <div className="demo-cards">
          <article className="demo-card">
            <h2>Compte ecole</h2>
            <p>`school@certicampus.test`</p>
            <p>`School1234`</p>
          </article>
          <article className="demo-card">
            <h2>Compte admin</h2>
            <p>`admin@certicampus.test`</p>
            <p>`Admin1234`</p>
          </article>
        </div>
      </section>

      <section className="auth-panel auth-panel-form">
        <h2>Connexion</h2>
        <form className="stack-form" onSubmit={submit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/register">Creer une ecole de test</Link>
          <Link to="/verify/CERT-DEMO">Verifier un certificat</Link>
        </div>
      </section>
    </main>
  );
}
