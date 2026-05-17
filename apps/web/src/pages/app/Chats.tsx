import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../state/auth';
import { useChats, type ChatRoom } from '../../hooks/useChats';
import { ChatPane } from './ChatPane';
import { lookupUserByEmail, createChat, type UserLookup } from '../../lib/chat-api';
import type { ProfileResponse } from '../../lib/api-types';
import { useSearchParams } from 'react-router-dom';

function formatTime(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  const d = ts.toDate();
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const diffDays = (now.getTime() - d.getTime()) / 86_400_000;
  if (diffDays < 7) return d.toLocaleDateString('es', { weekday: 'short' });
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

function chatTitle(room: ChatRoom, currentId: string): string {
  const otherId = room.participants.find((p) => p !== currentId);
  const detail = otherId ? room.participantDetails?.[otherId] : undefined;
  return detail?.name ?? 'Chat';
}

function rolToType(rol: string): 'user' | 'company' {
  return rol === 'empresa' ? 'company' : 'user';
}

function NewChatDialog({
  profile,
  onCreated,
  onClose,
}: {
  profile: ProfileResponse;
  onCreated: (chatId: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [found, setFound] = useState<UserLookup | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setNotFound(false);
    setFound(null);
    const result = await lookupUserByEmail(email.trim());
    setBusy(false);
    if (result) setFound(result);
    else setNotFound(true);
  };

  const start = async () => {
    if (!found) return;
    setBusy(true);
    setStartError(null);
    try {
      const room = await createChat({
        participants: [profile.id, found.id],
        participantDetails: {
          [profile.id]: { name: `${profile.nombre} ${profile.apellidos}`.trim(), type: rolToType(profile.rol) },
          [found.id]: { name: `${found.nombre} ${found.apellidos}`.trim(), type: rolToType(found.rol) },
        },
      });
      onCreated(room.id);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Error al crear el chat');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-cream rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg mb-4">Nuevo chat</h3>
        <form onSubmit={search} className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFound(null); setNotFound(false); }}
            placeholder="correo@ejemplo.com"
            className="flex-1 h-10 px-3.5 rounded-xl bg-white border border-ink/10 text-[13.5px] focus:outline-none focus:border-terracotta-500"
          />
          <button type="submit" disabled={busy || !email.trim()}
            className="px-4 h-10 rounded-xl bg-ink text-cream text-[13px] font-medium disabled:opacity-40 hover:bg-terracotta-600 transition">
            Buscar
          </button>
        </form>
        {notFound && <p className="text-[12.5px] text-terracotta-600 mb-3">Usuario no encontrado.</p>}
        {startError && <p className="text-[12.5px] text-terracotta-600 mb-3">{startError}</p>}
        {found && (
          <div className="rounded-xl border border-ink/10 bg-white px-4 py-3 flex items-center justify-between mb-4">
            <div>
              <div className="text-[14px] font-medium">{found.nombre} {found.apellidos}</div>
              <div className="text-[12px] text-ink/50 capitalize">{found.rol}</div>
            </div>
            <button onClick={start} disabled={busy}
              className="px-3.5 py-1.5 rounded-lg bg-terracotta-500 text-cream text-[13px] font-medium disabled:opacity-40 hover:bg-terracotta-600 transition">
              {busy ? 'Creando…' : 'Iniciar chat'}
            </button>
          </div>
        )}
        <button onClick={onClose} className="w-full text-center text-[12.5px] text-ink/50 hover:text-ink transition">Cancelar</button>
      </div>
    </div>
  );
}

function ChatList({
  chats,
  currentId,
  selectedId,
  onSelect,
  query,
  onQuery,
  onNew,
}: {
  chats: ChatRoom[];
  currentId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
  onNew: () => void;
}) {
  const filtered = useMemo(() => {
    const ql = query.toLowerCase();
    return chats.filter((c) => chatTitle(c, currentId).toLowerCase().includes(ql));
  }, [chats, currentId, query]);

  return (
    <aside className="border-r border-ink/[.08] bg-[#FAF7F1] flex flex-col">
      <div className="px-4 h-14 flex items-center justify-between border-b border-ink/[.06]">
        <h2 className="font-display text-[19px]">Chats</h2>
        <button onClick={onNew} title="Nuevo chat"
          className="w-8 h-8 rounded-full bg-terracotta-500 text-cream grid place-items-center hover:bg-terracotta-600 transition text-[18px] leading-none">
          +
        </button>
      </div>
      <div className="px-3 py-2">
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar chat…"
          className="w-full h-9 px-3 rounded-lg bg-white border border-ink/10 text-[13px] placeholder:text-ink/40 focus:outline-none focus:border-terracotta-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-[12.5px] text-ink/50">
            No hay chats todavía.
          </div>
        )}
        {filtered.map((c) => {
          const title = chatTitle(c, currentId);
          const last = c.lastMessage;
          const active = selectedId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition ${
                active ? 'bg-terracotta-500/10 border-l-2 border-terracotta-500' : 'border-l-2 border-transparent hover:bg-ink/[.03]'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-600 grid place-items-center font-display shrink-0">
                {title[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[14px] font-medium truncate">{title}</div>
                  <div className="text-[11px] text-ink/50 shrink-0">{formatTime(last?.createdAt)}</div>
                </div>
                <div className="text-[12.5px] text-ink/60 truncate">
                  {last?.text ?? <span className="italic text-ink/40">Sin mensajes</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}


export default function Chats() {
  const { profile } = useAuth();
  const { chats, loading, firebaseReady, error } = useChats(profile?.id ?? null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('chatId'));
  const [q, setQ] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);

  // Clean URL param once applied
  useEffect(() => {
    if (searchParams.get('chatId')) setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId && chats.length > 0) setSelectedId(chats[0].id);
  }, [chats, selectedId]);

  const selected = chats.find((c) => c.id === selectedId) ?? null;

  if (!profile) {
    return <div className="px-8 py-16 text-center text-ink/50">Inicia sesión para ver tus chats.</div>;
  }

  return (
    <div className="h-[calc(100vh-64px)] grid grid-cols-[320px_1fr] gap-0 bg-cream">
      {newChatOpen && (
        <NewChatDialog
          profile={profile}
          onCreated={(id) => { setSelectedId(id); setNewChatOpen(false); }}
          onClose={() => setNewChatOpen(false)}
        />
      )}
      <ChatList
        chats={chats}
        currentId={profile.id}
        selectedId={selectedId}
        onSelect={setSelectedId}
        query={q}
        onQuery={setQ}
        onNew={() => setNewChatOpen(true)}
      />

      {error ? (
        <div className="grid place-items-center text-[13px] text-terracotta-600 px-8 text-center">{error}</div>
      ) : !firebaseReady ? (
        <div className="grid place-items-center text-[13px] text-ink/50">Conectando al chat…</div>
      ) : loading && chats.length === 0 ? (
        <div className="grid place-items-center text-[13px] text-ink/50">Cargando chats…</div>
      ) : !selected ? (
        <div className="grid place-items-center text-center px-8">
          <div>
            <div className="font-display text-2xl mb-1">Sin chats</div>
            <p className="text-[13.5px] text-ink/55 max-w-sm">
              Cuando inicies una operación con otra empresa o cliente, aparecerá aquí su sala de chat.
            </p>
          </div>
        </div>
      ) : (
        <ChatPane
          chatId={selected.id}
          currentId={profile.id}
          title={chatTitle(selected, profile.id)}
          otherId={selected.participants.find((p) => p !== profile.id) ?? ''}
        />
      )}
    </div>
  );
}
