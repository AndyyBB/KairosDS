import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Paginacion from '../../components/Paginacion';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import Buscador from '../../components/Buscador';
import { StudentIcon } from '../../components/Iconos';
import CodigoQR from '../../components/CodigoQR';
import ModalQR from '../../components/ModalQR';
import { claseEnlaceNombre } from '../../components/AccionPeligro';
import { useAuth } from '../../api/AuthContext';

// Lista de estudiantes. Al hacer clic en el nombre se abre "Editar estudiante",
// donde tambien se puede eliminar definitivamente (HU-06 y HU-07).
export default function EstudiantesList() {
  const { tiene } = useAuth();
  const puedeEditar = tiene('estudiantes.editar') || tiene('estudiantes.eliminar');
  const [estudiantes, setEstudiantes] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });
  const [mensaje, setMensaje] = useMensajeFlash();
  const [error, setError] = useState('');
  const [verQr, setVerQr] = useState(null);

  async function cargar(p = 1) {
    setCargando(true);
    try {
      const res = await api.get('/estudiantes', { params: { buscar: buscar || undefined, page: p, solo_activos: 0 } });
      if (p > 1 && (res.data.data ?? []).length === 0) return cargar(p - 1);
      setEstudiantes(res.data.data ?? res.data);
      setMeta({ last_page: res.data.last_page ?? 1, total: res.data.total ?? 0 });
      setPagina(res.data.current_page ?? p);
    } catch (err) {
      setError(primerError(err, 'No se pudo cargar la lista de estudiantes.'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columnas = 6;

  return (
    <div>
      <Encabezado
        icono={<StudentIcon size={22} />}
        titulo="Lista de estudiantes"
        descripcion={
          puedeEditar
            ? 'Haz clic en el nombre de un estudiante para ver sus datos, editarlo o eliminarlo.'
            : 'Estudiantes registrados en el sistema.'
        }
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <Buscador
        valor={buscar}
        onCambiar={setBuscar}
        onBuscar={() => cargar(1)}
        placeholder="Buscar por código, documento o nombre..."
      />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Carreras</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">QR</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={columnas} className="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && estudiantes.length === 0 && (
              <tr><td colSpan={columnas} className="px-4 py-6 text-center text-gray-400">Sin resultados.</td></tr>
            )}
            {!cargando && estudiantes.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{e.codigo_universitario}</td>
                <td className="px-4 py-2">{e.documento_identidad}</td>
                <td className="px-4 py-2">
                  {puedeEditar ? (
                    <Link to={`/estudiantes/datos/${e.id}`} className={claseEnlaceNombre}>
                      {e.nombre_completo}
                    </Link>
                  ) : (
                    e.nombre_completo
                  )}
                  {e.activo === false && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactivo</span>
                  )}
                </td>
                <td className="px-4 py-2">{(e.carreras?.length ? e.carreras.map((c) => c.nombre) : [e.carrera?.nombre]).join(', ')}</td>
                <td className="px-4 py-2 text-gray-500">{e.correo_institucional}</td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setVerQr(e)}
                    title="Ver código QR"
                    aria-label={`Ver código QR de ${e.nombre_completo}`}
                    className="block rounded border border-gray-200 hover:border-kairos-600 p-0.5"
                  >
                    <CodigoQR valor={e.codigo_universitario} tamano={40} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} ultima={meta.last_page} total={meta.total} onCambiar={cargar} />

      {verQr && <ModalQR estudiante={verQr} onCerrar={() => setVerQr(null)} />}
    </div>
  );
}
