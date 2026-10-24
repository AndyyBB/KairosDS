import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import BotonesFormulario from '../../components/BotonesFormulario';
import { SelectorLista, TablaSeleccion, paginarLocal } from '../../components/Selectores';
import { camposIngresos, filtrarIngresos } from '../../components/catalogos';
import { ClipboardCheckIcon, BuildingIcon, Etiqueta } from '../../components/Iconos';

const TEXTOS = {
  editar: {
    titulo: 'Editar ingreso',
    descripcion: 'Selecciona el examen y el ingreso, corrige el ambiente y presiona "Guardar".',
  },
  eliminar: {
    titulo: 'Eliminar ingreso',
    descripcion: 'Selecciona el examen y el ingreso, revisa sus datos y presiona "Eliminar".',
  },
};

function Dato({ etiqueta, valor }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-6 py-1 text-sm">
      <dt className="sm:w-48 sm:shrink-0 text-gray-500">{etiqueta}</dt>
      <dd className="text-gray-800 break-words min-w-0">{valor || '—'}</dd>
    </div>
  );
}

// HU-10: "Editar ingreso" y "Eliminar ingreso" son pantallas independientes del menu
// Control de ingreso (en "Registrar ingreso" la lista de ultimos ingresos ya no tiene
// botones de editar ni eliminar). Requieren el permiso Editar / Eliminar de Control de
// ingreso (HU-17).
export default function GestionIngreso({ modo }) {
  const [examenes, setExamenes] = useState([]);
  const [cargandoExamenes, setCargandoExamenes] = useState(true);
  const [examenId, setExamenId] = useState('');
  const [ingresos, setIngresos] = useState([]);
  const [ingreso, setIngreso] = useState(null);
  const [ambientes, setAmbientes] = useState([]);
  const [ambienteId, setAmbienteId] = useState('');
  const [errorAmbiente, setErrorAmbiente] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    api
      .get('/control-ingreso/examenes', { params: { con_ingresos: 1 } })
      .then((res) => setExamenes(res.data))
      .catch((err) => setError(primerError(err, 'No se pudieron cargar los exámenes.')))
      .finally(() => setCargandoExamenes(false));
    if (modo === 'editar') {
      api
        .get('/control-ingreso/ambientes')
        .then((res) => setAmbientes(res.data))
        .catch((err) => setError(primerError(err, 'No se pudieron cargar los ambientes.')));
    }
  }, [modo]);

  // Ingresos del examen (se guardan para buscar y filtrar sin volver a consultar).
  const cache = useRef({});
  async function cargarIngresos(id, forzar = false) {
    if (!id) return [];
    if (forzar || !cache.current[id]) {
      const res = await api.get(`/control-ingreso/examenes/${id}/ingresos/todos`);
      cache.current[id] = res.data;
    }
    setIngresos(cache.current[id]);
    return cache.current[id];
  }


  function elegirExamen(id) {
    setExamenId(id);
    setIngreso(null);
    setMensaje('');
    setError('');
  }

  function elegirIngreso(i) {
    setIngreso(i);
    setAmbienteId(String(i.ambiente_id ?? ''));
    setErrorAmbiente('');
    setMensaje('');
    setError('');
  }

  // Cancelar: descarta los cambios y vuelve a la seleccion del ingreso.
  function cancelar() {
    setIngreso(null);
    setErrorAmbiente('');
    setError('');
  }

  async function guardar(e) {
    e.preventDefault();
    if (!ambienteId) {
      setErrorAmbiente('Seleccione un ambiente.');
      return;
    }
    setTrabajando(true);
    setError('');
    try {
      const res = await api.put(`/control-ingreso/ingresos/${ingreso.id}`, { ambiente_id: Number(ambienteId) });
      setMensaje(res.data.message ?? 'Ingreso actualizado con éxito.');
      const lista = await cargarIngresos(examenId, true);
      setIngreso(lista.find((x) => x.id === ingreso.id) ?? null);
    } catch (err) {
      setError(primerError(err, 'No se pudo actualizar el ingreso.'));
    } finally {
      setTrabajando(false);
    }
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el ingreso de ${ingreso.nombre}? El estudiante podrá volver a registrar su ingreso.`)) return;
    setTrabajando(true);
    setError('');
    try {
      const res = await api.delete(`/control-ingreso/ingresos/${ingreso.id}`);
      await cargarIngresos(examenId, true);
      setIngreso(null);
      setMensaje(res.data.message ?? 'Ingreso eliminado con éxito.');
    } catch (err) {
      setError(primerError(err, 'No se pudo eliminar el ingreso.'));
    } finally {
      setTrabajando(false);
    }
  }

  const textos = TEXTOS[modo];

  return (
    <div className={ingreso ? 'max-w-2xl' : 'max-w-5xl'}>
      <Encabezado icono={<ClipboardCheckIcon size={22} />} titulo={textos.titulo} descripcion={textos.descripcion} />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <SelectorLista
        etiqueta="Examen"
        placeholder="Seleccione un examen"
        ayuda="Solo se muestran los exámenes que tienen ingresos registrados."
        vacio="No hay exámenes con ingresos registrados."
        cargando={cargandoExamenes}
        opciones={examenes.map((ex) => ({
          value: String(ex.id),
          label: `${ex.asignatura} — ${ex.fecha} ${ex.hora}${ex.ambiente ? ` — ${ex.ambiente}` : ''}`,
        }))}
        valor={examenId}
        onElegir={elegirExamen}
      />

      {examenId && (
        <TablaSeleccion
          key={examenId}
          etiqueta="Ingreso"
          titulo={`Selecciona el ingreso que quieres ${modo === 'editar' ? 'editar' : 'eliminar'}`}
          placeholder="Buscar por código, documento o nombre..."
          campos={camposIngresos(ingresos)}
          columnas={[
            { titulo: 'Hora', celda: (i) => i.hora, clase: 'whitespace-nowrap' },
            { titulo: 'Nombre completo', celda: (i) => <span className="font-medium text-gray-800">{i.nombre}</span> },
            { titulo: 'Código', celda: (i) => i.codigo },
            { titulo: 'Documento', celda: (i) => i.documento },
            { titulo: 'Ambiente', celda: (i) => i.ambiente },
          ]}
          cargar={async ({ buscar, filtros, pagina }) => {
            const lista = await cargarIngresos(examenId);
            return paginarLocal(filtrarIngresos(lista, buscar, filtros), pagina);
          }}
          seleccionado={ingreso ? { titulo: ingreso.nombre, detalle: `${ingreso.codigo} · ${ingreso.documento}` } : null}
          onElegir={elegirIngreso}
          onCambiar={cancelar}
          vacio="No se encontraron ingresos."
        />
      )}

      {ingreso && (
        <form onSubmit={guardar} noValidate className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-6 space-y-4">
          {modo === 'eliminar' && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Revisa los datos antes de eliminar. El ingreso se borrará y el estudiante podrá volver a registrar su ingreso.
            </p>
          )}
          <dl>
            <Dato etiqueta="Nombre completo" valor={ingreso.nombre} />
            <Dato etiqueta="Código universitario" valor={ingreso.codigo} />
            <Dato etiqueta="Documento de identidad" valor={ingreso.documento} />
            <Dato etiqueta="Carrera" valor={ingreso.carrera} />
            <Dato etiqueta="Correo institucional" valor={ingreso.correo} />
            <Dato etiqueta="Fecha y hora de ingreso" valor={`${ingreso.fecha ?? ''} ${ingreso.hora}`} />
            {modo === 'eliminar' && <Dato etiqueta="Ambiente" valor={ingreso.ambiente} />}
            <Dato etiqueta="Registrado por" valor={ingreso.registrado_por} />
          </dl>

          {modo === 'editar' && (
            <div>
              <Etiqueta icon={<BuildingIcon size={16} />}>Ambiente</Etiqueta>
              <select
                className="input"
                value={ambienteId}
                onChange={(e) => {
                  setAmbienteId(e.target.value);
                  setErrorAmbiente('');
                }}
              >
                <option value="">Seleccione un ambiente</option>
                {ambientes.map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.nombre}</option>
                ))}
              </select>
              {errorAmbiente && <p className="text-xs text-red-600 mt-1">{errorAmbiente}</p>}
            </div>
          )}

          <BotonesFormulario
            modo={modo}
            guardando={trabajando}
            eliminando={trabajando}
            textoEliminar="Eliminar ingreso"
            onCancelar={cancelar}
            onEliminar={eliminar}
          />
        </form>
      )}
    </div>
  );
}
