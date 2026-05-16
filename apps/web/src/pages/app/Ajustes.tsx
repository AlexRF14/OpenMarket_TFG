import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '../../state/auth';
import { getSettings, updateSettings, changePassword, changeEmail, type DeepPartial } from '../../lib/settings-api';
import { ApiException } from '../../lib/api-client';
import type { UserSettings } from '../../lib/api-types';

function applyAccessibility(a: UserSettings['accessibility']) {
  const html = document.documentElement;
  html.classList.toggle('reduce-motion', a.reduce_motion);
  html.classList.toggle('high-contrast', a.high_contrast);
  html.classList.toggle('large-text', a.large_text);
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition disabled:opacity-50 ${checked ? 'bg-terracotta-500' : 'bg-ink/15'}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-ink/[.06] last:border-0">
      <div className="min-w-0">
        <div className="text-[14px] font-medium">{label}</div>
        {desc && <div className="text-[12.5px] text-ink/55 mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function InlineForm({
  title,
  fields,
  onSubmit,
  onCancel,
  submitting,
  error,
  success,
}: {
  title: string;
  fields: Array<{ name: string; label: string; type: string; placeholder?: string }>;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
  success: string | null;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 rounded-xl bg-[#FAF7F1] border border-ink/10 space-y-3">
      <div className="text-[13px] font-medium text-ink/70">{title}</div>
      {fields.map((f) => (
        <div key={f.name}>
          <label className="block text-[12px] text-ink/55 mb-1">{f.label}</label>
          <input
            type={f.type}
            placeholder={f.placeholder}
            value={values[f.name] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            required
            className="w-full h-9 px-3 rounded-lg border border-ink/10 bg-white text-[13.5px] outline-none focus:border-terracotta-500"
          />
        </div>
      ))}
      {error && <div className="text-[12.5px] text-terracotta-600">{error}</div>}
      {success && <div className="text-[12.5px] text-sage-700">{success}</div>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-4 rounded-lg bg-ink text-cream text-[13px] font-medium hover:bg-terracotta-600 transition disabled:opacity-60"
        >
          {submitting ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-4 rounded-lg border border-ink/10 text-[13px] hover:border-ink/30 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function Ajustes() {
  const { name, account, profile, refreshProfile } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getSettings();
        if (!cancelled) {
          setSettings(s);
          applyAccessibility(s.accessibility);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiException ? err.message : 'Error cargando ajustes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = async (delta: DeepPartial<UserSettings>) => {
    setSaving(true);
    setError(null);
    const prev = settings;
    if (settings) {
      const next = {
        ...settings,
        notifications: { ...settings.notifications, ...(delta.notifications ?? {}) },
        privacy: { ...settings.privacy, ...(delta.privacy ?? {}) },
        accessibility: { ...settings.accessibility, ...(delta.accessibility ?? {}) },
      };
      setSettings(next);
      if (delta.accessibility) applyAccessibility(next.accessibility);
    }
    try {
      const fresh = await updateSettings(delta);
      setSettings(fresh);
      if (delta.accessibility) applyAccessibility(fresh.accessibility);
    } catch (err) {
      setSettings(prev);
      if (prev) applyAccessibility(prev.accessibility);
      setError(err instanceof ApiException ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (values: Record<string, string>) => {
    if (values['newPassword'] !== values['confirmPassword']) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    setPasswordSubmitting(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await changePassword(values['currentPassword'], values['newPassword']);
      setPasswordSuccess('Contraseña actualizada correctamente');
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordError(err instanceof ApiException ? err.message : 'Error cambiando contraseña');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleEmailSubmit = async (values: Record<string, string>) => {
    setEmailSubmitting(true);
    setEmailError(null);
    setEmailSuccess(null);
    try {
      await changeEmail(values['newEmail'], values['currentPassword']);
      setEmailSuccess(`Correo actualizado a ${values['newEmail']}`);
      setShowEmailForm(false);
      void refreshProfile();
    } catch (err) {
      setEmailError(err instanceof ApiException ? err.message : 'Error cambiando correo');
    } finally {
      setEmailSubmitting(false);
    }
  };

  if (loading) {
    return <div className="px-8 py-16 text-center text-ink/50">Cargando ajustes…</div>;
  }

  if (!settings) {
    return (
      <div className="px-8 py-16 text-center">
        <div className="text-ink/60">{error ?? 'No se pudieron cargar los ajustes.'}</div>
      </div>
    );
  }

  const initial = (name || profile?.correo || '?')[0]?.toUpperCase() ?? '?';

  return (
    <div className="px-8 py-8 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-[32px] tracking-tight">Ajustes</h1>
        {saving && <span className="text-[12px] text-ink/50">Guardando…</span>}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 px-4 py-3 text-[13px]">
          {error}
        </div>
      )}

      <section className="rounded-2xl bg-white border border-ink/10 p-5 mb-5">
        <h2 className="font-display text-[18px] mb-3">Perfil</h2>
        <div className="flex items-center gap-4 pb-4 border-b border-ink/[.06]">
          <div className="w-16 h-16 rounded-full bg-sage-100 text-sage-600 grid place-items-center font-display text-2xl">
            {initial}
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-medium">{name || '—'}</div>
            <div className="text-[12.5px] text-ink/55 capitalize">{account ?? '—'}</div>
          </div>
        </div>

        <Row label="Correo" desc="Usado para iniciar sesión y recibir avisos">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-ink/70">{profile?.correo ?? '—'}</span>
            <button
              onClick={() => { setShowEmailForm((v) => !v); setEmailError(null); setEmailSuccess(null); }}
              className="text-[12.5px] text-terracotta-600 hover:underline"
            >
              {showEmailForm ? 'Cancelar' : 'Cambiar'}
            </button>
          </div>
        </Row>
        {emailSuccess && !showEmailForm && (
          <div className="mt-1 text-[12px] text-sage-700">{emailSuccess}</div>
        )}
        {showEmailForm && (
          <InlineForm
            title="Cambiar correo"
            fields={[
              { name: 'newEmail', label: 'Nuevo correo', type: 'email', placeholder: 'nuevo@ejemplo.com' },
              { name: 'currentPassword', label: 'Contraseña actual', type: 'password', placeholder: '••••••••' },
            ]}
            onSubmit={handleEmailSubmit}
            onCancel={() => { setShowEmailForm(false); setEmailError(null); }}
            submitting={emailSubmitting}
            error={emailError}
            success={null}
          />
        )}

        <Row label="Contraseña">
          <button
            onClick={() => { setShowPasswordForm((v) => !v); setPasswordError(null); setPasswordSuccess(null); }}
            className="text-[13px] text-terracotta-600 hover:underline"
          >
            {showPasswordForm ? 'Cancelar' : 'Cambiar'}
          </button>
        </Row>
        {passwordSuccess && !showPasswordForm && (
          <div className="mt-1 text-[12px] text-sage-700">{passwordSuccess}</div>
        )}
        {showPasswordForm && (
          <InlineForm
            title="Cambiar contraseña"
            fields={[
              { name: 'currentPassword', label: 'Contraseña actual', type: 'password', placeholder: '••••••••' },
              { name: 'newPassword', label: 'Nueva contraseña', type: 'password', placeholder: 'Mínimo 8 caracteres' },
              { name: 'confirmPassword', label: 'Confirmar nueva contraseña', type: 'password', placeholder: '••••••••' },
            ]}
            onSubmit={handlePasswordSubmit}
            onCancel={() => { setShowPasswordForm(false); setPasswordError(null); }}
            submitting={passwordSubmitting}
            error={passwordError}
            success={null}
          />
        )}
      </section>

      <section className="rounded-2xl bg-white border border-ink/10 p-5 mb-5">
        <h2 className="font-display text-[18px] mb-3">Notificaciones</h2>
        <Row label="Correo electrónico" desc="Resumen diario de actividad">
          <Toggle checked={settings.notifications.email} disabled={saving} onChange={(v) => patch({ notifications: { email: v } })} />
        </Row>
        <Row label="Push del navegador">
          <Toggle checked={settings.notifications.push} disabled={saving} onChange={(v) => patch({ notifications: { push: v } })} />
        </Row>
        <Row label="Mensajes de chat">
          <Toggle checked={settings.notifications.chat_messages} disabled={saving} onChange={(v) => patch({ notifications: { chat_messages: v } })} />
        </Row>
        <Row label="Operaciones" desc="Cambios de estado, contraofertas, etc.">
          <Toggle checked={settings.notifications.operations} disabled={saving} onChange={(v) => patch({ notifications: { operations: v } })} />
        </Row>
        <Row label="Marketing">
          <Toggle checked={settings.notifications.marketing} disabled={saving} onChange={(v) => patch({ notifications: { marketing: v } })} />
        </Row>
      </section>

      <section className="rounded-2xl bg-white border border-ink/10 p-5 mb-5">
        <h2 className="font-display text-[18px] mb-3">Privacidad</h2>
        <Row label="Perfil público" desc="Otras cuentas pueden ver tu perfil">
          <Toggle checked={settings.privacy.public_profile} disabled={saving} onChange={(v) => patch({ privacy: { public_profile: v } })} />
        </Row>
        <Row label="Permitir que me escriban" desc="Cualquier cuenta puede iniciar un chat contigo">
          <Toggle checked={settings.privacy.allow_messages} disabled={saving} onChange={(v) => patch({ privacy: { allow_messages: v } })} />
        </Row>
        <Row label="Mostrar valoraciones en el perfil">
          <Toggle checked={settings.privacy.show_valoraciones} disabled={saving} onChange={(v) => patch({ privacy: { show_valoraciones: v } })} />
        </Row>
      </section>

      <section className="rounded-2xl bg-white border border-ink/10 p-5 mb-5">
        <h2 className="font-display text-[18px] mb-3">Accesibilidad</h2>
        <Row label="Reducir movimiento" desc="Elimina transiciones y animaciones">
          <Toggle checked={settings.accessibility.reduce_motion} disabled={saving} onChange={(v) => patch({ accessibility: { reduce_motion: v } })} />
        </Row>
        <Row label="Alto contraste" desc="Aumenta el contraste visual">
          <Toggle checked={settings.accessibility.high_contrast} disabled={saving} onChange={(v) => patch({ accessibility: { high_contrast: v } })} />
        </Row>
        <Row label="Texto más grande" desc="Aumenta el tamaño base de texto un 12%">
          <Toggle checked={settings.accessibility.large_text} disabled={saving} onChange={(v) => patch({ accessibility: { large_text: v } })} />
        </Row>
      </section>

      <section className="rounded-2xl bg-white border border-terracotta-500/20 p-5">
        <h2 className="font-display text-[18px] mb-1 text-terracotta-600">Zona crítica</h2>
        <p className="text-[13px] text-ink/60 mb-3">Acciones irreversibles. Tómate tu tiempo.</p>
        <div className="flex gap-3">
          <button className="h-10 px-4 rounded-lg bg-white border border-ink/10 text-[13.5px] hover:border-ink/30" disabled title="Pendiente endpoint RGPD">
            Exportar mis datos (RGPD)
          </button>
          <button className="h-10 px-4 rounded-lg bg-terracotta-500 text-cream text-[13.5px] hover:bg-terracotta-600" disabled title="Pendiente endpoint">
            Eliminar cuenta
          </button>
        </div>
      </section>

      <div className="h-16" />
    </div>
  );
}
