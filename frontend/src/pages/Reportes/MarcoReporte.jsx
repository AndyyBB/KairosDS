import { useState } from 'react';
import Encabezado from '../../components/Encabezado';
import { ReporteIcon } from '../../components/Iconos';
import Aviso from '../../components/Aviso';
import { TablaDatos, btnPrincipal, tarjeta } from '../../components/Sprint3';
import { exportarExcel, exportarPDF } from '../../utils/exportar';

function BotonExportar({ onClick, children, tono, deshabilitado }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className={`inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${tono}`}
    >
      {children}
    </button>
  );
}

// Estructura comun de los reportes (HU-19, HU-20, HU-21 y HU-22): filtros con
// "Generar reporte", cabecera del reporte, exportacion a PDF / Excel, resumen y tabla.
// reporte = { titulo, subtitulo, filtros, resumen, generado, columnas, filas, totales, archivo, hoja,
//             chips (nodos), avisos (textos), vacio }
export default function MarcoReporte({ titulo, descripcion, filtros, onGenerar, generando, error, onCerrarError, reporte }) {
  const [exportando, setExportando] = useState('');
  const [errorExportar, setErrorExportar] = useState('');

  async function exportar(tipo) {
    setErrorExportar('');
    setExportando(tipo);
    try {
      if (tipo === 'pdf') await exportarPDF(reporte);
      else exportarExcel(reporte);
    } catch (e) {
      setErrorExportar('No se pudo exportar el reporte. Intente nuevamente.');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setExportando('');
    }
  }

  return (
    <div>
      <Encabezado icono={<ReporteIcon size={22} />} titulo={titulo} descripcion={descripcion} />
      <Aviso mensaje={error} tipo="error" onCerrar={onCerrarError} />
      <Aviso mensaje={errorExportar} tipo="error" onCerrar={() => setErrorExportar('')} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGenerar();
        }}
        noValidate
        className={`${tarjeta} p-5 mb-5`}
      >
        <div className="flex flex-col lg:flex-row lg:items-start gap-3">
          <div className="flex-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">{filtros}</div>
          <button type="submit" disabled={generando} className={`${btnPrincipal} lg:mt-6`}>
            {generando ? 'Generando...' : 'Generar reporte'}
          </button>
        </div>
      </form>

      {reporte && (
        <section className={`${tarjeta} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-800">{reporte.titulo}</h2>
              {reporte.subtitulo && <p className="text-sm text-gray-500">{reporte.subtitulo}</p>}
              {reporte.generado && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Generado el {reporte.generado.fecha} a las {reporte.generado.hora}
                  {reporte.generado.usuario ? ` por ${reporte.generado.usuario}` : ''}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <BotonExportar
                onClick={() => exportar('pdf')}
                deshabilitado={Boolean(exportando) || !reporte.filas.length}
                tono="border-red-500 text-red-600 hover:bg-red-50"
              >
                <span className="text-xs font-bold">PDF</span> {exportando === 'pdf' ? 'Exportando...' : 'Exportar PDF'}
              </BotonExportar>
              <BotonExportar
                onClick={() => exportar('excel')}
                deshabilitado={Boolean(exportando) || !reporte.filas.length}
                tono="border-green-600 text-green-700 hover:bg-green-50"
              >
                <span className="text-xs font-bold">XLS</span> {exportando === 'excel' ? 'Exportando...' : 'Exportar Excel'}
              </BotonExportar>
            </div>
          </div>

          {reporte.avisos?.map((a) => (
            <p key={a} className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">{a}</p>
          ))}
          {reporte.chips && <div className="flex flex-wrap gap-2 mb-4">{reporte.chips}</div>}

          <TablaDatos columnas={reporte.columnas} filas={reporte.filas} totales={reporte.totales} vacio={reporte.vacio} minimo="min-w-[820px]" />
        </section>
      )}
    </div>
  );
}

// Campos Desde / Hasta.
export function CamposFechas({ desde, hasta, onDesde, onHasta, error }) {
  return (
    <>
      <div>
        <label htmlFor="desde" className="block text-sm font-medium text-gray-600 mb-1">Desde</label>
        <input id="desde" type="date" className="input" value={desde} onChange={(e) => onDesde(e.target.value)} />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <div>
        <label htmlFor="hasta" className="block text-sm font-medium text-gray-600 mb-1">Hasta</label>
        <input id="hasta" type="date" className="input" value={hasta} onChange={(e) => onHasta(e.target.value)} />
      </div>
    </>
  );
}

export const MSG_RANGO = 'La fecha Desde no puede ser posterior a la fecha Hasta.';

export const fechaDMA = (iso) => {
  const [y, m, d] = String(iso ?? '').split('-');
  return d ? `${d}/${m}/${y}` : '';
};
