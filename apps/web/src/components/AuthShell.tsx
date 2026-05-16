import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  back?: { to: string; label?: string };
};

export default function AuthShell({ title, subtitle, children, footer, back }: Props) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-cream">
      {/* Left: brand panel */}
      <aside className="hidden lg:flex relative overflow-hidden bg-terracotta-500 text-cream p-12 flex-col justify-between">
        <div className="flex items-center gap-2 text-cream/95">
          <div className="w-8 h-8 rounded-full bg-cream/20 grid place-items-center font-display text-lg">O</div>
          <span className="font-display text-xl tracking-tight">OpenMarket</span>
        </div>

        <div className="relative z-10">
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight">
            Un mercado abierto, <em className="italic text-terracotta-100">para todos</em>.
          </h1>
          <p className="mt-6 max-w-md text-cream/85 leading-relaxed">
            Compra, vende y negocia productos y servicios con empresas y personas reales.
            Conversaciones, operaciones y logística — en un solo sitio.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm text-cream/80">
          <span>© OpenMarket 2026</span>
          <a className="hover:text-cream" href="#">Términos</a>
          <a className="hover:text-cream" href="#">Privacidad</a>
        </div>

        {/* Decorative blobs */}
        <div className="absolute -right-20 -top-20 w-[420px] h-[420px] rounded-full bg-terracotta-400/60 blur-2xl" />
        <div className="absolute -left-24 bottom-10 w-[360px] h-[360px] rounded-full bg-terracotta-700/50 blur-3xl" />
      </aside>

      {/* Right: form */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[440px]">
          {back && (
            <Link to={back.to} className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink mb-6">
              <span aria-hidden>←</span> {back.label ?? 'Atrás'}
            </Link>
          )}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-terracotta-500 text-cream grid place-items-center font-display">O</div>
            <span className="font-display text-xl">OpenMarket</span>
          </div>
          <h2 className="font-display text-[34px] leading-[1.1] tracking-tight">{title}</h2>
          {subtitle && <p className="mt-2 text-ink/60 leading-relaxed">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-ink/60">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
