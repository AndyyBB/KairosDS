import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { fechaDMA, horaHM } from '../../api/formato';
import Paginacion from '../../components/Paginacion';
import { primerError } from '../../api/errores';
import { useAuth } from '../../api/AuthContext';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import { CheckAllIcon, CheckBadgeIcon, CheckIcon, XIcon } from '../../components/Iconos';

const POR_PAGINA = 20;

// Sprint 4 (observacion de la licenciada): habilitar y deshabilitar son dos pantallas
// independientes del menu Examenes (antes era una sola: "Habilitar/Deshabilitar estudiantes").
// - "Habilitar estudiantes": se marcan los inscritos que pueden rendir el examen y se presiona
//   "Guardar habilitaciones".
// - "Deshabilitar estudiantes": se marcan los inscritos que NO pueden rendirlo, se escribe el
//   motivo de cada uno (obligatorio) y se presiona "Deshabilitar seleccionados".
// En las dos, la barra de acciones esta arriba de la tabla y se mantiene visible al bajar.
const TEXTOS = {
  habilitar: {
    titulo: 'Habilitar estudiantes',
    descripcion: 'Selecciona un examen, marca a los estudiantes inscritos que pueden rendirlo y presiona "Guardar habilitaciones".',
    ruta: '/examenes/habilitar',
  },
  deshabilitar: {
    titulo: 'Deshabilitar estudiantes',
    descripcion: 'Selecciona un examen, marca a los estudiantes que no pueden rendirlo, escribe el motivo y presiona "Deshabilitar seleccionados".',
    ruta: '/examenes/deshabilitar',
  },
};

// Todas las carreras del estudiante (puede tener mas de una).
function carrerasDe(estudiante) {
  const lista = estudiante.carreras?.length ? estudiante.carreras : estudiante.carrera ? [estudiante.carrera] : [];
  return lista.map((c) => c.nombre).join(', ') || '-';
}

// Estado actual de la habilitacion: true (habilitado), false (no habilitado) o null (sin decidir).
const estadoDe = (habilitacion) => (habilitacion ? habilitacion.habilitado : null);

function EstadoActual({ habilitacion }) {
  const estado = estadoDe(habilitacion);
  if (estado === true) {
    return <span className="whitespace-nowrap rounded-full bg-kairos-gradient px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">Habilitado</span>;
  }
  if (estado === false) {
    return <span className="whitespace-nowrap rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">No habilitado</span>;
  }
  return <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">Sin decidir</span>;
}

export default function HabilitarEstudiantes({ modo = 'habilitar' }) {
  const { examenId } = useParams();
  const { tiene } = useAuth();
  const navigate = useNavigate();
  const textos = TEXTOS[modo];
  const habilitar = modo === 'habilitar';

  const [examenes, setExamenes] = useState([]);
  const [examen, setExamen] = useState(null);
  const [inscritos, setInscritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState({}); // { [id]: true }
  const [motivos, setMotivos] = useState({}); // solo en "Deshabilitar"
  const [erroresMotivo, setErroresMotivo] = useState({});
  const [buscar, setBuscar] = useState('');
  const [mostrar, setMostrar] = useState('pendientes'); // pendientes | todos
  const [pagina, setPagina] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Examenes registrados que todavia admiten habilitaciones (no finalizados ni cancelados).
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

  async function cargar() {
    setSeleccion({});
    setMotivos({});
    setErroresMotivo({});
    if (!examenId) {
      setExamen(null);
      setInscritos([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const [examenRes, inscritosRes] = await Promise.all([
        api.get(`/examenes/${examenId}`),
        api.get(`/examenes/${examenId}/inscritos`),
      ]);
      setExamen(examenRes.data);
      setInscritos(inscritosRes.data);
    } catch (err) {
      setError(primerError(err, 'No se pudo cargar el examen.'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    setPagina(1);
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examenId]);

  const cerrado = ['finalizado', 'cancelado'].includes(examen?.estado_actual);
  const editable = !cerrado;

  // Un estudiante se puede marcar si todavia no tiene el estado de esta pantalla:
  // en "Habilitar", los sin decidir y los no habilitados; en "Deshabilitar", los sin decidir y los habilitados.
  const elegible = ({ habilitacion }) => (habilitar ? estadoDe(habilitacion) !== true : estadoDe(habilitacion) !== false);

  const texto = buscar.trim().toLowerCase();
  const filtrados = inscritos.filter((fila) => {
    if (mostrar === 'pendientes' && !elegible(fila)) return false;
    if (!texto) return true;
    const e = fila.estudiante;
    return [e.nombre_completo, e.codigo_universitario, e.documento_identidad].some((v) => String(v ?? '').toLowerCase().includes(texto));
  });
  const ultimaPagina = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const totalHabilitados = inscritos.filter(({ habilitacion }) => estadoDe(habilitacion) === true).length;
  const totalNoHabilitados = inscritos.filter(({ habilitacion }) => estadoDe(habilitacion) === false).length;
  const totalSinDecidir = inscritos.length - totalHabilitados - totalNoHabilitados;
  const marcados = Object.keys(seleccion).length;


  function alternar(id) {
    setSeleccion((s) => {
      const n = { ...s };
      if (n[id]) delete n[id];
      else n[id] = true;
      return n;
    });
    setErroresMotivo((e) => ({ ...e, [id]: false }));
  }


  // "Habilitar a todos" / "Deshabilitar a todos": marca a todos los inscritos que todavia
  // faltan habilitar (o deshabilitar). Al deshabilitar, cada uno sigue necesitando su motivo.
  // Un clic marca a todos; si ya estan todos marcados, otro clic los desmarca.
  const todosElegibles = inscritos.filter(elegible);
  const todosMarcados = todosElegibles.length > 0 && todosElegibles.every(({ estudiante }) => seleccion[estudiante.id]);

  function marcarATodos() {
    if (todosMarcados) {
      setSeleccion({});
      return;
    }
    const n = {};
    todosElegibles.forEach(({ estudiante }) => {
      n[estudiante.id] = true;
    });
    setSeleccion(n);
  }

  async function guardar() {
    const ids = Object.keys(seleccion).map(Number);
    if (!ids.length) return;

    if (!habilitar) {
      // El motivo de inhabilitacion es obligatorio para cada estudiante marcado.
      const faltantes = {};
      ids.forEach((id) => {
        if (!motivos[id]?.trim()) faltantes[id] = true;
      });
      if (Object.keys(faltantes).length) {
        setErroresMotivo(faltantes);
        const indice = filtrados.findIndex(({ estudiante }) => faltantes[estudiante.id]);
        if (indice >= 0) setPagina(Math.floor(indice / POR_PAGINA) + 1);
        return;
      }
      const pregunta = ids.length === 1 ? '¿Deshabilitar al estudiante seleccionado?' : `¿Deshabilitar a los ${ids.length} estudiantes seleccionados?`;
      if (!confirm(`${pregunta} No podrán registrar su ingreso a este examen.`)) return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await Promise.all(
        ids.map((id) =>
          api.post(`/examenes/${examenId}/habilitaciones`, {
            estudiante_id: id,
            habilitado: habilitar,
            observacion: habilitar ? null : motivos[id].trim(),
          })
        )
      );
      const n = ids.length;
      setMensaje(
        habilitar
          ? `Habilitaciones registradas con éxito: ${n === 1 ? '1 estudiante habilitado' : `${n} estudiantes habilitados`}.`
          : `${n === 1 ? '1 estudiante deshabilitado' : `${n} estudiantes deshabilitados`} con éxito.`
      );
      await cargar();
    } catch (err) {
      setError(primerError(err, habilitar ? 'No se pudo guardar las habilitaciones.' : 'No se pudo deshabilitar a los estudiantes.'));
      await cargar();
    } finally {
      setGuardando(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const etiqueta = (ex) =>
    `${ex.materia?.nombre} — ${fechaDMA(ex.fecha)} ${horaHM(ex.hora_inicio)} — ${
      ex.ambientes?.length ? ex.ambientes.map((a) => a.nombre).join(', ') : ex.ambiente?.nombre ?? ''
    }`;

  return (
    <div className="max-w-6xl">
      <Encabezado icono={<CheckBadgeIcon size={22} />} titulo={textos.titulo} descripcion={textos.descripcion} />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
        <label htmlFor={`examen-${modo}`} className="block text-sm font-medium text-gray-600 mb-1">Examen</label>
        <select
          id={`examen-${modo}`}
          className="input"
          value={examenId ?? ''}
          onChange={(e) => {
            setMensaje('');
            navigate(e.target.value ? `${textos.ruta}/${e.target.value}` : textos.ruta);
          }}
        >
          <option value="">Seleccione un examen</option>
          {examenes.map((ex) => (
            <option key={ex.id} value={String(ex.id)}>{etiqueta(ex)}</option>
          ))}
          {/* Si se entra con un examen que ya no esta en la lista (finalizado), igual se muestra. */}
          {examen && !examenes.some((ex) => String(ex.id) === String(examen.id)) && (
            <option value={String(examen.id)}>{etiqueta(examen)}</option>
          )}
        </select>
      </div>

      {!examenId && (
        <div className="rounded-xl border border-dashed border-kairos-200 bg-white/60 px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kairos-50 text-kairos-600">
            <CheckBadgeIcon size={24} />
          </div>
          <p className="font-medium text-gray-700">Selecciona un examen</p>
          <p className="text-sm text-gray-500 mt-1">Se mostrará la lista de estudiantes inscritos en ese examen.</p>
        </div>
      )}

      {examenId && (
        <>
          {cerrado && (
            <p className="text-sm text-amber-700 mb-4">Este examen está {examen.estado_actual}: ya no admite habilitaciones.</p>
          )}

          {/* Busqueda dentro de los inscritos */}
          <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md px-5 pt-5 pb-2 mb-3">
            <div className="flex flex-col lg:flex-row gap-2 mb-3">
              <input
                className="input lg:flex-1"
                placeholder="Buscar por nombre, código o documento"
                value={buscar}
                onChange={(e) => {
                  setBuscar(e.target.value);
                  setPagina(1);
                }}
              />
              <select
                className="input lg:w-72"
                aria-label="Mostrar"
                value={mostrar}
                onChange={(e) => {
                  setMostrar(e.target.value);
                  setPagina(1);
                }}
              >
                <option value="pendientes">{habilitar ? 'Solo los que faltan habilitar' : 'Solo los que faltan deshabilitar'}</option>
                <option value="todos">Todos los inscritos</option>
              </select>
            </div>
          </div>

          {/* Barra de acciones fija arriba: siempre visible al bajar por la lista. */}
          <div className="sticky top-[64px] lg:top-0 z-20 -mx-1 mb-3 px-1 py-2 bg-[#f3f8f8]/95 backdrop-blur">
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-md ${
                habilitar ? 'border-kairos-100/70 bg-white' : 'border-red-100 bg-red-50'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                {editable && (
                  <button
                    type="button"
                    onClick={marcarATodos}
                    aria-pressed={todosMarcados}
                    disabled={guardando || todosElegibles.length === 0}
                    className={`inline-flex items-center gap-2 bg-white border rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${
                      habilitar ? 'border-kairos-600 text-kairos-700 hover:bg-kairos-50' : 'border-red-500 text-red-700 hover:bg-red-50'
                    }`}
                  >
                    {todosMarcados ? <XIcon size={16} /> : <CheckAllIcon size={16} />}
                    {todosMarcados ? 'Desmarcar a todos' : habilitar ? 'Habilitar a todos' : 'Deshabilitar a todos'}
                  </button>
                )}
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-kairos-700">{totalHabilitados}</span> habilitados /{' '}
                  <span className="font-semibold text-red-600">{totalNoHabilitados}</span> no habilitados
                  {totalSinDecidir > 0 && (
                    <>
                      {' '}/ <span className="font-semibold text-gray-700">{totalSinDecidir}</span> sin decidir
                    </>
                  )}
                  {' · '}
                  <span className="font-semibold text-gray-800">{marcados}</span> seleccionados
                </p>
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={guardar}
                  disabled={guardando || !marcados}
                  className={
                    habilitar
                      ? 'inline-flex items-center gap-2 bg-kairos-gradient text-white text-sm font-medium rounded-lg px-5 py-2 shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none'
                      : 'inline-flex items-center gap-2 bg-red-600 text-white text-sm font-medium rounded-lg px-5 py-2 shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'
                  }
                >
                  {habilitar ? <CheckIcon size={16} /> : <XIcon size={16} />}
                  {guardando ? 'Guardando...' : habilitar ? 'Guardar habilitaciones' : 'Deshabilitar seleccionados'}
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-kairos-50/80 text-kairos-800 text-left">
                <tr>
                  <th className="px-4 py-2 w-10">
                {/* Sin casilla "marcar pagina": para marcar a todos se usa el boton "... a todos". */}
              </th>
                  <th className="px-4 py-2">Estudiante</th>
                  <th className="px-4 py-2">Código</th>
                  <th className="px-4 py-2">CI</th>
                  <th className="px-4 py-2">Carrera</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Motivo de inhabilitación</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((fila) => {
                  const { estudiante, habilitacion } = fila;
                  const marcado = Boolean(seleccion[estudiante.id]);
                  return (
                    <tr
                      key={estudiante.id}
                      className={`border-t border-gray-100 align-top ${marcado ? (habilitar ? 'bg-kairos-50/60' : 'bg-red-50/60') : ''}`}
                    >
                      <td className="px-4 py-2">
                        {editable && elegible(fila) && (
                          <input
                            type="checkbox"
                            aria-label={`Marcar a ${estudiante.nombre_completo}`}
                            className={`h-4 w-4 ${habilitar ? 'accent-kairos-600' : 'accent-red-600'}`}
                            checked={marcado}
                            onChange={() => alternar(estudiante.id)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-2">{estudiante.nombre_completo}</td>
                      <td className="px-4 py-2 text-gray-500">{estudiante.codigo_universitario}</td>
                      <td className="px-4 py-2 text-gray-500">{estudiante.documento_identidad || '-'}</td>
                      <td className="px-4 py-2 text-gray-500">{carrerasDe(estudiante)}</td>
                      <td className="px-4 py-2">
                        <EstadoActual habilitacion={habilitacion} />
                      </td>
                      <td className="px-4 py-2">
                        {!habilitar && marcado ? (
                          <div>
                            <input
                              className={`input text-xs py-1 ${erroresMotivo[estudiante.id] ? 'input-error' : ''}`}
                              placeholder="Ingresa el motivo..."
                              maxLength={200}
                              value={motivos[estudiante.id] ?? ''}
                              onChange={(ev) => {
                                setMotivos((m) => ({ ...m, [estudiante.id]: ev.target.value }));
                                setErroresMotivo((e) => ({ ...e, [estudiante.id]: false }));
                              }}
                            />
                            {erroresMotivo[estudiante.id] && (
                              <p className="text-red-500 text-xs mt-1">El motivo de inhabilitación es obligatorio.</p>
                            )}
                          </div>
                        ) : estadoDe(habilitacion) === false ? (
                          <span className="text-xs text-gray-600">{habilitacion.observacion || habilitacion.motivo?.descripcion || '-'}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!cargando && inscritos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                      Ningún estudiante está inscrito en este examen.
                      {tiene('habilitaciones.registrar') && !cerrado && (
                        <>
                          {' '}Primero inscríbelos en la pantalla{' '}
                          <Link to={`/examenes/inscribir/${examenId}`} className="text-kairos-600 font-medium hover:underline">
                            Inscribir estudiantes
                          </Link>
                          .
                        </>
                      )}
                    </td>
                  </tr>
                )}
                {!cargando && inscritos.length > 0 && filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                      {mostrar === 'pendientes' && !texto
                        ? habilitar
                          ? 'Todos los inscritos ya están habilitados.'
                          : 'Todos los inscritos ya están como no habilitados.'
                        : 'No se encontraron estudiantes.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Paginacion pagina={pagina} ultima={ultimaPagina} total={filtrados.length} onCambiar={setPagina} />
        </>
      )}
    </div>
  );
}
