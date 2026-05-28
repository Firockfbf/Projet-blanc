import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SchoolWorkspace from "./pages/SchoolWorkspace";
import AdminWorkspace from "./pages/AdminWorkspace";
import VerifyCertificatePage from "./pages/VerifyCertificatePage";
import { useSession } from "./session";

function ProtectedRoute({
  children,
  role,
}: {
  children: ReactElement;
  role?: "ADMIN" | "SCHOOL";
}) {
  const { user, ready } = useSession();

  if (!ready) {
    return <div className="screen-center">Chargement de la session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/school"} replace />;
  }

  return children;
}

export default function App() {
  const { user, ready } = useSession();

  if (!ready) {
    return <div className="screen-center">Initialisation...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.role === "ADMIN" ? "/admin" : "/school"} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify/:code" element={<VerifyCertificatePage />} />
      <Route
        path="/school"
        element={
          <ProtectedRoute role="SCHOOL">
            <SchoolWorkspace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminWorkspace />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
