import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { ChatSettingsDrawer } from './ChatSettingsDrawer';

export function ChatPane({
  chatId,
  currentId,
  title,
  otherId,
  onDelete,
}: {
  chatId: string;
  currentId: string;
  title: string;
  otherId: string;
  onDelete: () => void;
}) {
  const { messages, loading, sendMessage, markAsRead } = useChat(chatId);
  const [draft, setDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [blocked, setBlocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markAsRead(currentId).catch(() => undefined);
  }, [chatId, currentId, markAsRead, messages.length]);

  useEffect(() => {
    if (!searchQuery) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, searchQuery]);

  const visibleMessages = useMemo(() => {
    let msgs = messages;
    if (blocked && otherId) msgs = msgs.filter((m) => m.senderId !== otherId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      msgs = msgs.filter((m) => m.text.toLowerCase().includes(q));
    }
    return msgs;
  }, [messages, blocked, otherId, searchQuery]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    try {
      await sendMessage(text, currentId);
    } catch {
      setDraft(text);
    }
  };

  return (
    <section className="flex flex-col relative overflow-hidden">
      {/* header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-ink/[.08] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sage-100 text-sage-600 grid place-items-center font-display shrink-0">
            {title[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <div className="text-[14.5px] font-medium">{title}</div>
            <div className="text-[11px] text-ink/45 font-mono">{chatId.slice(0, 8)}…</div>
          </div>
        </div>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          title="Ajustes del chat"
          aria-label="Ajustes del chat"
          className={`w-9 h-9 rounded-full grid place-items-center transition text-[18px] ${
            settingsOpen ? 'bg-terracotta-500/10 text-terracotta-600' : 'hover:bg-ink/[.06] text-ink/50'
          }`}
        >
          ⚙
        </button>
      </div>

      {/* blocked banner */}
      {blocked && (
        <div className="px-5 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-[12.5px] text-amber-700 shrink-0">
          <span>Mensajes de este usuario ocultos.</span>
          <button onClick={() => setBlocked(false)} className="font-medium hover:underline">Desbloquear</button>
        </div>
      )}

      {/* search banner */}
      {searchQuery && (
        <div className="px-5 py-1.5 bg-terracotta-50 border-b border-terracotta-100 flex items-center justify-between text-[12.5px] text-terracotta-700 shrink-0">
          <span>Mostrando {visibleMessages.length} de {messages.length} mensajes</span>
          <button onClick={() => setSearchQuery('')} className="font-medium hover:underline">Limpiar</button>
        </div>
      )}

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
        {loading && <div className="text-center text-[12px] text-ink/45">Cargando mensajes…</div>}
        {!loading && visibleMessages.length === 0 && !searchQuery && !blocked && (
          <div className="text-center text-[13px] text-ink/45">Aún no hay mensajes en este chat.</div>
        )}
        {!loading && visibleMessages.length === 0 && searchQuery && (
          <div className="text-center text-[13px] text-ink/45">Sin resultados para «{searchQuery}».</div>
        )}
        {visibleMessages.map((m) => {
          if (m.isSystem) {
            return (
              <div key={m.id} className="flex justify-center">
                <span className="text-[11.5px] text-ink/40 italic bg-ink/[.04] px-3 py-1 rounded-full">
                  {m.text}
                </span>
              </div>
            );
          }
          const mine = m.senderId === currentId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[60%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                mine ? 'bg-terracotta-500 text-cream rounded-br-md' : 'bg-white border border-ink/[.08] rounded-bl-md'
              }`}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <form onSubmit={onSend} className="border-t border-ink/[.08] p-4 shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribir…"
            className="flex-1 h-10 px-3.5 rounded-xl bg-white border border-ink/10 focus:outline-none focus:border-terracotta-500 text-[14px]"
          />
          <button type="submit" className="w-10 h-10 rounded-xl bg-ink text-cream grid place-items-center hover:bg-terracotta-600 transition">
            ➤
          </button>
        </div>
      </form>

      {/* settings drawer */}
      <ChatSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        chatId={chatId}
        title={title}
        currentId={currentId}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        matchCount={visibleMessages.length}
        messages={messages}
        blocked={blocked}
        onBlockChange={setBlocked}
        onDelete={onDelete}
      />
    </section>
  );
}
