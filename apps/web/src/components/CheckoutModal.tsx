import { FormEvent, useState } from 'react';
import type { DeliveryInfo, OperacionDto, ProfileResponse } from '../lib/api-types';

interface Props {
  op: OperacionDto;
  qty: number;
  profile: ProfileResponse | null;
  onClose: () => void;
  onConfirm: (info: DeliveryInfo) => Promise<void>;
}

const today = new Date().toISOString().split('T')[0];

/** Modal de datos de entrega antes de redirigir a Stripe. */
export function CheckoutModal({ op, qty, profile, onClose, onConfirm }: Props) {
  const [form, setForm] = useState<Partial<DeliveryInfo>>({
    fullName: profile ? `${profile.nombre} ${profile.apellidos}`.trim() : '',
    email: profile?.correo ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof DeliveryInfo, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(form.postalCode ?? '')) {
      setError('Código postal inválido (5 dígitos)');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(form as DeliveryInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error iniciando el pago');
      setSubmitting(false);
    }
  };

  const total = (parseFloat(op.totalAmount) * qty).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/[.07]">
          <div>
            <div className="font-display text-[18px]">Datos de entrega</div>
            <div className="text-[12.5px] text-ink/55 mt-0.5 truncate max-w-[340px]">
              {op.titulo ?? 'Oferta'}{qty > 1 ? ` · ${qty} ud.` : ''} — {total} {op.currency}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink/5 text-ink/50 text-lg">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-ink/55 mb-1">Nombre completo</label>
              <input required value={form.fullName ?? ''} onChange={(e) => set('fullName', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-ink/15 text-[13.5px] outline-none focus:border-terracotta-500 transition bg-white" />
            </div>
            <div>
              <label className="block text-[12px] text-ink/55 mb-1">Teléfono</label>
              <input required type="tel" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full h-9 px-3 rounded-lg border border-ink/15 text-[13.5px] outline-none focus:border-terracotta-500 transition bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-ink/55 mb-1">Correo electrónico</label>
            <input required type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-ink/15 text-[13.5px] outline-none focus:border-terracotta-500 transition bg-white" />
          </div>

          <div>
            <label className="block text-[12px] text-ink/55 mb-1">Dirección (calle y número)</label>
            <input required value={form.address ?? ''} onChange={(e) => set('address', e.target.value)}
              placeholder="Calle Mayor, 1, 3ºA"
              className="w-full h-9 px-3 rounded-lg border border-ink/15 text-[13.5px] outline-none focus:border-terracotta-500 transition bg-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-ink/55 mb-1">Código postal</label>
              <input required value={form.postalCode ?? ''} onChange={(e) => set('postalCode', e.target.value)}
                placeholder="28001" maxLength={5}
                className="w-full h-9 px-3 rounded-lg border border-ink/15 text-[13.5px] outline-none focus:border-terracotta-500 transition bg-white" />
            </div>
            <div>
              <label className="block text-[12px] text-ink/55 mb-1">Ciudad</label>
              <input required value={form.city ?? ''} onChange={(e) => set('city', e.target.value)}
                placeholder="Madrid"
                className="w-full h-9 px-3 rounded-lg border border-ink/15 text-[13.5px] outline-none focus:border-terracotta-500 transition bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-ink/55 mb-1">Fecha de entrega deseada</label>
            <input required type="date" min={today} value={form.deliveryDate ?? ''} onChange={(e) => set('deliveryDate', e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-ink/15 text-[13.5px] outline-none focus:border-terracotta-500 transition bg-white" />
          </div>

          <div>
            <label className="block text-[12px] text-ink/55 mb-1">Notas para el vendedor <span className="text-ink/35">(opcional)</span></label>
            <textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)}
              rows={2} maxLength={500} placeholder="Instrucciones especiales, horario de entrega…"
              className="w-full px-3 py-2 rounded-lg border border-ink/15 text-[13.5px] outline-none focus:border-terracotta-500 transition bg-white resize-none" />
          </div>

          {error && <div className="text-[12.5px] text-terracotta-600 bg-terracotta-50 px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-ink/10 text-[13.5px] hover:border-ink/30 transition">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-11 rounded-xl bg-terracotta-500 text-cream text-[13.5px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60">
              {submitting ? 'Redirigiendo…' : `Continuar al pago — ${total} ${op.currency}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
