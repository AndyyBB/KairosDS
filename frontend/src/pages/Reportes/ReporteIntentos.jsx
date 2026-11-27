import { useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import { CampoExamen, Chip, etiquetaExamen, useExamenes } from '../../components/Sprint3';
import MarcoReporte, { CamposFechas, MSG_RANGO, fechaDMA } from './MarcoReporte';

// HU-21 (presentacion final: "Central de riesgos"). Reporte de todos los intentos de ingreso
// que no corresponden (personas no registradas, QR no validos, no inscritos, no habilitados,
// ingresos repetidos, estudiantes expulsados, en otro examen y duplicados de la importacion),
// con su nivel de riesgo, antecedentes (reincidencia) y la incidencia registrada.
export default function ReporteIntentos() {
  const { examenes, cargando } = useExamenes('/reportes/examenes');
  const [examenId, setExamenId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [nivel, setNivel] = useState('');
  const [incidencia, setIncidencia] = useState('');
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
        params: {
          examen_id: examenId || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          nivel: nivel || undefined,
          incidencia: incidencia || undefined,
        },
      });
      const r = data.resumen;
      const examenTxt = data.examen ? etiquetaExamen(data.examen) : 'Todos los exámenes';
      const periodo = desde || hasta ? `del ${desde ? fechaDMA(desde) : '…'} al ${hasta ? fechaDMA(hasta) : '…'}` : 'todas las fechas';
      const nivelTxt = nivel ? `Riesgo ${nivel.toLowerCase()}` : 'Todos los niveles';
      const incTxt = incidencia === 'con' ? 'Con incidencia' : incidencia === 'sin' ? 'Sin incidencia' : 'Con y sin incidencia';
      setReporte({
        titulo: 'Central de riesgos',
        subtitulo: `${examenTxt} · ${periodo}`,
        filtros: [`Examen: ${examenTxt}`, `Periodo: ${periodo}`, `Nivel: ${nivelTxt}`, `Incidencia: ${incTxt}`],
        resumen: [
          `Total: ${r.total} intentos · ${r.alto} de riesgo alto · ${r.medio} de riesgo medio`,
          `${r.con_incidencia} con incidencia · ${r.sin_incidencia} sin incidencia · ${r.reincidentes} reincidentes`,
          ...(r.por_motivo.length ? [`Por motivo: ${r.por_motivo.map((m) => `${m.cantidad} ${m.motivo}`).join(', ')}`] : []),
        ],
        generado: data.generado,
        chips: [
          <Chip key="t">Total: {r.total} {r.total === 1 ? 'intento' : 'intentos'}</Chip>,
          <Chip key="a" tono="rojo">{r.alto} riesgo alto</Chip>,
          <Chip key="m" tono="ambar">{r.medio} riesgo medio</Chip>,
          <Chip key="c" tono="verde">{r.con_incidencia} con incidencia</Chip>,
          <Chip key="s" tono="gris">{r.sin_incidencia} sin incidencia</Chip>,
          <Chip key="re" tono="rojo">{r.reincidentes} {r.reincidentes === 1 ? 'reincidente' : 'reincidentes'}</Chip>,
          ...r.por_motivo.map((m) => (
            <Chip key={m.motivo} tono="gris">
              {m.cantidad} {m.motivo}
            </Chip>
          )),
        ],
        columnas: [
          { titulo: 'Fecha', campo: 'fecha', clase: 'whitespace-nowrap' },
          { titulo: 'Hora', campo: 'hora' },
          { titulo: 'Código / documento', campo: 'codigo' },
          { titulo: 'Estudiante', campo: 'nombre' },
          { titulo: 'Examen', campo: 'examen', clase: 'min-w-[220px]' },
          { titulo: 'Motivo', campo: 'motivo' },
          {
            titulo: 'Riesgo',
            campo: 'nivel',
            celda: (f) => (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${f.nivel === 'Alto' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {f.nivel}
              </span>
            ),
          },
          {
            titulo: 'Antecedentes',
            campo: 'antecedentes',
            celda: (f) => <span className={f.antecedentes.includes('reincidente') ? 'font-semibold text-red-700' : 'text-gray-500'}>{f.antecedentes}</span>,
          },
          { titulo: 'Verificado por', campo: 'verificado_por' },
          {
            titulo: 'Incidencia',
            campo: 'incidencia',
            clase: 'min-w-[280px]',
            celda: (f) => <span className={f.con_incidencia ? 'text-green-700' : 'text-gray-400'}>{f.incidencia}</span>,
          },
        ],
        filas: data.filas,
        minimo: 'min-w-[1400px]',
        vacio: 'No hay intentos en la central de riesgos para los filtros seleccionados.',
        archivo: `Reporte_central_de_riesgos${desde ? `_${desde}` : ''}${hasta ? `_${hasta}` : ''}`,
        hoja: 'Central de riesgos',
      });
    } catch (err) {
      setError(primerError(err, 'No se pudo generar el reporte.'));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <MarcoReporte
      titulo="Reporte de la central de riesgos"
      descripcion="Intentos de ingreso que no corresponden, con su nivel de riesgo, reincidencia e incidencia registrada."
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
          <div>
            <label htmlFor="nivel-riesgo" className="block text-sm font-medium text-gray-600 mb-1">Nivel de riesgo</label>
            <select id="nivel-riesgo" className="input" value={nivel} onChange={(e) => setNivel(e.target.value)}>
              <option value="">Todos los niveles</option>
              <option value="Alto">Alto</option>
              <option value="Medio">Medio</option>
            </select>
          </div>
          <div>
            <label htmlFor="incidencia-riesgo" className="block text-sm font-medium text-gray-600 mb-1">Incidencia</label>
            <select id="incidencia-riesgo" className="input" value={incidencia} onChange={(e) => setIncidencia(e.target.value)}>
              <option value="">Con y sin incidencia</option>
              <option value="con">Con incidencia registrada</option>
              <option value="sin">Sin incidencia</option>
            </select>
          </div>
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
