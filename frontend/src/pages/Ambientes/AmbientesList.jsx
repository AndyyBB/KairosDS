import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import { claseEnlaceNombre } from '../../components/AccionPeligro';
import { useAuth } from '../../api/AuthContext';
import Buscador from '../../components/Buscador';
import { useCamposAmbientes, filtrarAmbientes } from '../../components/catalogos';
import Encabezado from '../../components/Encabezado';
import Paginacion from '../../components/Paginacion';
import { BuildingIcon } from '../../components/Iconos';

const POR_PAGINA = 20;

// Lista de ambientes: al hacer clic en el nombre se abre "Datos de ..." solo para ver.
// Editar y Eliminar son pantallas independientes del menu.
export default function AmbientesList() {
  const { tiene } = useAuth();
  // El nombre abre "Datos de ..." (solo para ver). Editar y Eliminar tienen sus propias
  // pantallas en el menu.
  const puedeVerDatos = tiene('ambientes.ver');
  const [ambientes, setAmbientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useMensajeFlash();
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);
  const [buscar, setBuscar] = useState('');
  const [aplicado, setAplicado] = useState(''); // texto buscado al presionar Buscar
  const [filtros, setFiltros] = useState({});
  const camposFiltro = useCamposAmbientes();

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

  const lista = filtrarAmbientes(ambientes, aplicado, filtros);
  const ultima = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const visibles = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div>
      <Encabezado
        icono={<BuildingIcon size={22} />}
        titulo="Lista de ambientes"
        descripcion={
          puedeVerDatos
            ? 'Haz clic en el nombre de un ambiente para ver sus datos.'
            : 'Ambientes disponibles para programar exámenes.'
        }
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <Buscador
        valor={buscar}
        onCambiar={setBuscar}
        onBuscar={() => {
          setAplicado(buscar);
          setPagina(1);
        }}
        placeholder="Buscar por nombre o ubicación..."
        campos={camposFiltro}
        filtros={filtros}
        onFiltrar={(f) => {
          setFiltros(f);
          setPagina(1);
        }}
      />

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
                  {puedeVerDatos ? (
                    <Link to={`/ambientes/datos/${a.id}`} className={claseEnlaceNombre}>{a.nombre}</Link>
                  ) : (
                    a.nombre
                  )}
                </td>
                <td className="px-4 py-2">{a.capacidad_maxima}</td>
                <td className="px-4 py-2 text-gray-500">{a.ubicacion}</td>
              </tr>
            ))}
            {!cargando && lista.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">{ambientes.length ? 'Sin resultados.' : 'Aún no hay ambientes registrados.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} ultima={ultima} total={lista.length} onCambiar={setPagina} />
    </div>
  );
}
