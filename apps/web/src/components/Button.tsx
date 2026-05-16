import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  full?: boolean;
};

const styles: Record<Variant, string> = {
  primary:
    'bg-ink text-cream hover:bg-terracotta-600 focus:ring-terracotta-500/30',
  secondary:
    'bg-white text-ink border border-ink/10 hover:border-ink/30 focus:ring-ink/10',
  ghost: 'bg-transparent text-ink hover:bg-ink/5 focus:ring-ink/10',
};

export default function Button({
  variant = 'primary',
  full = false,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      className={
        'h-11 px-5 rounded-xl font-medium text-[15px] transition ' +
        'focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed ' +
        (full ? 'w-full ' : '') +
        styles[variant] + ' ' + className
      }
      {...rest}
    >
      {children}
    </button>
  );
}
