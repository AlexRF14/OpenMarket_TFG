import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import Button from '../../components/Button';
import { api, ApiException } from '../../lib/api-client';
import { useAuth } from '../../state/auth';

interface OnboardingResponse {
  url: string;
  accountId: string;
}

function messageForStatus(err: ApiException): string {
  switch (err.status) {
    case 400:
      return `Datos inválidos: ${err.message}`;
    case 403:
      return 'No eres el propietario de esta empresa o tu sesión no tiene permisos para iniciar Stripe.';
    case 404:
      return 'No se encontró la empresa. Vuelve al paso anterior y crea de nuevo la empresa.';
    default:
      return err.message || 'Error iniciando Stripe Onboarding';
  }
}

export default function RegistroEmpresaStripe() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const empresaId = typeof window !== 'undefined' ? sessionStorage.getItem('om.empresaId') : null;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startOnboarding = async () => {
    setError(null);
    if (!profile) {
      setError('Debes iniciar sesión primero.');
      return;
    }
    if (!empresaId) {
      setError('No se encontró la empresa creada. Vuelve al paso anterior.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<OnboardingResponse>('/payments/connect/onboarding', {
        empresaId,
        email: profile.correo,
      });
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof ApiException ? messageForStatus(err) : 'No se pudo iniciar el onboarding');
      setLoading(false);
    }
  };

  const missingEmpresa = !empresaId;

  return (
    <AuthShell
      title="Verificación con Stripe"
      subtitle="OpenMarket usa Stripe Connect para verificar tu empresa (KYB) y poder recibir pagos."
      back={{ to: '/registro/empresa' }}
    >
      <ol className="flex items-center gap-3 mb-6 text-xs">
        <li className="flex items-center gap-2 text-ink/40">
          <span className="w-6 h-6 rounded-full bg-sage-100 text-sage-600 grid place-items-center font-medium">✓</span>
          Datos de empresa
        </li>
        <span className="flex-1 h-px bg-ink/10" />
        <li className="flex items-center gap-2 text-ink">
          <span className="w-6 h-6 rounded-full bg-ink text-cream grid place-items-center font-medium">2</span>
          Verificación (Stripe)
        </li>
      </ol>

      <div className="rounded-2xl bg-white border border-ink/10 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#635BFF] text-white grid place-items-center font-bold">S</div>
          <div>
            <div className="font-medium">Stripe Connect Express</div>
            <div className="text-xs text-ink/60">Pasarela de pagos con licencia europea — split payments y payouts</div>
          </div>
        </div>

        <ul className="space-y-2.5 text-sm text-ink/75">
          <li className="flex gap-2"><span className="text-sage-600">✓</span> Identidad del titular real (UBO)</li>
          <li className="flex gap-2"><span className="text-sage-600">✓</span> Documentación legal de la empresa</li>
          <li className="flex gap-2"><span className="text-sage-600">✓</span> Cuenta bancaria para liquidaciones</li>
          <li className="flex gap-2"><span className="text-sage-600">✓</span> Cumplimiento PSD2, SCA/3DS2 y DAC7</li>
        </ul>
      </div>

      <div className="mt-4 rounded-xl bg-terracotta-50 border border-terracotta-200 p-4 text-sm text-terracotta-700">
        Tendrás ~5 min. Serás redirigido al entorno seguro de Stripe y volverás automáticamente aquí.
      </div>

      {missingEmpresa && (
        <div className="mt-4 rounded-xl bg-terracotta-50 border border-terracotta-200 p-4 text-[13px] text-terracotta-700">
          No tenemos una empresa asociada a tu sesión.{' '}
          <Link to="/registro/empresa" className="underline font-medium">Vuelve al paso anterior</Link>{' '}
          para crearla antes de continuar.
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 rounded-xl bg-terracotta-50 border border-terracotta-200 p-3 text-[13px] text-terracotta-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <Button full onClick={startOnboarding} disabled={loading || missingEmpresa}>
          {loading ? 'Generando enlace…' : 'Continuar con Stripe →'}
        </Button>
        <Button full variant="secondary" onClick={() => nav('/registro/completado?skip=1')} disabled={loading}>
          Verificar más tarde
        </Button>
      </div>
    </AuthShell>
  );
}
