import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import AuthShell from '../../components/AuthShell';
import Button from '../../components/Button';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../state/auth';
import { ApiException } from '../../lib/api-client';

export default function LoginLanding() {
  const nav = useNavigate();
  const { loginGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await cred.user.getIdToken();
      await loginGoogle(idToken);
      nav('/app');
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'No se pudo iniciar sesión con Google');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Bienvenido de vuelta"
      subtitle="Entra o crea una cuenta para empezar a operar en OpenMarket."
    >
      <div className="space-y-3">
        <Button full onClick={() => nav('/login/credenciales')}>Iniciar Sesión</Button>
        <Button full variant="secondary" onClick={() => nav('/login/tipo?mode=signup')}>Registrarse</Button>
      </div>

      <div className="my-8 flex items-center gap-3 text-xs uppercase tracking-wider text-ink/40">
        <div className="h-px flex-1 bg-ink/10" />
        o continuar con
        <div className="h-px flex-1 bg-ink/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" full onClick={onGoogle} disabled={busy}>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 rounded-sm bg-gradient-to-br from-[#EA4335] via-[#FBBC05] to-[#4285F4]" />
            Google
          </span>
        </Button>
        <Button variant="secondary" full disabled title="Apple sign-in pendiente">
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 rounded-sm bg-ink" />
            Apple
          </span>
        </Button>
      </div>

      {error && <div className="mt-4 text-[13px] text-terracotta-600">{error}</div>}

      <p className="mt-8 text-sm text-ink/60">
        ¿Primera vez por aquí?{' '}
        <Link to="/login/tipo?mode=signup" className="text-terracotta-600 font-medium hover:underline">
          Crea una cuenta
        </Link>
      </p>
    </AuthShell>
  );
}
