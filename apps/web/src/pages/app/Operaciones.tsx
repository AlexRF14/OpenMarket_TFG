import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useOperaciones, STATUS_META } from '../../state/ops';
import { useAuth } from '../../state/auth';
import type { AnyOperationType, OperacionDto, OperacionStatus } from '../../lib/api-types';

function typeLabel(t: AnyOperationType): string {
  if (t === 'publica') return 'Pública';
  if (t === 'negociada') return 'Negociada';
  if (t === 'public_b2c') return 'Pública B2C';
  if (t === 'public_b2b') return 'Pública B2B';
  if (t === 'negotiated') return 'Negociada';
  return t;
}

const TABS: Array<{ key: 'todas' | 'pendientes' | 'en_curso' | 'historial'; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'en_curso', label: 'En curso' },
  { key: 'historial', label: 'Historial' },
];

function StatusPill({ s }: { s: OperacionStatus }) {
  const m = STATUS_META[s];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11.5px] font-medium whitespace-nowrap"
      style={{ background: m.bg, color: m.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function sideOf(op: OperacionDto, currentUserId: string | undefined): 'comprando' | 'vendiendo' {
  if (!currentUserId) return 'comprando';
  return op.idVendedor === currentUserId ? 'vendiendo' : 'comprando';
}

function opTitle(op: OperacionDto): string {
  return op.titulo ?? op.notes ?? 'Operación';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

export default function Operaciones() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const { ops, loading, error } = useOperaciones();
  const [tab, setTab] = useState<typeof TABS[number]['key']>('todas');
  const [q, setQ] = useState('');
  const [side, setSide] = useState<'todas' | 'comprando' | 'vendiendo'>('todas');

  const filtered = useMemo(() => {
    return ops.filter((o) => {
      const opSide = sideOf(o, profile?.id);
      if (tab === 'pendientes' && o.status !== 'pending') return false;
      if (tab === 'en_curso' && !['confirmed', 'shipped'].includes(o.status)) return false;
      if (tab === 'historial' && !['completed', 'cancelled', 'refunded', 'disputed'].includes(o.status)) return false;
      if (side !== 'todas' && opSide !== side) return false;
      if (q && !(`${o.id} ${o.titulo ?? ''} ${o.notes ?? ''}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [ops, tab, q, side, profile?.id]);

  const counts = useMemo(() => ({
    pendientes: ops.filter((o) => o.status === 'pending').length,
    en_curso: ops.filter((o) => ['confirmed', 'shipped'].includes(o.status)).length,
    historial: ops.filter((o) => ['completed', 'cancelled', 'refunded', 'disputed'].includes(o.status)).length,
  }), [ops]);

  return (
    <div className="max-w-[1180px] mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Operaciones</h1>
          <p className="text-ink/60 mt-1.5 text-[14.5px]">
            Gestiona tus operaciones públicas y negociadas.
          </p>
        </div>
        <button
          onClick={() => nav('/app/operaciones/nueva')}
          className="h-11 px-5 rounded-xl bg-ink text-cream font-medium text-[14px] hover:bg-terracotta-600 transition inline-flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Nueva operación
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: ops.length, hint: 'abiertas e históricas' },
          { label: 'Pendientes', value: counts.pendientes, hint: 'esperando acción' },
          { label: 'En curso', value: counts.en_curso, hint: 'confirmadas o enviadas' },
          { label: 'Cerradas', value: counts.historial, hint: 'completadas o canceladas' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-white border border-ink/10 p-4">
            <div className="text-[12px] text-ink/55 uppercase tracking-wider">{k.label}</div>
            <div className="font-display text-3xl mt-1">{k.value}</div>
            <div className="text-[11.5px] text-ink/50 mt-1">{k.hint}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="inline-flex bg-white border border-ink/10 rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`h-9 px-4 rounded-lg text-[13px] font-medium transition ${
                tab === t.key ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-white border border-ink/10 rounded-xl p-1 text-[12.5px]">
            {(['todas', 'comprando', 'vendiendo'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`h-8 px-3 rounded-md capitalize transition ${
                  side === s ? 'bg-terracotta-500/10 text-terracotta-600 font-medium' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-white border border-ink/10 w-[260px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink/45">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar operación…"
              className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-ink/40"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 px-4 py-3 mb-4 text-[13px]">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
        <table className="w-full text-[14px]">
          <thead className="bg-[#FAF7F1] text-ink/55 text-[11.5px] uppercase tracking-wider">
            <tr>
              <th className="text-left font-medium py-3 px-5">Operación</th>
              <th className="text-left font-medium py-3 px-3">Posición</th>
              <th className="text-left font-medium py-3 px-3">Tipo</th>
              <th className="text-right font-medium py-3 px-3">Total</th>
              <th className="text-left font-medium py-3 px-3">Estado</th>
              <th className="text-left font-medium py-3 px-3">Actualizada</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const opSide = sideOf(o, profile?.id);
              return (
                <tr
                  key={o.id}
                  onClick={() => nav(`/app/operaciones/${o.id}`)}
                  className="border-t border-ink/[.06] hover:bg-terracotta-50/50 cursor-pointer transition"
                >
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-1 h-8 rounded-full"
                        style={{ background: opSide === 'comprando' ? '#5C7159' : '#B85A36' }}
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{opTitle(o)}</div>
                        <div className="text-[11.5px] text-ink/50 font-mono truncate">{o.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-ink/80 capitalize">{opSide}</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 h-6 inline-flex items-center rounded-md text-[11.5px] font-medium bg-ink/[.04] text-ink/75">
                      {typeLabel(o.operationType)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums font-medium">
                    {o.totalAmount} {o.currency}
                  </td>
                  <td className="py-3.5 px-3"><StatusPill s={o.status} /></td>
                  <td className="py-3.5 px-3 text-ink/55 text-[13px]">{formatDate(o.updatedAt)}</td>
                  <td className="py-3.5 px-3 text-ink/30">›</td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-ink/50 text-[14px]">
                  {ops.length === 0 ? 'Aún no tienes operaciones.' : 'No hay operaciones con estos filtros.'}
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-ink/50 text-[14px]">
                  Cargando…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
