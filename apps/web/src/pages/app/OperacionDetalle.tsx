import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useOperacion, getStatusDisplay } from '../../state/ops';
import { useAuth } from '../../state/auth';
import { useCart } from '../../state/cart';
import { getValoraciones, createValoracion } from '../../lib/valoraciones-api';
import { useState, FormEvent, useCallback, useEffect, useRef } from 'react';
import type { AnyOperationType, CompraDto, DeliveryInfo, OperacionDto, ValoracionDto } from '../../lib/api-types';
import { categoriaLabel } from '../../lib/api-types';
import { initiateCheckout } from '../../lib/operaciones-api';
import { getComprasByOperacion, getMisCompras, marcarRecibida, refundCompra, acceptRefund, rejectRefund } from '../../lib/compras-api';
import { ApiException } from '../../lib/api-client';
import { CheckoutModal } from '../../components/CheckoutModal';

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
      className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11.5px] font-medium"
      style={{ background: m.bg, color: m.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'text-amber-400' : 'text-ink/15'}>★</span>
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="text-2xl leading-none transition"
          style={{ color: n <= (hover || value) ? '#F59E0B' : '#e5e7eb' }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-10 h-6 rounded-full border transition-colors shrink-0 disabled:opacity-40 ${
        checked ? 'bg-terracotta-500 border-terracotta-500' : 'bg-white border-ink/30'
      }`}
    >
      <span className={`absolute top-[3px] w-4 h-4 rounded-full shadow-sm transition-all ${
        checked ? 'left-[18px] bg-white' : 'left-[3px] bg-ink/40'
      }`} />
    </button>
  );
}

function ValoracionesPanel({ opId, currentUserId, canRate }: {
  opId: string;
  currentUserId: string;
  canRate: boolean;
}) {
  const [valoraciones, setValoraciones] = useState<ValoracionDto[]>([]);
  const [loadingV, setLoadingV] = useState(true);
  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getValoraciones(opId)
      .then(setValoraciones)
      .catch(() => {})
      .finally(() => setLoadingV(false));
  }, [opId]);

  const myValoracion = valoraciones.find((v) => v.autorId === currentUserId);
  const canSubmit = canRate && !myValoracion;

  const avg = valoraciones.length > 0
    ? (valoraciones.reduce((s, v) => s + v.puntuacion, 0) / valoraciones.length).toFixed(1)
    : null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const v = await createValoracion(opId, { puntuacion, comentario: comentario.trim() || undefined });
      setValoraciones((prev) => [v, ...prev]);
      setComentario('');
    } catch (err) {
      setSubmitError(err instanceof ApiException ? err.message : 'Error enviando la valoración');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="h-14 px-5 flex items-center justify-between border-b border-ink/[.08] shrink-0">
        <div className="font-medium text-[14px]">Valoraciones</div>
        {avg && (
          <div className="flex items-center gap-1.5 text-[13px]">
            <Stars value={Math.round(parseFloat(avg))} />
            <span className="text-ink/55">{avg} ({valoraciones.length})</span>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {loadingV && <div className="text-center text-[12px] text-ink/45">Cargando…</div>}

        {!loadingV && valoraciones.length === 0 && !canSubmit && (
          <div className="h-full flex items-center justify-center text-center text-ink/45 text-[13px]">
            Sin valoraciones todavía.
          </div>
        )}

        {valoraciones.map((v) => (
          <div key={v.id} className="rounded-xl bg-white border border-ink/10 p-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Stars value={v.puntuacion} />
                <span className="text-[13px] font-medium">{v.autorNombre}</span>
                {v.autorId === currentUserId && (
                  <span className="text-[11px] text-ink/40 bg-ink/[.05] px-1.5 py-0.5 rounded-md">Tu valoración</span>
                )}
              </div>
              <span className="text-[11.5px] text-ink/40">
                {new Date(v.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            {v.comentario && (
              <p className="text-[13.5px] text-ink/75 leading-relaxed">{v.comentario}</p>
            )}
          </div>
        ))}
      </div>

      {canSubmit && (
        <form onSubmit={onSubmit} className="border-t border-ink/[.08] p-4 bg-white rounded-b-2xl space-y-3">
          <div className="text-[13px] font-medium text-ink/80">Tu valoración</div>
          <StarPicker value={puntuacion} onChange={setPuntuacion} />
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            placeholder="Cuéntanos tu experiencia (opcional)…"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F1] border border-ink/10 text-[13.5px] outline-none focus:border-terracotta-500 transition resize-none"
          />
          {submitError && <div className="text-[12px] text-terracotta-600">{submitError}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="h-9 px-4 rounded-xl bg-ink text-cream text-[13px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60"
          >
            {submitting ? 'Enviando…' : 'Enviar valoración'}
          </button>
        </form>
      )}

      {canRate && myValoracion && (
        <div className="border-t border-ink/[.08] px-5 py-3 text-[12.5px] text-ink/50 bg-white rounded-b-2xl">
          Ya has valorado esta operación.
        </div>
      )}
    </>
  );
}

export default function OperacionDetalle() {
  const { id } = useParams();
  const { profile } = useAuth();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { op, loading, error, changeStatus, reload, updateOp, updateSettings } = useOperacion(id);
  const { addToCart, inCart, removeFromCart } = useCart();
  const [copied, setCopied] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [sellerCompras, setSellerCompras] = useState<CompraDto[]>([]);
  const [buyerCompra, setBuyerCompra] = useState<CompraDto | null>(null);
  const [compraActionBusy, setCompraActionBusy] = useState(false);
  const [compraError, setCompraError] = useState<string | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundActionId, setRefundActionId] = useState<string | null>(null);

  // Inline stock edit
  const [stockInput, setStockInput] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const checkoutResult = searchParams.get('checkout');

  useEffect(() => { setQty(1); }, [id]);
  useEffect(() => { if (op) setStockInput(String(op.stock)); }, [op]);

  // Load compras: seller sees all; buyer sees their own
  useEffect(() => {
    if (!id || !op || !profile) return;
    if (op.idVendedor === profile.id) {
      getComprasByOperacion(id).then(setSellerCompras).catch(() => {});
    } else {
      getMisCompras(id).then((list) => setBuyerCompra(list[0] ?? null)).catch(() => {});
    }
  }, [id, op, profile]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleCheckoutConfirm = useCallback(async (deliveryInfo: DeliveryInfo) => {
    if (!id) return;
    setBuying(true);
    setBuyError(null);
    const { checkoutUrl } = await initiateCheckout(id, qty, deliveryInfo);
    window.location.href = checkoutUrl;
  }, [id, qty]);

  const handleMarcarRecibida = useCallback(async () => {
    if (!buyerCompra) return;
    setCompraActionBusy(true);
    setCompraError(null);
    try {
      const updated = await marcarRecibida(buyerCompra.id);
      setBuyerCompra(updated);
    } catch (err) {
      setCompraError(err instanceof ApiException ? err.message : 'Error');
    } finally {
      setCompraActionBusy(false);
    }
  }, [buyerCompra]);

  const handleRefundCompra = useCallback(async () => {
    if (!buyerCompra || !op) return;
    const b2c = !!op.sellerCompanyId && !op.buyerCompanyId && profile?.rol === 'cliente';
    if (b2c) {
      setCompraActionBusy(true);
      setCompraError(null);
      try {
        await refundCompra(buyerCompra.id);
        const list = await getMisCompras(id);
        setBuyerCompra(list[0] ?? null);
      } catch (err) {
        setCompraError(err instanceof ApiException ? err.message : 'Error solicitando reembolso');
      } finally {
        setCompraActionBusy(false);
      }
    } else {
      setRefundReason('');
      setCompraError(null);
      setShowRefundModal(true);
    }
  }, [buyerCompra, op, profile, id]);

  const handleSubmitRefund = useCallback(async () => {
    if (!buyerCompra || !refundReason.trim()) return;
    setCompraActionBusy(true);
    setCompraError(null);
    try {
      await refundCompra(buyerCompra.id, refundReason.trim());
      setShowRefundModal(false);
      const list = await getMisCompras(id);
      setBuyerCompra(list[0] ?? null);
    } catch (err) {
      setCompraError(err instanceof ApiException ? err.message : 'Error solicitando reembolso');
    } finally {
      setCompraActionBusy(false);
    }
  }, [buyerCompra, refundReason, id]);

  const handleAcceptRefund = useCallback(async (compraId: string) => {
    setRefundActionId(compraId);
    try {
      await acceptRefund(compraId);
      if (id) getComprasByOperacion(id).then(setSellerCompras).catch(() => {});
    } catch (err) {
      setCompraError(err instanceof ApiException ? err.message : 'Error aceptando reembolso');
    } finally {
      setRefundActionId(null);
    }
  }, [id]);

  const handleRejectRefund = useCallback(async (compraId: string) => {
    setRefundActionId(compraId);
    try {
      await rejectRefund(compraId);
      if (id) getComprasByOperacion(id).then(setSellerCompras).catch(() => {});
    } catch (err) {
      setCompraError(err instanceof ApiException ? err.message : 'Error rechazando reembolso');
    } finally {
      setRefundActionId(null);
    }
  }, [id]);

  const saveStock = async () => {
    const s = parseInt(stockInput, 10);
    if (isNaN(s) || s < 0) { setStockError('Stock inválido'); return; }
    setStockSaving(true);
    setStockError(null);
    try {
      await updateOp?.({ stock: s });
    } catch {
      setStockError('Error guardando stock');
    } finally {
      setStockSaving(false);
    }
  };

  const toggleSetting = async (key: 'activa' | 'mostrarSinStock', val: boolean) => {
    setSettingsSaving(true);
    try {
      await updateSettings?.({ [key]: val });
    } finally {
      setSettingsSaving(false);
    }
  };

  void nav;

  if (loading) {
    return <div className="max-w-xl mx-auto px-8 py-16 text-center text-ink/50">Cargando…</div>;
  }

  if (error || !op) {
    return (
      <div className="max-w-xl mx-auto px-8 py-16 text-center">
        <div className="font-display text-2xl">Operación no encontrada</div>
        <p className="text-ink/55 mt-2">{error ?? 'La operación que buscas no existe o no eres parte de ella.'}</p>
        <Link to="/app/operaciones" className="inline-block mt-6 h-10 px-4 rounded-xl bg-ink text-cream font-medium text-[13.5px] leading-[40px]">
          Volver a Operaciones
        </Link>
      </div>
    );
  }

  const isParte = !!profile && (op.idComprador === profile.id || op.idVendedor === profile.id);
  const isSeller = profile?.id === op.idVendedor;
  const opSide = isSeller ? 'vendiendo' : 'comprando';
  const canPublish = isParte && isSeller && op.status === 'pending';
  const canEdit = isParte && isSeller && op.status === 'pending';
  const canEditStock = isParte && isSeller && ['confirmed', 'shipped'].includes(op.status);
  const canManageSettings = isParte && isSeller && !['cancelled', 'refunded'].includes(op.status);
  const canCancel = isParte && isSeller && ['pending', 'confirmed'].includes(op.status);
  const canComplete = isSeller && op.status === 'shipped';
  const deliveryDateStr = op.deliveryInfo?.deliveryDate ?? null;
  const deliveryDatePassed = !deliveryDateStr || new Date(deliveryDateStr) <= new Date();
  const availableStock = op.stock ?? 1;
  const canBuy = !!profile && !isSeller && op.status === 'confirmed' && availableStock > 0 && !buying;

  // Buyer compra-based flags
  const buyerDeliveryDate = buyerCompra?.deliveryInfo?.deliveryDate ?? null;
  const buyerDeliveryPassed = !buyerDeliveryDate || new Date(buyerDeliveryDate) <= new Date();
  const buyerIsEnviando = !!buyerCompra && buyerCompra.status === 'activo' && !buyerCompra.receivedAt && !buyerDeliveryPassed;
  const buyerIsAdquirido = !!buyerCompra && buyerCompra.status === 'activo' && (!!buyerCompra.receivedAt || buyerDeliveryPassed);
  const canRate = !!profile && buyerIsAdquirido;
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  const isB2C = !!op.sellerCompanyId && !op.buyerCompanyId && profile?.rol === 'cliente';
  const canRefund = !!buyerCompra
    && buyerCompra.status === 'activo'
    && !!buyerCompra.stripePaymentIntentId
    && !!buyerCompra.purchasedAt
    && (Date.now() - new Date(buyerCompra.purchasedAt).getTime()) < FOURTEEN_DAYS_MS;

  return (
    <>
    {showCheckoutModal && (
      <CheckoutModal
        op={op}
        qty={qty}
        profile={profile}
        onClose={() => setShowCheckoutModal(false)}
        onConfirm={handleCheckoutConfirm}
      />
    )}
    {showRefundModal && (
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
          {compraError && <div className="text-[12px] text-terracotta-600">{compraError}</div>}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowRefundModal(false)}
              disabled={compraActionBusy}
              className="h-10 px-4 rounded-xl bg-white border border-ink/15 text-[13.5px] font-medium hover:border-ink/30 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitRefund}
              disabled={compraActionBusy || !refundReason.trim()}
              className="h-10 px-4 rounded-xl bg-terracotta-500 text-cream text-[13.5px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60"
            >
              {compraActionBusy ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="max-w-[1180px] mx-auto px-8 py-8">
      {/* Draft notice */}
      {isSeller && op.status === 'pending' && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-ink/5 border border-ink/15 text-ink/70 text-[13px] flex items-center gap-2">
          <span className="text-base">📝</span>
          <span>Esta operación es un borrador y aún no es visible para otros. Pulsa <strong>Publicar operación</strong> para hacerla pública.</span>
        </div>
      )}

      {/* Paused notice */}
      {isSeller && op.status === 'confirmed' && !op.activa && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] flex items-center gap-2">
          <span className="text-base">⏸</span>
          <span>Esta operación está <strong>pausada</strong> y no aparece en el explorador. Actívala para que sea visible.</span>
        </div>
      )}

      {/* Checkout banners */}
      {checkoutResult === 'success' && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-sage-50 border border-sage-200 text-sage-800 text-[13px] flex items-center justify-between">
          <span>✓ Pago completado. La operación está en curso.</span>
          <button
            onClick={() => {
              if (id) removeFromCart(id);
              void reload();
              setSearchParams({}, { replace: true });
            }}
            className="text-sage-600 font-medium hover:underline text-[12.5px]"
          >
            Actualizar
          </button>
        </div>
      )}
      {checkoutResult === 'cancelled' && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] flex items-center justify-between">
          <span>Pago cancelado. La operación sigue disponible.</span>
          <button onClick={() => setSearchParams({}, { replace: true })} className="text-amber-700 font-medium hover:underline text-[12.5px]">Cerrar</button>
        </div>
      )}

      <div className="text-[13px] text-ink/55 mb-4 flex items-center gap-2">
        <Link to="/app/operaciones" className="hover:text-ink">Operaciones</Link>
        <span>›</span>
        <span className="text-ink/80 font-mono">{op.id.slice(0, 8)}…</span>
      </div>

      <div className="flex items-start justify-between gap-6 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-[32px] leading-tight tracking-tight truncate">
              {op.titulo ?? op.notes ?? 'Operación'}
            </h1>
            <StatusPill op={op} userId={profile?.id} />
          </div>
          <div className="mt-2 text-[14px] text-ink/65 flex flex-wrap gap-x-5 gap-y-1">
            {op.categoria && <span>Categoría: <span className="text-ink/80">{categoriaLabel(op.categoria)}</span></span>}
            <span>Visibilidad: <span className="text-ink/80">{typeLabel(op.operationType)}</span></span>
            <span className="capitalize">Posición: <span className="text-ink/80">{opSide}</span></span>
            <span>Creada: <span className="text-ink/80">{new Date(op.createdAt).toLocaleString('es')}</span></span>
            {!isSeller && (
              <span>
                Vendedor:{' '}
                <Link to={`/app/perfil/${op.idVendedor}`} className="text-terracotta-600 hover:underline font-medium">
                  Ver perfil →
                </Link>
              </span>
            )}
          </div>

          {op.operationType === 'negociada' && (
            <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800">
              <span className="flex-1">Operación privada. Comparte el enlace para invitar a la otra parte.</span>
              <button
                onClick={copyLink}
                className="shrink-0 h-8 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 font-medium transition text-[12.5px]"
              >
                {copied ? '✓ Copiado' : 'Copiar enlace'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {canBuy && (
            <div className="flex flex-col items-end gap-2">
              {availableStock > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] text-ink/55">Cantidad:</span>
                  <div className="flex items-center border border-ink/15 rounded-lg overflow-hidden h-9">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="w-9 h-9 flex items-center justify-center text-ink/50 hover:bg-ink/5 disabled:opacity-30 transition text-lg">−</button>
                    <span className="w-10 text-center text-[14px] font-medium tabular-nums">{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(availableStock, q + 1))} disabled={qty >= availableStock} className="w-9 h-9 flex items-center justify-center text-ink/50 hover:bg-ink/5 disabled:opacity-30 transition text-lg">+</button>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (inCart(op.id)) removeFromCart(op.id);
                    else addToCart({ operacionId: op.id, titulo: op.titulo ?? 'Oferta', totalAmount: op.totalAmount, currency: op.currency, categoria: op.categoria, stock: availableStock }, qty);
                  }}
                  className={`h-11 px-4 rounded-xl border text-[13.5px] font-medium transition ${inCart(op.id) ? 'bg-terracotta-50 border-terracotta-400 text-terracotta-700' : 'bg-white border-ink/15 hover:border-ink/30'}`}
                >
                  {inCart(op.id) ? '✓ En carrito' : 'Añadir al carrito'}
                </button>
                <button
                  onClick={() => setShowCheckoutModal(true)}
                  disabled={buying}
                  className="h-11 px-6 rounded-xl bg-terracotta-500 text-cream text-[14px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60 shadow-sm"
                >
                  {buying ? 'Redirigiendo…' : `Comprar ${qty > 1 ? `${qty}×` : 'ahora'} — ${(parseFloat(op.totalAmount) * qty).toFixed(2)} ${op.currency}`}
                </button>
              </div>
              {buyError && <span className="text-[12px] text-terracotta-600">{buyError}</span>}
            </div>
          )}

          <div className="flex gap-2 flex-wrap justify-end">
            {canEdit && (
              <button
                onClick={() => nav(`/app/operaciones/${id}/editar`)}
                className="h-10 px-4 rounded-xl bg-white border border-ink/10 hover:border-ink/30 text-[13.5px] font-medium transition"
              >
                Editar oferta
              </button>
            )}
            {canPublish && (
              <button
                onClick={() => changeStatus('confirmed')}
                className="h-10 px-4 rounded-xl bg-sage-600 text-cream text-[13.5px] font-medium hover:opacity-90 transition"
              >
                Publicar operación
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => changeStatus('cancelled')}
                className="h-10 px-4 rounded-xl bg-white border border-ink/10 text-[13.5px] font-medium hover:border-ink/30 transition"
              >
                Cancelar
              </button>
            )}
            {canComplete && (
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => changeStatus('completed')}
                  disabled={!deliveryDatePassed}
                  title={!deliveryDatePassed ? `Fecha de entrega: ${deliveryDateStr}` : undefined}
                  className="h-10 px-4 rounded-xl bg-ink text-cream text-[13.5px] font-medium hover:bg-terracotta-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Marcar completada
                </button>
                {!deliveryDatePassed && (
                  <span className="text-[11.5px] text-ink/50">Entrega prevista: {deliveryDateStr}</span>
                )}
              </div>
            )}
            {buyerIsEnviando && (
              <button
                onClick={handleMarcarRecibida}
                disabled={compraActionBusy}
                className="h-10 px-4 rounded-xl bg-amber-500 text-white text-[13.5px] font-medium hover:bg-amber-600 transition disabled:opacity-60"
                title="Solo para demos: simula que el paquete llegó"
              >
                {compraActionBusy ? '…' : '🧪 Test: Marcar recibido'}
              </button>
            )}
            {canRefund && (
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={handleRefundCompra}
                  className="h-10 px-4 rounded-xl bg-white border border-terracotta-400 text-terracotta-700 text-[13.5px] font-medium hover:bg-terracotta-50 transition"
                >
                  Solicitar reembolso
                </button>
              </div>
            )}
            {buyerCompra?.status === 'solicitud_reembolso' && (
              <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px]">
                Solicitud enviada — pendiente de revisión por el vendedor.
              </div>
            )}
            {buyerCompra?.status === 'reembolso_en_revision' && (
              <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[13px]">
                Reembolso en revisión — nuestro equipo lo gestionará pronto.
              </div>
            )}
            {buyerCompra?.status === 'reembolsada' && (
              <div className="px-3 py-2 rounded-xl bg-sage-100 border border-sage-400 text-sage-700 text-[13px] font-medium">
                ✓ Reembolso completado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {op.notes && (
        <div className="mb-5 rounded-2xl bg-white border border-ink/10 px-5 py-4">
          <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-2">Descripción</div>
          <p className="text-[14px] text-ink/80 leading-relaxed whitespace-pre-wrap">{op.notes}</p>
        </div>
      )}

      {/* Image gallery */}
      {(op.images?.length ?? 0) > 0 && <ImageGallery images={op.images!} />}

      {(() => {
        const totalQuantity = op.cantidad ?? 1;
        const stockRemaining = op.stock ?? 0;
        const soldUnits = Math.max(0, totalQuantity - stockRemaining);

        return (
          <div className="grid grid-cols-[360px_1fr] gap-5">
            <aside className="space-y-4">
              <div className="rounded-2xl bg-white border border-ink/10 p-5">
                <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-3">Resumen económico</div>
                <div className="space-y-2.5">
                  <Row k="Precio/unidad" v={`${op.totalAmount} ${op.currency}`} />
                  <Row k="Base imponible" v={`${op.amountNet} ${op.currency}`} />
                  <Row k="IVA (21%)" v={`${op.taxAmount} ${op.currency}`} />
                  <Row k="Comisión plataforma (5%)" v={`${op.platformFee} ${op.currency}`} />
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-ink/10 p-5">
                <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-3">
                  {isSeller ? 'Inventario' : 'Unidades'}
                </div>
                <div className="space-y-2.5">
                  {isSeller ? (
                    <>
                      <Row k="Stock inicial" v={String(totalQuantity)} />
                      <Row k="Vendidas" v={<span className={soldUnits > 0 ? 'text-sage-700 font-medium' : ''}>{soldUnits}</span>} />
                      <Row k="Stock restante" v={<span className={stockRemaining === 0 ? 'text-terracotta-600 font-medium' : 'font-medium'}>{stockRemaining === 0 ? 'Agotado' : stockRemaining}</span>} />
                      {soldUnits > 0 && <Row k="Ingresos brutos" v={`${(parseFloat(op.totalAmount) * soldUnits).toFixed(2)} ${op.currency}`} />}
                    </>
                  ) : (
                    <>
                      <Row k="Disponibles" v={String(stockRemaining)} />
                      {isParte && soldUnits > 0 && (
                        <>
                          <Row k="Compradas" v={<span className="font-medium">{soldUnits}</span>} />
                          <Row k="Total pagado" v={<span className="font-medium">{(parseFloat(op.totalAmount) * soldUnits).toFixed(2)} {op.currency}</span>} />
                          {op.deliveryInfo?.deliveryDate && (
                            <Row k="Entrega solicitada" v={<span className={new Date(op.deliveryInfo.deliveryDate) > new Date() ? 'text-amber-600 font-medium' : 'text-sage-700 font-medium'}>{op.deliveryInfo.deliveryDate}</span>} />
                          )}
                          {op.deliveryInfo?.address && (
                            <Row k="Dirección" v={<span className="text-[12px]">{op.deliveryInfo.address}, {op.deliveryInfo.postalCode} {op.deliveryInfo.city}</span>} />
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Inline stock edit — confirmed seller only */}
                {canEditStock && (
                  <div className="mt-4 pt-4 border-t border-ink/[.08]">
                    <div className="text-[12px] text-ink/55 mb-1.5">Ajustar stock disponible</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        value={stockInput}
                        onChange={(e) => setStockInput(e.target.value)}
                        className="w-20 h-9 px-2.5 rounded-lg border border-ink/15 text-[13.5px] text-center outline-none focus:border-terracotta-500 transition"
                      />
                      <button
                        onClick={saveStock}
                        disabled={stockSaving || stockInput === String(op.stock)}
                        className="h-9 px-3 rounded-lg bg-ink text-cream text-[12.5px] font-medium hover:bg-terracotta-600 transition disabled:opacity-50"
                      >
                        {stockSaving ? '…' : 'Guardar'}
                      </button>
                    </div>
                    {stockError && <div className="mt-1 text-[11.5px] text-terracotta-600">{stockError}</div>}
                  </div>
                )}
              </div>

              {/* Visibility settings — seller only */}
              {canManageSettings && (
                <div className="rounded-2xl bg-white border border-ink/10 p-5">
                  <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-3">Visibilidad</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13.5px] font-medium">Activa</div>
                        <div className="text-[12px] text-ink/50">Aparece en el explorador</div>
                      </div>
                      <Toggle
                        checked={op.activa}
                        onChange={(v) => void toggleSetting('activa', v)}
                        disabled={settingsSaving}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13.5px] font-medium">Mostrar sin stock</div>
                        <div className="text-[12px] text-ink/50">Visible aunque esté agotada</div>
                      </div>
                      <Toggle
                        checked={op.mostrarSinStock}
                        onChange={(v) => void toggleSetting('mostrarSinStock', v)}
                        disabled={settingsSaving}
                      />
                    </div>
                  </div>
                </div>
              )}

              {op.stripeCheckoutSessionId && (
                <div className="rounded-2xl bg-white border border-ink/10 p-5">
                  <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-3">Pago</div>
                  <div className="space-y-2.5">
                    <Row k="Sesión Stripe" v={<span className="font-mono text-[11px] break-all">{op.stripeCheckoutSessionId.slice(0, 24)}…</span>} />
                    {op.stripePaymentStatus && <Row k="Estado" v={op.stripePaymentStatus} />}
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-terracotta-50 border border-terracotta-200 p-4 text-[13px] text-terracotta-700 leading-relaxed">
                <div className="font-medium mb-1">Pago protegido</div>
                Los pagos se procesan a través de Stripe. Los fondos se transfieren al vendedor tras completar la transacción.
              </div>

              {/* Seller: list of all purchases (tickets) */}
              {isSeller && sellerCompras.length > 0 && (
                <div className="rounded-2xl bg-white border border-ink/10 p-5">
                  <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-3">
                    Compras recibidas ({sellerCompras.length})
                  </div>
                  <div className="space-y-3">
                    {sellerCompras.map((c) => {
                      const delivDate = c.deliveryInfo?.deliveryDate;
                      const isAdq = !!c.receivedAt || !delivDate || new Date(delivDate) <= new Date();
                      const statusLabel =
                        c.status === 'reembolsada' ? 'Reembolsada' :
                        c.status === 'solicitud_reembolso' ? 'Solicitud reembolso' :
                        c.status === 'reembolso_en_revision' ? 'En revisión' :
                        isAdq ? 'Adquirido' : 'Enviando';
                      const statusColor =
                        c.status === 'reembolsada' ? '#4A3F32' :
                        c.status === 'solicitud_reembolso' ? '#92400E' :
                        c.status === 'reembolso_en_revision' ? '#1E4A72' :
                        isAdq ? '#2F4D2F' : '#1E4A72';
                      const statusBg =
                        c.status === 'reembolsada' ? '#F3EEE4' :
                        c.status === 'solicitud_reembolso' ? '#FEF3C7' :
                        c.status === 'reembolso_en_revision' ? '#EFF6FF' :
                        isAdq ? '#E4EAE1' : '#E3EFF8';
                      const isBusy = refundActionId === c.id;
                      return (
                        <div key={c.id} className="rounded-xl border border-ink/[.08] p-3 text-[12.5px] space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{c.deliveryInfo?.fullName ?? 'Comprador'}</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: statusBg, color: statusColor }}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="text-ink/55 space-y-0.5">
                            <div>{c.quantity} ud. · {c.totalPagado} {c.currency}</div>
                            {delivDate && <div>Entrega: <span className={new Date(delivDate) > new Date() ? 'text-amber-600' : 'text-sage-700'}>{delivDate}</span></div>}
                            {c.deliveryInfo?.address && <div className="truncate">{c.deliveryInfo.address}, {c.deliveryInfo.postalCode} {c.deliveryInfo.city}</div>}
                            {c.deliveryInfo?.phone && <div>{c.deliveryInfo.phone}</div>}
                          </div>
                          {c.status === 'solicitud_reembolso' && (
                            <div className="pt-1 space-y-1.5">
                              {c.refundReason && (
                                <div className="text-[12px] text-ink/60 bg-amber-50 rounded-lg px-2.5 py-1.5 italic">
                                  "{c.refundReason}"
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => void handleAcceptRefund(c.id)}
                                  disabled={isBusy}
                                  className="flex-1 h-8 rounded-lg bg-sage-600 text-cream text-[12px] font-medium hover:opacity-90 transition disabled:opacity-60"
                                >
                                  {isBusy ? '…' : 'Aceptar'}
                                </button>
                                <button
                                  onClick={() => void handleRejectRefund(c.id)}
                                  disabled={isBusy}
                                  className="flex-1 h-8 rounded-lg bg-white border border-terracotta-400 text-terracotta-700 text-[12px] font-medium hover:bg-terracotta-50 transition disabled:opacity-60"
                                >
                                  {isBusy ? '…' : 'Rechazar'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </aside>

            <section className="rounded-2xl bg-[#FAF7F1] border border-ink/10 flex flex-col" style={{ minHeight: 560 }}>
              {profile && (
                <ValoracionesPanel
                  opId={op.id}
                  currentUserId={profile.id}
                  canRate={canRate}
                />
              )}
            </section>
          </div>
        );
      })()}
    </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13.5px]">
      <span className="text-ink/55">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

function ImageGallery({ images }: { images: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 mb-5 snap-x scroll-smooth"
        style={{ scrollbarWidth: 'thin' }}
      >
        {images.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={`Imagen ${i + 1}`}
            onClick={() => setLightbox(url)}
            className="h-52 w-52 flex-shrink-0 object-cover rounded-2xl cursor-pointer hover:opacity-90 transition snap-start border border-ink/[.08]"
          />
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/35 transition text-xl grid place-items-center"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
