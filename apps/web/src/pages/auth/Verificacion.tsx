import { FormEvent, useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import Button from '../../components/Button';
import { useAuth } from '../../state/auth';
import { ApiException } from '../../lib/api-client';

/**
 * Verificación TOTP tras login con MFA activo.
 * El temp token llega en el query string `?temp=...` desde LoginCredenciales.
 */
export default function Verificacion() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const tempToken = sp.get('temp') ?? '';
  const { finishMfa } = useAuth();

  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setAt = (i: number, v: string) => {
    const next = [...code];
    next[i] = v.slice(-1);
    setCode(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6).fill('');
    text.split('').forEach((c, i) => (next[i] = c));
    setCode(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tempToken) {
      setError('Falta el token temporal de MFA. Vuelve a iniciar sesión.');
      return;
    }
    setSubmitting(true);
    try {
      await finishMfa(tempToken, code.join(''));
      nav('/app');
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Código incorrecto');
    } finally {
      setSubmitting(false);
    }
  };

  const complete = code.every(Boolean);

  return (
    <AuthShell
      title="Verificación"
      subtitle="Introduce el código de 6 dígitos de tu app de autenticación (TOTP)."
      back={{ to: '/login/credenciales' }}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex gap-2 justify-between">
          {code.map((v, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={v}
              inputMode="numeric"
              maxLength={1}
              onChange={(e) => setAt(i, e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => onKey(i, e)}
              onPaste={onPaste}
              className="w-12 h-14 text-center text-xl font-display rounded-xl bg-white border border-ink/10 focus:outline-none focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/15 transition"
            />
          ))}
        </div>

        {error && <div className="text-[13px] text-terracotta-600">{error}</div>}

        <Button full type="submit" disabled={!complete || submitting}>
          {submitting ? 'Verificando…' : 'Continuar'}
        </Button>
      </form>
    </AuthShell>
  );
}
