import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Encabezado from '../../components/Encabezado';
import { BuscarIcon } from '../../components/Iconos';
import { AvisoNota, CampoExamen, Dato, btnPrincipal, btnSecundario, tarjeta, useExamenes } from '../../components/Sprint3';

const TONO = { habilitado: 'verde', no_inscrito: 'ambar', sin_habilitacion: 'ambar' };

// HU-05: Consulta del motivo de inhabilitacion de un estudiante. Solo muestra el motivo;
// no permite modificar la habilitacion.
export default function ConsultaMotivo() {
  const { examenes, cargando } = useExamenes('/consultas/examenes');
  const [examenId, setExamenId] = useState('');
  const [valor, setValor] = useState('');
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null); // { tono, texto }
  const [resultado, setResultado] = useState(null); // estudiante no habilitado (ventana)
  const [consultando, setConsultando] = useState(false);
  const campoValor = useRef(null);

  function cerrar() {
    setResultado(null);
    setValor('');
    setTimeout(() => campoValor.current?.focus(), 0);
  }

  useEffect(() => {
    if (!resultado) return undefined;
    const alTeclear = (e) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [resultado]);

  async function consultar(e) {
    e.preventDefault();
    setAviso(null);
    const errs = {};
    if (!examenId) errs.examen = 'Seleccione un examen.';
    if (!valor.trim()) errs.valor = 'Ingrese el código universitario o documento de identidad.';
    setErrores(errs);
    if (Object.keys(errs).length) return;

    setConsultando(true);
    try {
      const { data } = await api.post('/consultas/motivo', { examen_id: Number(examenId), valor: valor.trim() });
      if (data.estado === 'no_habilitado') {
        setResultado(data);
      } else {
        setAviso({ tono: TONO[data.estado] ?? 'ambar', texto: data.message });
      }
    } catch (err) {
      const campos = err?.response?.data?.errors ?? {};
      if (campos.examen_id) setErrores({ examen: campos.examen_id[0] });
      else setErrores({ valor: primerError(err, 'No se pudo realizar la consulta.') });
    } finally {
      setConsultando(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Encabezado
        icono={<BuscarIcon size={22} />}
        titulo="Consulta del motivo de inhabilitación"
        descripcion="Busca a un estudiante para ver por qué no está habilitado para el examen."
      />

      <form onSubmit={consultar} noValidate className={`${tarjeta} p-5 space-y-4`}>
        <CampoExamen
          examenes={examenes}
          cargando={cargando}
          valor={examenId}
          onCambiar={(v) => {
            setExamenId(v);
            setAviso(null);
            setErrores((x) => ({ ...x, examen: undefined }));
          }}
          error={errores.examen}
          vacio="No hay exámenes programados."
        />
        <div>
          <label htmlFor="valor" className="block text-sm font-medium text-gray-600 mb-1">
            Código universitario o documento de identidad
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="valor"
              ref={campoValor}
              className="input flex-1"
              value={valor}
              maxLength={30}
              onChange={(e) => {
                setValor(e.target.value);
                setErrores((x) => ({ ...x, valor: undefined }));
              }}
            />
            <button type="submit" disabled={consultando} className={btnPrincipal}>
              {consultando ? 'Consultando...' : 'Consultar'}
            </button>
          </div>
          {errores.valor && <p className="text-xs text-red-600 mt-1">{errores.valor}</p>}
        </div>
        {aviso && <AvisoNota tono={aviso.tono}>{aviso.texto}</AvisoNota>}
      </form>

      {resultado && (
        <div
          className="fixed inset-0 z-50 bg-kairos-950/40 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Motivo de inhabilitación"
        >
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-kairos-100/70 w-full max-w-lg p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Motivo de inhabilitación</h2>
              <span className="rounded-full border border-red-300 bg-red-50 text-red-700 font-bold text-xs tracking-wide px-3 py-1">
                NO HABILITADO
              </span>
            </div>
            <dl>
              <Dato etiqueta="Nombre completo" valor={resultado.estudiante.nombre_completo} />
              <Dato etiqueta="Código universitario" valor={resultado.estudiante.codigo_universitario} />
              <Dato etiqueta="Documento de identidad" valor={resultado.estudiante.documento_identidad} />
              <Dato etiqueta="Examen" valor={`${resultado.examen.asignatura} · ${resultado.examen.fecha} · ${resultado.examen.hora}`} />
            </dl>
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
              <span className="font-bold">Motivo:</span> {resultado.motivo}
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Consulta registrada en el historial de operaciones · {resultado.consultado.fecha} {resultado.consultado.hora}
              {resultado.consultado.usuario ? ` · ${resultado.consultado.usuario}` : ''}
            </p>
            <div className="flex justify-end mt-5">
              <button type="button" onClick={cerrar} className={btnSecundario} autoFocus>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
