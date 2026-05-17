import { useEffect, useRef, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import type { ChatMessage } from '../../hooks/useChat';
import { reportChat, blockUser, unblockUser, deleteChat } from '../../lib/chat-api';

// ── helpers ───────────────────────────────────────────────────────────────────

function exportTxt(messages: ChatMessage[], title: string, currentId: string) {
  const header =
    `Chat con ${title}\n` +
    `Exportado el ${new Date().toLocaleString('es')}\n` +
    `${'─'.repeat(50)}\n\n`;

  const lines = messages.map((m) => {
    const time = m.createdAt
      ? (m.createdAt as Timestamp).toDate().toLocaleString('es')
      : 'sin fecha';
    return `[${time}] ${m.senderId === currentId ? 'Yo' : title}: ${m.text}`;
  });

  const blob = new Blob([header + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  chatId: string;
  title: string;
  currentId: string;
  // Buscar
  searchQuery: string;
  onSearch: (q: string) => void;
  matchCount: number;
  // Exportar
  messages: ChatMessage[];
  // Bloquear
  blocked: boolean;
  onBlockChange: (blocked: boolean) => void;
  // Eliminar
  onDelete: () => void;
}

export function ChatSettingsDrawer({
  open, onClose, chatId, title, currentId,
  searchQuery, onSearch, matchCount,
  messages,
  blocked, onBlockChange,
  onDelete,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);

  // Reportar state
  const [reason, setReason] = useState('');
  const [reportState, setReportState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Bloquear state
  const [blockBusy, setBlockBusy] = useState(false);

  // Eliminar state
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setReason('');
      setReportState('idle');
      setDeleteConfirm(false);
      setDeleteError(null);
    }
  }, [open]);

  const submitReport = async () => {
    if (reason.trim().length < 10) return;
    setReportState('sending');
    try {
      await reportChat(chatId, reason.trim());
      setReportState('sent');
      setReason('');
    } catch {
      setReportState('error');
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteChat(chatId);
      onDelete();
    } catch {
      setDeleteError('Error al eliminar el chat. Inténtalo de nuevo.');
      setDeleteBusy(false);
    }
  };

  const toggleBlock = async () => {
    setBlockBusy(true);
    try {
      if (blocked) {
        await unblockUser(chatId);
        onBlockChange(false);
      } else {
        await blockUser(chatId);
        onBlockChange(true);
      }
    } catch {
      // silently keep current state
    } finally {
      setBlockBusy(false);
    }
  };

  return (
    <>
      {open && <div className="absolute inset-0 z-10 bg-ink/10" onClick={onClose} />}

      <aside className={`absolute right-0 top-0 bottom-0 w-72 bg-[#FAF7F1] border-l border-ink/[.08] shadow-2xl z-20 flex flex-col transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-ink/[.08] shrink-0">
          <span className="font-display text-[16px]">Ajustes del chat</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-ink/[.06] grid place-items-center text-ink/50 text-lg transition">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

          {/* ── Buscar ─────────────────────────────────────── */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-2">Buscar en el chat</h3>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Palabra o frase…"
              className="w-full h-9 px-3 rounded-xl bg-white border border-ink/10 text-[13px] focus:outline-none focus:border-terracotta-500"
            />
            {searchQuery && (
              <div className="mt-1.5 flex items-center justify-between text-[12px] text-ink/50">
                <span>{matchCount === 0 ? 'Sin resultados' : `${matchCount} mensaje${matchCount !== 1 ? 's' : ''}`}</span>
                <button onClick={() => onSearch('')} className="text-terracotta-600 hover:underline">Limpiar</button>
              </div>
            )}
          </section>

          {/* ── Exportar ───────────────────────────────────── */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-2">Exportar conversación</h3>
            <p className="text-[12.5px] text-ink/55 mb-3">Descarga todos los mensajes como archivo de texto.</p>
            <button
              onClick={() => exportTxt(messages, title, currentId)}
              disabled={messages.length === 0}
              className="w-full h-9 rounded-xl bg-ink text-cream text-[13px] font-medium disabled:opacity-40 hover:bg-terracotta-600 transition"
            >
              Descargar .txt
            </button>
          </section>

          {/* ── Reportar ───────────────────────────────────── */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-2">Reportar usuario</h3>
            {reportState === 'sent' ? (
              <div className="rounded-xl bg-sage-50 border border-sage-200 px-4 py-3 text-[13px] text-sage-700">
                Reporte enviado. El equipo lo revisará pronto.
              </div>
            ) : (
              <>
                <textarea
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); if (reportState === 'error') setReportState('idle'); }}
                  placeholder="Describe el motivo (mín. 10 caracteres)…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-ink/10 text-[13px] resize-none focus:outline-none focus:border-terracotta-500"
                />
                {reportState === 'error' && (
                  <p className="mt-1 text-[12px] text-terracotta-600">Error al enviar. Inténtalo de nuevo.</p>
                )}
                <button
                  onClick={submitReport}
                  disabled={reason.trim().length < 10 || reportState === 'sending'}
                  className="mt-2 w-full h-9 rounded-xl bg-terracotta-500 text-cream text-[13px] font-medium disabled:opacity-40 hover:bg-terracotta-600 transition"
                >
                  {reportState === 'sending' ? 'Enviando…' : 'Enviar reporte'}
                </button>
              </>
            )}
          </section>

          {/* ── Bloquear ───────────────────────────────────── */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-2">
              {blocked ? 'Usuario bloqueado' : 'Bloquear usuario'}
            </h3>
            <p className="text-[12.5px] text-ink/55 mb-3">
              {blocked
                ? 'Sus mensajes están ocultos en esta conversación.'
                : 'Sus mensajes dejarán de mostrarse en esta conversación.'}
            </p>
            <button
              onClick={toggleBlock}
              disabled={blockBusy}
              className={`w-full h-9 rounded-xl text-[13px] font-medium disabled:opacity-40 transition ${
                blocked
                  ? 'bg-white border border-ink/15 text-ink hover:bg-ink/[.04]'
                  : 'bg-terracotta-500 text-cream hover:bg-terracotta-600'
              }`}
            >
              {blockBusy ? '…' : blocked ? 'Desbloquear' : 'Bloquear'}
            </button>
          </section>

          {/* ── Eliminar ───────────────────────────────────── */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-2">Eliminar chat</h3>
            <p className="text-[12.5px] text-ink/55 mb-3">
              Solo tú dejarás de ver este chat. El otro participante recibirá una notificación.
            </p>
            {deleteError && (
              <p className="mb-2 text-[12px] text-terracotta-600">{deleteError}</p>
            )}
            {deleteConfirm ? (
              <div className="space-y-2">
                <p className="text-[12.5px] font-medium text-ink">¿Seguro? Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmDelete}
                    disabled={deleteBusy}
                    className="flex-1 h-9 rounded-xl bg-red-500 text-white text-[13px] font-medium disabled:opacity-40 hover:bg-red-600 transition"
                  >
                    {deleteBusy ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeleteError(null); }}
                    disabled={deleteBusy}
                    className="flex-1 h-9 rounded-xl bg-white border border-ink/15 text-[13px] hover:border-ink/30 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full h-9 rounded-xl bg-white border border-red-200 text-red-600 text-[13px] font-medium hover:bg-red-50 hover:border-red-300 transition"
              >
                Eliminar chat
              </button>
            )}
          </section>

        </div>
      </aside>
    </>
  );
}
