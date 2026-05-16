import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

/**
 * Bloquea rutas autenticadas. Mientras carga el perfil al montar la app,
 * muestra un placeholder simple — no redirige hasta saber si hay sesión.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-ink/50 text-[14px]">
        Cargando…
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
