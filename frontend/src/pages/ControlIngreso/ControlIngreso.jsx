import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../api/AuthContext';
import { primerError } from '../../api/errores';
import Paginacion from '../../components/Paginacion';
import { IconoTitulo, ClipboardCheckIcon, AlertaIcon } from '../../components/Iconos';
import LectorQR from './LectorQR';

const METODOS = [
  { id: 'codigo', etiqueta: 'Código universitario' },
  { id: 'documento', etiqueta: 'Documento de identidad' },
  { id: 'qr', etiqueta: 'Código QR' },
];

const POR_PAGINA = 10;
const ACTUALIZAR_CADA_MS = 5000;

const ESTILOS_BANNER = {
  exito: { clases: 'bg-green-50 border-green-300 text-green-800', icono: '✓' },
  aviso: { clases: 'bg-amber-50 border-amber-300 text-amber-800', icono: '⚠' },
  error: { clases: 'bg-red-50 border-red-300 text-red-700', icono: '✕' },
};

function Banner({ tipo, texto }) {
  const e = ESTILOS_BANNER[tipo];
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm shadow-sm font-semibold ${e.clases}`}>
      <span className="mr-2">{e.icono}</span>
      {texto}
    </div>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-6 py-1 text-sm">
      <dt className="sm:w-48 sm:shrink-0 text-gray-500">{etiqueta}</dt>
      <dd className="text-gray-800 break-words min-w-0">{valor}</dd>
    </div>
  );
}

function limpiarValor(metodo, texto) {
  if (metodo === 'codigo') return texto.replace(/[^A-Za-z0-9]/g, '').slice(0, 15);
  if (metodo === 'documento') return texto.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 15);
  return texto.slice(0, 200);
}

// HU-10: Control de ingreso (pantalla "Registrar ingreso"). Sprint 4 (observaciones 19 y
// 20): los ingresos registrados no se editan ni se eliminan. Observacion 8: si el estudiante
// ya esta rindiendo otro examen, no se registra su ingreso, salvo que se registre su salida
// de ese examen con una observacion obligatoria.
export default function ControlIngreso() {
  const { tiene } = useAuth();
  const puedeRegistrar = tiene('control_ingreso.registrar');

  const [examenes, setExamenes] = useState([]);
  const [cargandoExamenes, setCargandoExamenes] = useState(true);
  const [examenId, setExamenId] = useState('');
  const [metodo, setMetodo] = useState('codigo');
  const [valor, setValor] = useState('');
  const [errores, setErrores] = useState({});
  const [errorQr, setErrorQr] = useState('');
  const [escaneando, setEscaneando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [banners, setBanners] = useState([]);
  const [errorExamenes, setErrorExamenes] = useState('');
  const [resumen, setResumen] = useState(null);
  // Sprint 4 (observacion 9): central de riesgos del examen (intentos de ingreso indebido).
  const [intentos, setIntentos] = useState([]);
  const [tiposRiesgo, setTiposRiesgo] = useState([]);
  const [paginaIntentos, setPaginaIntentos] = useState(1);
  // Presentacion final: ventana de la central de riesgos ({ riesgo, contexto }): muestra la
  // incidencia detectada y permite registrarla en ese momento.
  const [ventana, setVentana] = useState(null);
  const [filtroRiesgo, setFiltroRiesgo] = useState({ buscar: '', motivo: '', nivel: '', incidencia: '' });
  // Sprint 4 (observacion 8): salida del otro examen que el estudiante esta rindiendo.
  const [conSalida, setConSalida] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [errorObservacion, setErrorObservacion] = useState('');
  const examenActual = useRef('');

  // HU-10 (1): examenes programados para la fecha actual. La lista se vuelve a
  // consultar sola (cada 10 s, al volver a la pestaña y al abrir el selector)
  // para que un examen creado despues de abrir esta pantalla aparezca sin recargar.
  const cargarExamenes = useCallback(() => {
    return api
      .get('/control-ingreso/examenes')
      .then((res) => {
        setExamenes(res.data);
        setErrorExamenes('');
      })
      .catch((err) => setErrorExamenes(primerError(err)))
      .finally(() => setCargandoExamenes(false));
  }, []);

  useEffect(() => {
    cargarExamenes();
    const timer = setInterval(cargarExamenes, 10000);
    window.addEventListener('focus', cargarExamenes);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', cargarExamenes);
    };
  }, [cargarExamenes]);

  // HU-12 (6, 7, 8) y HU-26 (8): ultimos ingresos, contador e intentos del examen,
  // actualizados sin recargar la pagina.
  const cargarListas = useCallback(async (id) => {
    if (!id) {
      setResumen(null);
      setIntentos([]);
      return;
    }
    try {
      const [ing, int] = await Promise.all([
        api.get(`/control-ingreso/examenes/${id}/ingresos`),
        api.get(`/control-ingreso/examenes/${id}/riesgos`),
      ]);
      if (examenActual.current === id) {
        setResumen(ing.data);
        setIntentos(int.data.riesgos ?? []);
        setTiposRiesgo(int.data.tipos ?? []);
      }
    } catch {
      // Se reintenta en la siguiente actualizacion.
    }
  }, []);

  useEffect(() => {
    examenActual.current = examenId;
    setPaginaIntentos(1);
    cargarListas(examenId);
    if (!examenId) return undefined;
    const t = setInterval(() => cargarListas(examenId), ACTUALIZAR_CADA_MS);
    return () => clearInterval(t);
  }, [examenId, cargarListas]);

  function limpiarResultados() {
    setVentana(null);
    setConSalida(false);
    setObservacion('');
    setErrorObservacion('');
    setResultado(null);
    setBanners([]);
    setErrores({});
    setErrorQr('');
  }

  function cambiarExamen(id) {
    setExamenId(id);
    setEscaneando(false);
    limpiarResultados();
  }

  function cambiarMetodo(id) {
    if (id === metodo) return;
    setMetodo(id);
    setValor('');
    setEscaneando(false);
    limpiarResultados();
  }

  // HU-10 (13): limpia los datos mostrados y el campo de busqueda.
  function nuevaVerificacion() {
    setValor('');
    setEscaneando(false);
    limpiarResultados();
  }

  async function verificar(metodoUsado, valorUsado) {
    const nuevos = {};
    if (!examenId) nuevos.examen = 'Seleccione un examen.';
    if (metodoUsado !== 'qr' && !valorUsado.trim()) {
      nuevos.valor = 'Ingrese el código universitario o documento de identidad.';
    }
    setErrores(nuevos);
    setErrorQr('');
    if (Object.keys(nuevos).length) {
      setResultado(null);
      setBanners([]);
      return;
    }

    setVerificando(true);
    try {
      const res = await api.post('/control-ingreso/verificar', {
        examen_id: Number(examenId),
        metodo: metodoUsado,
        valor: valorUsado.trim(),
      });
      const d = res.data;
      setResultado({ ...d, metodoUsado, registrado: false });
      setEscaneando(false);
      if (metodoUsado === 'qr') setValor(d.estudiante.codigo_universitario);

      const lista = [{ tipo: 'exito', texto: d.message }];
      // Presentacion final: el estudiante fue expulsado de este examen.
      if (d.expulsion) lista.push({ tipo: 'error', texto: d.expulsion.mensaje });
      // Presentacion final: tiene una situacion excepcional registrada en este examen.
      else if (d.situacion) lista.push({ tipo: 'aviso', texto: d.situacion.mensaje });
      // HU-13 (2): el estudiante ya registro su ingreso a este examen.
      else if (d.ingreso_previo) lista.push({ tipo: 'aviso', texto: d.ingreso_previo.mensaje });
      // HU-26 (7): intento de ingreso no correspondiente registrado.
      if (d.mensaje_intento) lista.push({ tipo: 'aviso', texto: d.mensaje_intento });
      // Sprint 4 (observacion 8): ya esta rindiendo otro examen.
      if (d.otro_examen) lista.push({ tipo: 'aviso', texto: d.otro_examen.mensaje });
      setConSalida(false);
      setObservacion('');
      setErrorObservacion('');
      setBanners(lista);
      // Presentacion final: todo intento que queda en la central de riesgos (ingreso repetido,
      // expulsado, no inscrito, no habilitado, en otro examen) abre la ventana de la incidencia.
      setVentana(d.riesgo ? { riesgo: d.riesgo, contexto: d } : null);

      if (d.intento_registrado) cargarListas(examenId);
    } catch (err) {
      setResultado(null);
      setBanners([]);
      setVentana(null);
      // Sprint 4 (observacion 9): estudiante no encontrado o QR no valido: el intento queda en la
      // central de riesgos y se puede registrar la incidencia en ese momento.
      const riesgo = err?.response?.data?.riesgo;
      if (riesgo) {
        setBanners([
          { tipo: 'error', texto: err.response.data.message },
          { tipo: 'aviso', texto: err.response.data.mensaje_riesgo },
        ]);
        setVentana({ riesgo, contexto: { noEncontrado: err.response.data.message } });
        if (metodoUsado === 'qr') setEscaneando(false);
        setErrores({});
        cargarListas(examenId);
        return;
      }
      const mensaje = primerError(err, 'No se pudo verificar la identidad. Intente nuevamente.');
      if (metodoUsado === 'qr') {
        setErrorQr(mensaje);
      } else {
        setErrores({ valor: mensaje });
      }
    } finally {
      setVerificando(false);
    }
  }

  function enviar(e) {
    e.preventDefault();
    if (metodo === 'qr') {
      // Con el metodo Codigo QR se activa la camara del dispositivo (no hay campo de texto).
      if (!examenId) {
        setErrores({ examen: 'Seleccione un examen.' });
        return;
      }
      setErrores({});
      setErrorQr('');
      setResultado(null);
      setBanners([]);
      setEscaneando(true);
      return;
    }
    verificar(metodo, valor);
  }

  function qrLeido(texto) {
    verificar('qr', texto);
  }

  function falloCamara() {
    setEscaneando(false);
    setErrorQr('No se pudo acceder a la cámara del dispositivo.');
  }

  // HU-12: registrar el ingreso del estudiante habilitado.
  async function registrarIngreso() {
    if (!resultado || registrando) return;
    const salida = Boolean(resultado.otro_examen) && conSalida;
    if (salida && !observacion.trim()) {
      setErrorObservacion('La observación es obligatoria para registrar la salida del otro examen.');
      return;
    }
    setErrorObservacion('');
    setRegistrando(true);
    try {
      const res = await api.post('/control-ingreso/ingresos', {
        examen_id: Number(examenId),
        estudiante_id: resultado.estudiante.id,
        metodo: resultado.metodoUsado,
        ...(salida ? { registrar_salida: true, observacion: observacion.trim() } : {}),
      });
      setResultado((r) => ({
        ...r,
        registrado: true,
        otro_examen: null,
        ingreso_previo: {
          hora: res.data.ingreso.hora,
          registrado_por: res.data.ingreso.registrado_por,
        },
      }));
      setBanners([{ tipo: 'exito', texto: res.data.message }]);
      setResumen(res.data.resumen);
      cargarListas(examenId);
    } catch (err) {
      const estado = err.response?.status;
      if (estado === 409 && err.response.data.otro_examen) {
        // Sprint 4: el estudiante esta rindiendo otro examen.
        setResultado((r) => ({ ...r, otro_examen: err.response.data.otro_examen }));
        setBanners([{ tipo: 'aviso', texto: err.response.data.message }]);
      } else if (estado === 409) {
        // HU-13: ya tenia un ingreso registrado (por ejemplo, registrado por otro usuario a la vez).
        const previo = err.response.data.ingreso_previo;
        setResultado((r) => ({ ...r, ingreso_previo: previo }));
        setBanners([{ tipo: 'aviso', texto: err.response.data.message }]);
        cargarListas(examenId);
      } else if (!err.response || estado >= 500) {
        // HU-12 (10): error de conexion.
        setBanners([{ tipo: 'error', texto: 'No se pudo registrar el ingreso. Intente nuevamente.' }]);
      } else {
        setBanners([{ tipo: 'error', texto: primerError(err, 'No se pudo registrar el ingreso. Intente nuevamente.') }]);
      }
    } finally {
      setRegistrando(false);
    }
  }

  const etiquetaCampo = METODOS.find((m) => m.id === metodo).etiqueta;
  // Presentacion final: filtros de la central de riesgos del examen.
  const textoRiesgo = filtroRiesgo.buscar.trim().toLowerCase();
  const intentosFiltrados = intentos.filter(
    (i) =>
      (!filtroRiesgo.motivo || i.motivo === filtroRiesgo.motivo) &&
      (!filtroRiesgo.nivel || i.nivel === filtroRiesgo.nivel) &&
      (!filtroRiesgo.incidencia || (filtroRiesgo.incidencia === 'con') === Boolean(i.incidencia)) &&
      (!textoRiesgo || [i.codigo, i.nombre].some((v) => String(v ?? '').toLowerCase().includes(textoRiesgo)))
  );
  const motivosRiesgo = [...new Set(intentos.map((i) => i.motivo))].sort();
  const totalAlto = intentos.filter((i) => i.nivel === 'Alto').length;
  const sinIncidencia = intentos.filter((i) => !i.incidencia).length;
  const reincidentes = new Set(intentos.filter((i) => i.antecedentes > 1).map((i) => i.codigo)).size;
  const ultimaIntentos = Math.max(1, Math.ceil(intentosFiltrados.length / POR_PAGINA));
  const intentosVisibles = intentosFiltrados.slice((paginaIntentos - 1) * POR_PAGINA, paginaIntentos * POR_PAGINA);
  const filtrar = (campo, v) => {
    setFiltroRiesgo((f) => ({ ...f, [campo]: v }));
    setPaginaIntentos(1);
  };

  const habilitado = resultado?.estado === 'habilitado';
  const noInscrito = resultado?.estado === 'no_inscrito';
  const yaIngreso = !!resultado?.ingreso_previo;
  const expulsado = Boolean(resultado?.expulsion);
  const conSituacion = Boolean(resultado?.situacion) && !expulsado;
  const enOtroExamen = Boolean(resultado?.otro_examen) && !resultado?.registrado;
  // Presentacion final: con una situacion excepcional registrada no se puede registrar el ingreso.
  const bloqueadoPorSituacion = Boolean(resultado?.situacion?.bloquea_ingreso);
  const botonActivo = habilitado && !yaIngreso && !bloqueadoPorSituacion && !registrando && (!enOtroExamen || conSalida);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <IconoTitulo><ClipboardCheckIcon size={22} /></IconoTitulo>
        <h1 className="text-2xl font-semibold text-gray-800">Control de ingreso</h1>
      </div>

      {/* Examen */}
      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
        <label htmlFor="examen" className="block text-sm text-gray-600 mb-1">Examen</label>
        <select
          id="examen"
          className="input"
          value={examenId}
          onFocus={cargarExamenes}
          onChange={(e) => cambiarExamen(e.target.value)}
        >
          <option value="">Seleccione un examen</option>
          {examenes.map((ex) => (
            <option key={ex.id} value={String(ex.id)}>
              {`${ex.asignatura} — ${ex.fecha} ${ex.hora} — ${ex.ambiente}`}
            </option>
          ))}
        </select>
        {errores.examen && <p className="text-red-500 text-xs mt-1">{errores.examen}</p>}
        {errorExamenes && <p className="text-red-500 text-xs mt-1">{errorExamenes}</p>}
        {!cargandoExamenes && examenes.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">No hay exámenes programados para hoy.</p>
        )}
      </div>

      {/* Metodo de verificacion */}
      {puedeRegistrar && (
        <form onSubmit={enviar} noValidate className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
          <p className="text-sm text-gray-600 mb-1">Método de verificación</p>
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden mb-4">
            {METODOS.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => cambiarMetodo(m.id)}
                className={`px-4 py-2 text-sm ${i > 0 ? 'border-l border-gray-300' : ''} ${
                  metodo === m.id ? 'bg-kairos-50 text-kairos-700 font-semibold' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {m.etiqueta}
              </button>
            ))}
          </div>

          {metodo !== 'qr' && (
            <label htmlFor="busqueda" className="block text-sm text-gray-600 mb-1">{etiquetaCampo}</label>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            {metodo !== 'qr' && (
              <input
                id="busqueda"
                className="input flex-1"
                value={valor}
                onChange={(e) => setValor(limpiarValor(metodo, e.target.value))}
                autoComplete="off"
                maxLength={15}
              />
            )}
            <button
              type="submit"
              disabled={verificando}
              className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-5 py-2 shadow-glow disabled:opacity-60"
            >
              {metodo === 'qr' ? 'Escanear QR' : 'Verificar'}
            </button>
            <button
              type="button"
              onClick={nuevaVerificacion}
              className="border border-gray-300 text-gray-800 text-sm font-medium rounded-lg px-5 py-2 hover:bg-gray-50"
            >
              Nueva verificación
            </button>
          </div>
          {errores.valor && <p className="text-red-500 text-xs mt-1">{errores.valor}</p>}
        </form>
      )}

      {puedeRegistrar && metodo === 'qr' && (escaneando || errorQr) && (
        escaneando ? (
          <LectorQR onLeido={qrLeido} onFalloCamara={falloCamara} error={errorQr} />
        ) : (
          <p className="mb-5 rounded-lg border border-red-200 bg-red-50 text-red-700 font-semibold text-sm px-4 py-3">
            {errorQr}
          </p>
        )
      )}

      {/* Mensajes */}
      {banners.map((b, i) => (
        <Banner key={i} tipo={b.tipo} texto={b.texto} />
      ))}

      {/* Presentacion final: ventana de la central de riesgos con la incidencia detectada. */}
      {ventana && (
        <VentanaRiesgo
          key={ventana.riesgo.id}
          riesgo={ventana.riesgo}
          contexto={ventana.contexto}
          tipos={tiposRiesgo}
          puedeRegistrar={puedeRegistrar}
          onRegistrada={(r, texto) => {
            setVentana((v) => ({ ...v, riesgo: r }));
            setBanners((b) => [...b, { tipo: 'exito', texto }]);
            cargarListas(examenId);
          }}
          onCerrar={() => setVentana(null)}
        />
      )}

      {/* HU-11: resultado de la validacion */}
      {resultado && (
        <div
          className={`bg-white rounded-xl shadow-md p-5 mb-5 ${
            noInscrito ? 'border-2 border-red-300' : 'border border-kairos-100/70'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Resultado de la validación</h2>
            {noInscrito ? (
              <span className="rounded-full border border-red-300 bg-red-600 text-white font-bold text-sm tracking-wide px-4 py-1">
                NO INSCRITO EN EL EXAMEN
              </span>
            ) : expulsado ? (
              <span className="rounded-full border border-red-300 bg-red-600 text-white font-bold text-sm tracking-wide px-4 py-1">
                EXPULSADO DEL EXAMEN
              </span>
            ) : conSituacion ? (
              <span className="rounded-full border border-amber-300 bg-amber-100 text-amber-900 font-bold text-sm tracking-wide px-4 py-1">
                SITUACIÓN EXCEPCIONAL
              </span>
            ) : habilitado && yaIngreso && !resultado.registrado ? (
              <span className="rounded-full border border-amber-300 bg-amber-50 text-amber-800 font-bold text-sm tracking-wide px-4 py-1">
                INGRESO YA REGISTRADO
              </span>
            ) : habilitado && enOtroExamen ? (
              <span className="rounded-full border border-amber-300 bg-amber-50 text-amber-800 font-bold text-sm tracking-wide px-4 py-1">
                EN OTRO EXAMEN
              </span>
            ) : habilitado ? (
              <span className="rounded-full border border-green-300 bg-green-50 text-green-700 font-bold text-sm tracking-wide px-4 py-1">
                HABILITADO
              </span>
            ) : (
              <span className="rounded-full border border-red-300 bg-red-50 text-red-700 font-bold text-sm tracking-wide px-4 py-1">
                NO HABILITADO
              </span>
            )}
          </div>

          {/* Sprint 4: aviso destacado cuando el estudiante no esta inscrito en el examen */}
          {noInscrito && (
            <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800">
              <span className="shrink-0 text-red-600 mt-0.5"><AlertaIcon size={24} /></span>
              <div>
                <p className="font-bold">El estudiante no está inscrito en este examen</p>
                <p className="text-sm mt-0.5">
                  No se puede registrar su ingreso mientras no esté inscrito en el examen seleccionado.
                </p>
              </div>
            </div>
          )}

          <dl>
            <Dato etiqueta="Nombre completo" valor={resultado.estudiante.nombre_completo} />
            <Dato etiqueta="Código universitario" valor={resultado.estudiante.codigo_universitario} />
            <Dato etiqueta="Documento de identidad" valor={resultado.estudiante.documento_identidad} />
            <Dato etiqueta="Carrera" valor={resultado.estudiante.carrera} />
            <Dato etiqueta="Correo institucional" valor={resultado.estudiante.correo_institucional} />
          </dl>

          {resultado.estado === 'no_habilitado' && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
              <span className="font-bold">Motivo de inhabilitación:</span> {resultado.motivo}
            </div>
          )}

          {/* HU-11 (8): asignatura, fecha, hora y ambiente del examen */}
          <p className="mt-4 text-sm text-gray-500">
            Examen: {resultado.examen.asignatura} · {resultado.examen.fecha} · {resultado.examen.hora} · {resultado.examen.ambiente}
          </p>

          {/* Sprint 4 (observacion 8): el estudiante ya esta rindiendo otro examen */}
          {enOtroExamen && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">El estudiante ya está rindiendo otro examen</p>
              <p className="mt-1">
                {resultado.otro_examen.asignatura} · {resultado.otro_examen.fecha} · {resultado.otro_examen.hora}
                {resultado.otro_examen.ambiente ? ` · ${resultado.otro_examen.ambiente}` : ''} — ingresó a las{' '}
                {resultado.otro_examen.hora_ingreso}.
              </p>
              <p className="mt-1">
                No puede ingresar a dos exámenes a la vez. Si sale de ese examen para rendir este, registra su salida con una
                observación.
              </p>
              <label className="mt-3 flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-amber-600"
                  checked={conSalida}
                  onChange={(e) => {
                    setConSalida(e.target.checked);
                    setErrorObservacion('');
                  }}
                />
                Registrar su salida del otro examen y permitir el ingreso
              </label>
              {conSalida && (
                <div className="mt-2">
                  <label htmlFor="observacion-salida" className="block text-xs font-medium text-amber-900 mb-1">
                    Observación (obligatoria)
                  </label>
                  <textarea
                    id="observacion-salida"
                    className="input bg-white"
                    rows={2}
                    maxLength={300}
                    placeholder="Ej.: El estudiante entregó el examen de Cálculo y sale para rendir este examen."
                    value={observacion}
                    onChange={(e) => {
                      setObservacion(e.target.value);
                      setErrorObservacion('');
                    }}
                  />
                  <p className="text-xs text-amber-800 mt-1">{observacion.length}/300 · La hora de salida se toma del servidor.</p>
                  {errorObservacion && <p className="text-xs text-red-600 mt-1">{errorObservacion}</p>}
                </div>
              )}
            </div>
          )}

          {/* Presentacion final: expulsion del estudiante en este examen */}
          {expulsado && (
            <div role="alert" className="mt-4 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800">
              <span className="shrink-0 text-red-600 mt-0.5"><AlertaIcon size={22} /></span>
              <div className="text-sm">
                <p className="font-bold">El estudiante fue expulsado de este examen</p>
                <p className="mt-0.5">
                  Expulsado a las {resultado.expulsion.hora}
                  {resultado.expulsion.registrado_por ? ` por ${resultado.expulsion.registrado_por}` : ''}. Motivo:{' '}
                  {resultado.expulsion.motivo}
                </p>
                <p className="mt-0.5">No puede volver a ingresar a este examen.</p>
              </div>
            </div>
          )}

          {/* Presentacion final: situacion excepcional registrada (HU-25) */}
          {conSituacion && <CajaSituacion situacion={resultado.situacion} />}

          {/* HU-13 (4): usuario que registro el primer ingreso */}
          {resultado.ingreso_previo && (
            <p className="mt-1 text-sm text-gray-500">
              Primer ingreso registrado {resultado.ingreso_previo.hora ? `a las ${resultado.ingreso_previo.hora} ` : ''}por:{' '}
              {resultado.ingreso_previo.registrado_por}
              {resultado.ingreso_previo.ambiente ? ` · ${resultado.ingreso_previo.ambiente}` : ''}
            </p>
          )}

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={registrarIngreso}
              disabled={!botonActivo}
              className={`text-sm font-medium rounded-lg px-5 py-2 shadow-sm ${
                botonActivo ? 'bg-kairos-gradient text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {enOtroExamen && conSalida ? 'Registrar salida e ingreso' : 'Registrar ingreso'}
            </button>
          </div>
        </div>
      )}

      {/* HU-12: ultimos ingresos y contador */}
      {examenId && resumen && (
        <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Últimos ingresos</h2>
            <span className="text-kairos-700 font-bold">
              {resumen.ingresados} ingresados / {resumen.habilitados} habilitados
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-kairos-50/80 text-kairos-800 text-left">
                <tr>
                  <th className="px-3 py-2">Hora</th>
                  <th className="px-3 py-2">Nombre completo</th>
                  <th className="px-3 py-2">Código universitario</th>
                  <th className="px-3 py-2">Documento de identidad</th>
                  <th className="px-3 py-2">Carrera</th>
                  <th className="px-3 py-2">Correo institucional</th>
                  <th className="px-3 py-2">Ambiente</th>
                  <th className="px-3 py-2">Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {resumen.ultimos.map((i) => (
                  <tr key={i.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 whitespace-nowrap">{i.hora}</td>
                    <td className="px-3 py-2">{i.nombre}</td>
                    <td className="px-3 py-2">{i.codigo}</td>
                    <td className="px-3 py-2">{i.documento}</td>
                    <td className="px-3 py-2">{i.carrera}</td>
                    <td className="px-3 py-2">{i.correo}</td>
                    <td className="px-3 py-2">{i.ambiente}</td>
                    <td className="px-3 py-2">{i.registrado_por}</td>
                  </tr>
                ))}
                {resumen.ultimos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-gray-400">
                      Aún no hay ingresos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HU-26 + Sprint 4 (observacion 9): CENTRAL DE RIESGOS del examen */}
      {examenId && (
        <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h2 className="text-lg font-semibold text-gray-800">Central de riesgos del examen</h2>
            <span className="text-sm text-gray-500">{intentos.length} registrados</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Intentos de ingreso que no corresponden (personas no registradas, QR no válidos, estudiantes no inscritos, no
            habilitados, que ya registraron su ingreso, que fueron expulsados o que ya están rindiendo otro examen), además de
            las expulsiones y situaciones excepcionales registradas en el examen. Los registros no se pueden modificar ni
            eliminar.
          </p>

          {/* Presentacion final: resumen y filtros de la central de riesgos */}
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">{intentos.length} intentos</span>
            <span className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white">{totalAlto} riesgo alto</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">{sinIncidencia} sin incidencia</span>
            <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 font-medium text-red-700">
              {reincidentes} {reincidentes === 1 ? 'reincidente' : 'reincidentes'}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mb-3">
            <input
              className="input"
              placeholder="Buscar por código o nombre"
              value={filtroRiesgo.buscar}
              onChange={(e) => filtrar('buscar', e.target.value)}
              aria-label="Buscar en la central de riesgos"
            />
            <select className="input" aria-label="Motivo" value={filtroRiesgo.motivo} onChange={(e) => filtrar('motivo', e.target.value)}>
              <option value="">Todos los motivos</option>
              {motivosRiesgo.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select className="input" aria-label="Nivel de riesgo" value={filtroRiesgo.nivel} onChange={(e) => filtrar('nivel', e.target.value)}>
              <option value="">Todos los niveles</option>
              <option value="Alto">Riesgo alto</option>
              <option value="Medio">Riesgo medio</option>
            </select>
            <select className="input" aria-label="Incidencia" value={filtroRiesgo.incidencia} onChange={(e) => filtrar('incidencia', e.target.value)}>
              <option value="">Con y sin incidencia</option>
              <option value="sin">Sin incidencia registrada</option>
              <option value="con">Con incidencia registrada</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-kairos-50/80 text-kairos-800 text-left">
                <tr>
                  <th className="px-3 py-2">Hora</th>
                  <th className="px-3 py-2">Código / documento</th>
                  <th className="px-3 py-2">Estudiante</th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2">Riesgo</th>
                  <th className="px-3 py-2">Antecedentes</th>
                  <th className="px-3 py-2">Verificado por</th>
                  <th className="px-3 py-2">Incidencia</th>
                </tr>
              </thead>
              <tbody>
                {intentosVisibles.map((i) => (
                  <tr key={i.id} className={`border-t border-gray-100 ${ventana?.riesgo.id === i.id ? 'bg-amber-50/70' : ''}`}>
                    <td className="px-3 py-2 whitespace-nowrap">{i.hora}</td>
                    <td className="px-3 py-2">{i.codigo}</td>
                    <td className="px-3 py-2">{i.nombre ?? <span className="text-red-700 font-medium">Persona no registrada</span>}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-xs whitespace-nowrap">
                        {i.motivo}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          i.nivel === 'Alto' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {i.nivel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {i.antecedentes > 1 ? (
                        <span className="font-semibold text-red-700">{i.antecedentes} intentos (reincidente)</span>
                      ) : (
                        <span className="text-gray-500">Primer intento</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{i.registrado_por}</td>
                    <td className="px-3 py-2">
                      {i.incidencia ? (
                        <button
                          type="button"
                          onClick={() => setVentana({ riesgo: i, contexto: null })}
                          className="text-left text-xs text-green-700 w-56 whitespace-normal hover:underline"
                        >
                          <span className="font-semibold">Registrada: {i.incidencia.tipo} ({i.incidencia.hora})</span>
                          <span className="block text-kairos-700">Ver detalle</span>
                        </button>
                      ) : puedeRegistrar ? (
                        <button
                          type="button"
                          onClick={() => setVentana({ riesgo: i, contexto: null })}
                          className="rounded-lg border border-amber-500 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 whitespace-nowrap"
                        >
                          Registrar incidencia
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Sin incidencia</span>
                      )}
                    </td>
                  </tr>
                ))}
                {intentosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-gray-400">
                      {intentos.length ? 'No hay intentos que coincidan con los filtros.' : 'No hay intentos registrados en este examen.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion
            pagina={paginaIntentos}
            ultima={ultimaIntentos}
            total={intentosFiltrados.length}
            onCambiar={setPaginaIntentos}
          />
        </div>
      )}
    </div>
  );
}

// Presentacion final (observacion de la licenciada): VENTANA de la central de riesgos. Se abre
// sola cuando un intento queda registrado (ingreso repetido, estudiante expulsado, no inscrito,
// no habilitado, en otro examen, persona no registrada o QR no valido) y tambien desde la tabla.
// Muestra la incidencia detectada con sus datos y permite registrarla en ese mismo momento.
const TITULOS_RIESGO = {
  'Ingreso ya registrado': 'El estudiante ya registró su ingreso',
  'Estudiante expulsado': 'Estudiante expulsado de este examen',
  'No inscrito en el examen': 'Estudiante no inscrito en el examen',
  'No habilitado': 'Estudiante no habilitado',
  'No registrado en el sistema': 'Persona no registrada en el sistema',
  'Código QR no válido': 'Código QR no válido',
  'Ya está rindiendo otro examen': 'El estudiante ya está rindiendo otro examen',
  'Registro duplicado en la importación': 'Estudiante duplicado en la importación',
  'Situación excepcional registrada': 'El estudiante tiene una situación excepcional registrada',
  'Situación excepcional': 'Situación excepcional registrada en el examen',
  'Expulsión del examen': 'Estudiante expulsado del examen',
};

// Datos de la situacion excepcional (HU-25) registrada para el estudiante en el examen.
function CajaSituacion({ situacion }) {
  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">
        Situación excepcional: {situacion.tipo} — registrada a las {situacion.hora}
        {situacion.registrado_por ? ` por ${situacion.registrado_por}` : ''}.
      </p>
      {situacion.descripcion && <p className="mt-0.5">Descripción: {situacion.descripcion}</p>}
      {situacion.ambiente_destino && <p className="mt-0.5">Ambiente de destino: {situacion.ambiente_destino}</p>}
      {situacion.bloquea_ingreso && (
        <p className="mt-1 font-semibold text-red-700">No se puede registrar su ingreso mientras tenga esta situación excepcional.</p>
      )}
    </div>
  );
}

function FilaVentana({ etiqueta, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-1 text-sm">
      <dt className="sm:w-40 sm:shrink-0 text-gray-500">{etiqueta}</dt>
      <dd className="text-gray-800 break-words min-w-0">{children}</dd>
    </div>
  );
}

function VentanaRiesgo({ riesgo, contexto, tipos, puedeRegistrar, onRegistrada, onCerrar }) {
  const sugerido = tipos.find((t) => t.codigo === riesgo.tipo_sugerido) ?? tipos[0];
  // Con una situacion excepcional registrada, el tipo es el de esa situacion y no se cambia.
  const tipoFijo = riesgo.tipo_fijo ?? null;
  const [tipoId, setTipoId] = useState(tipoFijo ? String(tipoFijo.id) : sugerido ? String(sugerido.id) : '');
  const [descripcion, setDescripcion] = useState('');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const alto = riesgo.nivel === 'Alto';
  const c = contexto ?? {};

  // Se cierra con la tecla Escape.
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  async function registrar(e) {
    e.preventDefault();
    const nuevos = {};
    if (!tipoId) nuevos.tipo = 'El campo Tipo de incidencia es obligatorio.';
    if (!descripcion.trim()) nuevos.descripcion = 'El campo Descripción es obligatorio.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setGuardando(true);
    try {
      const res = await api.post(`/control-ingreso/riesgos/${riesgo.id}/incidencia`, {
        tipo_incidencia_id: Number(tipoId),
        descripcion: descripcion.trim(),
      });
      onRegistrada(res.data.riesgo, res.data.message);
    } catch (err) {
      setErrores({ general: primerError(err, 'No se pudo registrar la incidencia. Intente nuevamente.') });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-3 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-riesgo" className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-6">
        <div className={`flex items-start justify-between gap-3 rounded-t-2xl px-5 py-4 ${alto ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-900'}`}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0"><AlertaIcon size={24} /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Central de riesgos · Riesgo {riesgo.nivel}</p>
              <h2 id="titulo-riesgo" className="text-lg font-bold">{TITULOS_RIESGO[riesgo.motivo] ?? riesgo.motivo}</h2>
            </div>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-xl leading-none opacity-80 hover:opacity-100">✕</button>
        </div>

        <div className="px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Incidencia detectada</h3>
          <dl className="mb-3">
            <FilaVentana etiqueta="Estudiante">{riesgo.nombre ?? <span className="font-medium text-red-700">Persona no registrada</span>}</FilaVentana>
            <FilaVentana etiqueta="Código / documento">{riesgo.codigo}</FilaVentana>
            <FilaVentana etiqueta="Motivo">{riesgo.motivo}</FilaVentana>
            <FilaVentana etiqueta="Fecha y hora">{riesgo.fecha} · {riesgo.hora}</FilaVentana>
            <FilaVentana etiqueta="Antecedentes">
              {riesgo.antecedentes > 1 ? (
                <span className="font-semibold text-red-700">{riesgo.antecedentes} intentos (reincidente)</span>
              ) : (
                'Primer intento'
              )}
            </FilaVentana>
            <FilaVentana etiqueta="Verificado por">{riesgo.registrado_por}</FilaVentana>
          </dl>

          {/* Detalle segun el caso */}
          {c.expulsion && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Fue expulsado a las {c.expulsion.hora}{c.expulsion.registrado_por ? ` por ${c.expulsion.registrado_por}` : ''}.</p>
              <p className="mt-0.5">Motivo de la expulsión: {c.expulsion.motivo}</p>
            </div>
          )}
          {!c.expulsion && c.situacion && (
            <div className="mb-3">
              <CajaSituacion situacion={c.situacion} />
            </div>
          )}
          {!c.expulsion && c.ingreso_previo && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Ya registró su ingreso a este examen a las {c.ingreso_previo.hora}.</p>
              <p className="mt-0.5">
                Registrado por {c.ingreso_previo.registrado_por}
                {c.ingreso_previo.ambiente ? ` · Ambiente: ${c.ingreso_previo.ambiente}` : ''}. No se puede registrar un segundo ingreso.
              </p>
            </div>
          )}
          {c.otro_examen && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{c.otro_examen.mensaje}</div>
          )}
          {c.estado === 'no_habilitado' && c.motivo && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span className="font-semibold">Motivo de inhabilitación:</span> {c.motivo}
            </div>
          )}
          {c.mensaje_estado && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{c.mensaje_estado}</div>
          )}
          {c.noEncontrado && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {c.noEncontrado} El código o documento ingresado no pertenece a ningún estudiante registrado.
            </div>
          )}

          {riesgo.incidencia ? (
            <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-semibold">Incidencia registrada: {riesgo.incidencia.tipo} ({riesgo.incidencia.hora})</p>
              {riesgo.incidencia.descripcion && <p className="mt-1 text-green-900">{riesgo.incidencia.descripcion}</p>}
            </div>
          ) : puedeRegistrar ? (
            <form onSubmit={registrar} noValidate className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Registrar incidencia</h3>
              <div className="grid gap-3">
                <div>
                  <label htmlFor="tipo-riesgo" className="block text-xs font-medium text-gray-700 mb-1">Tipo de incidencia</label>
                  {tipoFijo ? (
                    <>
                      <input id="tipo-riesgo" className="input bg-gray-100 text-gray-700 cursor-not-allowed" value={tipoFijo.nombre} readOnly disabled />
                      <p className="text-xs text-gray-500 mt-1">Es el tipo de la situación excepcional registrada para el estudiante; no se puede cambiar.</p>
                    </>
                  ) : (
                    <select id="tipo-riesgo" className="input bg-white" value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
                      <option value="">Seleccione un tipo</option>
                      {tipos.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  )}
                  {errores.tipo && <p className="text-xs text-red-600 mt-1">{errores.tipo}</p>}
                </div>
                <div>
                  <label htmlFor="descripcion-riesgo" className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    id="descripcion-riesgo"
                    className="input bg-white"
                    rows={3}
                    maxLength={500}
                    placeholder="Describe lo que ocurrió y qué se hizo (ej.: volvió a presentarse en la puerta; se le negó o permitió el ingreso)."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">{descripcion.length}/500</p>
                  {errores.descripcion && <p className="text-xs text-red-600 mt-1">{errores.descripcion}</p>}
                </div>
              </div>
              {errores.general && <p className="text-sm text-red-600 mt-2">{errores.general}</p>}
              <div className="flex flex-wrap justify-end gap-2 mt-3">
                <button type="button" onClick={onCerrar} className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-white">
                  Ahora no
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className={`text-white text-sm font-medium rounded-lg px-5 py-2 disabled:opacity-60 ${alto ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  {guardando ? 'Registrando...' : 'Registrar incidencia'}
                </button>
              </div>
            </form>
          ) : null}

          {(riesgo.incidencia || !puedeRegistrar) && (
            <div className="flex justify-end mt-3">
              <button type="button" onClick={onCerrar} className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-5 py-2 shadow-glow">
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
