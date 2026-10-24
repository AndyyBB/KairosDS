import { useEffect, useState } from 'react';
import api from '../api/client';
import { primerError } from '../api/errores';

// Piezas comunes de las pantallas del Sprint 3 (consultas, incidencias, reportes e historial).

export const tarjeta = 'bg-white rounded-xl border border-kairos-100/70 shadow-md';
export const btnPrincipal =
  'bg-kairos-gradient text-white text-sm font-medium rounded-lg px-5 py-2 shadow-glow disabled:opacity-60 whitespace-nowrap';
export const btnSecundario =
  'border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 whitespace-nowrap';

export function etiquetaExamen(ex) {
  return [ex.asignatura, `${ex.fecha} ${ex.hora}`, ex.ambientes].filter(Boolean).join(' — ');
}

// Carga una lista de examenes del endpoint indicado.
export function useExamenes(url, params) {
  const [examenes, setExamenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const clave = JSON.stringify(params ?? {});
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    api
      .get(url, { params })
      .then((res) => vigente && setExamenes(res.data))
      .catch((err) => vigente && setError(primerError(err, 'No se pudieron cargar los exámenes.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, clave]);
  return { examenes, cargando, error };
}

// Campo "Examen" (lista desplegable).
export function CampoExamen({ examenes, valor, onCambiar, error, cargando, opcionTodos, id = 'examen', vacio }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">Examen</label>
      <select id={id} className="input" value={valor} onChange={(e) => onCambiar(e.target.value)} disabled={cargando}>
        <option value="">{cargando ? 'Cargando...' : opcionTodos ?? 'Seleccione un examen'}</option>
        {examenes.map((ex) => (
          <option key={ex.id} value={String(ex.id)}>{etiquetaExamen(ex)}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {!cargando && !examenes.length && vacio && <p className="text-xs text-gray-500 mt-1">{vacio}</p>}
    </div>
  );
}

export function Dato({ etiqueta, valor }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-6 py-1 text-sm">
      <dt className="sm:w-48 sm:shrink-0 text-gray-500">{etiqueta}</dt>
      <dd className="text-gray-800 break-words min-w-0">{valor || '—'}</dd>
    </div>
  );
}

const TONOS = {
  kairos: 'bg-kairos-50 text-kairos-800 border-kairos-100',
  verde: 'bg-green-50 text-green-700 border-green-200',
  rojo: 'bg-red-50 text-red-700 border-red-200',
  ambar: 'bg-amber-50 text-amber-800 border-amber-200',
  gris: 'bg-gray-50 text-gray-700 border-gray-200',
};

export function Chip({ children, tono = 'kairos' }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${TONOS[tono]}`}>{children}</span>;
}

export function Insignia({ children, tono = 'rojo' }) {
  return <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${TONOS[tono]}`}>{children}</span>;
}

export function AvisoNota({ children, tono = 'ambar' }) {
  return <p className={`rounded-lg border px-4 py-2.5 text-sm ${TONOS[tono]}`}>{children}</p>;
}

// Tabla de solo lectura.
export function TablaDatos({ columnas, filas, vacio, totales, minimo = 'min-w-[720px]' }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className={`w-full ${minimo} text-sm`}>
        <thead className="bg-kairos-50/80 text-kairos-800 text-left">
          <tr>
            {columnas.map((c) => (
              <th key={c.titulo} className={`px-3 py-2 ${c.numero ? 'text-right' : ''}`}>{c.titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr><td colSpan={columnas.length} className="px-3 py-6 text-center text-gray-400">{vacio}</td></tr>
          )}
          {filas.map((f, i) => (
            <tr key={f.id ?? i} className="border-t border-gray-100">
              {columnas.map((c) => (
                <td key={c.titulo} className={`px-3 py-2 ${c.numero ? 'text-right tabular-nums' : ''} ${c.clase ?? ''}`}>
                  {c.celda ? c.celda(f) : f[c.campo] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totales && filas.length > 0 && (
          <tfoot className="border-t-2 border-kairos-100 bg-kairos-50/50 font-semibold text-gray-800">
            <tr>
              {columnas.map((c, i) => (
                <td key={c.titulo} className={`px-3 py-2 ${c.numero ? 'text-right tabular-nums' : ''}`}>
                  {i === 0 ? 'Total' : totales[c.campo] ?? ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// Texto de un error de la API para un campo (o el mensaje general).
export function errorDeCampo(err, campo) {
  return err?.response?.data?.errors?.[campo]?.[0] ?? null;
}
