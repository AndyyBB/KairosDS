import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { primerError } from '../api/errores';
import { CalendarIcon } from './Iconos';

// HU-40: calendario interactivo de examenes en la pantalla de Inicio.
// Muestra por mes los examenes programados (y los que estan en curso o ya finalizaron).
// Al hacer clic en un dia se listan sus examenes; al hacer clic en un examen se abren
// sus datos ("Datos del examen").
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const ESTILO = {
  programado: { chip: 'bg-kairos-100 text-kairos-800 hover:bg-kairos-200', punto: 'bg-kairos-600', texto: 'Programado' },
  'en curso': { chip: 'bg-amber-100 text-amber-800 hover:bg-amber-200', punto: 'bg-amber-500', texto: 'En curso' },
  finalizado: { chip: 'bg-gray-100 text-gray-500 hover:bg-gray-200', punto: 'bg-gray-400', texto: 'Finalizado' },
};

const dosDigitos = (n) => String(n).padStart(2, '0');
const claveDia = (d) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
// Fecha de hoy en Bolivia (las fechas de los examenes estan en hora de La Paz).
const hoyLaPaz = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
const fechaDe = (ex) => String(ex.fecha ?? '').slice(0, 10);
const horaDe = (ex) => String(ex.hora_inicio ?? '').slice(0, 5);
const ambientesDe = (ex) => (ex.ambientes?.length ? ex.ambientes.map((a) => a.nombre).join(', ') : ex.ambiente?.nombre ?? '');
const estiloDe = (ex) => ESTILO[ex.estado_actual] ?? ESTILO.programado;

// Dias que se muestran: semanas completas (de lunes a domingo) que cubren el mes.
function diasDeLaGrilla(anio, mes) {
  const primero = new Date(anio, mes, 1);
  const inicio = new Date(anio, mes, 1 - ((primero.getDay() + 6) % 7));
  const ultimo = new Date(anio, mes + 1, 0);
  const fin = new Date(anio, mes + 1, 0 + (7 - ((ultimo.getDay() + 6) % 7) - 1));
  const dias = [];
  for (let d = new Date(inicio); d <= fin; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) dias.push(d);
  return dias;
}

function Flechita({ izquierda }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d={izquierda ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

export default function CalendarioExamenes() {
  const navigate = useNavigate();
  const hoy = hoyLaPaz();
  const [vista, setVista] = useState(() => ({ anio: Number(hoy.slice(0, 4)), mes: Number(hoy.slice(5, 7)) - 1 }));
  const [diaSel, setDiaSel] = useState(hoy);
  const [examenes, setExamenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const dias = useMemo(() => diasDeLaGrilla(vista.anio, vista.mes), [vista]);

  // Examenes de las semanas visibles (se piden todas las paginas, de 100 en 100).
  useEffect(() => {
    let vigente = true;
    const desde = claveDia(dias[0]);
    const hasta = claveDia(dias[dias.length - 1]);
    setCargando(true);
    setError('');
    (async () => {
      const lista = [];
      let pagina = 1;
      let ultima = 1;
      do {
        const res = await api.get('/examenes', { params: { desde, hasta, per_page: 100, page: pagina } });
        lista.push(...(res.data.data ?? []));
        ultima = res.data.last_page ?? 1;
        pagina += 1;
      } while (pagina <= ultima);
      return lista;
    })()
      .then((lista) => vigente && setExamenes(lista))
      .catch((err) => vigente && setError(primerError(err, 'No se pudo cargar el calendario de exámenes.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [dias]);

  // Examenes agrupados por dia y ordenados por hora.
  const porDia = useMemo(() => {
    const mapa = {};
    examenes.forEach((ex) => {
      (mapa[fechaDe(ex)] ??= []).push(ex);
    });
    Object.values(mapa).forEach((l) => l.sort((a, b) => horaDe(a).localeCompare(horaDe(b))));
    return mapa;
  }, [examenes]);

  function moverMes(delta) {
    setVista(({ anio, mes }) => {
      const d = new Date(anio, mes + delta, 1);
      return { anio: d.getFullYear(), mes: d.getMonth() };
    });
  }

  function irAHoy() {
    setVista({ anio: Number(hoy.slice(0, 4)), mes: Number(hoy.slice(5, 7)) - 1 });
    setDiaSel(hoy);
  }

  const abrir = (ex) => navigate(`/examenes/datos/${ex.id}`);
  const delDia = porDia[diaSel] ?? [];
  const totalMes = examenes.filter((ex) => Number(fechaDe(ex).slice(5, 7)) - 1 === vista.mes).length;
  const [a, m, d] = diaSel.split('-').map(Number);
  const tituloDia = new Date(a, m - 1, d).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <section className="mb-6 rounded-xl border border-kairos-100/70 bg-white p-4 sm:p-5 shadow-md" aria-label="Calendario de exámenes">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-kairos-50 text-kairos-700">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Calendario de exámenes</h2>
            <p className="text-xs text-gray-500">
              {cargando ? 'Cargando…' : `${totalMes} ${totalMes === 1 ? 'examen' : 'exámenes'} en ${MESES[vista.mes].toLowerCase()}`} · haz clic
              en un examen para ver sus datos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={irAHoy} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Hoy
          </button>
          <button
            type="button"
            onClick={() => moverMes(-1)}
            aria-label="Mes anterior"
            className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-kairos-50 hover:text-kairos-700"
          >
            <Flechita izquierda />
          </button>
          <span className="w-36 text-center font-semibold text-kairos-800">
            {MESES[vista.mes]} {vista.anio}
          </span>
          <button
            type="button"
            onClick={() => moverMes(1)}
            aria-label="Mes siguiente"
            className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-kairos-50 hover:text-kairos-700"
          >
            <Flechita />
          </button>
        </div>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
        {/* Grilla del mes */}
        <div>
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-kairos-800 mb-1">
            {DIAS.map((dia) => (
              <div key={dia} className="py-1">{dia}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-100 bg-gray-100">
            {dias.map((dia) => {
              const clave = claveDia(dia);
              const delMes = dia.getMonth() === vista.mes;
              const lista = porDia[clave] ?? [];
              const esHoy = clave === hoy;
              const elegido = clave === diaSel;
              return (
                <div
                  key={clave}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDiaSel(clave)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setDiaSel(clave)}
                  aria-label={`${dia.getDate()} de ${MESES[dia.getMonth()]}: ${lista.length} exámenes`}
                  className={`min-h-[56px] sm:min-h-[104px] cursor-pointer p-1 sm:p-1.5 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-kairos-400 ${
                    elegido ? 'bg-kairos-50' : delMes ? 'bg-white hover:bg-kairos-50/50' : 'bg-gray-50/80 hover:bg-kairos-50/50'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      esHoy ? 'bg-kairos-gradient font-semibold text-white' : delMes ? 'text-gray-700' : 'text-gray-300'
                    }`}
                  >
                    {dia.getDate()}
                  </span>

                  {/* En pantallas pequeñas: un punto por examen */}
                  {lista.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                      {lista.slice(0, 4).map((ex) => (
                        <span key={ex.id} className={`h-1.5 w-1.5 rounded-full ${estiloDe(ex).punto}`} />
                      ))}
                    </div>
                  )}

                  {/* En pantallas grandes: hasta 2 examenes con hora y asignatura */}
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {lista.slice(0, 2).map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrir(ex);
                        }}
                        title={`${horaDe(ex)} · ${ex.materia?.nombre ?? ''} · ${ambientesDe(ex)}`}
                        className={`block w-full rounded px-1 py-0.5 text-left text-[11px] leading-tight ${estiloDe(ex).chip}`}
                      >
                        <span className="block font-semibold">{horaDe(ex)}</span>
                        <span className="block truncate">{ex.materia?.nombre}</span>
                      </button>
                    ))}
                    {lista.length > 2 && <span className="block px-1 text-[11px] text-kairos-700">+{lista.length - 2} más</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
            {Object.values(ESTILO).map((e) => (
              <span key={e.texto} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${e.punto}`} /> {e.texto}
              </span>
            ))}
          </div>
        </div>

        {/* Examenes del dia elegido */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 first-letter:uppercase">{tituloDia}</h3>
          {delDia.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
              No hay exámenes este día.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {delDia.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => abrir(ex)}
                    className="w-full rounded-lg border border-kairos-100 bg-white px-3 py-2 text-left transition hover:border-kairos-300 hover:bg-kairos-50/60 focus:outline-none focus:ring-2 focus:ring-kairos-400"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-kairos-800">{horaDe(ex)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${estiloDe(ex).chip}`}>{estiloDe(ex).texto}</span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-gray-800">{ex.materia?.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {ambientesDe(ex)} · {ex.duracion_min} min
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
