import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import { primeraPantalla } from './navegacion';
import { MENSAJE_SIN_PERMISO } from './RutaPermiso';

// Al entrar a un modulo (por ejemplo /estudiantes), el sistema redirige a su
// primera pantalla permitida (Registrar estudiante).
export default function EntrarModulo({ base }) {
  const { tiene, esAdministrador, rol } = useAuth();
  const destino = primeraPantalla(base, tiene, esAdministrador, rol);

  if (!destino) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold">
        {MENSAJE_SIN_PERMISO}
      </div>
    );
  }
  return <Navigate to={destino} replace />;
}

// Redireccion de rutas antiguas con parametro (ej. /estudiantes/5/editar -> /estudiantes/editar/5).
export function RedirigirConId({ a }) {
  const params = useParams();
  const id = params.id ?? params.examenId;
  return <Navigate to={a.replace(':id', id)} replace />;
}
