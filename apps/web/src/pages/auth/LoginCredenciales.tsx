import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import Field from '../../components/Field';
import Button from '../../components/Button';
import { useAuth } from '../../state/auth';
import { isMfaRequired } from '../../lib/auth-api';
import { ApiException } from '../../lib/api-client';

export default function LoginCredenciales() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const as = sp.get('as') === 'company' ? 'empresa' : 'usuario';
  const { loginWithCredentials } = useAuth();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await loginWithCredentials(correo, contrasena);
      if (isMfaRequired(res)) {
        nav(`/login/verificacion?temp=${encodeURIComponent(res.tempToken)}`);
      } else {
        nav('/app');
      }
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle={`Entrando como ${as}. Introduce tus credenciales.`}
      back={{ to: '/login/tipo' }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Correo"
          type="email"
          placeholder="nombre@correo.com"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <Field
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />

        {error && <div className="text-[13px] text-terracotta-600">{error}</div>}

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 text-ink/70 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-terracotta-500" />
            Recordarme
          </label>
          <a href="#" className="text-terracotta-600 hover:underline">¿Olvidaste la contraseña?</a>
        </div>

        <Button full type="submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Continuar'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-ink/60">
        ¿Primera vez por aquí?{' '}
        <Link to="/login/tipo?mode=signup" className="text-terracotta-600 font-medium hover:underline">
          Crea una cuenta
        </Link>
      </p>
    </AuthShell>
  );
}
