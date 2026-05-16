import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import Field from '../../components/Field';
import Button from '../../components/Button';
import { useAuth } from '../../state/auth';
import { api, ApiException } from '../../lib/api-client';

interface CreatedEmpresa {
  id: string;
  nombre: string;
  taxId: string;
  sector: string | null;
}

const sectores = [
  'Agricultura / Ganadería',
  'Alimentación y bebidas',
  'Comercio minorista',
  'Restauración',
  'Moda y textil',
  'Tecnología / Software',
  'Servicios profesionales',
  'Construcción',
  'Logística',
  'Otro',
];

/**
 * Registra al titular de la empresa como `usuario` con rol=empresa.
 *
 * TODO: en una segunda llamada (post /registro/empresa/stripe) crear la fila en
 * `empresas` con tax_id, sector, etc. — necesita EmpresasController.
 */
export default function RegistroEmpresa() {
  const nav = useNavigate();
  const { registerAndLogin } = useAuth();

  const [razonSocial, setRazonSocial] = useState('');
  const [taxId, setTaxId] = useState('');
  const [sector, setSector] = useState('');
  const [correo, setCorreo] = useState('');
  const [responsable, setResponsable] = useState('');
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
      setError('Debes aceptar los términos y la verificación KYB');
      return;
    }
    const [nombre = responsable, ...resto] = responsable.trim().split(/\s+/);
    setSubmitting(true);
    try {
      await registerAndLogin({
        nombre,
        apellidos: resto.join(' ') || '-',
        correo,
        contrasena,
        rol: 'empresa',
      });
      const empresa = await api.post<CreatedEmpresa>('/empresas', {
        razonSocial,
        taxId,
        sector,
      });
      sessionStorage.setItem('om.empresaId', empresa.id);
      nav('/registro/empresa/stripe');
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Registra tu empresa"
      subtitle="Datos identificativos de tu empresa o actividad como autónomo. Después completarás la verificación con Stripe."
      back={{ to: '/login/tipo?mode=signup' }}
    >
      <ol className="flex items-center gap-3 mb-6 text-xs">
        <li className="flex items-center gap-2 text-ink">
          <span className="w-6 h-6 rounded-full bg-ink text-cream grid place-items-center font-medium">1</span>
          Datos de empresa
        </li>
        <span className="flex-1 h-px bg-ink/10" />
        <li className="flex items-center gap-2 text-ink/40">
          <span className="w-6 h-6 rounded-full bg-ink/10 grid place-items-center font-medium">2</span>
          Verificación (Stripe)
        </li>
      </ol>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Razón social" placeholder="Mi Empresa, S.L." required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="NIF / CIF" placeholder="B12345678" required value={taxId} onChange={(e) => setTaxId(e.target.value)} />
          <label className="block">
            <span className="block text-sm font-medium text-ink/80 mb-1.5">Sector</span>
            <select
              required value={sector} onChange={(e) => setSector(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-white border border-ink/10 text-ink focus:outline-none focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/15 transition"
            >
              <option value="" disabled>Selecciona…</option>
              {sectores.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <Field label="Correo corporativo" type="email" placeholder="contacto@miempresa.com" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <Field label="Nombre de la persona responsable" placeholder="Alejandro Rodríguez" required value={responsable} onChange={(e) => setResponsable(e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Contraseña" type="password" placeholder="••••••••" required minLength={8} value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
          <Field label="Confirmar contraseña" type="password" placeholder="••••••••" required value={contrasena2} onChange={(e) => setContrasena2(e.target.value)} />
        </div>

        {error && <div className="text-[13px] text-terracotta-600">{error}</div>}

        <label className="flex items-start gap-2 text-sm text-ink/70 pt-1">
          <input type="checkbox" required className="mt-0.5 w-4 h-4 rounded accent-terracotta-500" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
          <span>
            Acepto los{' '}
            <a href="#" className="text-terracotta-600 hover:underline">Términos</a>, la{' '}
            <a href="#" className="text-terracotta-600 hover:underline">Política de privacidad</a> y la verificación KYB
            por parte de Stripe Connect (AML/PSD2).
          </span>
        </label>

        <Button full type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : 'Continuar a verificación'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-ink/60">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-terracotta-600 font-medium hover:underline">Inicia sesión</Link>
      </p>
    </AuthShell>
  );
}
