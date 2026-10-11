import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../api/AuthContext';
import { primerError } from '../../api/errores';
import Aviso from '../../components/Aviso';
import Paginacion from '../../components/Paginacion';

// Inscripcion de estudiantes a un examen, dentro de la pantalla de HU-04
// (ventana emergente, sin pantalla aparte). Al inscribir, el estudiante queda
// sin decidir: luego se marca Habilitado / No habilitado en HU-04.
// Las confirmaciones se hacen dentro de la fila (sin confirm() del navegador,
// que Chrome puede bloquear en silencio).
export default function ModalInscribir({ examenId, cerrado = false, onCerrar }) {
  const [huboCambios, setHuboCambios] = useState(false);
  const { tiene } = useAuth();
  const puedeInscribir = tiene('habilitaciones.registrar');
  const puedeQuitar = tiene('habilitaciones.editar');

  const [carreras, setCarreras] = useState([]);
  const [filas, setFilas] = useState([]);
  const [meta, setMeta] = useState({ pagina: 1, ultima: 1, total: 0, inscritos: 0 });
  const [buscar, setBuscar] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [carreraId, setCarreraId] = useState('');
  const [soloInscritos, setSoloInscritos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [confirmarQuitar, setConfirmarQuitar] = useState(null); // id del estudiante
  const [confirmarTodos, setConfirmarTodos] = useState(false);
  const [errorFila, setErrorFila] = useState({}); // { [estudianteId]: mensaje }

  useEffect(() => {
    api.get('/carreras')
      .then((car) => setCarreras(car.data))
      .catch((err) => setError(primerError(err)));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get(`/examenes/${examenId}/inscripciones`, {
        params: {
          page: pagina,
          buscar: busqueda || undefined,
          carrera_id: carreraId || undefined,
          solo_inscritos: soloInscritos ? 1 : undefined,
        },
      });
      setFilas(res.data.data);
      setMeta({
        pagina: res.data.current_page,
        ultima: res.data.last_page,
        total: res.data.total,
        inscritos: res.data.total_inscritos,
      });
    } catch (err) {
      setError(primerError(err));
    } finally {
      setCargando(false);
    }
  }, [examenId, pagina, busqueda, carreraId, soloInscritos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function buscarAhora(e) {
    e.preventDefault();
    setPagina(1);
    setBusqueda(buscar.trim());
  }

  async function inscribir(ids) {
    setTrabajando(true);
    setError('');
    setMensaje('');
    try {
      const res = await api.post(`/examenes/${examenId}/inscripciones`, { estudiante_ids: ids });
      setMensaje(res.data.message);
      setHuboCambios(true);
      await cargar();
    } catch (err) {
      setError(primerError(err, 'No se pudo inscribir al estudiante.'));
    } finally {
      setTrabajando(false);
    }
  }

  async function inscribirATodos() {
    setConfirmarTodos(false);
    setTrabajando(true);
    setError('');
    setMensaje('');
    try {
      const res = await api.post(`/examenes/${examenId}/inscripciones`, {
        todos: true,
        buscar: busqueda || undefined,
        carrera_id: carreraId || undefined,
      });
      setMensaje(res.data.message);
      setHuboCambios(true);
      await cargar();
    } catch (err) {
      setError(primerError(err, 'No se pudo inscribir a los estudiantes.'));
    } finally {
      setTrabajando(false);
    }
  }

  async function quitar(id) {
    setConfirmarQuitar(null);
    setTrabajando(true);
    setError('');
    setMensaje('');
    setErrorFila((prev) => ({ ...prev, [id]: undefined }));
    try {
      const res = await api.delete(`/examenes/${examenId}/inscripciones/${id}`);
      setMensaje(res.data.message);
      setHuboCambios(true);
      await cargar();
    } catch (err) {
      // El error se muestra junto al estudiante, donde el usuario está mirando.
      setErrorFila((prev) => ({ ...prev, [id]: primerError(err, 'No se pudo quitar la inscripción.') }));
    } finally {
      setTrabajando(false);
    }
  }

  const cerrarVentana = () => onCerrar(huboCambios);

  return (
    <div
      className="fixed inset-0 z-50 bg-kairos-950/40 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Inscribir estudiantes"
    >
      <div className="bg-white rounded-xl shadow-2xl ring-1 ring-kairos-100/70 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Inscribir estudiantes</h2>
          <button
            type="button"
            onClick={cerrarVentana}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-2"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <p className="text-xs text-gray-400 mb-3">
            Los estudiantes inscritos quedan sin decidir: luego márcalos como Habilitado o No habilitado en esta pantalla.
          </p>

      {cerrado && (
        <p className="text-sm text-amber-700 mb-4">Este examen ya no admite inscripciones.</p>
      )}

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <form onSubmit={buscarAhora} className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          className="input flex-1"
          placeholder="Buscar por nombre, código o documento"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
        <select
          className="input sm:w-64"
          value={carreraId}
          onChange={(e) => { setCarreraId(e.target.value); setPagina(1); }}
        >
          <option value="">Todas las carreras</option>
          {carreras.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <button type="submit" className="border border-gray-300 rounded-lg px-4 text-sm text-gray-700 py-2">
          Buscar
        </button>
      </form>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            className="h-4 w-4 accent-kairos-600"
            checked={soloInscritos}
            onChange={(e) => { setSoloInscritos(e.target.checked); setPagina(1); }}
          />
          Mostrar solo inscritos
        </label>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{meta.inscritos} inscritos en este examen</p>
          {puedeInscribir && !cerrado && (confirmarTodos ? (
            <span className="flex items-center gap-2 text-sm text-gray-600">
              ¿Inscribir a los {meta.total}?
              <button
                type="button"
                onClick={inscribirATodos}
                disabled={trabajando}
                className="bg-kairos-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setConfirmarTodos(false)}
                className="border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 text-sm"
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarTodos(true)}
              disabled={trabajando || meta.total === 0}
              className="border border-kairos-600 text-kairos-700 hover:bg-kairos-50 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Inscribir a todos
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              <th className="px-4 py-2">Estudiante</th>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2">Carrera</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{e.nombre_completo}</td>
                <td className="px-4 py-2 text-gray-500">{e.codigo_universitario}</td>
                <td className="px-4 py-2 text-gray-500">{e.documento_identidad}</td>
                <td className="px-4 py-2 text-gray-500">
                  {(e.carreras?.length ? e.carreras.map((c) => c.nombre) : [e.carrera?.nombre]).join(', ')}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      e.inscrito ? 'bg-kairos-gradient text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {e.inscrito ? 'Inscrito' : 'No inscrito'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {!cerrado && !e.inscrito && puedeInscribir && (
                    <button
                      type="button"
                      onClick={() => inscribir([e.id])}
                      disabled={trabajando}
                      className="border border-kairos-600 text-kairos-700 hover:bg-kairos-50 rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
                    >
                      Inscribir
                    </button>
                  )}
                  {!cerrado && e.inscrito && puedeQuitar && (confirmarQuitar === e.id ? (
                    <span className="inline-flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap">
                      ¿Quitar?
                      <button
                        type="button"
                        onClick={() => quitar(e.id)}
                        disabled={trabajando}
                        className="bg-red-600 text-white rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmarQuitar(null)}
                        className="border border-gray-300 text-gray-600 rounded-lg px-3 py-1 text-xs"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmarQuitar(e.id)}
                      disabled={trabajando}
                      className="border border-red-500 text-red-600 hover:bg-red-50 rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  ))}
                  {errorFila[e.id] && (
                    <p className="text-xs text-red-600 mt-1 max-w-[220px] ml-auto text-right">{errorFila[e.id]}</p>
                  )}
                </td>
              </tr>
            ))}
            {!cargando && filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No se encontraron estudiantes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={meta.pagina} ultima={meta.ultima} total={meta.total} onCambiar={setPagina} />
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={cerrarVentana}
            className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-glow whitespace-nowrap"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
