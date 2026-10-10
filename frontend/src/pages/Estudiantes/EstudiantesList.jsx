import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Paginacion from '../../components/Paginacion';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import { IconoTitulo, StudentIcon } from '../../components/Iconos';
import { useAuth } from '../../api/AuthContext';

export default function EstudiantesList() {
  const { tiene } = useAuth();
  const [estudiantes, setEstudiantes] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });
  const [mensaje, setMensaje] = useMensajeFlash();

  async function cargar(p = 1) {
    setCargando(true);
    const res = await api.get('/estudiantes', { params: { buscar, page: p } });
    setEstudiantes(res.data.data ?? res.data);
    setMeta({ last_page: res.data.last_page ?? 1, total: res.data.total ?? 0 });
    setPagina(res.data.current_page ?? p);
    setCargando(false);
  }

  useEffect(() => {
    cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDesactivar(id) {
    if (!confirm('¿Desactivar este estudiante? El historial de ingresos se conserva.')) return;
    await api.delete(`/estudiantes/${id}`);
    cargar(pagina);
  }

  return (
    <div>
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconoTitulo><StudentIcon size={22} /></IconoTitulo>
          <h1 className="text-2xl font-semibold text-gray-800">Estudiantes</h1>
        </div>
        {tiene('estudiantes.registrar') && (
          <Link
            to="/estudiantes/nuevo"
            className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm"
          >
            Registrar estudiante
          </Link>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cargar(1)}
          placeholder="Buscar por código, documento o nombre..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button onClick={() => cargar(1)} className="border border-gray-300 rounded-lg px-4 text-sm text-gray-700">
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Carreras</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && estudiantes.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin resultados.</td></tr>
            )}
            {estudiantes.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{e.codigo_universitario}</td>
                <td className="px-4 py-2">{e.nombre_completo}</td>
                <td className="px-4 py-2">{(e.carreras?.length ? e.carreras.map((c) => c.nombre) : [e.carrera?.nombre]).join(', ')}</td>
                <td className="px-4 py-2 text-gray-500">{e.correo_institucional}</td>
                <td className="px-4 py-2 text-right space-x-3">
                  {tiene('estudiantes.editar') && (
                    <Link to={`/estudiantes/${e.id}/editar`} className="text-kairos-600 font-medium">
                      Editar
                    </Link>
                  )}
                  {tiene('estudiantes.eliminar') && (
                    <button onClick={() => handleDesactivar(e.id)} className="text-gray-400">
                      Desactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} ultima={meta.last_page} total={meta.total} onCambiar={cargar} />
    </div>
  );
}
