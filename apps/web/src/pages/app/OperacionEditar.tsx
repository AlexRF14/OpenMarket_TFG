import { FormEvent, useRef, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useOperacion } from '../../state/ops';
import { useAuth } from '../../state/auth';
import { ApiException } from '../../lib/api-client';
import type { Categoria, OperationType } from '../../lib/api-types';
import { PRODUCTO_CATS, SERVICIO_CATS, categoriaTipo } from '../../lib/api-types';

const TAX_RATE = 0.21;
const FEE_RATE = 0.05;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function toAmount(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'cloud_name');
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Tiempo de espera agotado (30 s). Comprueba la conexión.')), 30_000),
  );
  const res = await Promise.race([
    fetch('https://api.cloudinary.com/v1_1/dehsoatcf/image/upload', { method: 'POST', body: formData }),
    timeout,
  ]);
  if (!res.ok) throw new Error(`Cloudinary error ${res.status}`);
  const data = await res.json() as { secure_url: string };
  return data.secure_url;
}

export default function OperacionEditar() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useAuth();
  const { op, loading, updateOp } = useOperacion(id);

  const [titulo, setTitulo] = useState('');
  const [tipoOferta, setTipoOferta] = useState<'producto' | 'servicio'>('producto');
  const [categoria, setCategoria] = useState<string>(PRODUCTO_CATS[0].value);
  const [tipo, setTipo] = useState<OperationType>('publica');
  const [grossInput, setGrossInput] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!op) return;
    setTitulo(op.titulo ?? '');
    const t = categoriaTipo(op.categoria);
    setTipoOferta(t ?? 'producto');
    setCategoria(op.categoria ?? PRODUCTO_CATS[0].value);
    setTipo((op.operationType === 'publica' || op.operationType === 'negociada') ? op.operationType : 'publica');
    setGrossInput(op.totalAmount);
    setDescripcion(op.notes ?? '');
    setImages(op.images ?? []);
  }, [op]);

  const total = parseFloat(grossInput || '0');
  const amountNet = total / (1 + TAX_RATE);
  const taxAmount = total - amountNet;
  const platformFee = total * FEE_RATE;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!titulo.trim()) { setError('El nombre es obligatorio'); return; }
    if (!total || total <= 0) { setError('El precio debe ser mayor que 0'); return; }
    setSubmitting(true);
    try {
      await updateOp?.({
        titulo: titulo.trim(),
        categoria: categoria as Categoria,
        operationType: tipo,
        totalAmount: toAmount(total),
        amountNet: toAmount(amountNet),
        taxAmount: toAmount(taxAmount),
        platformFee: toAmount(platformFee),
        notes: descripcion.trim() || undefined,
        images: images.length > 0 ? images : [],
      });
      nav(`/app/operaciones/${id}`);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Error guardando los cambios');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="max-w-xl mx-auto px-8 py-16 text-center text-ink/50">Cargando…</div>;
  if (!op || !profile || op.idVendedor !== profile.id || op.status !== 'pending') {
    return (
      <div className="max-w-xl mx-auto px-8 py-16 text-center">
        <div className="font-display text-2xl">No disponible</div>
        <p className="text-ink/55 mt-2">Solo puedes editar borradores de tus propias operaciones.</p>
        <Link to="/app/operaciones" className="inline-block mt-6 h-10 px-4 rounded-xl bg-ink text-cream font-medium text-[13.5px] leading-[40px]">Volver</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[860px] mx-auto px-8 py-10">
      <div className="text-[13px] text-ink/55 mb-4 flex items-center gap-2">
        <Link to="/app/operaciones" className="hover:text-ink">Operaciones</Link>
        <span>›</span>
        <Link to={`/app/operaciones/${id}`} className="hover:text-ink font-mono">{id?.slice(0, 8)}…</Link>
        <span>›</span>
        <span className="text-ink/80">Editar</span>
      </div>

      <h1 className="font-display text-4xl tracking-tight">Editar oferta</h1>
      <p className="text-ink/60 mt-1.5 text-[14.5px] max-w-xl">
        Solo puedes editar borradores antes de publicarlos. Una vez publicada, podrás ajustar el stock.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        {/* Tipo de oferta */}
        <div>
          <div className="text-[13px] font-medium mb-2 text-ink/80">¿Qué ofreces?</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {([
              { k: 'producto' as const, title: 'Producto', sub: 'Bien físico o digital.' },
              { k: 'servicio' as const, title: 'Servicio', sub: 'Prestación de trabajo o actividad.' },
            ]).map((opt) => (
              <button
                type="button"
                key={opt.k}
                onClick={() => {
                  setTipoOferta(opt.k);
                  setCategoria(opt.k === 'producto' ? PRODUCTO_CATS[0].value : SERVICIO_CATS[0].value);
                }}
                className={`text-left p-4 rounded-2xl border transition ${
                  tipoOferta === opt.k ? 'border-terracotta-500 bg-terracotta-50' : 'border-ink/10 bg-white hover:border-ink/30'
                }`}
              >
                <div className="font-display text-base">{opt.title}</div>
                <div className="text-[12.5px] text-ink/60 leading-snug mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink/80 mb-1.5">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {(tipoOferta === 'producto' ? PRODUCTO_CATS : SERVICIO_CATS).map((cat) => (
                <button
                  type="button"
                  key={cat.value}
                  onClick={() => setCategoria(cat.value)}
                  className={`h-8 px-3 rounded-lg text-[13px] border transition ${
                    categoria === cat.value
                      ? 'bg-ink text-cream border-ink'
                      : 'bg-white border-ink/10 text-ink/70 hover:border-ink/30'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Field label="Nombre" value={titulo} onChange={setTitulo} placeholder="Nombre del producto o servicio" required />

        <label className="block">
          <span className="block text-[13px] font-medium text-ink/80 mb-1.5">Descripción</span>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={4}
            placeholder="Características, condiciones, plazo de entrega…"
            className="w-full px-3.5 py-3 rounded-xl bg-white border border-ink/10 text-[14px] outline-none focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/15 transition resize-none"
          />
        </label>

        <ImageUploader images={images} onChange={setImages} />

        <Field
          label="Precio por unidad con IVA (€)"
          value={grossInput}
          onChange={(v) => setGrossInput(v.replace(/[^0-9.]/g, ''))}
          placeholder="125.00"
          required
        />

        <div className="rounded-2xl bg-[#FAF7F1] border border-ink/10 p-4 space-y-1.5 text-[13.5px]">
          <Row k="Subtotal" v={`${toAmount(amountNet)} €`} />
          <Row k="IVA (21%)" v={`${toAmount(taxAmount)} €`} />
          <Row k="Comisión plataforma (5%)" v={`${toAmount(platformFee)} €`} />
          <div className="border-t border-ink/[.08] pt-1.5 flex items-center justify-between">
            <span className="text-ink/55">Total</span>
            <span className="font-display text-2xl">{toAmount(total)} €</span>
          </div>
        </div>

        <div>
          <div className="text-[13px] font-medium mb-2 text-ink/80">Visibilidad</div>
          <div className="grid grid-cols-2 gap-3">
            {([
              { k: 'publica', title: 'Pública', sub: 'Visible en el explorador de mercado.' },
              { k: 'negociada', title: 'Negociada', sub: 'Privada, solo entre las partes.' },
            ] as const).map((opt) => (
              <button
                type="button"
                key={opt.k}
                onClick={() => setTipo(opt.k)}
                className={`text-left p-4 rounded-2xl border transition ${
                  tipo === opt.k ? 'border-terracotta-500 bg-terracotta-50' : 'border-ink/10 bg-white hover:border-ink/30'
                }`}
              >
                <div className="font-display text-base">{opt.title}</div>
                <div className="text-[12.5px] text-ink/60 leading-snug mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="text-[13px] text-terracotta-600">{error}</div>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => nav(`/app/operaciones/${id}`)}
            className="h-11 px-5 rounded-xl bg-white border border-ink/10 hover:border-ink/30 text-[14px] font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 px-5 rounded-xl bg-ink text-cream text-[14px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60"
          >
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink/80 mb-1.5">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3.5 rounded-xl bg-white border border-ink/10 text-ink placeholder:text-ink/30 focus:outline-none focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/15 transition text-[14px]"
      />
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink/55">{k}</span>
      <span className="text-ink/80">{v}</span>
    </div>
  );
}

function ImageUploader({ images, onChange }: { images: string[]; onChange: (urls: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    const remaining = 10 - images.length;
    if (remaining <= 0) return;
    const toUpload = Array.from(files).slice(0, remaining);
    const oversized = toUpload.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) { setUploadError('Cada imagen debe ser menor de 5 MB.'); return; }
    setUploading(true);
    setUploadError(null);
    try {
      const urls = await Promise.all(toUpload.map(uploadImage));
      onChange([...images, ...urls]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setUploadError(`Error subiendo las imágenes: ${msg}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <span className="block text-[13px] font-medium text-ink/80 mb-1.5">
        Fotos{' '}
        <span className="font-normal text-ink/40">({images.length}/10 · máx 5 MB por imagen)</span>
      </span>
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-ink/10 group shrink-0">
            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/70 text-cream text-[11px] opacity-0 group-hover:opacity-100 transition grid place-items-center leading-none"
            >×</button>
          </div>
        ))}
        {images.length < 10 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-ink/20 hover:border-terracotta-400 hover:bg-terracotta-50 transition grid place-items-center text-ink/35 hover:text-terracotta-500 disabled:opacity-40 shrink-0"
          >
            {uploading ? <span className="text-[11px] text-ink/50">Subiendo…</span> : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>
        )}
      </div>
      {uploadError && <p className="mt-1.5 text-[12px] text-terracotta-600">{uploadError}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); }}
      />
    </div>
  );
}
