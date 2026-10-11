import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../api/AuthContext';
import { primerError } from '../../api/errores';
import Paginacion from '../../components/Paginacion';
import { IconoTitulo, ClipboardCheckIcon } from '../../components/Iconos';
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

// Sprint 2 - HU-10, HU-11, HU-12, HU-13 y HU-26: Control de ingreso.
export default function ControlIngreso() {
  const { tiene } = useAuth();
  const puedeRegistrar = tiene('control_ingreso.registrar');
  const puedeEditar = tiene('control_ingreso.editar');
  const puedeEliminar = tiene('control_ingreso.eliminar');

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
  // HU-12 (9): edicion / eliminacion de un ingreso (solo con los permisos correspondientes).
  const [ambientes, setAmbientes] = useState([]);
  const [editando, setEditando] = useState(null);
  const [ambienteSel, setAmbienteSel] = useState('');
  const [guardandoIngreso, setGuardandoIngreso] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [intentos, setIntentos] = useState([]);
  const [paginaIntentos, setPaginaIntentos] = useState(1);
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
        api.get(`/control-ingreso/examenes/${id}/intentos`),
      ]);
      if (examenActual.current === id) {
        setResumen(ing.data);
        setIntentos(int.data);
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
      // HU-13 (2): el estudiante ya registro su ingreso a este examen.
      if (d.ingreso_previo) lista.push({ tipo: 'aviso', texto: d.ingreso_previo.mensaje });
      // HU-26 (7): intento de ingreso no correspondiente registrado.
      if (d.mensaje_intento) lista.push({ tipo: 'aviso', texto: d.mensaje_intento });
      setBanners(lista);

      if (d.intento_registrado) cargarListas(examenId);
    } catch (err) {
      setResultado(null);
      setBanners([]);
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

  async function abrirEdicion(ingreso) {
    setEditando(ingreso);
    setAmbienteSel(String(ingreso.ambiente_id ?? ''));
    if (ambientes.length === 0) {
      try {
        const res = await api.get('/control-ingreso/ambientes');
        setAmbientes(res.data);
      } catch (err) {
        setBanners([{ tipo: 'error', texto: primerError(err, 'No se pudieron cargar los ambientes.') }]);
        setEditando(null);
      }
    }
  }

  async function guardarEdicion() {
    if (!ambienteSel) return;
    setGuardandoIngreso(true);
    try {
      const res = await api.put(`/control-ingreso/ingresos/${editando.id}`, { ambiente_id: Number(ambienteSel) });
      setBanners([{ tipo: 'exito', texto: res.data.message }]);
      setEditando(null);
      await cargarListas(examenId);
    } catch (err) {
      setBanners([{ tipo: 'error', texto: primerError(err, 'No se pudo actualizar el ingreso.') }]);
    } finally {
      setGuardandoIngreso(false);
    }
  }

  async function eliminarIngreso(ingreso) {
    if (!confirm(`¿Eliminar el ingreso de ${ingreso.nombre}? Podrá volver a registrarse.`)) return;
    try {
      const res = await api.delete(`/control-ingreso/ingresos/${ingreso.id}`);
      setBanners([{ tipo: 'exito', texto: res.data.message }]);
      await cargarListas(examenId);
    } catch (err) {
      setBanners([{ tipo: 'error', texto: primerError(err, 'No se pudo eliminar el ingreso.') }]);
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
    setRegistrando(true);
    try {
      const res = await api.post('/control-ingreso/ingresos', {
        examen_id: Number(examenId),
        estudiante_id: resultado.estudiante.id,
        metodo: resultado.metodoUsado,
      });
      setResultado((r) => ({
        ...r,
        registrado: true,
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
      if (estado === 409) {
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
  const ultimaIntentos = Math.max(1, Math.ceil(intentos.length / POR_PAGINA));
  const intentosVisibles = intentos.slice((paginaIntentos - 1) * POR_PAGINA, paginaIntentos * POR_PAGINA);

  const habilitado = resultado?.estado === 'habilitado';
  const yaIngreso = !!resultado?.ingreso_previo;
  const botonActivo = habilitado && !yaIngreso && !registrando;

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

      {/* HU-11: resultado de la validacion */}
      {resultado && (
        <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Resultado de la validación</h2>
            {habilitado ? (
              <span className="rounded-full border border-green-300 bg-green-50 text-green-700 font-bold text-sm tracking-wide px-4 py-1">
                HABILITADO
              </span>
            ) : (
              <span className="rounded-full border border-red-300 bg-red-50 text-red-700 font-bold text-sm tracking-wide px-4 py-1">
                NO HABILITADO
              </span>
            )}
          </div>

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
          {resultado.estado === 'no_inscrito' && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 font-semibold">
              {resultado.mensaje_estado}
            </div>
          )}

          {/* HU-11 (8): asignatura, fecha, hora y ambiente del examen */}
          <p className="mt-4 text-sm text-gray-500">
            Examen: {resultado.examen.asignatura} · {resultado.examen.fecha} · {resultado.examen.hora} · {resultado.examen.ambiente}
          </p>

          {/* HU-13 (4): usuario que registro el primer ingreso */}
          {resultado.ingreso_previo && (
            <p className="mt-1 text-sm text-gray-500">
              Primer ingreso registrado por: {resultado.ingreso_previo.registrado_por}
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
              Registrar ingreso
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
            <table className="w-full min-w-[1100px] text-sm">
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
                  {(puedeEditar || puedeEliminar) && <th className="px-3 py-2"></th>}
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
                    {(puedeEditar || puedeEliminar) && (
                      <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                        {puedeEditar && (
                          <button
                            type="button"
                            onClick={() => abrirEdicion(i)}
                            className="border border-kairos-600 text-kairos-700 hover:bg-kairos-50 rounded-lg px-3 py-1 text-xs font-medium"
                          >
                            Editar
                          </button>
                        )}
                        {puedeEliminar && (
                          <button
                            type="button"
                            onClick={() => eliminarIngreso(i)}
                            className="border border-red-500 text-red-600 hover:bg-red-50 rounded-lg px-3 py-1 text-xs font-medium"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {resumen.ultimos.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-center text-gray-400">
                      Aún no hay ingresos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HU-26: intentos de ingreso no correspondiente */}
      {examenId && (
        <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Intentos de ingreso no correspondiente</h2>
            <span className="text-sm text-gray-500">{intentos.length} registrados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-kairos-50/80 text-kairos-800 text-left">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Hora</th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Motivo del rechazo</th>
                  <th className="px-3 py-2">Verificado por</th>
                </tr>
              </thead>
              <tbody>
                {intentosVisibles.map((i) => (
                  <tr key={i.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{i.fecha}</td>
                    <td className="px-3 py-2">{i.hora}</td>
                    <td className="px-3 py-2">{i.codigo}</td>
                    <td className="px-3 py-2">{i.nombre}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-xs">
                        {i.motivo}
                      </span>
                    </td>
                    <td className="px-3 py-2">{i.registrado_por}</td>
                  </tr>
                ))}
                {intentos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-gray-400">
                      No hay intentos registrados en este examen.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion
            pagina={paginaIntentos}
            ultima={ultimaIntentos}
            total={intentos.length}
            onCambiar={setPaginaIntentos}
          />
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 z-50 bg-kairos-950/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Editar ingreso">
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-kairos-100/70 w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Editar ingreso</h2>
            <p className="text-sm text-gray-500 mb-4">{editando.nombre} · {editando.codigo}</p>
            <label htmlFor="ambiente-ingreso" className="block text-sm text-gray-600 mb-1">Ambiente</label>
            <select
              id="ambiente-ingreso"
              className="input"
              value={ambienteSel}
              onChange={(e) => setAmbienteSel(e.target.value)}
            >
              <option value="">Seleccione un ambiente</option>
              {ambientes.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.nombre}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setEditando(null)} className="text-sm text-gray-500 px-3 py-2">
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarEdicion}
                disabled={!ambienteSel || guardandoIngreso}
                className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-glow disabled:opacity-60"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
