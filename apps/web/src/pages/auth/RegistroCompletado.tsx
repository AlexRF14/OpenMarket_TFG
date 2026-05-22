import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import Button from '../../components/Button';

export default function RegistroCompletado() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const skipped = sp.get('skip') === '1';

  return (
    <AuthShell title="¡Todo listo!" subtitle="Tu cuenta en OpenMarket está activa.">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-sage-100 text-sage-600 grid place-items-center text-2xl">
          ✓
        </div>
        <h3 className="font-display text-xl mt-4">Bienvenido a OpenMarket</h3>
        <p className="text-sm text-ink/60 mt-1">
          {skipped
            ? 'Puedes explorar la plataforma. Recuerda completar la verificación con Stripe antes de recibir pagos.'
            : 'Tu verificación está en curso. Te notificaremos cuando Stripe la apruebe (suele ser < 24 h).'}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <Button full onClick={() => nav('/app')}>Ir al marketplace</Button>
        <Button full variant="ghost" onClick={() => nav('/login')}>Volver a inicio</Button>
      </div>
    </AuthShell>
  );
}
