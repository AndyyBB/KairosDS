import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Encabezado from '../../components/Encabezado';
import Aviso from '../../components/Aviso';
import { AlertaIcon, BuildingIcon, ExamIcon, Etiqueta, UserIcon } from '../../components/Iconos';
import { CampoExamen, btnPrincipal, btnSecundario, tarjeta, useExamenes } from '../../components/Sprint3';

const MAX = 500;

// HU-25: Registro de situaciones excepcionales.
export default function RegistrarSituacion() {
  const navigate = useNavigate();
  const { examenes, cargando } = useExamenes('/consultas/examenes');
  const [tipos, setTipos] = useState([]);
  const [ambientes, setAmbientes] = useState([]);
  const [examenId, setExamenId] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [valor, setValor] = useState('');
  const [estudiante, setEstudiante] = useState(null); // { estudiante, ingreso }
  const [ambienteId, setAmbienteId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/incidencias/tipos').then((res) => setTipos(res.data)).catch((err) => setError(primerError(err)));
    api.get('/control-ingreso/ambientes').then((res) => setAmbientes(res.data)).catch(() => setAmbientes([]));
  }, []);

  const tipo = tipos.find((t) => String(t.id) === tipoId);
  const cambioAmbiente = tipo?.codigo === 'CAMBIO_AMBIENTE';
  const limpiarError = (campo) => setErrores((x) => ({ ...x, [campo]: undefined }));

  async function buscar() {
    setEstudiante(null);
    if (!valor.trim()) {
      setErrores((x) => ({ ...x, valor: 'Ingrese el código universitario o documento de identidad.' }));
      return;
    }
    setBuscando(true);
    try {
      const { data } = await api.post('/incidencias/estudiante', { valor: valor.trim(), examen_id: examenId ? Number(examenId) : null });
      setEstudiante(data);
      limpiarError('valor');
    } catch (err) {
      setErrores((x) => ({ ...x, valor: primerError(err, 'No se pudo buscar al estudiante.') }));
    } finally {
      setBuscando(false);
    }
  }

  function quitarEstudiante() {
    setEstudiante(null);
    setValor('');
  }

  async function guardar(e) {
    e.preventDefault();
    setMensaje('');
    setError('');
    const errs = {};
    if (!examenId) errs.examen = 'Seleccione un examen.';
    if (!tipoId) errs.tipo = 'El campo Tipo de situación es obligatorio.';
    if (valor.trim() && !estudiante) errs.valor = 'Presione "Buscar" para seleccionar al estudiante, o deje el campo vacío.';
    if (cambioAmbiente && (!estudiante || !ambienteId)) errs.ambiente = 'Seleccione al estudiante y el ambiente de destino.';
    if (cambioAmbiente && estudiante?.ingreso && ambienteId && String(estudiante.ingreso.ambiente_id) === ambienteId) {
      errs.ambiente = 'El estudiante ya está en ese ambiente.';
    }
    if (!descripcion.trim()) errs.descripcion = 'El campo Descripción es obligatorio.';
    setErrores(errs);
    if (Object.keys(errs).length) return;

    setGuardando(true);
    try {
      const { data } = await api.post('/incidencias/situaciones', {
        examen_id: Number(examenId),
        tipo_incidencia_id: Number(tipoId),
        estudiante_id: estudiante?.estudiante.id ?? null,
        ambiente_destino_id: cambioAmbiente ? Number(ambienteId) : null,
        descripcion: descripcion.trim(),
      });
      setMensaje(data.message);
      setTipoId('');
      setValor('');
      setEstudiante(null);
      setAmbienteId('');
      setDescripcion('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(primerError(err, 'No se pudo registrar la situación excepcional.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Encabezado
        icono={<AlertaIcon size={22} />}
        titulo="Registrar situación excepcional"
        descripcion="Registra problemas de identificación, cambios de ambiente u otras situaciones durante el examen."
      />
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <form onSubmit={guardar} noValidate className={`${tarjeta} p-6 space-y-4`}>
        <CampoExamen
          examenes={examenes}
          cargando={cargando}
          valor={examenId}
          onCambiar={(v) => {
            setExamenId(v);
            setEstudiante(null);
            limpiarError('examen');
          }}
          error={errores.examen}
          vacio="No hay exámenes en curso o programados para hoy."
        />

        <div>
          <Etiqueta icon={<AlertaIcon size={16} />}>Tipo de situación</Etiqueta>
          <select
            className="input"
            value={tipoId}
            onChange={(e) => {
              setTipoId(e.target.value);
              limpiarError('tipo');
              limpiarError('ambiente');
            }}
          >
            <option value="">Seleccione un tipo de situación</option>
            {tipos.map((t) => (
              <option key={t.id} value={String(t.id)}>{t.nombre}</option>
            ))}
          </select>
          {errores.tipo && <p className="text-xs text-red-600 mt-1">{errores.tipo}</p>}
        </div>

        <div>
          <Etiqueta icon={<UserIcon />}>Estudiante {cambioAmbiente ? '' : '(opcional)'}</Etiqueta>
          {estudiante ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-kairos-100 bg-kairos-50/40 px-4 py-2.5 text-sm">
              <span className="text-gray-800">
                <span className="font-medium">{estudiante.estudiante.nombre_completo}</span> · {estudiante.estudiante.codigo_universitario} ·{' '}
                {estudiante.estudiante.carrera}
                {estudiante.ingreso && (
                  <span className="block text-xs text-gray-500">
                    Ingresó a las {estudiante.ingreso.hora} · Ambiente {estudiante.ingreso.ambiente}
                  </span>
                )}
              </span>
              <button type="button" onClick={quitarEstudiante} className="text-xs font-medium text-kairos-700 hover:underline">
                Quitar
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                className="input flex-1"
                placeholder="Código universitario o documento de identidad"
                value={valor}
                maxLength={30}
                onChange={(e) => {
                  setValor(e.target.value);
                  limpiarError('valor');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    buscar();
                  }
                }}
              />
              <button type="button" onClick={buscar} disabled={buscando} className={btnSecundario}>
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          )}
          {errores.valor && <p className="text-xs text-red-600 mt-1">{errores.valor}</p>}
        </div>

        {cambioAmbiente && (
          <div>
            <Etiqueta icon={<BuildingIcon size={16} />}>Ambiente de destino</Etiqueta>
            <select
              className="input"
              value={ambienteId}
              onChange={(e) => {
                setAmbienteId(e.target.value);
                limpiarError('ambiente');
              }}
            >
              <option value="">Seleccione un ambiente</option>
              {ambientes.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.nombre}</option>
              ))}
            </select>
            {errores.ambiente && <p className="text-xs text-red-600 mt-1">{errores.ambiente}</p>}
          </div>
        )}

        <div>
          <Etiqueta icon={<ExamIcon size={16} />}>Descripción</Etiqueta>
          <textarea
            className="input min-h-[96px]"
            value={descripcion}
            maxLength={MAX}
            placeholder="Describe lo que ocurrió y cómo se resolvió..."
            onChange={(e) => {
              setDescripcion(e.target.value);
              limpiarError('descripcion');
            }}
          />
          <div className="flex justify-between gap-3 mt-1">
            <p className="text-xs text-red-600">{errores.descripcion}</p>
            <p className="text-xs text-gray-400 shrink-0">{descripcion.length}/{MAX} · La fecha y hora se toman del servidor.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/')} className={btnSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className={btnPrincipal}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
