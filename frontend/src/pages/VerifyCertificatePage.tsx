import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import type { Certificate } from "../types";

export default function VerifyCertificatePage() {
  const { code = "" } = useParams();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCertificate = async () => {
      try {
        const response = await api.get<{ certificate: Certificate }>(
          `/certificates/verify/${code}`,
        );
        setCertificate(response.data.certificate);
      } catch (requestError: unknown) {
        setError("Certificat introuvable ou non encore genere.");
      }
    };

    void loadCertificate();
  }, [code]);

  return (
    <main className="verify-shell">
      <section className="verify-card">
        <p className="eyebrow">Verification publique</p>
        <h1>{certificate ? "Certificat valide" : "Verification en cours"}</h1>

        {error ? <p className="error-text">{error}</p> : null}

        {certificate ? (
          <div className="verify-grid">
            <div>
              <span>Code</span>
              <strong>{certificate.code}</strong>
            </div>
            <div>
              <span>Etudiant</span>
              <strong>
                {certificate.student.firstName} {certificate.student.lastName}
              </strong>
            </div>
            <div>
              <span>Ecole</span>
              <strong>{certificate.school?.name ?? "CertiCampus"}</strong>
            </div>
            <div>
              <span>Formation</span>
              <strong>{certificate.student.formation?.name ?? "Non renseignee"}</strong>
            </div>
          </div>
        ) : null}

        <Link to="/login" className="secondary-link">
          Retour a l'application
        </Link>
      </section>
    </main>
  );
}
