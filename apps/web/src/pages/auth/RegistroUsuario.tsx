import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import Field from '../../components/Field';
import Button from '../../components/Button';
import { useAuth } from '../../state/auth';
import { ApiException } from '../../lib/api-client';

export default function RegistroUsuario() {
  const nav = useNavigate();
  const { registerAndLogin } = useAuth();

  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [contrasena2, setContrasena2] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (contrasena !== contrasena2) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!acepta) {
      setError('Debes aceptar los términos');
      return;
    }
    setSubmitting(true);
    try {
      await registerAndLogin({
        nombre,
        apellidos: apellidos || '-',
        correo,
        contrasena,
        rol: 'cliente',
      });
      nav('/registro/completado');
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Regístrate como cliente para comprar, valorar y contactar con empresas."
      back={{ to: '/login/tipo?mode=signup' }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" placeholder="Alejandro" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Field label="Apellidos" placeholder="Rodríguez Ferrer" value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
        </div>
        <Field label="Correo" type="email" placeholder="nombre@correo.com" required value={correo} onChange={(e) => setCorreo(e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Contraseña" type="password" placeholder="••••••••" required minLength={8} value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
          <Field label="Confirmar contraseña" type="password" placeholder="••••••••" required value={contrasena2} onChange={(e) => setContrasena2(e.target.value)} />
        </div>

        {error && <div className="text-[13px] text-terracotta-600">{error}</div>}

        <label className="flex items-start gap-2 text-sm text-ink/70 pt-1">
          <input type="checkbox" required className="mt-0.5 w-4 h-4 rounded accent-terracotta-500" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
          <span>
            Acepto los{' '}
            <a href="#" className="text-terracotta-600 hover:underline">Términos</a> y la{' '}
            <a href="#" className="text-terracotta-600 hover:underline">Política de privacidad</a> (RGPD).
          </span>
        </label>

        <Button full type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear cuenta'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-ink/60">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-terracotta-600 font-medium hover:underline">Inicia sesión</Link>
      </p>
    </AuthShell>
  );
}
