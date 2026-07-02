import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, CartItem } from '../../state/cart';
import { useAuth } from '../../state/auth';
import { initiateCheckout } from '../../lib/operaciones-api';
import { categoriaLabel, BUYER_FEE_CENTS } from '../../lib/api-types';
import type { DeliveryInfo } from '../../lib/api-types';
import { CheckoutModal } from '../../components/CheckoutModal';

const BUYER_FEE = BUYER_FEE_CENTS / 100;

export default function Carrito() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const { items, removeFromCart, updateQty } = useCart();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checkoutItem, setCheckoutItem] = useState<CartItem | null>(null);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected(selected.size === items.length ? new Set() : new Set(items.map((i) => i.operacionId)));

  const selectedItems = items.filter((i) => selected.has(i.operacionId));
  const selectedTotal = selectedItems.reduce((acc, i) => acc + parseFloat(i.totalAmount) * i.qty, 0);

  const payItem = (operacionId: string, qty: number) => {
    const item = items.find((i) => i.operacionId === operacionId);
    if (!item) return;
    setCheckoutItem({ ...item, qty });
  };

  // Opens the delivery-info modal for the first selected item. User returns to pay
  // the rest one by one — browsers block location assignment on opened tabs after await,
  // so a true multi-item checkout isn't reliable here.
  const paySelected = () => {
    if (selectedItems.length === 0) return;
    setCheckoutItem(selectedItems[0]);
  };

  const handleCheckoutConfirm = async (deliveryInfo: DeliveryInfo) => {
    if (!checkoutItem) return;
    const { checkoutUrl } = await initiateCheckout(checkoutItem.operacionId, checkoutItem.qty, deliveryInfo);
    // Do NOT remove from cart here — only remove on ?checkout=success return
    window.location.href = checkoutUrl;
  };

  return (
    <div className="px-8 py-8 max-w-[1000px] mx-auto">
      {checkoutItem && (
        <CheckoutModal
          op={checkoutItem}
          qty={checkoutItem.qty}
          profile={profile}
          onClose={() => setCheckoutItem(null)}
          onConfirm={handleCheckoutConfirm}
        />
      )}

      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-[32px] tracking-tight">Carrito</h1>
          <p className="text-ink/55 text-[13.5px] mt-0.5">{items.length} {items.length === 1 ? 'artículo' : 'artículos'}</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => nav('/app/explorador')}
            className="h-10 px-4 rounded-xl border border-ink/10 text-[13.5px] hover:border-ink/30 transition"
          >
            Seguir comprando
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white border border-ink/10 p-14 text-center">
          <div className="font-display text-[22px] mb-2">Tu carrito está vacío</div>
          <p className="text-[14px] text-ink/60 max-w-xs mx-auto">Explora el marketplace y añade productos o servicios que te interesen.</p>
          <button
            onClick={() => nav('/app/explorador')}
            className="mt-5 h-11 px-5 rounded-xl bg-ink text-cream text-[14px] font-medium hover:bg-terracotta-600 transition"
          >
            Explorar mercado
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all */}
          <div className="flex items-center gap-3 px-1 pb-1 border-b border-ink/[.06]">
            <input
              type="checkbox"
              checked={selected.size === items.length && items.length > 0}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-terracotta-500 cursor-pointer"
            />
            <span className="text-[13px] text-ink/55">
              {selected.size > 0 ? `${selected.size} seleccionado${selected.size > 1 ? 's' : ''}` : 'Seleccionar todo'}
            </span>
            {selected.size > 0 && (
              <button
                onClick={() => {
                  selected.forEach((id) => removeFromCart(id));
                  setSelected(new Set());
                }}
                className="ml-auto text-[12.5px] text-terracotta-600 hover:underline"
              >
                Eliminar seleccionados
              </button>
            )}
          </div>

          {/* Items */}
          {items.map((item) => (
            <div
              key={item.operacionId}
              className={`flex items-center gap-4 rounded-2xl bg-white border p-4 transition ${selected.has(item.operacionId) ? 'border-terracotta-400/50 bg-terracotta-50/30' : 'border-ink/10'}`}
            >
              <input
                type="checkbox"
                checked={selected.has(item.operacionId)}
                onChange={() => toggle(item.operacionId)}
                className="w-4 h-4 rounded accent-terracotta-500 cursor-pointer shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div
                  className="font-medium text-[14.5px] hover:text-terracotta-600 cursor-pointer truncate"
                  onClick={() => nav(`/app/operaciones/${item.operacionId}`)}
                >
                  {item.titulo}
                </div>
                {item.categoria && (
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-ink/[.04] text-[11.5px] text-ink/60 font-medium">
                    {categoriaLabel(item.categoria)}
                  </span>
                )}
              </div>

              {/* Qty stepper */}
              <div className="flex items-center border border-ink/15 rounded-lg overflow-hidden h-9 shrink-0">
                <button
                  onClick={() => updateQty(item.operacionId, item.qty - 1)}
                  disabled={item.qty <= 1}
                  className="w-9 h-9 flex items-center justify-center text-ink/50 hover:bg-ink/5 disabled:opacity-30 transition text-lg"
                >−</button>
                <span className="w-9 text-center text-[14px] font-medium tabular-nums">{item.qty}</span>
                <button
                  onClick={() => updateQty(item.operacionId, item.qty + 1)}
                  disabled={item.qty >= item.stock}
                  className="w-9 h-9 flex items-center justify-center text-ink/50 hover:bg-ink/5 disabled:opacity-30 transition text-lg"
                >+</button>
              </div>

              {/* Price */}
              <div className="text-right shrink-0 w-24">
                <div className="font-display text-[17px]">
                  {(parseFloat(item.totalAmount) * item.qty).toFixed(2)}
                </div>
                <div className="text-[11.5px] text-ink/45">{item.currency}{item.qty > 1 ? ` · ${item.qty}×${parseFloat(item.totalAmount).toFixed(2)}` : ''}</div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => payItem(item.operacionId, item.qty)}
                  className="h-9 px-4 rounded-lg bg-terracotta-500 text-cream text-[13px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60 whitespace-nowrap"
                >
                  Comprar
                </button>
                <button
                  onClick={() => { removeFromCart(item.operacionId); setSelected((s) => { const n = new Set(s); n.delete(item.operacionId); return n; }); }}
                  className="h-7 px-3 rounded-lg text-[12px] text-ink/45 hover:text-terracotta-600 hover:bg-terracotta-50 transition"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          {/* Summary footer */}
          {selected.size > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-white border border-ink/10 flex items-center justify-between gap-4">
              <div>
                <div className="text-[13.5px] text-ink/60">
                  {selectedItems.length} artículo{selectedItems.length > 1 ? 's' : ''} seleccionado{selectedItems.length > 1 ? 's' : ''}
                </div>
                <div className="text-[11.5px] text-ink/40 mt-0.5">
                  {selectedItems.length > 1 ? `Se procesará primero "${selectedItems[0].titulo}"` : 'Datos de entrega y pago'}
                  {' · +'}{BUYER_FEE.toFixed(2)} {selectedItems[0]?.currency ?? 'EUR'} gastos de gestión
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[11.5px] text-ink/45">Total estimado</div>
                  <div className="font-display text-[20px]">{(selectedTotal + BUYER_FEE).toFixed(2)} {selectedItems[0]?.currency ?? 'EUR'}</div>
                </div>
                <button
                  onClick={paySelected}
                  className="h-11 px-5 rounded-xl bg-terracotta-500 text-cream text-[14px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60 whitespace-nowrap"
                >
                  {selectedItems.length > 1 ? `Pagar primero (1/${selectedItems.length})` : 'Comprar ahora'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
