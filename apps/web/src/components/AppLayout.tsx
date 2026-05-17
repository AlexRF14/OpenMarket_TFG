import { ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';
import { useCart } from '../state/cart';
import { useNotifications } from '../hooks/useNotifications';

/* ─────────── ICONS (inline SVG, thin stroke) ─────────── */
const iconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const Icons = {
  home: <svg {...iconProps}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>,
  chat: <svg {...iconProps}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>,
  bell: <svg {...iconProps}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>,
  settings: <svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  chart: <svg {...iconProps}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 6-7" /></svg>,
  ops: <svg {...iconProps}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h10" /><circle cx="19" cy="17" r="2" /></svg>,
  user: <svg {...iconProps}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  logout: <svg {...iconProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>,
  chevron: <svg {...iconProps}><path d="M9 18l6-6-6-6" /></svg>,
  search: <svg {...iconProps}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>,
  cart: <svg {...iconProps}><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 3h3l2.7 12.6a2 2 0 0 0 2 1.4h7.6a2 2 0 0 0 2-1.5L22 7H6" /></svg>,
  sparkle: <svg {...iconProps}><path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5z" /></svg>,
};

/* ─────────── SIDEBAR ─────────── */
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { account, name, logout, profile } = useAuth();
  const nav = useNavigate();
  const display = name || '—';
  const initial = (display[0] ?? '?').toUpperCase();
  const onLogout = async () => {
    await logout();
    nav('/login');
  };

  const items: Array<{ to: string; label: string; icon: ReactNode; only?: 'empresa' | 'cliente' }> = [
    { to: '/app', label: 'Inicio', icon: Icons.home },
    { to: '/app/explorador', label: 'Explorador', icon: Icons.search },
    { to: '/app/chats', label: 'Chats', icon: Icons.chat },
    { to: '/app/operaciones', label: 'Operaciones', icon: Icons.ops },
    { to: '/app/notificaciones', label: 'Notificaciones', icon: Icons.bell },
    { to: '/app/cuadro-mandos', label: 'Cuadro de Mandos', icon: Icons.chart, only: 'empresa' },
    { to: '/app/ajustes', label: 'Ajustes', icon: Icons.settings },
  ];

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-[#FAF7F1] border-r border-ink/10 transition-[width] duration-300 ease-out"
      style={{ width: collapsed ? 72 : 240 }}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-ink/[.06]">
        <div className="w-8 h-8 rounded-full bg-terracotta-500 text-cream grid place-items-center font-display shrink-0">O</div>
        {!collapsed && <span className="font-display text-[19px] tracking-tight">OpenMarket</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((it) => {
          if (it.only && it.only !== account) return null;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/app'}
              className={({ isActive }) =>
                `group flex items-center gap-3 h-10 px-3 rounded-lg text-[14px] transition ` +
                (isActive
                  ? 'bg-terracotta-500 text-cream'
                  : 'text-ink/75 hover:bg-ink/5 hover:text-ink')
              }
              title={collapsed ? it.label : undefined}
            >
              <span className="shrink-0">{it.icon}</span>
              {!collapsed && <span className="truncate">{it.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: account + collapse */}
      <div className="p-3 border-t border-ink/[.06] space-y-1.5">
        <button
          onClick={() => nav(profile?.id ? `/app/perfil/${profile.id}` : '/app/ajustes')}
          className="w-full flex items-center gap-3 h-11 px-2 rounded-lg hover:bg-ink/5 text-left"
          title={collapsed ? display : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-sage-100 text-sage-600 grid place-items-center font-display shrink-0">
            {initial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{display}</div>
              <div className="text-[11px] text-ink/55 capitalize truncate">{account ?? ''}</div>
            </div>
          )}
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 h-10 px-3 rounded-lg text-ink/60 hover:bg-ink/5 hover:text-ink text-[13px]"
          title="Cerrar sesión"
        >
          <span className="shrink-0">{Icons.logout}</span>
          {!collapsed && <span>Cerrar sesión</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="w-full h-9 rounded-lg bg-white border border-ink/10 hover:border-ink/30 flex items-center justify-center text-ink/60 hover:text-ink transition"
        >
          <span className="transition-transform" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
            {Icons.chevron}
          </span>
        </button>
      </div>
    </aside>
  );
}

/* ─────────── TOPBAR (hide on scroll down, show on scroll up) ─────────── */
function TopBar({ sidebarWidth, visible }: { sidebarWidth: number; visible: boolean }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState('');
  const { count: cartCount } = useCart();
  const { unreadCount } = useNotifications();

  return (
    <header
      className="fixed top-0 right-0 z-30 bg-cream/80 backdrop-blur-md border-b border-ink/[.06] transition-transform duration-300 ease-out"
      style={{
        left: sidebarWidth,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      }}
    >
      <div className="h-16 px-6 flex items-center gap-4">
        {/* Search */}
        <form
          onSubmit={(e) => { e.preventDefault(); nav(`/app/explorador${q ? `?q=${encodeURIComponent(q)}` : ''}`); }}
          className="flex-1 max-w-xl"
        >
          <label className="group flex items-center gap-2.5 h-10 px-3.5 rounded-xl bg-white border border-ink/10 focus-within:border-terracotta-500 focus-within:ring-4 focus-within:ring-terracotta-500/15 transition">
            <span className="text-ink/50">{Icons.search}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busca productos, servicios o empresas…"
              className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-ink/40"
            />
            <kbd className="text-[11px] px-1.5 py-0.5 rounded border border-ink/10 text-ink/40 font-mono">⌘K</kbd>
          </label>
        </form>

        <div className="flex items-center gap-1">
          <button
            onClick={() => nav('/app/notificaciones')}
            className="relative w-10 h-10 rounded-xl hover:bg-ink/5 grid place-items-center text-ink/70 hover:text-ink transition"
            aria-label="Notificaciones"
          >
            {Icons.bell}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 rounded-full bg-terracotta-500 text-cream text-[10px] font-medium grid place-items-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => nav('/app/carrito')}
            className="relative w-10 h-10 rounded-xl hover:bg-ink/5 grid place-items-center text-ink/70 hover:text-ink transition"
            aria-label="Carrito"
          >
            {Icons.cart}
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 rounded-full bg-terracotta-500 text-cream text-[10px] font-medium grid place-items-center px-1">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─────────── LAYOUT ─────────── */
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('om.sidebar') === 'collapsed');
  const [topVisible, setTopVisible] = useState(true);
  const lastY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('om.sidebar', collapsed ? 'collapsed' : 'open');
  }, [collapsed]);

  // Hide-on-scroll-down / show-on-scroll-up on the inner scroll container
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      const dy = y - lastY.current;
      if (y < 20) setTopVisible(true);
      else if (dy > 6) setTopVisible(false);
      else if (dy < -6) setTopVisible(true);
      lastY.current = y;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const sidebarW = collapsed ? 72 : 240;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div
        ref={scrollRef}
        className="transition-[margin] duration-300 ease-out h-screen overflow-y-auto"
        style={{ marginLeft: sidebarW }}
      >
        <TopBar sidebarWidth={sidebarW} visible={topVisible} />
        <main className="pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
