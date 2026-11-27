import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { readSheet } from 'read-excel-file/browser';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import { fechaDMA, horaHM } from '../../api/formato';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import Paginacion from '../../components/Paginacion';
import { CheckIcon } from '../../components/Iconos';

// Presentacion final: "Importar lista de estudiantes" (reemplaza a "Enviar invitaciones").
// Se elige un examen y se sube un Excel (.xlsx) con el formato valido. Antes de guardar, el
// sistema revisa todas las filas y muestra una vista previa:
// - Si alguna fila tiene un error, no se importa nada (hay que corregir el Excel).
// - Los estudiantes nuevos quedan registrados, inscritos y habilitados en el examen.
// - Los estudiantes que ya estan registrados son duplicados: no se importan y quedan como
//   incidencia en la central de riesgos del examen.

// Columnas del formato valido, en el orden de la plantilla.
const COLUMNAS = [
  ['codigo_universitario', 'Código universitario'],
  ['documento_identidad', 'Documento de identidad'],
  ['nombres', 'Nombres'],
  ['apellidos', 'Apellidos'],
  ['correo_institucional', 'Correo institucional'],
  ['carrera', 'Carrera'],
];
const POR_PAGINA = 20;
const MAX_MB = 5;

// Para comparar los titulos de las columnas: sin mayusculas, tildes ni espacios de mas.
const clave = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function UploadIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

function ExcelIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="m9 13 4 5M13 13l-4 5" />
    </svg>
  );
}

// Lee el Excel y devuelve las filas con sus datos, o lanza un error con el mensaje para el usuario.
async function leerExcel(archivo) {
  let datos;
  try {
    datos = await readSheet(archivo);
  } catch {
    throw new Error('No se pudo leer el archivo. Verifica que sea un archivo de Excel (.xlsx) válido.');
  }
  const filas = Array.isArray(datos) ? datos : datos?.data ?? [];
  if (!filas.length) throw new Error('El archivo está vacío.');

  // La primera fila debe tener los titulos del formato valido (en cualquier orden).
  const titulos = filas[0].map(clave);
  const posicion = {};
  const faltan = [];
  COLUMNAS.forEach(([campo, titulo]) => {
    const i = titulos.indexOf(clave(titulo));
    if (i === -1) faltan.push(titulo);
    else posicion[campo] = i;
  });
  if (faltan.length) {
    throw new Error(
      `El archivo no tiene el formato válido. La primera fila debe tener las columnas: ${COLUMNAS.map((c) => c[1]).join(', ')}. Faltan: ${faltan.join(', ')}.`
    );
  }

  const resultado = [];
  filas.slice(1).forEach((celdas, i) => {
    const fila = { fila: i + 2 };
    COLUMNAS.forEach(([campo]) => {
      const v = celdas[posicion[campo]];
      fila[campo] = v === null || v === undefined ? '' : String(v).trim();
    });
    // Se ignoran las filas completamente vacias.
    if (COLUMNAS.some(([campo]) => fila[campo] !== '')) resultado.push(fila);
  });
  if (!resultado.length) throw new Error('El archivo no tiene estudiantes: llena la hoja desde la fila 2.');
  return resultado;
}

export default function ImportarEstudiantes() {
  const { examenId } = useParams();
  const navigate = useNavigate();
  const [examenes, setExamenes] = useState([]);
  const [error, setError] = useState('');

  // Examenes que todavia admiten inscripciones (no finalizados ni cancelados).
  useEffect(() => {
    api
      .get('/examenes', { params: { per_page: 100 } })
      .then((res) => {
        const lista = (res.data.data ?? res.data).filter((ex) => !['finalizado', 'cancelado'].includes(ex.estado_actual));
        lista.sort((a, b) => `${a.fecha} ${a.hora_inicio}`.localeCompare(`${b.fecha} ${b.hora_inicio}`));
        setExamenes(lista);
      })
      .catch((err) => setError(primerError(err, 'No se pudo cargar la lista de exámenes.')));
  }, []);

  const etiqueta = (ex) =>
    `${ex.materia?.nombre} — ${fechaDMA(ex.fecha)} ${horaHM(ex.hora_inicio)} — ${
      ex.ambientes?.length ? ex.ambientes.map((a) => a.nombre).join(', ') : ex.ambiente?.nombre ?? ''
    }`;

  async function descargarPlantilla() {
    try {
      const res = await api.get('/importacion/plantilla', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_importar_estudiantes.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo descargar la plantilla.');
    }
  }

  return (
    <div className="max-w-6xl">
      <Encabezado
        icono={<UploadIcon />}
        titulo="Importar lista de estudiantes"
        descripcion="Elige un examen y sube un Excel con la lista de estudiantes: quedan registrados, inscritos y habilitados para ese examen."
      />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
        <label htmlFor="examen-importar" className="block text-sm font-medium text-gray-600 mb-1">Examen</label>
        <select
          id="examen-importar"
          className="input"
          value={examenId ?? ''}
          onChange={(e) => navigate(e.target.value ? `/examenes/importar/${e.target.value}` : '/examenes/importar')}
        >
          <option value="">Seleccione un examen</option>
          {examenes.map((ex) => (
            <option key={ex.id} value={String(ex.id)}>{etiqueta(ex)}</option>
          ))}
        </select>
      </div>

      {/* Formato valido y plantilla */}
      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Formato del Excel</h2>
            <p className="text-sm text-gray-500 mt-1">
              Archivo <strong>.xlsx</strong> con un estudiante por fila. La primera fila debe tener estas columnas:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLUMNAS.map(([campo, titulo]) => (
                <span key={campo} className="rounded-full border border-kairos-100 bg-kairos-50 px-3 py-1 text-xs font-medium text-kairos-800">
                  {titulo}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              El correo institucional es CódigoUniversitario@est.umss.edu y la carrera debe estar registrada en el sistema.
            </p>
          </div>
          <button
            type="button"
            onClick={descargarPlantilla}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-kairos-600 bg-white px-4 py-2 text-sm font-medium text-kairos-700 shadow-sm hover:bg-kairos-50"
          >
            <ExcelIcon size={16} />
            Descargar plantilla
          </button>
        </div>
      </div>

      {examenId ? (
        <PanelImportar key={examenId} examenId={examenId} />
      ) : (
        <div className="rounded-xl border border-dashed border-kairos-200 bg-white/60 px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kairos-50 text-kairos-600">
            <UploadIcon size={24} />
          </div>
          <p className="font-medium text-gray-700">Selecciona un examen</p>
          <p className="text-sm text-gray-500 mt-1">Después podrás subir el Excel con la lista de estudiantes.</p>
        </div>
      )}
    </div>
  );
}

const ESTADOS = {
  nuevo: { texto: 'Se importará', clase: 'bg-kairos-gradient text-white' },
  duplicado: { texto: 'Duplicado', clase: 'bg-amber-100 text-amber-800' },
  error: { texto: 'Con error', clase: 'bg-red-100 text-red-700' },
};

function PanelImportar({ examenId }) {
  const entrada = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [filasExcel, setFilasExcel] = useState([]);
  const [revision, setRevision] = useState(null); // { filas, resumen }
  const [mostrar, setMostrar] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const [trabajando, setTrabajando] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  function limpiar() {
    setArchivo(null);
    setFilasExcel([]);
    setRevision(null);
    setMostrar('todas');
    setPagina(1);
    if (entrada.current) entrada.current.value = '';
  }

  // Al elegir el archivo: se lee y el sistema revisa todas las filas (vista previa).
  async function elegir(e) {
    const f = e.target.files?.[0];
    setMensaje('');
    setError('');
    setRevision(null);
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      setError('Solo se pueden importar archivos de Excel (.xlsx).');
      limpiar();
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera el tamaño máximo de ${MAX_MB} MB.`);
      limpiar();
      return;
    }
    setArchivo(f);
    setTrabajando('Revisando el archivo...');
    try {
      const filas = await leerExcel(f);
      setFilasExcel(filas);
      const res = await api.post(`/examenes/${examenId}/importar-estudiantes`, { filas, confirmar: false });
      setRevision(res.data);
    } catch (err) {
      if (err.response?.data?.filas) {
        // Hay errores: se muestra la vista previa con las filas que fallan.
        setRevision(err.response.data);
        setMostrar('error');
        setError(err.response.data.message);
      } else {
        setError(err.message && !err.response ? err.message : primerError(err, 'No se pudo revisar el archivo.'));
        limpiar();
      }
    } finally {
      setTrabajando('');
    }
  }

  async function importar() {
    const r = revision?.resumen;
    if (!r || r.errores > 0) return;
    let texto = `¿Importar la lista al examen? ${r.nuevos} estudiante(s) quedarán registrados, inscritos y habilitados.`;
    if (r.duplicados > 0) texto += ` ${r.duplicados} duplicado(s) no se importarán y quedarán como incidencia en la central de riesgos.`;
    if (!confirm(texto)) return;
    setTrabajando('Importando estudiantes...');
    setError('');
    try {
      const res = await api.post(`/examenes/${examenId}/importar-estudiantes`, { filas: filasExcel, confirmar: true });
      limpiar();
      setMensaje(res.data.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.response?.data?.filas) {
        setRevision(err.response.data);
        setMostrar('error');
      }
      setError(primerError(err, 'No se pudo importar la lista de estudiantes.'));
    } finally {
      setTrabajando('');
    }
  }

  const filas = revision?.filas ?? [];
  const visibles = useMemo(() => (mostrar === 'todas' ? filas : filas.filter((f) => f.estado === mostrar)), [filas, mostrar]);
  const ultima = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const pag = visibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const r = revision?.resumen;
  const puedeImportar = r && r.errores === 0 && r.total > 0 && !trabajando;

  return (
    <>
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-3">
        <label className="block text-sm font-medium text-gray-600 mb-2">Archivo de Excel</label>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-kairos-gradient px-5 py-2 text-sm font-medium text-white shadow-glow hover:brightness-110">
            <UploadIcon size={16} />
            {archivo ? 'Elegir otro archivo' : 'Seleccionar archivo'}
            <input ref={entrada} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={elegir} disabled={Boolean(trabajando)} />
          </label>
          <span className="text-sm text-gray-600 truncate">
            {archivo ? archivo.name : 'Ningún archivo seleccionado'}
          </span>
          {trabajando && <span className="text-sm text-kairos-700">{trabajando}</span>}
        </div>
      </div>

      {r && (
        <>
          {/* Barra de acciones fija arriba: siempre visible al bajar por la lista. */}
          <div className="sticky top-[64px] lg:top-0 z-20 -mx-1 mb-3 px-1 py-2 bg-[#f3f8f8]/95 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kairos-100/70 bg-white px-4 py-3 shadow-md">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{r.total}</span> filas ·{' '}
                <span className="font-semibold text-kairos-700">{r.nuevos}</span> se importarán ·{' '}
                <span className="font-semibold text-amber-700">{r.duplicados}</span> duplicados ·{' '}
                <span className="font-semibold text-red-600">{r.errores}</span> errores
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="input w-auto py-1.5 text-sm"
                  aria-label="Mostrar"
                  value={mostrar}
                  onChange={(e) => {
                    setMostrar(e.target.value);
                    setPagina(1);
                  }}
                >
                  <option value="todas">Todas las filas</option>
                  <option value="nuevo">Solo las que se importarán</option>
                  <option value="duplicado">Solo los duplicados</option>
                  <option value="error">Solo las filas con error</option>
                </select>
                <button type="button" onClick={limpiar} className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={importar}
                  disabled={!puedeImportar}
                  className="inline-flex items-center gap-2 bg-kairos-gradient text-white text-sm font-medium rounded-lg px-5 py-2 shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <CheckIcon size={16} />
                  Importar estudiantes
                </button>
              </div>
            </div>
            {r.errores > 0 && (
              <p className="mt-2 text-sm text-red-700">
                No se puede importar mientras el archivo tenga errores: corrige las filas marcadas en el Excel y vuelve a subirlo.
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-kairos-50/80 text-kairos-800 text-left">
                <tr>
                  <th className="px-3 py-2">Fila</th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Nombres</th>
                  <th className="px-3 py-2">Apellidos</th>
                  <th className="px-3 py-2">Correo institucional</th>
                  <th className="px-3 py-2">Carrera</th>
                  <th className="px-3 py-2">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {pag.map((f) => (
                  <tr key={f.fila} className={`border-t border-gray-100 align-top ${f.estado === 'error' ? 'bg-red-50/50' : f.estado === 'duplicado' ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-3 py-2 text-gray-500">{f.fila}</td>
                    <td className="px-3 py-2">{f.codigo_universitario}</td>
                    <td className="px-3 py-2">{f.documento_identidad}</td>
                    <td className="px-3 py-2">{f.nombres}</td>
                    <td className="px-3 py-2">{f.apellidos}</td>
                    <td className="px-3 py-2 text-gray-600">{f.correo_institucional}</td>
                    <td className="px-3 py-2 text-gray-600">{f.carrera}</td>
                    <td className="px-3 py-2 w-[280px] min-w-[240px] whitespace-normal break-words">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADOS[f.estado].clase}`}>
                        {ESTADOS[f.estado].texto}
                      </span>
                      {f.estado === 'nuevo' && <p className="mt-1 text-xs text-gray-500">Se registrará, inscribirá y habilitará.</p>}
                      {f.estado === 'duplicado' && (
                        <>
                          <ul className="mt-1 list-disc pl-4 text-xs text-amber-800">
                            {f.duplicado.map((m) => (
                              <li key={m}>{m}</li>
                            ))}
                          </ul>
                          <p className="mt-1 text-xs text-amber-800">No se importará: quedará como incidencia en la central de riesgos.</p>
                        </>
                      )}
                      {f.estado === 'error' && (
                        <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
                          {f.errores.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
                {pag.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-400">No hay filas para mostrar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={pagina} ultima={ultima} total={visibles.length} onCambiar={setPagina} />
        </>
      )}
    </>
  );
}
