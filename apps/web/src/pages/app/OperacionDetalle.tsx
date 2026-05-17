import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useOperacion, STATUS_META } from '../../state/ops';
import { useAuth } from '../../state/auth';
import { useCart } from '../../state/cart';
import { getValoraciones, createValoracion } from '../../lib/valoraciones-api';
import { useState, FormEvent, useCallback, useEffect, useRef } from 'react';
import type { AnyOperationType, OperacionDto, OperacionStatus, ValoracionDto } from '../../lib/api-types';
import { categoriaLabel } from '../../lib/api-types';
import { initiateCheckout } from '../../lib/operaciones-api';
import { ApiException } from '../../lib/api-client';

function typeLabel(t: AnyOperationType): string {
  if (t === 'publica') return 'Pública';
  if (t === 'negociada') return 'Negociada';
  if (t === 'public_b2c') return 'Pública B2C';
  if (t === 'public_b2b') return 'Pública B2B';
  if (t === 'negotiated') return 'Negociada';
  return t;
}

function StatusPill({ s }: { s: OperacionStatus }) {
  const m = STATUS_META[s];
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

  // Inline stock edit
  const [stockInput, setStockInput] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const checkoutResult = searchParams.get('checkout');

  useEffect(() => { setQty(1); }, [id]);
  useEffect(() => { if (op) setStockInput(String(op.stock)); }, [op]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const buy = useCallback(async () => {
    if (!id) return;
    setBuying(true);
    setBuyError(null);
    try {
      const { checkoutUrl } = await initiateCheckout(id, qty);
      window.location.href = checkoutUrl;
    } catch (err) {
      setBuyError(err instanceof ApiException ? err.message : 'Error iniciando el pago');
      setBuying(false);
    }
  }, [id, qty]);

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
  const canComplete = isParte && op.status === 'shipped';
  const availableStock = op.stock ?? 1;
  const canBuy = !!profile && !isSeller && op.status === 'confirmed' && availableStock > 0 && !buying;
  const canRate = !!profile && op.idComprador === profile.id && !['pending', 'cancelled', 'refunded'].includes(op.status);

  return (
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
            <StatusPill s={op.status} />
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
                  onClick={buy}
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
              <button
                onClick={() => changeStatus('completed')}
                className="h-10 px-4 rounded-xl bg-ink text-cream text-[13.5px] font-medium hover:bg-terracotta-600 transition"
              >
                Marcar completada
              </button>
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
                      {isParte && soldUnits > 0 && <Row k="Compradas" v={<span className="font-medium">{soldUnits}</span>} />}
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
