import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/auth';
import { listPublic } from '../../lib/operaciones-api';
import { STATUS_META } from '../../state/ops';
import type { OperacionDto, OperacionStatus } from '../../lib/api-types';
import { PRODUCTO_CATS, SERVICIO_CATS, ALL_PRODUCTO_VALUES, ALL_SERVICIO_VALUES, categoriaLabel } from '../../lib/api-types';

type TipoFilter = 'todos' | 'producto' | 'servicio';
const ALL_CATS = [
  ...PRODUCTO_CATS.map((c) => ({ ...c, tipo: 'producto' as const })),
  ...SERVICIO_CATS.map((c) => ({ ...c, tipo: 'servicio' as const })),
];

function StatusPill({ s }: { s: OperacionStatus }) {
  const m = STATUS_META[s];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[11px] font-medium"
      style={{ background: m.bg, color: m.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function OfertaCard({ op, onClick }: { op: OperacionDto; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-ink/10 rounded-2xl p-5 hover:border-terracotta-500/40 hover:shadow-sm transition group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        {op.categoria && (
          <span className="px-2 py-0.5 rounded-md bg-ink/[.04] text-[11px] font-medium text-ink/60">
            {categoriaLabel(op.categoria)}
          </span>
        )}
        <StatusPill s={op.status} />
      </div>
      <div className="font-display text-[17px] leading-snug group-hover:text-terracotta-600 transition truncate">
        {op.titulo ?? 'Oferta'}
      </div>
      {op.notes && (
        <div className="text-[12.5px] text-ink/55 mt-1 line-clamp-2 leading-relaxed">{op.notes}</div>
      )}
      <div className="mt-3 font-display text-[20px]">
        {parseFloat(op.totalAmount).toFixed(2)} <span className="text-[14px] text-ink/50">{op.currency}</span>
      </div>
    </button>
  );
}

export default function Home() {
  const { name, account } = useAuth();
  const nav = useNavigate();
  const [ops, setOps] = useState<OperacionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    listPublic().then((list) => setOps(list.slice(0, 48))).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return ops.filter((o) => {
      if (tipoFilter === 'producto' && !ALL_PRODUCTO_VALUES.includes(o.categoria ?? '')) return false;
      if (tipoFilter === 'servicio' && !ALL_SERVICIO_VALUES.includes(o.categoria ?? '')) return false;
      if (categoriaFilter && o.categoria !== categoriaFilter) return false;
      const price = parseFloat(o.totalAmount);
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;
      return true;
    }).slice(0, 12);
  }, [ops, tipoFilter, categoriaFilter, minPrice, maxPrice]);

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-[13px] text-ink/55">Bienvenido, {name || '—'}</div>
          <h1 className="font-display text-[34px] tracking-tight mt-0.5">Explora el mercado</h1>
        </div>
        {account && (
          <div className="text-[13px] text-ink/55">
            Viendo como <span className="font-medium text-ink capitalize">{account}</span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-6 space-y-2.5">
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
          <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-white border border-ink/10">
            <span className="text-[12px] text-ink/45">€</span>
            <input value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Mín" className="w-14 bg-transparent outline-none text-[13.5px] placeholder:text-ink/35" />
            <span className="text-ink/30">—</span>
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Máx" className="w-14 bg-transparent outline-none text-[13.5px] placeholder:text-ink/35" />
          </div>
        </div>
        {tipoFilter !== 'todos' && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategoriaFilter('')} className={`h-7 px-3 rounded-lg text-[12.5px] border transition ${!categoriaFilter ? 'bg-ink text-cream border-ink' : 'bg-white border-ink/10 text-ink/60 hover:border-ink/30'}`}>
              Todas
            </button>
            {ALL_CATS.filter((c) => c.tipo === tipoFilter).map((cat) => (
              <button key={cat.value} onClick={() => setCategoriaFilter(categoriaFilter === cat.value ? '' : cat.value)} className={`h-7 px-3 rounded-lg text-[12.5px] border transition ${categoriaFilter === cat.value ? 'bg-ink text-cream border-ink' : 'bg-white border-ink/10 text-ink/60 hover:border-ink/30'}`}>
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center text-ink/50 py-16 text-[14px]">Cargando…</div>
      ) : ops.length === 0 ? (
        <section className="rounded-2xl bg-white border border-ink/10 p-10 text-center">
          <h2 className="font-display text-[22px] mb-2">El mercado está vacío</h2>
          <p className="text-[14px] text-ink/60 max-w-md mx-auto">
            Aún no hay ofertas públicas. Sé el primero en publicar.
          </p>
          <button
            onClick={() => nav('/app/operaciones/nueva')}
            className="mt-5 h-11 px-5 rounded-xl bg-ink text-cream text-[14px] font-medium hover:bg-terracotta-600 transition"
          >
            Publicar oferta
          </button>
        </section>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[19px]">Últimas ofertas</h2>
            <button
              onClick={() => nav('/app/explorador')}
              className="text-[13px] text-terracotta-600 hover:underline"
            >
              Ver todas →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.length > 0
              ? filtered.map((op) => (
                  <OfertaCard key={op.id} op={op} onClick={() => nav(`/app/operaciones/${op.id}`)} />
                ))
              : <div className="col-span-4 py-12 text-center text-ink/50 text-[14px]">Sin resultados con los filtros actuales.</div>
            }
          </div>
        </>
      )}

      <div className="h-16" />
    </div>
  );
}
