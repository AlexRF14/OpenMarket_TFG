import { Routes, Route, Navigate } from 'react-router-dom';
import LoginLanding from './pages/auth/LoginLanding';
import LoginTipo from './pages/auth/LoginTipo';
import LoginCredenciales from './pages/auth/LoginCredenciales';
import Verificacion from './pages/auth/Verificacion';
import RegistroUsuario from './pages/auth/RegistroUsuario';
import RegistroEmpresa from './pages/auth/RegistroEmpresa';
import RegistroEmpresaStripe from './pages/auth/RegistroEmpresaStripe';
import RegistroCompletado from './pages/auth/RegistroCompletado';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/app/Home';
import Chats from './pages/app/Chats';
import Carrito from './pages/app/Carrito';
import Notificaciones from './pages/app/Notificaciones';
import Ajustes from './pages/app/Ajustes';
import CuadroMandos from './pages/app/CuadroMandos';
import Operaciones from './pages/app/Operaciones';
import OperacionDetalle from './pages/app/OperacionDetalle';
import OperacionNueva from './pages/app/OperacionNueva';
import Explorador from './pages/app/Explorador';
import { AuthProvider } from './state/auth';
import { CartProvider } from './state/cart';

export default function App() {
  return (
    <AuthProvider>
    <CartProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginLanding />} />
        <Route path="/login/tipo" element={<LoginTipo />} />
        <Route path="/login/credenciales" element={<LoginCredenciales />} />
        <Route path="/login/verificacion" element={<Verificacion />} />
        <Route path="/registro/usuario" element={<RegistroUsuario />} />
        <Route path="/registro/empresa" element={<RegistroEmpresa />} />
        <Route path="/registro/empresa/stripe" element={<RegistroEmpresaStripe />} />
        <Route path="/registro/completado" element={<RegistroCompletado />} />

        {/* App — requiere autenticación */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/app" element={<Home />} />
          <Route path="/app/chats" element={<Chats />} />
          <Route path="/app/carrito" element={<Carrito />} />
          <Route path="/app/notificaciones" element={<Notificaciones />} />
          <Route path="/app/ajustes" element={<Ajustes />} />
          <Route path="/app/cuadro-mandos" element={<CuadroMandos />} />
          <Route path="/app/explorador" element={<Explorador />} />
          <Route path="/app/operaciones" element={<Operaciones />} />
          <Route path="/app/operaciones/nueva" element={<OperacionNueva />} />
          <Route path="/app/operaciones/:id" element={<OperacionDetalle />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </CartProvider>
    </AuthProvider>
  );
}
