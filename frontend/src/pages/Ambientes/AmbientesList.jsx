import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import { claseEnlaceNombre } from '../../components/AccionPeligro';
import { useAuth } from '../../api/AuthContext';
import Encabezado from '../../components/Encabezado';
import Paginacion from '../../components/Paginacion';
import { BuildingIcon } from '../../components/Iconos';

const POR_PAGINA = 20;

// Lista de ambientes. Al hacer clic en el nombre se abre "Editar ambiente",
// donde tambien se puede eliminar definitivamente.
export default function AmbientesList() {
  const { tiene } = useAuth();
  const puedeEditar = tiene('ambientes.editar') || tiene('ambientes.eliminar');
  const [ambientes, setAmbientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useMensajeFlash();
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);

  async function cargar() {
    setCargando(true);
    try {
      const res = await api.get('/ambientes', { params: { solo_activos: 0 } });
      setAmbientes(res.data);
    } catch (err) {
      setError(primerError(err, 'No se pudo cargar la lista de ambientes.'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const ultima = Math.max(1, Math.ceil(ambientes.length / POR_PAGINA));
  const visibles = ambientes.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div>
      <Encabezado
        icono={<BuildingIcon size={22} />}
        titulo="Lista de ambientes"
        descripcion={
          puedeEditar
            ? 'Haz clic en el nombre de un ambiente para ver sus datos, editarlo o eliminarlo.'
            : 'Ambientes disponibles para programar exámenes.'
        }
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Capacidad</th>
              <th className="px-4 py-2">Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  {puedeEditar ? (
                    <Link to={`/ambientes/datos/${a.id}`} className={claseEnlaceNombre}>{a.nombre}</Link>
                  ) : (
                    a.nombre
                  )}
                  {a.activo === false && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactivo</span>
                  )}
                </td>
                <td className="px-4 py-2">{a.capacidad_maxima}</td>
                <td className="px-4 py-2 text-gray-500">{a.ubicacion}</td>
              </tr>
            ))}
            {!cargando && ambientes.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Aún no hay ambientes registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} ultima={ultima} total={ambientes.length} onCambiar={setPagina} />
    </div>
  );
}
