import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchVendedores, type VendedorDto } from '../../lib/perfil-api';
import { ApiException } from '../../lib/api-client';

function VendedorCard({ v }: { v: VendedorDto }) {
  const nav = useNavigate();
  const initial = (v.nombre[0] ?? '?').toUpperCase();
  return (
    <div className="bg-white border border-ink/10 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-600 grid place-items-center font-display text-[18px] shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-[14.5px] truncate">{v.nombre} {v.apellidos}</div>
        </div>
      </div>
      {v.bio ? (
        <p className="text-[13px] text-ink/60 line-clamp-3 leading-relaxed flex-1">{v.bio}</p>
      ) : (
        <p className="text-[13px] text-ink/35 italic flex-1">Sin descripción.</p>
      )}
      <button
        onClick={() => nav(`/app/perfil/${v.id}`)}
        className="h-9 px-4 rounded-xl border border-ink/10 hover:border-terracotta-500 hover:text-terracotta-600 text-[13px] font-medium transition w-full text-center"
      >
        Ver perfil →
      </button>
    </div>
  );
}

export function VendedoresTab() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [vendedores, setVendedores] = useState<VendedorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    searchVendedores(debouncedQ || undefined)
      .then(setVendedores)
      .catch((err) => setError(err instanceof ApiException ? err.message : 'Error buscando vendedores'))
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  return (
    <div>
      {/* Search */}
      <label className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white border border-ink/10 max-w-sm mb-6 focus-within:border-terracotta-500 focus-within:ring-4 focus-within:ring-terracotta-500/15 transition">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink/45 shrink-0">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o descripción…"
          className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-ink/40"
        />
        {q && (
          <button onClick={() => setQ('')} className="text-ink/40 hover:text-ink text-[18px] leading-none">×</button>
        )}
      </label>

      {error && (
        <div className="rounded-xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 px-4 py-3 mb-4 text-[13px]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-ink/50 py-16 text-[14px]">Buscando vendedores…</div>
      ) : vendedores.length === 0 ? (
        <div className="rounded-2xl bg-white border border-ink/10 p-10 text-center text-ink/50 text-[14px]">
          {q ? `Sin resultados para «${q}»` : 'No hay vendedores con perfil público todavía.'}
        </div>
      ) : (
        <>
          <p className="text-[12.5px] text-ink/50 mb-4">
            {vendedores.length} {vendedores.length === 1 ? 'vendedor' : 'vendedores'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendedores.map((v) => <VendedorCard key={v.id} v={v} />)}
          </div>
        </>
      )}
    </div>
  );
}
