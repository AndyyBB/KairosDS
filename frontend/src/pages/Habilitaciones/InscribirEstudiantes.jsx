import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../api/AuthContext';
import { primerError } from '../../api/errores';
import { fechaDMA, horaHM } from '../../api/formato';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import Paginacion from '../../components/Paginacion';
import { CheckAllIcon, CheckIcon, UserMinusIcon, UserPlusIcon } from '../../components/Iconos';

// HU-04 (Sprint 4, observacion 3 de la licenciada): la inscripcion se maneja en DOS
// pantallas independientes del menu Examenes:
// - "Inscribir estudiantes": solo inscribe: se marcan los estudiantes y se guardan.
// - "Desinscribir estudiantes": solo quita inscripciones (seleccionados o "Desinscribir a todos").
// Despues de inscribir, cada estudiante se marca como Habilitado o No habilitado en la
// pantalla "Habilitar estudiantes" (o "Deshabilitar estudiantes"); el Control de ingreso solo deja entrar a inscritos habilitados.
const TEXTOS = {
  inscribir: {
    titulo: 'Inscribir estudiantes',
    descripcion: 'Elige un examen, marca a los estudiantes que lo van a rendir y presiona "Guardar inscripciones".',
    vacio: 'Se mostrarán los estudiantes para inscribirlos en ese examen.',
    ruta: '/examenes/inscribir',
    Icono: UserPlusIcon,
  },
  desinscribir: {
    titulo: 'Desinscribir estudiantes',
    descripcion: 'Elige un examen, marca a los estudiantes que ya no lo rendirán y presiona "Desinscribir seleccionados".',
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
// Sprint 4: misma forma que "Habilitar estudiantes". Se marcan los
// estudiantes que van a rendir el examen y se guardan con un solo boton. La barra con
// "Inscribir a todos" y el contador (izquierda) y "Guardar inscripciones" (derecha) esta
// arriba de la tabla y se mantiene visible al bajar por la lista. No hay boton "Cancelar".
function PanelInscribir({ examenId, cerrado = false }) {
  const { tiene } = useAuth();
  const puedeInscribir = tiene('habilitaciones.registrar');
  const d = useEstudiantesDelExamen(examenId, 'no_inscritos');
  const [seleccion, setSeleccion] = useState({}); // { [id]: nombre }
  // "Inscribir a todos": marca a todos los no inscritos de la busqueda actual (todas las paginas).
  const [todos, setTodos] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Si cambia la busqueda, "todos" ya no se refiere a los mismos estudiantes.
  useEffect(() => {
    setTodos(false);
  }, [d.busqueda, d.carreraId, d.mostrar]);

  const editable = puedeInscribir && !cerrado;
  const elegibles = d.filas.filter((e) => !e.inscrito);
  const marcado = (e) => !e.inscrito && (todos || Boolean(seleccion[e.id]));
  const paginaMarcada = elegibles.length > 0 && elegibles.every(marcado);
  const marcados = Object.keys(seleccion).length;

  function alternar(e) {
    if (todos) {
      // Al desmarcar uno, quedan marcados los demas de esta pagina.
      const n = {};
      elegibles.forEach((x) => {
        if (x.id !== e.id) n[x.id] = x.nombre_completo;
      });
      setTodos(false);
      setSeleccion(n);
      return;
    }
    setSeleccion((s) => {
      const n = { ...s };
      if (n[e.id]) delete n[e.id];
      else n[e.id] = e.nombre_completo;
      return n;
    });
  }

  function alternarPagina() {
    if (todos) {
      setTodos(false);
      setSeleccion({});
      return;
    }
    setSeleccion((s) => {
      const n = { ...s };
      elegibles.forEach((e) => {
        if (paginaMarcada) delete n[e.id];
        else n[e.id] = e.nombre_completo;
      });
      return n;
    });
  }

  function inscribirATodos() {
    setSeleccion({});
    setTodos(true);
  }

  async function guardar() {
    if (!todos && !marcados) return;
    setTrabajando(true);
    setError('');
    setMensaje('');
    try {
      const body = todos
        ? { todos: true, buscar: d.busqueda || undefined, carrera_id: d.carreraId || undefined }
        : { estudiante_ids: Object.keys(seleccion).map(Number) };
      const res = await api.post(`/examenes/${examenId}/inscripciones`, body);
      setMensaje(res.data.message);
      setSeleccion({});
      setTodos(false);
      await d.cargar();
    } catch (err) {
      setError(primerError(err, 'No se pudo inscribir a los estudiantes.'));
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <>
      {cerrado && <p className="text-sm text-amber-700 mb-4">Este examen ya finalizó: ya no admite inscripciones.</p>}
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error || d.errorCarga} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md px-5 pt-5 pb-2 mb-3">
        <Busqueda
          d={d}
          opcionesMostrar={[
            ['no_inscritos', 'Solo los no inscritos'],
            ['inscritos', 'Solo los inscritos'],
            ['todos', 'Todos los estudiantes'],
          ]}
        />
      </div>

      {/* Barra de acciones fija arriba: siempre visible al bajar por la lista. */}
      <div className="sticky top-[64px] lg:top-0 z-20 -mx-1 mb-3 px-1 py-2 bg-[#f3f8f8]/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kairos-100/70 bg-white px-4 py-3 shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            {editable && (
              <button
                type="button"
                onClick={inscribirATodos}
                disabled={trabajando || d.meta.total === 0 || d.mostrar === 'inscritos'}
                className="inline-flex items-center gap-2 bg-white border border-kairos-600 text-kairos-700 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-kairos-50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <CheckAllIcon size={16} />
                Inscribir a todos
              </button>
            )}
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-kairos-700">{d.meta.inscritos}</span> inscritos en este examen /{' '}
              <span className="font-semibold text-gray-700">
                {todos ? (d.mostrar === 'no_inscritos' ? d.meta.total : 'Todos') : marcados}
              </span>{' '}
              seleccionados
            </p>
          </div>
          {editable && (
            <button
              type="button"
              onClick={guardar}
              disabled={trabajando || (!todos && !marcados)}
              className="inline-flex items-center gap-2 bg-kairos-gradient text-white text-sm font-medium rounded-lg px-5 py-2 shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
            >
              <CheckIcon size={16} />
              {trabajando ? 'Guardando...' : 'Guardar inscripciones'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              <th className="px-4 py-2 w-10">
                {editable && (
                  <input
                    type="checkbox"
                    aria-label="Marcar a todos los de esta página"
                    className="h-4 w-4 accent-kairos-600"
                    checked={paginaMarcada}
                    disabled={elegibles.length === 0}
                    onChange={alternarPagina}
                  />
                )}
              </th>
              <th className="px-4 py-2">Estudiante</th>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2">Carrera</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {d.filas.map((e) => (
              <tr key={e.id} className={`border-t border-gray-100 ${marcado(e) ? 'bg-kairos-50/60' : ''}`}>
                <td className="px-4 py-2">
                  {editable && !e.inscrito && (
                    <input
                      type="checkbox"
                      aria-label={`Marcar a ${e.nombre_completo}`}
                      className="h-4 w-4 accent-kairos-600"
                      checked={marcado(e)}
                      onChange={() => alternar(e)}
                    />
                  )}
                </td>
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
    </>
  );
}

// ---------------- Desinscribir estudiantes ----------------
// Sprint 4: misma forma que "Inscribir estudiantes". La barra con "Desinscribir a todos" y el
// contador (izquierda) y "Desinscribir seleccionados" (derecha) esta arriba de la tabla y se
// mantiene visible al bajar por la lista. Siempre se pide confirmacion antes de desinscribir.
function PanelDesinscribir({ examenId, cerrado = false }) {
  const d = useEstudiantesDelExamen(examenId, 'inscritos');
  const [seleccion, setSeleccion] = useState({}); // { [id]: nombre }
  // "Desinscribir a todos": marca a todos los inscritos de la busqueda actual (todas las paginas).
  const [todos, setTodos] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Si cambia la busqueda, "todos" ya no se refiere a los mismos estudiantes.
  useEffect(() => {
    setTodos(false);
  }, [d.busqueda, d.carreraId]);

  const elegibles = d.filas.filter((e) => !e.con_ingreso);
  const marcado = (e) => !e.con_ingreso && (todos || Boolean(seleccion[e.id]));
  const paginaMarcada = elegibles.length > 0 && elegibles.every(marcado);
  const marcados = Object.keys(seleccion).length;

  function alternar(e) {
    if (todos) {
      // Al desmarcar uno, quedan marcados los demas de esta pagina.
      const n = {};
      elegibles.forEach((x) => {
        if (x.id !== e.id) n[x.id] = x.nombre_completo;
      });
      setTodos(false);
      setSeleccion(n);
      return;
    }
    setSeleccion((s) => {
      const n = { ...s };
      if (n[e.id]) delete n[e.id];
      else n[e.id] = e.nombre_completo;
      return n;
    });
  }

  function alternarPagina() {
    if (todos) {
      setTodos(false);
      setSeleccion({});
      return;
    }
    setSeleccion((s) => {
      const n = { ...s };
      elegibles.forEach((e) => {
        if (paginaMarcada) delete n[e.id];
        else n[e.id] = e.nombre_completo;
      });
      return n;
    });
  }

  function desinscribirATodos() {
    setSeleccion({});
    setTodos(true);
  }

  async function desinscribir() {
    if (!todos && !marcados) return;
    let texto;
    if (todos) {
      texto = d.busqueda || d.carreraId
        ? `¿Desinscribir a los ${d.meta.total} estudiantes inscritos que coinciden con la búsqueda? Se quitará su inscripción y su habilitación.`
        : `¿Desinscribir a todos los estudiantes inscritos en este examen (${d.meta.total})? Se quitará su inscripción y su habilitación.`;
    } else {
      texto =
        marcados === 1
          ? `¿Desinscribir a ${Object.values(seleccion)[0]} del examen? Se quitará su inscripción y su habilitación.`
          : `¿Desinscribir a ${marcados} estudiantes del examen? Se quitará su inscripción y su habilitación.`;
    }
    if (!confirm(texto)) return;
    setTrabajando(true);
    setError('');
    setMensaje('');
    try {
      const body = todos
        ? { todos: true, buscar: d.busqueda || undefined, carrera_id: d.carreraId || undefined }
        : { estudiante_ids: Object.keys(seleccion).map(Number) };
      const res = await api.post(`/examenes/${examenId}/inscripciones/quitar`, body);
      setMensaje(res.data.message);
      setSeleccion({});
      setTodos(false);
      if (d.pagina !== 1) d.setPagina(1);
      else await d.cargar();
    } catch (err) {
      setError(primerError(err, 'No se pudo desinscribir a los estudiantes.'));
    } finally {
      setTrabajando(false);
    }
  }

  const editable = !cerrado;

  return (
    <>
      {cerrado && <p className="text-sm text-amber-700 mb-4">Este examen ya finalizó: ya no se pueden cambiar sus inscripciones.</p>}
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error || d.errorCarga} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md px-5 pt-5 pb-2 mb-3">
        <Busqueda d={d} />
      </div>

      {/* Barra de acciones fija arriba: siempre visible al bajar por la lista. */}
      <div className="sticky top-[64px] lg:top-0 z-20 -mx-1 mb-3 px-1 py-2 bg-[#f3f8f8]/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-white px-4 py-3 shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            {editable && (
              <button
                type="button"
                onClick={desinscribirATodos}
                disabled={trabajando || d.meta.total === 0}
                className="inline-flex items-center gap-2 bg-white border border-red-500 text-red-700 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <CheckAllIcon size={16} />
                Desinscribir a todos
              </button>
            )}
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-kairos-700">{d.meta.inscritos}</span> inscritos en este examen /{' '}
              <span className="font-semibold text-red-700">{todos ? d.meta.total : marcados}</span> seleccionados
            </p>
          </div>
          {editable && (
            <button
              type="button"
              onClick={desinscribir}
              disabled={trabajando || (!todos && !marcados)}
              className="inline-flex items-center gap-2 bg-red-600 text-white rounded-lg px-5 py-2 text-sm font-medium shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <UserMinusIcon size={16} />
              {trabajando ? 'Desinscribiendo...' : 'Desinscribir seleccionados'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              <th className="px-4 py-2 w-10">
                {editable && (
                  <input
                    type="checkbox"
                    aria-label="Marcar a todos los de esta página"
                    className="h-4 w-4 accent-red-600"
                    checked={paginaMarcada}
                    disabled={elegibles.length === 0}
                    onChange={alternarPagina}
                  />
                )}
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
              <tr key={e.id} className={`border-t border-gray-100 ${marcado(e) ? 'bg-red-50/60' : ''}`}>
                <td className="px-4 py-2">
                  {editable && (
                    <input
                      type="checkbox"
                      aria-label={`Marcar a ${e.nombre_completo}`}
                      className="h-4 w-4 accent-red-600"
                      checked={marcado(e)}
                      disabled={e.con_ingreso}
                      onChange={() => alternar(e)}
                    />
                  )}
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
    </>
  );
}
