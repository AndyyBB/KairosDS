import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../api/AuthContext';
import { primerError } from '../../api/errores';
import { fechaDMA, horaHM } from '../../api/formato';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import Paginacion from '../../components/Paginacion';
import { UserMinusIcon, UserPlusIcon } from '../../components/Iconos';

// HU-04 (Sprint 4, observacion 3 de la licenciada): la inscripcion se maneja en DOS
// pantallas independientes del menu Examenes:
// - "Inscribir estudiantes": solo inscribe (ya no tiene botones "Quitar").
// - "Desinscribir estudiantes": solo quita inscripciones (estudiantes seleccionados).
// Despues de inscribir, cada estudiante se marca como Habilitado o No habilitado en la
// pantalla "Habilitar/Deshabilitar estudiantes"; el Control de ingreso solo deja entrar a inscritos habilitados.
const TEXTOS = {
  inscribir: {
    titulo: 'Inscribir estudiantes',
    descripcion: 'Elige un examen y registra a los estudiantes que lo van a rendir.',
    ayuda: [
      'Inscribir es registrar qué estudiantes van a rendir el examen.',
      'Solo los estudiantes inscritos aparecen en "Habilitar/Deshabilitar estudiantes", donde se decide si pueden ingresar, y solo ellos pueden registrar su ingreso el día del examen.',
      'Para quitar a un estudiante de un examen usa la pantalla "Desinscribir estudiantes".',
    ],
    vacio: 'Se mostrarán los estudiantes para inscribirlos en ese examen.',
    ruta: '/examenes/inscribir',
    Icono: UserPlusIcon,
  },
  desinscribir: {
    titulo: 'Desinscribir estudiantes',
    descripcion: 'Elige un examen, marca a los estudiantes que ya no lo rendirán y presiona "Desinscribir seleccionados".',
    ayuda: [
      'Desinscribir quita la inscripción del estudiante en el examen y también su habilitación.',
      'No se puede desinscribir a un estudiante que ya registró su ingreso al examen.',
      'Para inscribir estudiantes usa la pantalla "Inscribir estudiantes".',
    ],
    vacio: 'Se mostrarán los estudiantes inscritos en ese examen.',
    ruta: '/examenes/desinscribir',
    Icono: UserMinusIcon,
  },
};

export default function InscribirEstudiantes({ modo = 'inscribir' }) {
  const { examenId } = useParams();
  const navigate = useNavigate();
  const [examenes, setExamenes] = useState([]);
  const [examen, setExamen] = useState(null);
  const [error, setError] = useState('');
  const textos = TEXTOS[modo];
  const { Icono } = textos;

  // Examenes que todavia admiten cambios de inscripcion (no finalizados ni cancelados).
  useEffect(() => {
    api
      .get('/examenes', { params: { per_page: 100 } })
      .then((res) => {
        const lista = (res.data.data ?? res.data).filter((ex) => !['finalizado', 'cancelado'].includes(ex.estado_actual));
        lista.sort((a, b) => `${a.fecha} ${a.hora_inicio}`.localeCompare(`${b.fecha} ${b.hora_inicio}`));
        setExamenes(lista);
      })
      .catch((err) => setError(primerError(err, 'No se pudo cargar la lista de exámenes.')));
  }, []);

  useEffect(() => {
    setExamen(null);
    if (!examenId) return;
    api
      .get(`/examenes/${examenId}`)
      .then((res) => setExamen(res.data))
      .catch((err) => setError(primerError(err, 'No se pudo cargar el examen.')));
  }, [examenId]);

  const cerrado = ['finalizado', 'cancelado'].includes(examen?.estado_actual);
  const etiqueta = (ex) =>
    `${ex.materia?.nombre} — ${fechaDMA(ex.fecha)} ${horaHM(ex.hora_inicio)} — ${
      ex.ambientes?.length ? ex.ambientes.map((a) => a.nombre).join(', ') : ex.ambiente?.nombre ?? ''
    }`;

  return (
    <div className="max-w-6xl">
      <Encabezado icono={<Icono size={22} />} titulo={textos.titulo} descripcion={textos.descripcion} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      {/* Sprint 4: explicacion de para que sirve la pantalla (observacion 3: "aclarar esta HU"). */}
      <div className="mb-5 rounded-xl border border-kairos-100 bg-kairos-50/60 px-5 py-4 text-sm text-kairos-900">
        <p className="font-semibold mb-1">¿Para qué sirve esta pantalla?</p>
        <ul className="list-disc pl-5 space-y-0.5">
          {textos.ayuda.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
        <label htmlFor="examen-inscribir" className="block text-sm font-medium text-gray-600 mb-1">Examen</label>
        <select
          id="examen-inscribir"
          className="input"
          value={examenId ?? ''}
          onChange={(e) => navigate(e.target.value ? `${textos.ruta}/${e.target.value}` : textos.ruta)}
        >
          <option value="">Seleccione un examen</option>
          {examenes.map((ex) => (
            <option key={ex.id} value={String(ex.id)}>{etiqueta(ex)}</option>
          ))}
          {examen && !examenes.some((ex) => String(ex.id) === String(examen.id)) && (
            <option value={String(examen.id)}>{etiqueta(examen)}</option>
          )}
        </select>
      </div>

      {!examenId && (
        <div className="rounded-xl border border-dashed border-kairos-200 bg-white/60 px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kairos-50 text-kairos-600">
            <Icono size={24} />
          </div>
          <p className="font-medium text-gray-700">Selecciona un examen</p>
          <p className="text-sm text-gray-500 mt-1">{textos.vacio}</p>
        </div>
      )}

      {examenId && (
        <>
          {modo === 'inscribir' ? (
            <PanelInscribir key={examenId} examenId={examenId} cerrado={cerrado} />
          ) : (
            <PanelDesinscribir key={examenId} examenId={examenId} cerrado={cerrado} />
          )}
        </>
      )}
    </div>
  );
}

// Busqueda y lista paginada de estudiantes del examen (comun a las dos pantallas).
function useEstudiantesDelExamen(examenId, filtroInicial) {
  const [carreras, setCarreras] = useState([]);
  const [filas, setFilas] = useState([]);
  const [meta, setMeta] = useState({ pagina: 1, ultima: 1, total: 0, inscritos: 0 });
  const [buscar, setBuscar] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [carreraId, setCarreraId] = useState('');
  const [mostrar, setMostrar] = useState(filtroInicial); // todos | no_inscritos | inscritos
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  useEffect(() => {
    api.get('/carreras').then((car) => setCarreras(car.data)).catch(() => setCarreras([]));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get(`/examenes/${examenId}/inscripciones`, {
        params: {
          page: pagina,
          buscar: busqueda || undefined,
          carrera_id: carreraId || undefined,
          solo_inscritos: mostrar === 'inscritos' ? 1 : undefined,
          solo_no_inscritos: mostrar === 'no_inscritos' ? 1 : undefined,
        },
      });
      setFilas(res.data.data);
      setMeta({
        pagina: res.data.current_page,
        ultima: res.data.last_page,
        total: res.data.total,
        inscritos: res.data.total_inscritos,
      });
      setErrorCarga('');
    } catch (err) {
      setErrorCarga(primerError(err));
    } finally {
      setCargando(false);
    }
  }, [examenId, pagina, busqueda, carreraId, mostrar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return {
    carreras, filas, meta, buscar, setBuscar, busqueda, setBusqueda, carreraId, setCarreraId,
    mostrar, setMostrar, pagina, setPagina, cargando, errorCarga, cargar,
  };
}

function carrerasDe(e) {
  return (e.carreras?.length ? e.carreras.map((c) => c.nombre) : [e.carrera?.nombre]).filter(Boolean).join(', ');
}

function Busqueda({ d, opcionesMostrar }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        d.setPagina(1);
        d.setBusqueda(d.buscar.trim());
      }}
      className="flex flex-col lg:flex-row gap-2 mb-3"
    >
      <input
        className="input lg:flex-1"
        placeholder="Buscar por nombre, código o documento"
        value={d.buscar}
        onChange={(e) => d.setBuscar(e.target.value)}
      />
      <select
        className="input lg:w-56"
        aria-label="Carrera"
        value={d.carreraId}
        onChange={(e) => {
          d.setCarreraId(e.target.value);
          d.setPagina(1);
        }}
      >
        <option value="">Todas las carreras</option>
        {d.carreras.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      {opcionesMostrar && (
        <select
          className="input lg:w-56"
          aria-label="Mostrar"
          value={d.mostrar}
          onChange={(e) => {
            d.setMostrar(e.target.value);
            d.setPagina(1);
          }}
        >
          {opcionesMostrar.map(([v, t]) => (
            <option key={v} value={v}>{t}</option>
          ))}
        </select>
      )}
      <button type="submit" className="border border-gray-300 rounded-lg px-4 text-sm text-gray-700 py-2">
        Buscar
      </button>
    </form>
  );
}

// ---------------- Inscribir estudiantes ----------------
function PanelInscribir({ examenId, cerrado = false }) {
  const { tiene } = useAuth();
  const puedeInscribir = tiene('habilitaciones.registrar');
  const d = useEstudiantesDelExamen(examenId, 'no_inscritos');
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [confirmarTodos, setConfirmarTodos] = useState(false);

  async function inscribir(body, respaldo) {
    setConfirmarTodos(false);
    setTrabajando(true);
    setError('');
    setMensaje('');
    try {
      const res = await api.post(`/examenes/${examenId}/inscripciones`, body);
      setMensaje(res.data.message);
      await d.cargar();
    } catch (err) {
      setError(primerError(err, respaldo));
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5">
      {cerrado && <p className="text-sm text-amber-700 mb-4">Este examen ya finalizó: ya no admite inscripciones.</p>}
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error || d.errorCarga} tipo="error" onCerrar={() => setError('')} />

      <Busqueda
        d={d}
        opcionesMostrar={[
          ['no_inscritos', 'Solo los no inscritos'],
          ['inscritos', 'Solo los inscritos'],
          ['todos', 'Todos los estudiantes'],
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-kairos-700">{d.meta.inscritos}</span> inscritos en este examen
        </p>
        {puedeInscribir && !cerrado && d.mostrar !== 'inscritos' && (confirmarTodos ? (
          <span className="flex items-center gap-2 text-sm text-gray-600">
            ¿Inscribir a los {d.meta.total} estudiantes de la búsqueda?
            <button
              type="button"
              onClick={() => inscribir({ todos: true, buscar: d.busqueda || undefined, carrera_id: d.carreraId || undefined }, 'No se pudo inscribir a los estudiantes.')}
              disabled={trabajando}
              className="bg-kairos-gradient text-white rounded-lg px-3 py-1 text-xs font-medium"
            >
              Sí
            </button>
            <button type="button" onClick={() => setConfirmarTodos(false)} className="border border-gray-300 rounded-lg px-3 py-1 text-xs">
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmarTodos(true)}
            disabled={trabajando || d.meta.total === 0}
            className="border border-kairos-600 text-kairos-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-kairos-50 disabled:opacity-50"
          >
            Inscribir a todos
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
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
            {d.filas.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{e.nombre_completo}</td>
                <td className="px-4 py-2 text-gray-500">{e.codigo_universitario}</td>
                <td className="px-4 py-2 text-gray-500">{e.documento_identidad}</td>
                <td className="px-4 py-2 text-gray-500">{carrerasDe(e)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                      onClick={() => inscribir({ estudiante_ids: [e.id] }, 'No se pudo inscribir al estudiante.')}
                      disabled={trabajando}
                      className="rounded-lg border border-kairos-600 px-3 py-1 text-xs font-medium text-kairos-700 hover:bg-kairos-50 disabled:opacity-50"
                    >
                      Inscribir
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!d.cargando && d.filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  {d.mostrar === 'no_inscritos' ? 'Todos los estudiantes de la búsqueda ya están inscritos.' : 'No se encontraron estudiantes.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={d.meta.pagina} ultima={d.meta.ultima} total={d.meta.total} onCambiar={d.setPagina} />
    </div>
  );
}

// ---------------- Desinscribir estudiantes ----------------
// Se marcan los estudiantes inscritos y se desinscriben con un solo boton (con confirmacion).
function PanelDesinscribir({ examenId, cerrado = false }) {
  const d = useEstudiantesDelExamen(examenId, 'inscritos');
  const [seleccion, setSeleccion] = useState({}); // { [id]: nombre }
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const elegibles = d.filas.filter((e) => !e.con_ingreso);
  const marcados = Object.keys(seleccion).length;
  const todosMarcados = elegibles.length > 0 && elegibles.every((e) => seleccion[e.id]);

  function alternar(e) {
    setSeleccion((s) => {
      const n = { ...s };
      if (n[e.id]) delete n[e.id];
      else n[e.id] = e.nombre_completo;
      return n;
    });
  }

  function alternarPagina() {
    setSeleccion((s) => {
      const n = { ...s };
      elegibles.forEach((e) => {
        if (todosMarcados) delete n[e.id];
        else n[e.id] = e.nombre_completo;
      });
      return n;
    });
  }

  async function desinscribir() {
    if (!marcados) return;
    const texto =
      marcados === 1
        ? `¿Desinscribir a ${Object.values(seleccion)[0]} del examen? Se quitará su inscripción y su habilitación.`
        : `¿Desinscribir a ${marcados} estudiantes del examen? Se quitará su inscripción y su habilitación.`;
    if (!confirm(texto)) return;
    setTrabajando(true);
    setError('');
    setMensaje('');
    try {
      const res = await api.post(`/examenes/${examenId}/inscripciones/quitar`, {
        estudiante_ids: Object.keys(seleccion).map(Number),
      });
      setMensaje(res.data.message);
      setSeleccion({});
      await d.cargar();
    } catch (err) {
      setError(primerError(err, 'No se pudo desinscribir a los estudiantes.'));
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5">
      {cerrado && <p className="text-sm text-amber-700 mb-4">Este examen ya finalizó: ya no se pueden cambiar sus inscripciones.</p>}
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error || d.errorCarga} tipo="error" onCerrar={() => setError('')} />

      <Busqueda d={d} />

      {/* Barra de accion arriba de la lista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 rounded-lg border border-red-100 bg-red-50/50 px-4 py-3">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-kairos-700">{d.meta.inscritos}</span> inscritos en este examen ·{' '}
          <span className="font-semibold text-red-700">{marcados}</span> seleccionados
        </p>
        <button
          type="button"
          onClick={desinscribir}
          disabled={trabajando || !marcados || cerrado}
          className="inline-flex items-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
        >
          <UserMinusIcon size={16} />
          {trabajando ? 'Desinscribiendo...' : 'Desinscribir seleccionados'}
        </button>
      </div>

      <div className="rounded-lg border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              <th className="px-4 py-2 w-10">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los de esta página"
                  className="h-4 w-4 accent-kairos-600"
                  checked={todosMarcados}
                  disabled={cerrado || elegibles.length === 0}
                  onChange={alternarPagina}
                />
              </th>
              <th className="px-4 py-2">Estudiante</th>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2">Carrera</th>
              <th className="px-4 py-2">Observación</th>
            </tr>
          </thead>
          <tbody>
            {d.filas.map((e) => (
              <tr key={e.id} className={`border-t border-gray-100 ${seleccion[e.id] ? 'bg-red-50/60' : ''}`}>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar a ${e.nombre_completo}`}
                    className="h-4 w-4 accent-red-600"
                    checked={Boolean(seleccion[e.id])}
                    disabled={cerrado || e.con_ingreso}
                    onChange={() => alternar(e)}
                  />
                </td>
                <td className="px-4 py-2">{e.nombre_completo}</td>
                <td className="px-4 py-2 text-gray-500">{e.codigo_universitario}</td>
                <td className="px-4 py-2 text-gray-500">{e.documento_identidad}</td>
                <td className="px-4 py-2 text-gray-500">{carrerasDe(e)}</td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {e.con_ingreso ? 'Ya registró su ingreso: no se puede desinscribir.' : '—'}
                </td>
              </tr>
            ))}
            {!d.cargando && d.filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">No hay estudiantes inscritos que coincidan con la búsqueda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={d.meta.pagina} ultima={d.meta.ultima} total={d.meta.total} onCambiar={d.setPagina} />
    </div>
  );
}
