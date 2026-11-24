import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import { fechaDMA, horaHM } from '../../api/formato';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import Paginacion from '../../components/Paginacion';
import { CheckAllIcon, MailIcon } from '../../components/Iconos';

// HU-41: Enviar invitaciones (menu Examenes, solo Administrador y Docente).
// Se elige un examen programado, se marcan los estudiantes y se presiona "Enviar invitaciones".
// A cada estudiante le llega un correo con el boton "Aceptar invitación"; al aceptarla queda
// inscrito en el examen. Misma forma que "Inscribir estudiantes": la barra con "Invitar a todos"
// y el contador (izquierda) y "Enviar invitaciones" (derecha) se mantiene visible al bajar.
const ESTADOS = {
  aceptada: { texto: 'Aceptada', clase: 'bg-kairos-gradient text-white shadow-sm' },
  inscrito: { texto: 'Ya inscrito', clase: 'bg-kairos-50 text-kairos-700' },
  enviada: { texto: 'Invitación enviada', clase: 'bg-amber-50 text-amber-700' },
};

function carrerasDe(e) {
  return (e.carreras?.length ? e.carreras.map((c) => c.nombre) : [e.carrera?.nombre]).filter(Boolean).join(', ');
}

export default function EnviarInvitaciones() {
  const { examenId } = useParams();
  const navigate = useNavigate();
  const [examenes, setExamenes] = useState([]);
  const [error, setError] = useState('');

  // Solo los examenes programados (que todavia no empezaron) admiten invitaciones.
  useEffect(() => {
    api
      .get('/examenes', { params: { per_page: 100, estado: 'programado' } })
      .then((res) => {
        const lista = (res.data.data ?? res.data).filter((ex) => ex.estado_actual === 'programado');
        lista.sort((a, b) => `${a.fecha} ${a.hora_inicio}`.localeCompare(`${b.fecha} ${b.hora_inicio}`));
        setExamenes(lista);
      })
      .catch((err) => setError(primerError(err, 'No se pudo cargar la lista de exámenes.')));
  }, []);

  const etiqueta = (ex) =>
    `${ex.materia?.nombre} — ${fechaDMA(ex.fecha)} ${horaHM(ex.hora_inicio)} — ${
      ex.ambientes?.length ? ex.ambientes.map((a) => a.nombre).join(', ') : ex.ambiente?.nombre ?? ''
    }`;

  return (
    <div className="max-w-6xl">
      <Encabezado
        icono={<MailIcon size={22} />}
        titulo="Enviar invitaciones"
        descripcion='Elige un examen, marca a los estudiantes y presiona "Enviar invitaciones". Al aceptar la invitación del correo, el estudiante queda inscrito.'
      />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
        <label htmlFor="examen-invitar" className="block text-sm font-medium text-gray-600 mb-1">Examen</label>
        <select
          id="examen-invitar"
          className="input"
          value={examenId ?? ''}
          onChange={(e) => navigate(e.target.value ? `/examenes/invitar/${e.target.value}` : '/examenes/invitar')}
        >
          <option value="">Seleccione un examen</option>
          {examenes.map((ex) => (
            <option key={ex.id} value={String(ex.id)}>{etiqueta(ex)}</option>
          ))}
        </select>
        {examenes.length === 0 && <p className="text-xs text-gray-400 mt-2">No hay exámenes programados.</p>}
      </div>

      {examenId ? (
        <PanelInvitar key={examenId} examenId={examenId} />
      ) : (
        <div className="rounded-xl border border-dashed border-kairos-200 bg-white/60 px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kairos-50 text-kairos-600">
            <MailIcon size={24} />
          </div>
          <p className="font-medium text-gray-700">Selecciona un examen</p>
          <p className="text-sm text-gray-500 mt-1">Se mostrarán los estudiantes para enviarles la invitación.</p>
        </div>
      )}
    </div>
  );
}

function PanelInvitar({ examenId }) {
  const [carreras, setCarreras] = useState([]);
  const [filas, setFilas] = useState([]);
  const [meta, setMeta] = useState({ pagina: 1, ultima: 1, total: 0, inscritos: 0, pendientes: 0 });
  const [buscar, setBuscar] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [carreraId, setCarreraId] = useState('');
  const [mostrar, setMostrar] = useState('no_inscritos');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState({}); // { [id]: nombre }
  // "Invitar a todos": marca a todos los no inscritos de la busqueda actual (todas las paginas).
  const [todos, setTodos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/carreras').then((res) => setCarreras(res.data)).catch(() => setCarreras([]));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get(`/examenes/${examenId}/invitaciones`, {
        params: { page: pagina, buscar: busqueda || undefined, carrera_id: carreraId || undefined, mostrar },
      });
      setFilas(res.data.data);
      setMeta({
        pagina: res.data.current_page,
        ultima: res.data.last_page,
        total: res.data.total,
        inscritos: res.data.total_inscritos,
        pendientes: res.data.total_pendientes,
      });
    } catch (err) {
      setError(primerError(err, 'No se pudo cargar la lista de estudiantes.'));
    } finally {
      setCargando(false);
    }
  }, [examenId, pagina, busqueda, carreraId, mostrar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Si cambia la busqueda, "todos" ya no se refiere a los mismos estudiantes.
  useEffect(() => {
    setTodos(false);
  }, [busqueda, carreraId, mostrar]);

  const elegibles = filas.filter((e) => !e.inscrito);
  const marcado = (e) => !e.inscrito && (todos || Boolean(seleccion[e.id]));
  const marcados = Object.keys(seleccion).length;

  function alternar(e) {
    if (todos) {
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


  async function enviar() {
    if (!todos && !marcados) return;
    setEnviando(true);
    setError('');
    setMensaje('');
    try {
      const body = todos
        ? { todos: true, buscar: busqueda || undefined, carrera_id: carreraId || undefined, mostrar }
        : { estudiante_ids: Object.keys(seleccion).map(Number) };
      const res = await api.post(`/examenes/${examenId}/invitaciones`, body);
      setMensaje(res.data.message);
      setSeleccion({});
      setTodos(false);
      await cargar();
    } catch (err) {
      setError(primerError(err, 'No se pudo enviar el correo. Intente nuevamente en unos minutos.'));
    } finally {
      setEnviando(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <>
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md px-5 pt-5 pb-2 mb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPagina(1);
            setBusqueda(buscar.trim());
          }}
          className="flex flex-col lg:flex-row gap-2 mb-3"
        >
          <input
            className="input lg:flex-1"
            placeholder="Buscar por nombre, código, documento o correo"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          <select
            className="input lg:w-56"
            aria-label="Carrera"
            value={carreraId}
            onChange={(e) => {
              setCarreraId(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todas las carreras</option>
            {carreras.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <select
            className="input lg:w-60"
            aria-label="Mostrar"
            value={mostrar}
            onChange={(e) => {
              setMostrar(e.target.value);
              setPagina(1);
            }}
          >
            <option value="no_inscritos">Solo los no inscritos</option>
            <option value="pendientes">Invitados que no aceptaron</option>
            <option value="todos">Todos los estudiantes</option>
          </select>
          <button type="submit" className="border border-gray-300 rounded-lg px-4 text-sm text-gray-700 py-2">
            Buscar
          </button>
        </form>
      </div>

      {/* Barra de acciones fija arriba: siempre visible al bajar por la lista. */}
      <div className="sticky top-[64px] lg:top-0 z-20 -mx-1 mb-3 px-1 py-2 bg-[#f3f8f8]/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kairos-100/70 bg-white px-4 py-3 shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSeleccion({});
                setTodos(true);
              }}
              disabled={enviando || meta.total === 0}
              className="inline-flex items-center gap-2 bg-white border border-kairos-600 text-kairos-700 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-kairos-50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <CheckAllIcon size={16} />
              Invitar a todos
            </button>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-kairos-700">{meta.inscritos}</span> inscritos /{' '}
              <span className="font-semibold text-amber-700">{meta.pendientes}</span> invitaciones sin aceptar /{' '}
              <span className="font-semibold text-gray-700">
                {todos ? (mostrar === 'todos' ? 'Todos' : meta.total) : marcados}
              </span>{' '}
              seleccionados
            </p>
          </div>
          <button
            type="button"
            onClick={enviar}
            disabled={enviando || (!todos && !marcados)}
            className="inline-flex items-center gap-2 bg-kairos-gradient text-white text-sm font-medium rounded-lg px-5 py-2 shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
          >
            <MailIcon size={16} />
            {enviando ? 'Enviando...' : 'Enviar invitaciones'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              <th className="px-4 py-2 w-10">
                {/* Sin casilla "marcar pagina": para marcar a todos se usa el boton "... a todos". */}
              </th>
              <th className="px-4 py-2">Estudiante</th>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Correo institucional</th>
              <th className="px-4 py-2">Carrera</th>
              <th className="px-4 py-2">Invitación</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((e) => {
              const estado = ESTADOS[e.invitacion];
              return (
                <tr key={e.id} className={`border-t border-gray-100 ${marcado(e) ? 'bg-kairos-50/60' : ''}`}>
                  <td className="px-4 py-2">
                    {!e.inscrito && (
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
                  <td className="px-4 py-2 text-gray-500">{e.correo_institucional}</td>
                  <td className="px-4 py-2 text-gray-500">{carrerasDe(e)}</td>
                  <td className="px-4 py-2">
                    {estado ? (
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>
                        {estado.texto}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Sin invitar</span>
                    )}
                    {e.invitacion === 'enviada' && e.invitada_en && (
                      <span className="block mt-0.5 text-[11px] text-gray-400">el {e.invitada_en}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!cargando && filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  {mostrar === 'no_inscritos'
                    ? 'Todos los estudiantes de la búsqueda ya están inscritos.'
                    : mostrar === 'pendientes'
                      ? 'No hay invitaciones sin aceptar.'
                      : 'No se encontraron estudiantes.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={meta.pagina} ultima={meta.ultima} total={meta.total} onCambiar={setPagina} />
    </>
  );
}
