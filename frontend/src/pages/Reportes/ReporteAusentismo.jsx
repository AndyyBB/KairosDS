import { useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import { CampoExamen, Chip, etiquetaExamen, useExamenes } from '../../components/Sprint3';
import MarcoReporte from './MarcoReporte';

// HU-20: Reporte de ausentismo por examen.
export default function ReporteAusentismo() {
  const { examenes, cargando } = useExamenes('/reportes/examenes');
  const [examenId, setExamenId] = useState('');
  const [errorExamen, setErrorExamen] = useState('');
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);
  const [reporte, setReporte] = useState(null);

  async function generar() {
    setError('');
    if (!examenId) {
      setErrorExamen('Seleccione un examen.');
      return;
    }
    setGenerando(true);
    try {
      const { data } = await api.get(`/reportes/ausentismo/${examenId}`);
      const ex = data.examen;
      const r = data.resumen;
      const avisos = data.finalizado ? [] : ['El examen todavía no finalizó: la lista de ausentes puede cambiar.'];
      setReporte({
        titulo: 'Ausentismo del examen',
        subtitulo: `${ex.asignatura} · ${ex.fecha} · ${ex.hora} · ${ex.duracion} min · ${ex.ambientes}`,
        filtros: [`Examen: ${etiquetaExamen(ex)}`],
        resumen: [`Ausentes: ${r.ausentes} de ${r.habilitados} habilitados (${r.porcentaje})`, ...avisos],
        generado: data.generado,
        avisos,
        chips: [<Chip key="a" tono={r.ausentes ? 'rojo' : 'verde'}>Ausentes: {r.ausentes} de {r.habilitados} habilitados ({r.porcentaje})</Chip>],
        columnas: [
          { titulo: 'N.°', campo: 'n', numero: true },
          { titulo: 'Nombre completo', campo: 'nombre' },
          { titulo: 'Código', campo: 'codigo' },
          { titulo: 'Documento', campo: 'documento' },
          { titulo: 'Carrera', campo: 'carrera' },
          { titulo: 'Correo institucional', campo: 'correo' },
        ],
        filas: data.filas,
        vacio: r.habilitados
          ? 'Todos los estudiantes habilitados registraron su ingreso.'
          : 'El examen no tiene estudiantes habilitados.',
        archivo: `Reporte_ausentismo_${(ex.asignatura ?? 'examen').replace(/\s+/g, '_')}_${ex.fecha.replace(/\//g, '-')}`,
        hoja: 'Ausentismo',
      });
    } catch (err) {
      setError(primerError(err, 'No se pudo generar el reporte.'));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <MarcoReporte
      titulo="Reporte de ausentismo"
      descripcion="Estudiantes habilitados que no registraron su ingreso al examen."
      filtros={
        <CampoExamen
          examenes={examenes}
          cargando={cargando}
          valor={examenId}
          onCambiar={(v) => {
            setExamenId(v);
            setErrorExamen('');
          }}
          error={errorExamen}
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
