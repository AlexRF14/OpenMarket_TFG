/**
 * Notificaciones del usuario.
 *
 * TODO: implementar NotificationsModule en el backend (tabla nueva o derivar de
 * eventos: cambios de estado de operaciones, mensajes de chat, etc.) y consumir
 * GET /notifications aquí.
 */
export default function Notificaciones() {
  return (
    <div className="px-8 py-8 max-w-[1000px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <h1 className="font-display text-[32px] tracking-tight">Notificaciones</h1>
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-10 text-center text-ink/60">
        No tienes notificaciones nuevas.
      </div>
    </div>
  );
}
