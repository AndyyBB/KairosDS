import { Navigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import { opcionPermitida } from './navegacion';

export const MENSAJE_SIN_PERMISO = 'No tiene permisos para realizar esta acción.';

// HU-17 (9): si el usuario entra a una funcion sin permiso, se muestra el mensaje.
// - permiso: uno o varios permisos (basta con tener uno).
// - roles: roles que siempre pueden entrar (ademas de quienes tengan el permiso).
// - soloAdmin: solo el administrador.
// - alInicio: en lugar del mensaje, el sistema redirige a la pantalla de Inicio (HU-27).
export default function RutaPermiso({ permiso, roles, soloAdmin = false, alInicio = false, children }) {
  const { tiene, esAdministrador, rol } = useAuth();
  const lista = permiso ? (Array.isArray(permiso) ? permiso : [permiso]) : [];
  const permitido = soloAdmin
    ? esAdministrador
    : lista.length
      ? lista.some((p) => opcionPermitida({ permiso: p, roles }, tiene, esAdministrador, rol))
      : opcionPermitida({ roles }, tiene, esAdministrador, rol);

  if (!permitido) {
    if (alInicio) return <Navigate to="/" replace />;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold">
        {MENSAJE_SIN_PERMISO}
      </div>
    );
  }

  return children;
}
