import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

const typeIcon: Record<string, string> = {
  purchase_completed: '✅',
  new_sale: '🎉',
  status_changed: '🔄',
  new_chat: '💬',
  rate_invite: '⭐',
};

export default function Notificaciones() {
  const nav = useNavigate();
  const { notifications, unreadCount, loading, markAllRead } = useNotifications();

  return (
    <div className="px-8 py-8 max-w-[760px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-[32px] tracking-tight">Notificaciones</h1>
          {unreadCount > 0 && (
            <p className="text-[13px] text-ink/55 mt-0.5">{unreadCount} sin leer</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="h-9 px-4 rounded-xl border border-ink/15 text-[13px] hover:border-ink/30 transition"
          >
            Marcar todo como leído
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white border border-ink/10 p-10 text-center text-ink/50 text-[14px]">
          Cargando…
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl bg-white border border-ink/10 p-10 text-center text-ink/60">
          No tienes notificaciones todavía.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (n.link) nav(n.link);
              }}
              disabled={!n.link}
              className={`w-full text-left rounded-2xl border px-5 py-4 flex items-start gap-4 transition ${
                n.read
                  ? 'bg-white border-ink/10 hover:border-ink/20'
                  : 'bg-terracotta-50 border-terracotta-200 hover:border-terracotta-300'
              } ${n.link ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className="text-[22px] shrink-0 mt-0.5">
                {typeIcon[n.type] ?? '🔔'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-[14px] font-medium ${!n.read ? 'text-ink' : 'text-ink/80'}`}>
                    {n.title}
                  </span>
                  <span className="text-[11.5px] text-ink/45 shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-[13px] text-ink/60 mt-0.5 leading-relaxed">{n.body}</p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-terracotta-500 shrink-0 mt-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
