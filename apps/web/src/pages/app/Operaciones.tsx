import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOperaciones, getStatusDisplay } from '../../state/ops';
import { useAuth } from '../../state/auth';
import type { AnyOperationType, CompraDto, OperacionDto } from '../../lib/api-types';
import { getMisCompras, marcarRecibida, refundCompra } from '../../lib/compras-api';
import { ApiException } from '../../lib/api-client';
import { categoriaLabel } from '../../lib/api-types';

function typeLabel(t: AnyOperationType): string {
  if (t === 'publica') return 'Pública';
  if (t === 'negociada') return 'Negociada';
  if (t === 'public_b2c') return 'Pública B2C';
  if (t === 'public_b2b') return 'Pública B2B';
  if (t === 'negotiated') return 'Negociada';
  return t;
}

function StatusPill({ op, userId }: { op: OperacionDto; userId?: string }) {
  const m = getStatusDisplay(op, userId);
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

function CompraStatusPill({ c }: { c: CompraDto }) {
  if (c.status === 'reembolsada') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11.5px] font-medium whitespace-nowrap" style={{ background: '#F3EEE4', color: '#4A3F32' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#6A5B4A' }} />
        Reembolsada
      </span>
    );
  }
  const deliveryDate = c.deliveryInfo?.deliveryDate;
  const isAdquirido = !!c.receivedAt || !deliveryDate || new Date(deliveryDate) <= new Date();
  if (isAdquirido) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11.5px] font-medium whitespace-nowrap" style={{ background: '#E4EAE1', color: '#2F4D2F' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4A7A4A' }} />
        Adquirido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11.5px] font-medium whitespace-nowrap" style={{ background: '#E3EFF8', color: '#1E4A72' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B6FA0' }} />
      Enviando
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

const VENTA_TABS: Array<{ key: 'todas' | 'pendientes' | 'en_curso' | 'historial'; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'en_curso', label: 'En curso' },
  { key: 'historial', label: 'Historial' },
];

const COMPRA_TABS: Array<{ key: 'todas' | 'activas' | 'historial'; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'activas', label: 'En curso' },
  { key: 'historial', label: 'Historial' },
];

export default function Operaciones() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const { ops, loading: opsLoading, error: opsError } = useOperaciones('vendiendo');
  const [compras, setCompras] = useState<CompraDto[]>([]);
  const [comprasLoading, setComprasLoading] = useState(true);
  const [comprasError, setComprasError] = useState<string | null>(null);
  const [ventaTab, setVentaTab] = useState<typeof VENTA_TABS[number]['key']>('todas');
  const [compraTab, setCompraTab] = useState<typeof COMPRA_TABS[number]['key']>('todas');
  const [q, setQ] = useState('');
  const [side, setSide] = useState<'comprando' | 'vendiendo'>('vendiendo');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refundModalId, setRefundModalId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const loadCompras = useCallback(async () => {
    setComprasLoading(true);
    try {
      setCompras(await getMisCompras());
      setComprasError(null);
    } catch (e) {
      setComprasError(e instanceof Error ? e.message : 'Error cargando compras');
    } finally {
      setComprasLoading(false);
    }
  }, []);

  useEffect(() => { void loadCompras(); }, [loadCompras]);

  const filteredOps = useMemo(() => {
    return ops.filter((o) => {
      if (ventaTab === 'pendientes' && o.status !== 'pending') return false;
      if (ventaTab === 'en_curso' && !['confirmed', 'shipped'].includes(o.status)) return false;
      if (ventaTab === 'historial' && !['completed', 'cancelled', 'refunded', 'disputed'].includes(o.status)) return false;
      if (q && !(`${o.id} ${o.titulo ?? ''} ${o.notes ?? ''}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [ops, ventaTab, q]);

  const isEnviando = (c: CompraDto) => {
    const d = c.deliveryInfo?.deliveryDate;
    return c.status === 'activo' && !c.receivedAt && !!d && new Date(d) > new Date();
  };
  const isAdquirido = (c: CompraDto) => {
    const d = c.deliveryInfo?.deliveryDate;
    return c.status === 'activo' && (!!c.receivedAt || !d || new Date(d) <= new Date());
  };

  const filteredCompras = useMemo(() => {
    return compras.filter((c) => {
      if (compraTab === 'activas' && !isEnviando(c)) return false;
      if (compraTab === 'historial' && !(c.status === 'reembolsada' || isAdquirido(c))) return false;
      if (q && !(`${c.operacionId} ${c.titulo ?? ''}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compras, compraTab, q]);

  const handleMarcarRecibida = async (compraId: string) => {
    setActionBusy(compraId);
    setActionError(null);
    try {
      const updated = await marcarRecibida(compraId);
      setCompras((prev) => prev.map((c) => c.id === compraId ? updated : c));
    } catch (e) {
      setActionError(e instanceof ApiException ? e.message : 'Error');
    } finally {
      setActionBusy(null);
    }
  };

  const handleRefund = (compraId: string) => {
    setRefundReason('');
    setActionError(null);
    setRefundModalId(compraId);
  };

  const handleSubmitRefund = async () => {
    if (!refundModalId || !refundReason.trim()) return;
    setActionBusy(refundModalId);
    setActionError(null);
    try {
      await refundCompra(refundModalId, refundReason.trim());
      setRefundModalId(null);
      await loadCompras();
    } catch (e) {
      setActionError(e instanceof ApiException ? e.message : 'Error solicitando reembolso');
    } finally {
      setActionBusy(null);
    }
  };

  const ventaCounts = useMemo(() => ({
    pendientes: ops.filter((o) => o.status === 'pending').length,
    en_curso: ops.filter((o) => ['confirmed', 'shipped'].includes(o.status)).length,
    historial: ops.filter((o) => ['completed', 'cancelled', 'refunded', 'disputed'].includes(o.status)).length,
  }), [ops]);

  const compraCounts = useMemo(() => ({
    activas: compras.filter((c) => c.status === 'activo').length,
    historial: compras.filter((c) => c.status === 'reembolsada').length,
  }), [compras]);

  return (
    <>
    {refundModalId && (
      <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <h2 className="font-display text-xl">Solicitar reembolso</h2>
          <p className="text-[13.5px] text-ink/65">Explica el motivo de la devolución. El vendedor recibirá esta información y podrá aceptar o rechazar la solicitud.</p>
          <textarea
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Describe el problema con tu pedido…"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F1] border border-ink/10 text-[13.5px] outline-none focus:border-terracotta-500 transition resize-none"
          />
          {actionError && <div className="text-[12px] text-terracotta-600">{actionError}</div>}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setRefundModalId(null)}
              disabled={!!actionBusy}
              className="h-10 px-4 rounded-xl bg-white border border-ink/15 text-[13.5px] font-medium hover:border-ink/30 transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleSubmitRefund()}
              disabled={!!actionBusy || !refundReason.trim()}
              className="h-10 px-4 rounded-xl bg-terracotta-500 text-cream text-[13.5px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60"
            >
              {actionBusy ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="max-w-[1180px] mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Operaciones</h1>
          <p className="text-ink/60 mt-1.5 text-[14.5px]">
            Gestiona tus ventas y compras.
          </p>
        </div>
        <button
          onClick={() => nav('/app/operaciones/nueva')}
          className="h-11 px-5 rounded-xl bg-ink text-cream font-medium text-[14px] hover:bg-terracotta-600 transition inline-flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Nueva operación
        </button>
      </div>

      {/* Side selector */}
      <div className="flex items-center gap-2 mb-6">
        {(['vendiendo', 'comprando'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`h-10 px-5 rounded-xl font-medium text-[13.5px] transition border ${
              side === s
                ? 'bg-ink text-cream border-ink'
                : 'bg-white text-ink/60 border-ink/10 hover:border-ink/30'
            }`}
          >
            {s === 'vendiendo' ? 'Mis ventas' : 'Mis compras'}
          </button>
        ))}
      </div>

      {/* ── VENDIENDO ── */}
      {side === 'vendiendo' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: ops.length, hint: 'listados creados' },
              { label: 'Pendientes', value: ventaCounts.pendientes, hint: 'borradores' },
              { label: 'En curso', value: ventaCounts.en_curso, hint: 'publicados o sin stock' },
              { label: 'Cerradas', value: ventaCounts.historial, hint: 'completadas o canceladas' },
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
              {VENTA_TABS.map((t) => (
                <button key={t.key} onClick={() => setVentaTab(t.key)}
                  className={`h-9 px-4 rounded-lg text-[13px] font-medium transition ${ventaTab === t.key ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <SearchBox q={q} setQ={setQ} />
          </div>

          {opsError && <ErrorBanner msg={opsError} />}

          <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
            <table className="w-full text-[14px]">
              <thead className="bg-[#FAF7F1] text-ink/55 text-[11.5px] uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium py-3 px-5">Operación</th>
                  <th className="text-left font-medium py-3 px-3">Tipo</th>
                  <th className="text-right font-medium py-3 px-3">Vendidas</th>
                  <th className="text-right font-medium py-3 px-3">Ingresos</th>
                  <th className="text-left font-medium py-3 px-3">Estado</th>
                  <th className="text-left font-medium py-3 px-3">Actualizada</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filteredOps.map((o) => {
                  const soldUnits = Math.max(0, (o.cantidad ?? 1) - (o.stock ?? 0));
                  const ingresos = soldUnits > 0
                    ? (parseFloat(o.totalAmount) * soldUnits).toFixed(2)
                    : parseFloat(o.totalAmount).toFixed(2);
                  return (
                    <tr key={o.id} onClick={() => nav(`/app/operaciones/${o.id}`)}
                      className="border-t border-ink/[.06] hover:bg-terracotta-50/50 cursor-pointer transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <span className="w-1 h-8 rounded-full bg-terracotta-500" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{opTitle(o)}</div>
                            {o.idComprador && o.deliveryInfo && (
                              <div className="text-[11px] text-ink/50 mt-0.5 flex gap-1.5 items-center truncate">
                                <span>📦</span>
                                <span>{o.deliveryInfo.fullName}</span>
                                <span className="text-ink/25">·</span>
                                <span>{o.deliveryInfo.city}</span>
                                <span className="text-ink/25">·</span>
                                <span>Entrega: {o.deliveryInfo.deliveryDate}</span>
                              </div>
                            )}
                            <div className="text-[11.5px] text-ink/50 font-mono truncate">{o.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 h-6 inline-flex items-center rounded-md text-[11.5px] font-medium bg-ink/[.04] text-ink/75">
                          {typeLabel(o.operationType)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums text-ink/70">
                        {soldUnits > 0 ? <span className="font-medium">{soldUnits} ud.</span> : <span className="text-ink/35">—</span>}
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums font-medium">
                        {ingresos} {o.currency}
                        {soldUnits === 0 && <span className="text-[11px] text-ink/40 font-normal ml-0.5">/ud</span>}
                      </td>
                      <td className="py-3.5 px-3"><StatusPill op={o} userId={profile?.id} /></td>
                      <td className="py-3.5 px-3 text-ink/55 text-[13px]">{formatDate(o.updatedAt)}</td>
                      <td className="py-3.5 px-3 text-ink/30">›</td>
                    </tr>
                  );
                })}
                {!opsLoading && filteredOps.length === 0 && (
                  <tr><td colSpan={7} className="py-16 text-center text-ink/50 text-[14px]">
                    {ops.length === 0 ? 'Aún no tienes operaciones como vendedor.' : 'No hay operaciones con estos filtros.'}
                  </td></tr>
                )}
                {opsLoading && <tr><td colSpan={7} className="py-16 text-center text-ink/50 text-[14px]">Cargando…</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── COMPRANDO ── */}
      {side === 'comprando' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total', value: compras.length, hint: 'compras realizadas' },
              { label: 'En curso', value: compraCounts.activas, hint: 'enviando o adquiridas' },
              { label: 'Reembolsadas', value: compraCounts.historial, hint: 'devueltas' },
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
              {COMPRA_TABS.map((t) => (
                <button key={t.key} onClick={() => setCompraTab(t.key)}
                  className={`h-9 px-4 rounded-lg text-[13px] font-medium transition ${compraTab === t.key ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <SearchBox q={q} setQ={setQ} />
          </div>

          {comprasError && <ErrorBanner msg={comprasError} />}
          {actionError && <ErrorBanner msg={actionError} />}

          <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
            <table className="w-full text-[14px]">
              <thead className="bg-[#FAF7F1] text-ink/55 text-[11.5px] uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium py-3 px-5">Producto / Servicio</th>
                  <th className="text-left font-medium py-3 px-3">Entrega</th>
                  <th className="text-right font-medium py-3 px-3">Ud.</th>
                  <th className="text-right font-medium py-3 px-3">Total</th>
                  <th className="text-left font-medium py-3 px-3">Estado</th>
                  <th className="text-left font-medium py-3 px-3">Fecha</th>
                  <th className="text-left font-medium py-3 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompras.map((c) => {
                  const deliveryDate = c.deliveryInfo?.deliveryDate;
                  const isEnviando = c.status === 'activo'
                    && !c.receivedAt
                    && !!deliveryDate
                    && new Date(deliveryDate) > new Date();
                  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
                  const canRefundThis = c.status === 'activo'
                    && !!c.stripePaymentIntentId
                    && !!c.purchasedAt
                    && (Date.now() - new Date(c.purchasedAt).getTime()) < FOURTEEN_DAYS_MS;
                  const busy = actionBusy === c.id;
                  return (
                    <tr key={c.id}
                      onClick={() => nav(`/app/operaciones/${c.operacionId}`)}
                      className="border-t border-ink/[.06] hover:bg-sage-50/40 cursor-pointer transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <span className="w-1 h-8 rounded-full bg-sage-600" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.titulo ?? 'Oferta'}</div>
                            {c.categoria && (
                              <div className="text-[11.5px] text-ink/50">{categoriaLabel(c.categoria)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-[13px] text-ink/70">
                        {deliveryDate ? (
                          <span className={new Date(deliveryDate) > new Date() ? 'text-amber-600' : 'text-sage-700'}>
                            {deliveryDate}
                          </span>
                        ) : <span className="text-ink/30">—</span>}
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums font-medium">{c.quantity}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums font-medium">
                        {c.totalPagado} {c.currency}
                      </td>
                      <td className="py-3.5 px-3"><CompraStatusPill c={c} /></td>
                      <td className="py-3.5 px-3 text-ink/55 text-[13px]">
                        {c.purchasedAt ? formatDate(c.purchasedAt) : '—'}
                      </td>
                      <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          {isEnviando && (
                            <button
                              disabled={busy}
                              onClick={() => void handleMarcarRecibida(c.id)}
                              className="h-7 px-2.5 rounded-lg bg-amber-100 text-amber-800 text-[11.5px] font-medium hover:bg-amber-200 transition disabled:opacity-50 whitespace-nowrap"
                              title="Solo para demos: simula que el paquete llegó"
                            >
                              {busy ? '…' : '🧪 Recibido'}
                            </button>
                          )}
                          {canRefundThis && (
                            <button
                              disabled={busy}
                              onClick={() => void handleRefund(c.id)}
                              className="h-7 px-2.5 rounded-lg border border-terracotta-300 text-terracotta-700 text-[11.5px] font-medium hover:bg-terracotta-50 transition disabled:opacity-50 whitespace-nowrap"
                            >
                              {busy ? '…' : 'Reembolso'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!comprasLoading && filteredCompras.length === 0 && (
                  <tr><td colSpan={7} className="py-16 text-center text-ink/50 text-[14px]">
                    {compras.length === 0 ? 'Aún no has realizado ninguna compra.' : 'No hay compras con estos filtros.'}
                  </td></tr>
                )}
                {comprasLoading && <tr><td colSpan={7} className="py-16 text-center text-ink/50 text-[14px]">Cargando…</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
    </>
  );
}

function SearchBox({ q, setQ }: { q: string; setQ: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-white border border-ink/10 w-[260px]">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink/45">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
      </svg>
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar…"
        className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-ink/40" />
    </label>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 px-4 py-3 mb-4 text-[13px]">
      {msg}
    </div>
  );
}
