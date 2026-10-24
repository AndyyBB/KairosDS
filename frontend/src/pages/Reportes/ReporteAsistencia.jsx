import { useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import { CampoExamen, Chip, Insignia, etiquetaExamen, useExamenes } from '../../components/Sprint3';
import MarcoReporte from './MarcoReporte';

// HU-19: Reporte de asistencia por examen.
export default function ReporteAsistencia() {
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
      const { data } = await api.get(`/reportes/asistencia/${examenId}`);
      const ex = data.examen;
      const r = data.resumen;
      setReporte({
        titulo: 'Asistencia del examen',
        subtitulo: `${ex.asignatura} · ${ex.fecha} · ${ex.hora} · ${ex.duracion} min · ${ex.ambientes}`,
        filtros: [`Examen: ${etiquetaExamen(ex)}`],
        resumen: [
          `Asistentes: ${r.asistentes} de ${r.habilitados} habilitados (${r.porcentaje})`,
          ...(r.primer_ingreso ? [`Primer ingreso: ${r.primer_ingreso} · Último ingreso: ${r.ultimo_ingreso}`] : []),
        ],
        generado: data.generado,
        chips: [
          <Chip key="a" tono="verde">Asistentes: {r.asistentes} de {r.habilitados} habilitados ({r.porcentaje})</Chip>,
          r.primer_ingreso && <Chip key="b" tono="gris">Primer ingreso {r.primer_ingreso} · Último ingreso {r.ultimo_ingreso}</Chip>,
          r.expulsados > 0 && <Chip key="c" tono="rojo">{r.expulsados} {r.expulsados === 1 ? 'expulsado' : 'expulsados'}</Chip>,
        ],
        columnas: [
          { titulo: 'N.°', campo: 'n', numero: true },
          {
            titulo: 'Nombre completo',
            campo: 'nombre',
            celda: (f) => (
              <>
                {f.nombre}
                {f.expulsado && <Insignia>Expulsado</Insignia>}
              </>
            ),
          },
          { titulo: 'Código', campo: 'codigo' },
          { titulo: 'Documento', campo: 'documento' },
          { titulo: 'Carrera', campo: 'carrera' },
          { titulo: 'Hora de ingreso', campo: 'hora_ingreso' },
          { titulo: 'Ambiente', campo: 'ambiente' },
          {
            titulo: 'Observación',
            campo: 'observacion',
            valor: (f) => (f.expulsado ? `Expulsado a las ${f.hora_expulsion}` : ''),
            celda: (f) => (f.expulsado ? <span className="text-red-700">Expulsado a las {f.hora_expulsion}</span> : '—'),
          },
        ],
        filas: data.filas,
        vacio: 'Ningún estudiante registró su ingreso a este examen.',
        archivo: `Reporte_asistencia_${(ex.asignatura ?? 'examen').replace(/\s+/g, '_')}_${ex.fecha.replace(/\//g, '-')}`,
        hoja: 'Asistencia',
      });
    } catch (err) {
      setError(primerError(err, 'No se pudo generar el reporte.'));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <MarcoReporte
      titulo="Reporte de asistencia"
      descripcion="Estudiantes que registraron su ingreso al examen, con su hora de ingreso."
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
