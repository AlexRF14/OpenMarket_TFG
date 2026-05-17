import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useOperacion, STATUS_META } from '../../state/ops';
import { useAuth } from '../../state/auth';
import { useCart } from '../../state/cart';
import { useChat } from '../../hooks/useChat';
import { useState, FormEvent, useCallback, useEffect, useRef } from 'react';
import type { AnyOperationType, OperacionDto, OperacionStatus } from '../../lib/api-types';
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

function ChatPanel({ op, currentUserId }: { op: OperacionDto; currentUserId: string }) {
  const chatId = op.chatRoomId;
  const { messages, sendMessage, loading } = useChat(chatId);
  const [draft, setDraft] = useState('');

  if (!chatId) {
    return (
      <div className="h-full grid place-items-center text-center px-6 text-ink/55 text-[13px]">
        Esta operación todavía no tiene un canal de chat asociado.
      </div>
    );
  }

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await sendMessage(draft.trim(), currentUserId);
    setDraft('');
  };

  return (
    <>
      <div className="flex-1 px-5 py-4 overflow-y-auto">
        {loading && <div className="text-center text-[12px] text-ink/45">Cargando mensajes…</div>}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} my-1.5`}>
              <div
                className={`max-w-[72%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                  mine ? 'bg-ink text-cream' : 'bg-white border border-ink/10'
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={onSend} className="border-t border-ink/[.08] p-4 bg-white rounded-b-2xl flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe un mensaje…"
          className="flex-1 h-10 px-3.5 rounded-xl bg-[#FAF7F1] border border-ink/10 text-[14px] outline-none focus:border-terracotta-500"
        />
        <button
          type="submit"
          className="h-10 px-4 rounded-xl bg-ink text-cream text-[13.5px] font-medium hover:bg-terracotta-600 transition"
        >
          Enviar
        </button>
      </form>
    </>
  );
}

export default function OperacionDetalle() {
  const { id } = useParams();
  const { profile } = useAuth();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { op, loading, error, changeStatus, reload } = useOperacion(id);
  const { addToCart, inCart, removeFromCart } = useCart();
  const [copied, setCopied] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const checkoutResult = searchParams.get('checkout');

  useEffect(() => { setQty(1); }, [id]);

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
  // pending = seller draft (not published); confirmed = published/available; shipped = sold out/delivered
  const canPublish = isParte && isSeller && op.status === 'pending';
  const canCancel = isParte && isSeller && ['pending', 'confirmed'].includes(op.status);
  const canComplete = isParte && op.status === 'shipped';
  const availableStock = op.stock ?? 1;
  const canBuy = !!profile && !isSeller && op.status === 'confirmed' && availableStock > 0 && !buying;

  return (
    <div className="max-w-[1180px] mx-auto px-8 py-8">
      {/* Draft notice for seller */}
      {isSeller && op.status === 'pending' && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-ink/5 border border-ink/15 text-ink/70 text-[13px] flex items-center gap-2">
          <span className="text-base">📝</span>
          <span>Esta operación es un borrador y aún no es visible para otros. Pulsa <strong>Publicar operación</strong> para hacerla pública.</span>
        </div>
      )}

      {/* Checkout result banners */}
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
            {op.categoria && <span className="capitalize">Categoría: <span className="text-ink/80">{op.categoria}</span></span>}
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
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      className="w-9 h-9 flex items-center justify-center text-ink/50 hover:bg-ink/5 disabled:opacity-30 transition text-lg"
                    >−</button>
                    <span className="w-10 text-center text-[14px] font-medium tabular-nums">{qty}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(availableStock, q + 1))}
                      disabled={qty >= availableStock}
                      className="w-9 h-9 flex items-center justify-center text-ink/50 hover:bg-ink/5 disabled:opacity-30 transition text-lg"
                    >+</button>
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
                  {buying
                    ? 'Redirigiendo…'
                    : `Comprar ${qty > 1 ? `${qty}×` : 'ahora'} — ${(parseFloat(op.totalAmount) * qty).toFixed(2)} ${op.currency}`}
                </button>
              </div>
              {buyError && <span className="text-[12px] text-terracotta-600">{buyError}</span>}
            </div>
          )}
          <div className="flex gap-2">
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
      {(op.images?.length ?? 0) > 0 && (
        <ImageGallery images={op.images!} />
      )}

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
                  <Row
                    k="Vendidas"
                    v={
                      <span className={soldUnits > 0 ? 'text-sage-700 font-medium' : ''}>
                        {soldUnits}
                      </span>
                    }
                  />
                  <Row
                    k="Stock restante"
                    v={
                      <span className={stockRemaining === 0 ? 'text-terracotta-600 font-medium' : 'font-medium'}>
                        {stockRemaining === 0 ? 'Agotado' : stockRemaining}
                      </span>
                    }
                  />
                  {soldUnits > 0 && (
                    <Row
                      k="Ingresos brutos"
                      v={`${(parseFloat(op.totalAmount) * soldUnits).toFixed(2)} ${op.currency}`}
                    />
                  )}
                </>
              ) : (
                <>
                  <Row k="Disponibles" v={String(stockRemaining)} />
                  {isParte && soldUnits > 0 && (
                    <Row
                      k="Compradas"
                      v={<span className="font-medium">{soldUnits}</span>}
                    />
                  )}
                </>
              )}
            </div>
          </div>

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
          <header className="h-14 px-5 flex items-center justify-between border-b border-ink/[.08]">
            <div className="font-medium text-[14px]">Chat de la operación</div>
            <span className="text-[11.5px] text-ink/50">
              {op.chatRoomId ? `Sala ${op.chatRoomId.slice(0, 6)}…` : 'Sin sala'}
            </span>
          </header>
          {profile && <ChatPanel op={op} currentUserId={profile.id} />}
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
