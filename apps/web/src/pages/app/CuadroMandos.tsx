import { Navigate } from 'react-router-dom';
import { useAuth } from '../../state/auth';

/**
 * Cuadro de mandos (sólo cuentas de empresa).
 *
 * TODO: implementar endpoint GET /empresas/me/analytics con KPIs reales:
 * total ventas, AOV, top productos, distribución por categoría, valoraciones.
 */
export default function CuadroMandos() {
  const { account } = useAuth();
  if (account && account !== 'empresa') return <Navigate to="/app" replace />;

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[13px] text-ink/55">Vista empresa</div>
          <h1 className="font-display text-[34px] tracking-tight mt-0.5">Cuadro de Mandos</h1>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-10 text-center">
        <h2 className="font-display text-[20px] mb-2">Sin datos todavía</h2>
        <p className="text-[14px] text-ink/60 max-w-md mx-auto">
          Cuando empieces a operar verás aquí ventas, productos destacados y reseñas.
          El módulo de analytics está pendiente de implementación.
        </p>
      </div>
    </div>
  );
}
