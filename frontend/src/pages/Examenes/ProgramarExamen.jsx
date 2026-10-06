import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos } from '../../api/errores';

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

// HU-02: Registro de examenes ("Programar examen")
// Campos segun mockup: Asignatura, Fecha, Hora de inicio, Duración, Ambiente, Normas del examen.
export default function ProgramarExamen() {
  const navigate = useNavigate();
  const [materias, setMaterias] = useState([]);
  const [ambientes, setAmbientes] = useState([]);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    materia_id: '',
    fecha: '',
    hora_inicio: '',
    duracion_min: '',
    ambientes: [''],
    normas: '',
  });

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

    // No se permite una fecha pasada, ni una hora pasada o igual a la actual.
    const hoy = fechaHoy();
    if (form.fecha && form.fecha < hoy) {
      setErrores({ fecha: ['La fecha del examen no puede ser anterior a la fecha actual.'] });
      return;
    }
    if (form.fecha === hoy && form.hora_inicio && form.hora_inicio <= horaAhora()) {
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
      await api.post('/examenes', payload);
      navigate('/examenes', { state: { mensaje: 'Exámen registrado con éxito.' } });
    } catch (err) {
      setErrores(erroresCampos(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-kairos-gradient flex items-center justify-center text-white shadow-md">
          <CalendarIcon />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Programar examen</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <Campo label="Asignatura" icon={<BookIcon />} error={errores.materia_id}>
          <select className="input" value={form.materia_id} onChange={(e) => set('materia_id', e.target.value)}>
            <option value="">Seleccione una asignatura</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>{m.sigla} - {m.nombre}</option>
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
                {form.ambientes.length > 1 && (
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
            {hayAmbientesSinUsar ? (
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

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/examenes')}
            className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="bg-kairos-gradient text-white rounded-lg px-5 py-2 text-sm font-medium shadow-sm disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
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
