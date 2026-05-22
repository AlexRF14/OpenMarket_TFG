import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';

export default function LoginTipo() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const isSignup = sp.get('mode') === 'signup';

  const pickUser = () => nav(isSignup ? '/registro/usuario' : '/login/credenciales?as=user');
  const pickCompany = () => nav(isSignup ? '/registro/empresa' : '/login/credenciales?as=company');

  return (
    <AuthShell
      title={isSignup ? '¿Cómo quieres registrarte?' : '¿Cómo quieres entrar?'}
      subtitle="Elige el tipo de cuenta que mejor te represente."
      back={{ to: '/login' }}
    >
      <div className="space-y-3">
        <button
          onClick={pickUser}
          className="group w-full text-left p-5 rounded-2xl bg-white border border-ink/10 hover:border-terracotta-500 hover:shadow-soft transition"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-terracotta-100 text-terracotta-600 grid place-items-center text-lg font-display">
              U
            </div>
            <div className="flex-1">
              <div className="font-display text-lg">
                {isSignup ? 'Registrarse como usuario' : 'Iniciar como usuario'}
              </div>
              <p className="text-sm text-ink/60 mt-0.5">
                Para personas que quieren comprar, vender o negociar a título individual.
              </p>
            </div>
            <span className="text-ink/30 group-hover:text-terracotta-600 transition">→</span>
          </div>
        </button>

        <button
          onClick={pickCompany}
          className="group w-full text-left p-5 rounded-2xl bg-white border border-ink/10 hover:border-terracotta-500 hover:shadow-soft transition"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-sage-100 text-sage-600 grid place-items-center text-lg font-display">
              E
            </div>
            <div className="flex-1">
              <div className="font-display text-lg">
                {isSignup ? 'Registrarse como empresa' : 'Iniciar como empresa'}
              </div>
              <p className="text-sm text-ink/60 mt-0.5">
                Incluye perfil corporativo, operaciones B2B y verificación con Stripe.
              </p>
            </div>
            <span className="text-ink/30 group-hover:text-terracotta-600 transition">→</span>
          </div>
        </button>
      </div>

      <p className="mt-8 text-sm text-ink/60">
        {isSignup ? (
          <>¿Ya tienes cuenta? <Link to="/login" className="text-terracotta-600 font-medium hover:underline">Inicia sesión</Link></>
        ) : (
          <>¿No tienes cuenta? <Link to="/login/tipo?mode=signup" className="text-terracotta-600 font-medium hover:underline">Regístrate</Link></>
        )}
      </p>
    </AuthShell>
  );
}
