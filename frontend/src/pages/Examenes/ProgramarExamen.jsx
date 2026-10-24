import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos, primerError } from '../../api/errores';
import { useAuth } from '../../api/AuthContext';
import BotonesFormulario from '../../components/BotonesFormulario';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import { SelectorExamen, ambientesDeExamen } from '../../components/Selectores';
import { fechaDMA } from '../../api/formato';
import Encabezado from '../../components/Encabezado';

// Fecha (AAAA-MM-DD) y hora (HH:MM) actuales en la hora local del equipo.
function fechaHoy() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function horaAhora() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// "C" -> "3er semestre (C)"
function nombreSemestre(nivel) {
  const n = 'ABCDEFGHIJ'.indexOf(nivel) + 1;
  if (n === 0) return 'Otras materias';
  const sufijo = { 1: 'er', 2: 'do', 3: 'er', 4: 'to', 5: 'to', 6: 'to', 7: 'mo', 8: 'vo', 9: 'no', 10: 'mo' }[n];
  return `${n}${sufijo} semestre (${nivel})`;
}

const FORM_INICIAL = {
  materia_id: '',
  fecha: '',
  hora_inicio: '',
  duracion_min: '',
  ambientes: [''],
  normas: '',
};

// Titulo y descripcion de cada pantalla (cada accion tiene su propia pantalla del menu).
const TEXTOS = {
  registrar: { titulo: 'Programar examen', descripcion: 'Indica la asignatura, la fecha, la hora, la duración, los ambientes y las normas del examen.' },
  datos: { titulo: 'Datos del examen', descripcion: 'Información registrada del examen.' },
  editar: { titulo: 'Editar examen', descripcion: 'Selecciona el examen, modifica sus datos y presiona "Guardar".' },
  eliminar: { titulo: 'Eliminar examen', descripcion: 'Selecciona el examen, revisa sus datos y presiona "Eliminar".' },
};

// HU-02 Programar examen, HU-08 Editar examen y HU-09 Eliminar examen: cada accion es una
// pantalla independiente del menu Examenes. Campos: Asignatura, Fecha, Hora de inicio,
// Duracion, Ambientes y Normas del examen. "Datos del examen" se abre desde la Lista de
// examenes (clic en la asignatura) y solo muestra los datos.
export default function ProgramarExamen({ modo = 'registrar' }) {
  const { id } = useParams();
  const editando = Boolean(id);
  const { tiene } = useAuth();
  const navigate = useNavigate();
  const [estadoExamen, setEstadoExamen] = useState(null);
  const [resumen, setResumen] = useState(null); // examen seleccionado (Editar / Eliminar)
  const [original, setOriginal] = useState(null); // fecha y hora con que se abrio la edicion
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [materias, setMaterias] = useState([]);
  const [ambientes, setAmbientes] = useState([]);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useMensajeFlash();
  const [form, setForm] = useState(FORM_INICIAL);
  const [formOriginal, setFormOriginal] = useState(null);

  // Al elegir otro registro se limpian los mensajes y errores anteriores.
  useEffect(() => {
    if (!id) return;
    setMensaje('');
    setError('');
    setErrores({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // "Cancelar": en "Registrar" descarta los datos ingresados y redirige a la pantalla de
  // Inicio; en "Editar examen" y "Eliminar examen" descarta los cambios y vuelve a la
  // seleccion del registro.
  function cancelar() {
    setErrores({});
    if (modo === 'editar' || modo === 'eliminar') {
      // Descarta los cambios y vuelve a la seleccion del registro.
      navigate(`/examenes/${modo}`);
      return;
    }
    setForm(FORM_INICIAL);
    navigate('/');
  }

  // HU-08: se cargan los datos del examen a editar.
  useEffect(() => {
    if (!editando) return;
    setResumen(null);
    api
      .get(`/examenes/${id}`)
      .then(({ data: ex }) => {
        const fecha = String(ex.fecha ?? '').slice(0, 10);
        const hora = String(ex.hora_inicio ?? '').slice(0, 5);
        const ids = ex.ambientes?.length ? ex.ambientes.map((a) => String(a.id)) : [String(ex.ambiente_id ?? '')];
        const normas = (ex.normas ?? [])
          .filter((n) => !n.estudiante_id)
          .map((n) => n.descripcion)
          .join('\n');
        const datos = {
          materia_id: String(ex.materia_id ?? ''),
          fecha,
          hora_inicio: hora,
          duracion_min: String(ex.duracion_min ?? ''),
          ambientes: ids.length ? ids : [''],
          normas,
        };
        setForm(datos);
        setFormOriginal(datos);
        setOriginal({ fecha, hora });
        setEstadoExamen(ex.estado_actual ?? ex.estado);
        setResumen({
          titulo: ex.materia?.nombre ?? 'Examen',
          detalle: `${fechaDMA(fecha)} ${hora} · ${ambientesDeExamen(ex)} · ${ex.estado_actual ?? ex.estado}`,
        });
      })
      .catch((err) => setError(primerError(err, 'No se pudo cargar el examen.')));
  }, [id, editando]);

  // HU-09: en la pantalla "Eliminar examen" se elimina definitivamente.
  async function eliminarExamen() {
    if (!confirm('¿Eliminar este examen? Se borrará definitivamente junto con sus inscripciones, habilitaciones e ingresos.')) return;
    setCancelando(true);
    setError('');
    try {
      await api.delete(`/examenes/${id}`);
      navigate('/examenes/eliminar', { state: { mensaje: 'Examen eliminado con éxito.' } });
    } catch (err) {
      setError(primerError(err, 'No se pudo eliminar el examen.'));
      setCancelando(false);
    }
  }

  const cerrado = ['finalizado', 'cancelado'].includes(estadoExamen);
  const soloLectura = modo === 'datos' || modo === 'eliminar' || (modo === 'editar' && cerrado);

  useEffect(() => {
    api.get('/materias').then((res) => setMaterias(res.data));
    api.get('/ambientes').then((res) => setAmbientes(res.data));
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Un examen puede tomarse en varios ambientes (mismo patrón que las carreras del estudiante).
  function cambiarAmbiente(indice, valor) {
    setForm((f) => ({ ...f, ambientes: f.ambientes.map((a, i) => (i === indice ? valor : a)) }));
  }

  function agregarAmbiente() {
    setForm((f) => ({ ...f, ambientes: [...f.ambientes, ''] }));
  }

  function quitarAmbiente(indice) {
    setForm((f) => ({ ...f, ambientes: f.ambientes.filter((_, i) => i !== indice) }));
  }

  const errorAmbiente = Object.entries(errores).find(([clave]) => clave.startsWith('ambiente'))?.[1];
  const hayAmbientesSinUsar = ambientes.some((a) => !form.ambientes.includes(String(a.id)));
  const capacidadTotal = ambientes
    .filter((a) => form.ambientes.includes(String(a.id)))
    .reduce((total, a) => total + Number(a.capacidad_maxima || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrores({});
    setMensaje('');

    // No se permite una fecha pasada, ni una hora pasada o igual a la actual
    // (al editar, solo si se cambio la fecha o la hora).
    const hoy = fechaHoy();
    const sinCambioHorario = editando && original && form.fecha === original.fecha && form.hora_inicio === original.hora;
    if (!sinCambioHorario && form.fecha && form.fecha < hoy) {
      setErrores({ fecha: ['La fecha del examen no puede ser anterior a la fecha actual.'] });
      return;
    }
    if (!sinCambioHorario && form.fecha === hoy && form.hora_inicio && form.hora_inicio <= horaAhora()) {
      setErrores({ hora_inicio: ['La hora de inicio debe ser posterior a la hora actual.'] });
      return;
    }

    setGuardando(true);

    const payload = {
      materia_id: form.materia_id,
      ambientes: form.ambientes.filter(Boolean).map(Number),
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      duracion_min: form.duracion_min,
      normas: form.normas.trim()
        ? [{ tipo: 'general', descripcion: form.normas.trim() }]
        : [],
    };

    try {
      if (editando) {
        await api.put(`/examenes/${id}`, payload);
        // Vuelve a mostrar los datos (ya guardados) sin poder modificarlos.
        setFormOriginal(form);
        setOriginal({ fecha: form.fecha, hora: form.hora_inicio });
        setMensaje('Examen actualizado con éxito.');
        return;
      }
      await api.post('/examenes', payload);
      // El sistema muestra el mensaje y deja el formulario listo para programar otro examen.
      setForm(FORM_INICIAL);
      setMensaje('Examen registrado con éxito.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrores(erroresCampos(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    // Sin registro elegido en Editar / Eliminar se muestra la tabla de seleccion (mas ancha).
    <div className={(modo === 'editar' || modo === 'eliminar') && !editando ? 'max-w-5xl' : 'max-w-2xl'}>
      <Encabezado
        icono={<CalendarIcon />}
        titulo={TEXTOS[modo].titulo}
        descripcion={TEXTOS[modo].descripcion}
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />
      {editando && cerrado && modo !== 'eliminar' && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este examen está {estadoExamen}: ya no se puede editar, solo eliminar.
        </p>
      )}
      {(modo === 'editar' || modo === 'eliminar') && (
        <SelectorExamen modo={modo} seleccionado={editando ? (resumen ?? { titulo: 'Cargando...' }) : null} />
      )}

      {(modo === 'registrar' || editando) && (
        <>
          {modo === 'eliminar' && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Revisa los datos antes de eliminar. El examen se borrará definitivamente junto con sus normas, inscripciones, habilitaciones e ingresos.
            </p>
          )}

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-6 space-y-5">
        <fieldset disabled={soloLectura} className="space-y-5">
        <Campo label="Asignatura" icon={<BookIcon />} error={errores.materia_id}>
          <select className="input" value={form.materia_id} onChange={(e) => set('materia_id', e.target.value)}>
            <option value="">Seleccione una asignatura</option>
            {/* Ing. de Sistemas por semestre (A = 1er semestre); las demás carreras al final */}
            {Object.entries(
              materias.reduce((grupos, m) => {
                const clave = m.carrera?.codigo === 'SIS'
                  ? `Ing. de Sistemas · ${nombreSemestre(m.nivel)}`
                  : m.carrera?.nombre || 'Otras materias';
                (grupos[clave] ||= []).push(m);
                return grupos;
              }, {})
            ).map(([grupo, lista]) => (
              <optgroup key={grupo} label={grupo}>
                {lista.map((m) => (
                  <option key={m.id} value={m.id}>{m.sigla} - {m.nombre}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Fecha" icon={<CalendarIcon small />} error={errores.fecha}>
            <input
              type="date"
              className="input"
              min={fechaHoy()}
              value={form.fecha}
              onChange={(e) => set('fecha', e.target.value)}
            />
          </Campo>

          <Campo label="Hora de inicio" icon={<ClockIcon />} error={errores.hora_inicio}>
            <input type="time" className="input" value={form.hora_inicio} onChange={(e) => set('hora_inicio', e.target.value)} />
          </Campo>
        </div>

        <Campo label="Duración (minutos)" icon={<ClockIcon />} error={errores.duracion_min}>
          <input
            type="number"
            min="5"
            max="300"
            className="input"
            value={form.duracion_min}
            onChange={(e) => set('duracion_min', e.target.value)}
           
          />
        </Campo>

        <Campo label="Ambiente" icon={<PinIcon />} error={errorAmbiente}>
          <div className="space-y-2">
            {form.ambientes.map((seleccionado, indice) => (
              <div key={indice} className="flex items-center gap-2">
                <select
                  className="input"
                  value={seleccionado}
                  onChange={(e) => cambiarAmbiente(indice, e.target.value)}
                >
                  <option value="">Seleccione un ambiente</option>
                  {ambientes
                    .filter((a) => String(a.id) === seleccionado || !form.ambientes.includes(String(a.id)))
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre} (cap. {a.capacidad_maxima})</option>
                    ))}
                </select>
                {form.ambientes.length > 1 && !soloLectura && (
                  <button
                    type="button"
                    onClick={() => quitarAmbiente(indice)}
                    aria-label="Quitar ambiente"
                    className="shrink-0 text-gray-400 hover:text-red-600 text-lg leading-none px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            {hayAmbientesSinUsar && !soloLectura ? (
              <button type="button" onClick={agregarAmbiente} className="text-sm text-kairos-600 font-medium">
                + Agregar otro ambiente
              </button>
            ) : (
              <span />
            )}
            {capacidadTotal > 0 && (
              <span className="text-xs text-gray-500">Capacidad total: {capacidadTotal} estudiantes</span>
            )}
          </div>
        </Campo>

        <Campo label="Normas del examen" icon={<DocIcon />} error={errores.normas || errores['normas.0.descripcion']}>
          <textarea
            className="input min-h-[90px]"
            placeholder="Normas generales que aplican a todos los estudiantes de este examen..."
            value={form.normas}
            onChange={(e) => set('normas', e.target.value)}
          />
        </Campo>
        </fieldset>

        <BotonesFormulario
          modo={modo}
          puedeGuardar={!cerrado}
          puedeEliminar={tiene('examenes.eliminar')}
          guardando={guardando}
          eliminando={cancelando}
          onCancelar={cancelar}
          onSalir={() => navigate('/examenes/lista')}
          onEliminar={eliminarExamen}
        />
      </form>
        </>
      )}
    </div>
  );
}

function Campo({ label, icon, error, children }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
        <span className="text-kairos-500">{icon}</span>
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error[0]}</p>}
    </div>
  );
}

function CalendarIcon({ small }) {
  const s = small ? 16 : 22;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  );
}
