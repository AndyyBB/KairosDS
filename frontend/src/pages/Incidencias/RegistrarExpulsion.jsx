import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Encabezado from '../../components/Encabezado';
import Aviso from '../../components/Aviso';
import { AlertaIcon, Etiqueta, IdCardIcon } from '../../components/Iconos';
import { CampoExamen, Dato, btnSecundario, tarjeta, useExamenes } from '../../components/Sprint3';

const MAX = 300;

// HU-24: Registro de estudiantes expulsados.
export default function RegistrarExpulsion() {
  const navigate = useNavigate();
  const { examenes, cargando } = useExamenes('/consultas/examenes');
  const [examenId, setExamenId] = useState('');
  const [valor, setValor] = useState('');
  const [encontrado, setEncontrado] = useState(null); // { estudiante, ingreso }
  const [motivo, setMotivo] = useState('');
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const limpiarError = (campo) => setErrores((x) => ({ ...x, [campo]: undefined }));

  async function buscar() {
    setMensaje('');
    setEncontrado(null);
    const errs = {};
    if (!examenId) errs.examen = 'Seleccione un examen.';
    if (!valor.trim()) errs.valor = 'Ingrese el código universitario o documento de identidad.';
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setBuscando(true);
    try {
      const { data } = await api.post('/incidencias/expulsiones/buscar', { examen_id: Number(examenId), valor: valor.trim() });
      setEncontrado(data);
    } catch (err) {
      setErrores({ valor: primerError(err, 'No se pudo buscar al estudiante.') });
    } finally {
      setBuscando(false);
    }
  }

  async function registrar(e) {
    e.preventDefault();
    setMensaje('');
    setError('');
    const errs = {};
    if (!examenId) errs.examen = 'Seleccione un examen.';
    if (!encontrado) errs.valor = valor.trim() ? 'Presione "Buscar" para verificar el ingreso del estudiante.' : 'Ingrese el código universitario o documento de identidad.';
    if (!motivo.trim()) errs.motivo = 'El campo Motivo de la expulsión es obligatorio.';
    setErrores(errs);
    if (Object.keys(errs).length) return;

    if (!window.confirm(`¿Confirmas la expulsión de ${encontrado.estudiante.nombre_completo} del examen?`)) return;

    setGuardando(true);
    try {
      const { data } = await api.post('/incidencias/expulsiones', {
        examen_id: Number(examenId),
        ingreso_id: encontrado.ingreso.id,
        motivo: motivo.trim(),
      });
      setMensaje(data.message);
      setValor('');
      setMotivo('');
      setEncontrado(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(primerError(err, 'No se pudo registrar la expulsión.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Encabezado
        icono={<AlertaIcon size={22} />}
        titulo="Registrar expulsión"
        descripcion="Registra la expulsión de un estudiante que ya ingresó al examen, con su motivo."
      />
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <form onSubmit={registrar} noValidate className={`${tarjeta} p-6 space-y-4`}>
        <CampoExamen
          examenes={examenes}
          cargando={cargando}
          valor={examenId}
          onCambiar={(v) => {
            setExamenId(v);
            setEncontrado(null);
            limpiarError('examen');
          }}
          error={errores.examen}
          vacio="No hay exámenes en curso o programados para hoy."
        />

        <div>
          <Etiqueta icon={<IdCardIcon />}>Código universitario o documento de identidad</Etiqueta>
          <div className="flex gap-3">
            <input
              className="input flex-1"
              value={valor}
              maxLength={30}
              onChange={(e) => {
                setValor(e.target.value);
                setEncontrado(null);
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
          {errores.valor && <p className="text-xs text-red-600 mt-1">{errores.valor}</p>}
        </div>

        {encontrado && (
          <dl className="rounded-lg border border-kairos-100 bg-kairos-50/40 p-4">
            <Dato etiqueta="Nombre completo" valor={encontrado.estudiante.nombre_completo} />
            <Dato etiqueta="Código universitario" valor={encontrado.estudiante.codigo_universitario} />
            <Dato etiqueta="Carrera" valor={encontrado.estudiante.carrera} />
            <Dato etiqueta="Ingreso registrado" valor={`${encontrado.ingreso.hora} · Ambiente ${encontrado.ingreso.ambiente ?? '—'}`} />
          </dl>
        )}

        <div>
          <Etiqueta icon={<AlertaIcon size={16} />}>Motivo de la expulsión</Etiqueta>
          <textarea
            className="input min-h-[96px]"
            value={motivo}
            maxLength={MAX}
            placeholder="Describe el motivo de la expulsión..."
            onChange={(e) => {
              setMotivo(e.target.value);
              limpiarError('motivo');
            }}
          />
          <div className="flex justify-between gap-3 mt-1">
            <p className="text-xs text-red-600">{errores.motivo}</p>
            <p className="text-xs text-gray-400 shrink-0">{motivo.length}/{MAX} · La hora se toma del servidor al registrar.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/')} className={btnSecundario}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg px-5 py-2 shadow-sm disabled:opacity-60"
          >
            {guardando ? 'Registrando...' : 'Registrar expulsión'}
          </button>
        </div>
      </form>
    </div>
  );
}
