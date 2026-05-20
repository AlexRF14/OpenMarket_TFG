import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../state/auth';
import { getPerfil, updateBio, type PerfilResponse } from '../../lib/perfil-api';
import { createChat } from '../../lib/chat-api';
import { ApiException } from '../../lib/api-client';
import { categoriaLabel } from '../../lib/api-types';
import type { OperacionDto } from '../../lib/api-types';

function rolToType(rol: string): 'user' | 'company' {
  return rol === 'empresa' ? 'company' : 'user';
}

function OpCard({ op, onClick }: { op: OperacionDto; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-ink/10 rounded-2xl p-4 hover:border-terracotta-500/40 hover:shadow-sm transition group w-full"
    >
      {op.categoria && (
        <span className="px-2 py-0.5 rounded-md bg-ink/[.04] text-[11px] font-medium text-ink/60">
          {categoriaLabel(op.categoria)}
        </span>
      )}
      <div className="font-display text-[16px] mt-1.5 group-hover:text-terracotta-600 transition truncate">
        {op.titulo ?? 'Oferta'}
      </div>
      {op.notes && (
        <div className="text-[12px] text-ink/50 mt-0.5 line-clamp-2">{op.notes}</div>
      )}
      <div className="mt-2 font-display text-[18px]">
        {parseFloat(op.totalAmount).toFixed(2)}{' '}
        <span className="text-[13px] text-ink/45">{op.currency}</span>
      </div>
      <div className="text-[11px] text-ink/45 mt-0.5">
        {op.stock === 0 ? 'Agotado' : `${op.stock} disponibles`}
      </div>
    </button>
  );
}

export default function Perfil() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const nav = useNavigate();

  const [perfil, setPerfil] = useState<PerfilResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  const [startingChat, setStartingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const targetId = id ?? profile?.id ?? '';
  const isOwn = !!profile && profile.id === targetId;

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    getPerfil(targetId)
      .then((p) => {
        setPerfil(p);
        setBioInput(p.bio ?? '');
      })
      .catch((err) => setError(err instanceof ApiException ? err.message : 'Error cargando perfil'))
      .finally(() => setLoading(false));
  }, [targetId]);

  const startChat = async () => {
    if (!profile || !perfil) return;
    setStartingChat(true);
    setChatError(null);
    try {
      const myName = `${profile.nombre} ${profile.apellidos}`.trim();
      const sellerName = `${perfil.nombre} ${perfil.apellidos}`.trim();
      const { id: chatId } = await createChat({
        participants: [profile.id, perfil.id],
        participantDetails: {
          [profile.id]: { name: myName, type: rolToType(profile.rol) },
          [perfil.id]: { name: sellerName, type: rolToType(perfil.rol) },
        },
      });
      nav(`/app/chats?chatId=${chatId}`);
    } catch (err) {
      setChatError(err instanceof ApiException ? err.message : 'Error iniciando el chat');
      setStartingChat(false);
    }
  };

  const saveBio = async () => {
    setSavingBio(true);
    try {
      const result = await updateBio(bioInput.trim() || null);
      setPerfil((prev) => prev ? { ...prev, bio: result.bio } : prev);
      setEditingBio(false);
    } catch {
      // keep editing open on error
    } finally {
      setSavingBio(false);
    }
  };

  if (loading) return <div className="px-8 py-16 text-center text-ink/50">Cargando…</div>;
  if (error || !perfil) {
    return (
      <div className="px-8 py-16 text-center">
        <div className="font-display text-2xl">Perfil no encontrado</div>
        <p className="text-ink/55 mt-2">{error}</p>
      </div>
    );
  }

  const initial = (perfil.nombre[0] ?? '?').toUpperCase();
  const fullName = `${perfil.nombre} ${perfil.apellidos}`.trim();

  return (
    <div className="max-w-[960px] mx-auto px-8 py-8">
      {/* Header card */}
      <div className="bg-white border border-ink/10 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-sage-100 text-sage-600 grid place-items-center font-display text-[28px] shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <h1 className="font-display text-[26px] tracking-tight">{fullName}</h1>
                {perfil.empresaNombre && (
                  <div className="text-[13.5px] text-ink/60 mt-0.5">{perfil.empresaNombre}</div>
                )}
              </div>
              {!isOwn && (
                <button
                  onClick={startChat}
                  disabled={startingChat}
                  className="h-9 px-4 rounded-xl bg-terracotta-500 text-cream text-[13px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60 inline-flex items-center gap-2"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                  </svg>
                  {startingChat ? 'Abriendo…' : 'Iniciar chat'}
                </button>
              )}
            </div>
            {chatError && <p className="text-[12px] text-terracotta-600 mt-1">{chatError}</p>}
            {perfil.correo && (
              <a
                href={`mailto:${perfil.correo}`}
                className="text-[13.5px] text-terracotta-600 hover:underline mt-0.5 inline-block"
              >
                {perfil.correo}
              </a>
            )}


            {/* Bio section */}
            <div className="mt-3">
              {editingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Describe tu negocio o servicios…"
                    className="w-full px-3 py-2 rounded-xl border border-ink/15 focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/15 text-[13.5px] outline-none resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveBio}
                      disabled={savingBio}
                      className="h-8 px-4 rounded-lg bg-ink text-cream text-[13px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60"
                    >
                      {savingBio ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => { setEditingBio(false); setBioInput(perfil.bio ?? ''); }}
                      className="h-8 px-4 rounded-lg bg-white border border-ink/10 text-[13px] hover:border-ink/30 transition"
                    >
                      Cancelar
                    </button>
                    <span className="text-[11px] text-ink/40 ml-auto">{bioInput.length}/500</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <p className="text-[14px] text-ink/70 leading-relaxed flex-1">
                    {perfil.bio ?? (isOwn ? (
                      <span className="italic text-ink/40">Sin descripción todavía.</span>
                    ) : (
                      <span className="italic text-ink/40">Este vendedor no ha añadido una descripción.</span>
                    ))}
                  </p>
                  {isOwn && (
                    <button
                      onClick={() => setEditingBio(true)}
                      className="shrink-0 h-8 px-3 rounded-lg border border-ink/10 hover:border-ink/30 text-[12.5px] text-ink/60 hover:text-ink transition"
                    >
                      {perfil.bio ? 'Editar bio' : 'Añadir bio'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Own profile: privacy notice */}
        {isOwn && !perfil.publicProfile && (
          <div className="mt-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[12.5px] text-amber-800">
            Tu perfil está en <strong>modo privado</strong>. Otros usuarios solo verán tu nombre. Actívalo en{' '}
            <button onClick={() => nav('/app/ajustes')} className="underline font-medium">Ajustes → Privacidad</button>.
          </div>
        )}
      </div>

      {/* Private profile for others */}
      {!perfil.publicProfile && !isOwn && (
        <div className="rounded-2xl bg-white border border-ink/10 p-10 text-center text-ink/55">
          <div className="font-display text-[20px] mb-1">Perfil privado</div>
          <p className="text-[14px]">Este usuario no ha hecho público su perfil.</p>
        </div>
      )}

      {/* Public operations */}
      {perfil.publicProfile && (
        <>
          <h2 className="font-display text-[20px] mb-4">
            Operaciones activas
            {perfil.operaciones.length > 0 && (
              <span className="ml-2 text-[14px] font-normal text-ink/50">({perfil.operaciones.length})</span>
            )}
          </h2>
          {perfil.operaciones.length === 0 ? (
            <div className="rounded-2xl bg-white border border-ink/10 p-10 text-center text-ink/50 text-[14px]">
              {isOwn ? 'No tienes operaciones públicas activas.' : 'Este vendedor no tiene operaciones activas.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {perfil.operaciones.map((op) => (
                <OpCard key={op.id} op={op} onClick={() => nav(`/app/operaciones/${op.id}`)} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="h-12" />
    </div>
  );
}
