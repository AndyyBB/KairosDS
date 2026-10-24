import { useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import { Chip } from '../../components/Sprint3';
import MarcoReporte, { CamposFechas, MSG_RANGO, fechaDMA } from './MarcoReporte';

// HU-22: Reporte de cantidad de estudiantes registrados por examen.
export default function ReporteRegistrados() {
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
      const { data } = await api.get('/reportes/registrados', { params: { desde: desde || undefined, hasta: hasta || undefined } });
      const periodo = desde || hasta ? `Exámenes del ${desde ? fechaDMA(desde) : '…'} al ${hasta ? fechaDMA(hasta) : '…'}` : 'Todos los exámenes';
      const avisos = data.pendientes.map((a) => `${a} todavía no se realizó: sus ausentes se completan cuando el examen finalice.`);
      const n = data.filas.length;
      setReporte({
        titulo: 'Estudiantes registrados por examen',
        subtitulo: periodo,
        filtros: [`Periodo: ${periodo}`],
        resumen: [`${n} ${n === 1 ? 'examen' : 'exámenes'}`, ...avisos],
        generado: data.generado,
        avisos,
        chips: [<Chip key="a">{n} {n === 1 ? 'examen' : 'exámenes'}</Chip>],
        columnas: [
          { titulo: 'Examen', campo: 'asignatura' },
          { titulo: 'Fecha', campo: 'fecha', clase: 'whitespace-nowrap' },
          { titulo: 'Hora', campo: 'hora' },
          { titulo: 'Ambiente', campo: 'ambientes' },
          { titulo: 'Inscritos', campo: 'inscritos', numero: true },
          { titulo: 'Habilitados', campo: 'habilitados', numero: true },
          { titulo: 'No habilitados', campo: 'no_habilitados', numero: true },
          { titulo: 'Ingresados', campo: 'ingresados', numero: true },
          { titulo: 'Ausentes', campo: 'ausentes', numero: true, valor: (f) => (f.ausentes ?? '—'), celda: (f) => f.ausentes ?? '—' },
        ],
        filas: data.filas,
        totales: data.totales,
        vacio: 'No hay exámenes programados en el periodo seleccionado.',
        archivo: `Reporte_estudiantes_registrados${desde ? `_${desde}` : ''}${hasta ? `_${hasta}` : ''}`,
        hoja: 'Registrados',
      });
    } catch (err) {
      setError(primerError(err, 'No se pudo generar el reporte.'));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <MarcoReporte
      titulo="Reporte de estudiantes registrados por examen"
      descripcion="Cantidad de estudiantes inscritos, habilitados, ingresados y ausentes en cada examen."
      filtros={
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
      }
      onGenerar={generar}
      generando={generando}
      error={error}
      onCerrarError={() => setError('')}
      reporte={reporte}
    />
  );
}
