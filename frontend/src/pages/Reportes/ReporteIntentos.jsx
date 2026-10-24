import { useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import { CampoExamen, Chip, etiquetaExamen, useExamenes } from '../../components/Sprint3';
import MarcoReporte, { CamposFechas, MSG_RANGO, fechaDMA } from './MarcoReporte';

// HU-21: Reporte de intentos de ingreso indebido.
export default function ReporteIntentos() {
  const { examenes, cargando } = useExamenes('/reportes/examenes');
  const [examenId, setExamenId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [errorRango, setErrorRango] = useState('');
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);
  const [reporte, setReporte] = useState(null);

  async function generar() {
    setError('');
    if (desde && hasta && desde > hasta) {
      setErrorRango(MSG_RANGO);
      return;
    }
    setErrorRango('');
    setGenerando(true);
    try {
      const { data } = await api.get('/reportes/intentos', {
        params: { examen_id: examenId || undefined, desde: desde || undefined, hasta: hasta || undefined },
      });
      const examenTxt = data.examen ? etiquetaExamen(data.examen) : 'Todos los exámenes';
      const periodo = desde || hasta ? `del ${desde ? fechaDMA(desde) : '…'} al ${hasta ? fechaDMA(hasta) : '…'}` : 'todas las fechas';
      const motivos = data.resumen.por_motivo;
      setReporte({
        titulo: 'Intentos de ingreso indebido',
        subtitulo: `${examenTxt} · ${periodo}`,
        filtros: [`Examen: ${examenTxt}`, `Periodo: ${periodo}`],
        resumen: [`Total: ${data.resumen.total} intentos${motivos.length ? ` (${motivos.map((m) => `${m.cantidad} ${m.motivo}`).join(', ')})` : ''}`],
        generado: data.generado,
        chips: [
          <Chip key="t">Total: {data.resumen.total} {data.resumen.total === 1 ? 'intento' : 'intentos'}</Chip>,
          ...motivos.map((m) => (
            <Chip key={m.motivo} tono={m.motivo === 'No habilitado' ? 'rojo' : 'ambar'}>
              {m.cantidad} {m.motivo}
            </Chip>
          )),
        ],
        columnas: [
          { titulo: 'Fecha', campo: 'fecha', clase: 'whitespace-nowrap' },
          { titulo: 'Hora', campo: 'hora' },
          { titulo: 'Código', campo: 'codigo' },
          { titulo: 'Nombre', campo: 'nombre' },
          { titulo: 'Examen', campo: 'examen' },
          { titulo: 'Motivo del rechazo', campo: 'motivo' },
          { titulo: 'Verificado por', campo: 'verificado_por' },
        ],
        filas: data.filas,
        vacio: 'No se registraron intentos de ingreso indebido en el periodo seleccionado.',
        archivo: `Reporte_intentos_ingreso_indebido${desde ? `_${desde}` : ''}${hasta ? `_${hasta}` : ''}`,
        hoja: 'Intentos',
      });
    } catch (err) {
      setError(primerError(err, 'No se pudo generar el reporte.'));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <MarcoReporte
      titulo="Reporte de intentos de ingreso indebido"
      descripcion="Intentos de ingreso de estudiantes no habilitados o no inscritos en el examen."
      filtros={
        <>
          <CampoExamen examenes={examenes} cargando={cargando} valor={examenId} onCambiar={setExamenId} opcionTodos="Todos los exámenes" />
          <CamposFechas
            desde={desde}
            hasta={hasta}
            onDesde={(v) => {
              setDesde(v);
              setErrorRango('');
            }}
            onHasta={(v) => {
              setHasta(v);
              setErrorRango('');
            }}
            error={errorRango}
          />
        </>
      }
      onGenerar={generar}
      generando={generando}
      error={error}
      onCerrarError={() => setError('')}
      reporte={reporte}
    />
  );
}
