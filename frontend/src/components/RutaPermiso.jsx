import { useAuth } from '../api/AuthContext';

export const MENSAJE_SIN_PERMISO = 'No tiene permisos para realizar esta acción.';

// HU-17 (9): si el usuario entra a una funcion sin permiso, se muestra el mensaje.
export default function RutaPermiso({ permiso, soloAdmin = false, children }) {
  const { tiene, esAdministrador } = useAuth();
  const permitido = soloAdmin ? esAdministrador : tiene(permiso);

  if (!permitido) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold">
        {MENSAJE_SIN_PERMISO}
      </div>
    );
  }

  return children;
}
