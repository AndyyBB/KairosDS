import { useEffect, useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import Paginacion from '../../components/Paginacion';
import { HistorialIcon } from '../../components/Iconos';

const POR_PAGINA = 10;
const nombreRol = (n) => (n ? n.charAt(0).toUpperCase() + n.slice(1) : '');

// HU-36: Consulta del historial de permisos por rol (solo consulta; los permisos se
// configuran en "Roles y permisos", HU-17).
export default function HistorialPermisos() {
  const [roles, setRoles] = useState([]);
  const [rolId, setRolId] = useState(null);
  const [periodos, setPeriodos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [fecha, setFecha] = useState('');
  const [enFecha, setEnFecha] = useState(null); // { fecha, permisos }
  const [errorFecha, setErrorFecha] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/roles')
      .then((res) => {
        setRoles(res.data);
        if (res.data.length) setRolId(res.data[0].id);
      })
      .catch((err) => setError(primerError(err)));
  }, []);

  // Al seleccionar un rol se muestra su historial (del periodo mas reciente al mas antiguo).
  useEffect(() => {
    if (!rolId) return;
    setCargando(true);
    setEnFecha(null);
    setErrorFecha('');
    setPagina(1);
    api
      .get(`/roles/${rolId}/permisos/historial`)
      .then((res) => setPeriodos(res.data.periodos ?? []))
      .catch((err) => {
        setPeriodos([]);
        setError(primerError(err, 'No se pudo cargar el historial de permisos.'));
      })
      .finally(() => setCargando(false));
  }, [rolId]);

  // Permisos que el rol tenia en una fecha (al final de ese dia).
  async function consultar(e) {
    e.preventDefault();
    setErrorFecha('');
    setEnFecha(null);
    if (!fecha) {
      setErrorFecha('Seleccione una fecha.');
      return;
    }
    try {
      const res = await api.get(`/roles/${rolId}/permisos/historial`, { params: { fecha } });
      setEnFecha({ fecha: res.data.fecha, permisos: res.data.en_fecha ?? [] });
    } catch (err) {
      setErrorFecha(primerError(err, 'No se pudo consultar la fecha.'));
    }
  }

  const ultima = Math.max(1, Math.ceil(periodos.length / POR_PAGINA));
  const visibles = periodos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const rol = nombreRol(roles.find((r) => r.id === rolId)?.nombre);

  return (
    <div>
      <Encabezado
        icono={<HistorialIcon size={22} />}
        titulo="Historial de permisos"
        descripcion="Selecciona un rol para ver desde cuándo y hasta cuándo tuvo cada permiso, y quién lo asignó o lo retiró."
      />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
        <p className="text-sm text-gray-600 mb-1">Rol</p>
        <div className="inline-flex flex-wrap rounded-lg border border-gray-300 overflow-hidden mb-5">
          {roles.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRolId(r.id)}
              className={`px-4 py-2 text-sm ${i > 0 ? 'border-l border-gray-300' : ''} ${
                rolId === r.id ? 'bg-kairos-50 text-kairos-700 font-semibold' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {nombreRol(r.nombre)}
            </button>
          ))}
        </div>

        <form onSubmit={consultar} className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
          <div>
            <label htmlFor="fecha-permisos" className="block text-sm font-medium text-gray-600 mb-1">
              Consultar permisos a la fecha
            </label>
            <input
              id="fecha-permisos"
              type="date"
              className="input"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setErrorFecha('');
              }}
            />
          </div>
          <button
            type="submit"
            className="border border-kairos-600 text-kairos-700 text-sm font-medium rounded-lg px-5 py-2 hover:bg-kairos-50"
          >
            Consultar
          </button>
        </form>
        {errorFecha && <p className="text-sm text-red-600 -mt-2 mb-3">{errorFecha}</p>}
        {enFecha && (
          <div className="mb-4 rounded-lg border border-kairos-100 bg-kairos-50/60 px-4 py-3 text-sm">
            {enFecha.permisos.length ? (
              <>
                <p className="font-medium text-kairos-800 mb-2">Permisos que tenía el rol {rol} el {enFecha.fecha}:</p>
                <div className="flex flex-wrap gap-2">
                  {enFecha.permisos.map((p) => (
                    <span key={p.id} className="rounded-full bg-white border border-kairos-200 px-3 py-1 text-xs text-kairos-800">
                      {p.modulo} · {p.accion}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-600">El rol no tenía permisos registrados en esa fecha.</p>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-kairos-50/80 text-kairos-800 text-left">
              <tr>
                <th className="px-3 py-2">Módulo</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Vigente desde</th>
                <th className="px-3 py-2">Vigente hasta</th>
                <th className="px-3 py-2">Asignado por</th>
                <th className="px-3 py-2">Retirado por</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{p.modulo}</td>
                  <td className="px-3 py-2">{p.accion}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.desde}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {p.hasta ?? <span className="text-kairos-700 font-medium">Vigente</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{p.asignado_por ?? 'Configuración inicial'}</td>
                  <td className="px-3 py-2 text-gray-600">{p.hasta ? p.retirado_por ?? '—' : '—'}</td>
                </tr>
              ))}
              {!cargando && periodos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                    No hay permisos registrados para este rol.
                  </td>
                </tr>
              )}
              {cargando && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">Cargando...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginacion pagina={pagina} ultima={ultima} total={periodos.length} onCambiar={setPagina} />
      </div>
    </div>
  );
}
