import { InputHTMLAttributes, forwardRef } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

const Field = forwardRef<HTMLInputElement, Props>(({ label, hint, error, id, className = '', ...rest }, ref) => {
  const inputId = id ?? `f-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <label htmlFor={inputId} className="block">
      <span className="block text-sm font-medium text-ink/80 mb-1.5">{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={
          'w-full h-11 px-3.5 rounded-xl bg-white border border-ink/10 ' +
          'text-ink placeholder:text-ink/30 ' +
          'focus:outline-none focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/15 ' +
          'transition ' + className
        }
        {...rest}
      />
      {hint && !error && <span className="block mt-1.5 text-xs text-ink/50">{hint}</span>}
      {error && <span className="block mt-1.5 text-xs text-terracotta-600">{error}</span>}
    </label>
  );
});
export default Field;
