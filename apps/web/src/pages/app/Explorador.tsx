import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listPublic } from '../../lib/operaciones-api';
import { STATUS_META } from '../../state/ops';
import type { OperacionDto, OperacionStatus } from '../../lib/api-types';
import { PRODUCTO_CATS, SERVICIO_CATS, ALL_PRODUCTO_VALUES, ALL_SERVICIO_VALUES, categoriaLabel } from '../../lib/api-types';
import { ApiException } from '../../lib/api-client';
import { VendedoresTab } from './VendedoresTab';

type MainTab = 'operaciones' | 'vendedores';

const STATUS_TABS: Array<{ key: OperacionStatus | 'todas'; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'confirmed', label: 'Disponibles' },
];

type TipoFilter = 'todos' | 'producto' | 'servicio';
const ALL_CATS = [
  ...PRODUCTO_CATS.map((c) => ({ ...c, tipo: 'producto' as const })),
  ...SERVICIO_CATS.map((c) => ({ ...c, tipo: 'servicio' as const })),
];

function StatusPill({ s }: { s: OperacionStatus }) {
  const m = STATUS_META[s];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 h-5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ background: m.bg, color: m.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function formatAmount(a: string, currency: string) {
  return `${parseFloat(a).toFixed(2)} ${currency}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Explorador() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mainTab, setMainTab] = useState<MainTab>('operaciones');
  const [ops, setOps] = useState<OperacionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get('q') ?? '');
  const [statusTab, setStatusTab] = useState<OperacionStatus | 'todas'>('todas');
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setSearchParams(q ? { q } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [q, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listPublic(debouncedQ || undefined)
      .then(setOps)
      .catch((err) => setError(err instanceof ApiException ? err.message : 'Error cargando el explorador'))
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  const filtered = useMemo(() => {
    return ops.filter((o) => {
      if (statusTab !== 'todas' && o.status !== statusTab) return false;
      if (tipoFilter === 'producto' && !ALL_PRODUCTO_VALUES.includes(o.categoria ?? '')) return false;
      if (tipoFilter === 'servicio' && !ALL_SERVICIO_VALUES.includes(o.categoria ?? '')) return false;
      if (categoriaFilter && o.categoria !== categoriaFilter) return false;
      const price = parseFloat(o.totalAmount);
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;
      return true;
    });
  }, [ops, statusTab, tipoFilter, categoriaFilter, minPrice, maxPrice]);

  return (
    <div className="max-w-[1180px] mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Explorador de mercado</h1>
          <p className="text-ink/60 mt-1.5 text-[14.5px]">
            Operaciones públicas activas en el marketplace.
          </p>
        </div>
        <button
          onClick={() => nav('/app/operaciones/nueva')}
          className="h-11 px-5 rounded-xl bg-ink text-cream font-medium text-[14px] hover:bg-terracotta-600 transition inline-flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Nueva operación
        </button>
      </div>

      {/* Main tabs */}
      <div className="inline-flex bg-white border border-ink/10 rounded-xl p-1 mb-6">
        {([
          { k: 'operaciones', label: 'Operaciones' },
          { k: 'vendedores', label: 'Vendedores' },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setMainTab(t.k)}
            className={`h-9 px-5 rounded-lg text-[13px] font-medium transition ${mainTab === t.k ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === 'vendedores' && <VendedoresTab />}

      {mainTab === 'operaciones' && <>

      {/* Filter bar */}
      <div className="space-y-3 mb-6">
        {/* Row 1: tipo + search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex bg-white border border-ink/10 rounded-xl p-1">
            {([
              { k: 'todos', label: 'Todos' },
              { k: 'producto', label: 'Productos' },
              { k: 'servicio', label: 'Servicios' },
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => { setTipoFilter(t.k); setCategoriaFilter(''); }}
                className={`h-9 px-4 rounded-lg text-[13px] font-medium transition ${tipoFilter === t.k ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-white border border-ink/10 flex-1 max-w-xs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink/45 shrink-0">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre…"
              className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-ink/40"
            />
            {q && <button onClick={() => setQ('')} className="text-ink/40 hover:text-ink text-[18px] leading-none">×</button>}
          </label>

          <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-white border border-ink/10">
            <span className="text-[12px] text-ink/45">€</span>
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="Mín"
              className="w-16 bg-transparent outline-none text-[13.5px] placeholder:text-ink/35"
            />
            <span className="text-ink/30">—</span>
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="Máx"
              className="w-16 bg-transparent outline-none text-[13.5px] placeholder:text-ink/35"
            />
          </div>

          {!loading && (
            <span className="text-[12.5px] text-ink/50">
              {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
        </div>

        {/* Row 2: categorias */}
        {tipoFilter !== 'todos' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoriaFilter('')}
              className={`h-7 px-3 rounded-lg text-[12.5px] border transition ${!categoriaFilter ? 'bg-ink text-cream border-ink' : 'bg-white border-ink/10 text-ink/60 hover:border-ink/30'}`}
            >
              Todas las categorías
            </button>
            {ALL_CATS.filter((c) => c.tipo === tipoFilter).map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoriaFilter(categoriaFilter === cat.value ? '' : cat.value)}
                className={`h-7 px-3 rounded-lg text-[12.5px] border transition ${categoriaFilter === cat.value ? 'bg-ink text-cream border-ink' : 'bg-white border-ink/10 text-ink/60 hover:border-ink/30'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 px-4 py-3 mb-4 text-[13px]">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
        <table className="w-full text-[14px]">
          <thead className="bg-[#FAF7F1] text-ink/55 text-[11.5px] uppercase tracking-wider">
            <tr>
              <th className="text-left font-medium py-3 px-5">Oferta</th>
              <th className="text-left font-medium py-3 px-3">Tipo</th>
              <th className="text-left font-medium py-3 px-3">Estado</th>
              <th className="text-right font-medium py-3 px-3">Precio</th>
              <th className="text-left font-medium py-3 px-3">Publicada</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-ink/50 text-[14px]">Cargando…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-ink/50 text-[14px]">
                  {q ? `Sin resultados para «${q}»` : 'No hay operaciones públicas todavía.'}
                </td>
              </tr>
            )}

            {!loading && filtered.map((o) => (
              <tr
                key={o.id}
                onClick={() => nav(`/app/operaciones/${o.id}`)}
                className="border-t border-ink/[.06] hover:bg-terracotta-50/50 cursor-pointer transition"
              >
                <td className="py-3.5 px-5">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.titulo ?? o.notes ?? 'Oferta'}</div>
                    <div className="text-[11.5px] text-ink/50 truncate max-w-xs">{o.notes ?? ''}</div>
                  </div>
                </td>
                <td className="py-3.5 px-3">
                  {o.categoria && (
                    <span className="px-2 h-6 inline-flex items-center rounded-md text-[11.5px] font-medium bg-ink/[.04] text-ink/75">
                      {categoriaLabel(o.categoria)}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-3">
                  <StatusPill s={o.status} />
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums font-medium">
                  <div>{formatAmount(o.totalAmount, o.currency)}</div>
                  <div className="text-[11px] text-ink/45 font-normal">
                    {(o.stock ?? 1) === 0 ? 'Agotado' : `${o.stock ?? 1} disp.`}
                  </div>
                </td>
                <td className="py-3.5 px-3 text-ink/55 text-[13px]">{formatDate(o.createdAt)}</td>
                <td className="py-3.5 px-3 text-ink/30">›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </>}
    </div>
  );
}
