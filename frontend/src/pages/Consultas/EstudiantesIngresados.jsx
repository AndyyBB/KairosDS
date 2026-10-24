import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Encabezado from '../../components/Encabezado';
import { BuscarIcon } from '../../components/Iconos';
import Aviso from '../../components/Aviso';
import { CampoExamen, Chip, Insignia, TablaDatos, tarjeta, useExamenes } from '../../components/Sprint3';

const CADA_MS = 5000;

// HU-18: Consulta en tiempo real de estudiantes ingresados. Solo muestra datos.
export default function EstudiantesIngresados() {
  const { examenes, cargando } = useExamenes('/consultas/examenes', { alcance: 'todos' });
  const [examenId, setExamenId] = useState('');
  const [datos, setDatos] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState('');
  const actual = useRef('');

  // Se actualiza cada 5 segundos sin recargar la pagina.
  useEffect(() => {
    actual.current = examenId;
    setDatos(null);
    setError('');
    if (!examenId) return undefined;
    const cargar = () =>
      api
        .get(`/consultas/examenes/${examenId}/ingresados`)
        .then((res) => actual.current === examenId && (setDatos(res.data), setError('')))
        .catch((err) => actual.current === examenId && setError(primerError(err, 'No se pudo actualizar la lista.')));
    cargar();
    const t = setInterval(cargar, CADA_MS);
    return () => clearInterval(t);
  }, [examenId]);

  const t = buscar.trim().toLowerCase();
  const coincide = (f) => !t || f.nombre.toLowerCase().includes(t) || String(f.codigo).toLowerCase().includes(t);
  const ingresaron = (datos?.ingresaron ?? []).filter(coincide);
  const pendientes = (datos?.pendientes ?? []).filter(coincide);

  return (
    <div>
      <Encabezado
        icono={<BuscarIcon size={22} />}
        titulo="Estudiantes ingresados"
        descripcion="Consulta en tiempo real quiénes ya ingresaron al examen y quiénes aún no se presentaron."
      />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className={`${tarjeta} p-5 mb-5`}>
        <CampoExamen examenes={examenes} cargando={cargando} valor={examenId} onCambiar={setExamenId} vacio="No hay exámenes registrados." />
      </div>

      {examenId && !datos && !error && <p className="text-sm text-gray-400">Cargando...</p>}

      {datos && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <Chip>{datos.resumen.ingresados} ingresados / {datos.resumen.habilitados} habilitados</Chip>
              <Chip tono={datos.resumen.sin_presentarse ? 'ambar' : 'verde'}>{datos.resumen.sin_presentarse} sin presentarse</Chip>
            </div>
            <p className="text-xs text-gray-500 inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Actualizado a las {datos.actualizado} · se actualiza cada 5 segundos
            </p>
          </div>

          <input
            className="input mb-4"
            placeholder="Buscar por nombre o código..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            aria-label="Buscar por nombre o código"
          />

          <div className="grid grid-cols-1 gap-5">
            <section className={`${tarjeta} p-5`}>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Ingresaron</h2>
              <TablaDatos
                minimo="min-w-[520px]"
                columnas={[
                  { titulo: 'Hora', campo: 'hora', clase: 'whitespace-nowrap' },
                  {
                    titulo: 'Nombre completo',
                    celda: (f) => (
                      <>
                        {f.nombre}
                        {f.expulsado && <Insignia>Expulsado{f.hora_expulsion ? ` · ${f.hora_expulsion}` : ''}</Insignia>}
                      </>
                    ),
                  },
                  { titulo: 'Código', campo: 'codigo' },
                  { titulo: 'Ambiente', campo: 'ambiente' },
                ]}
                filas={ingresaron}
                vacio={datos.ingresaron.length ? 'Sin resultados para la búsqueda.' : 'Aún no ingresó ningún estudiante.'}
              />
            </section>
            <section className={`${tarjeta} p-5`}>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Aún no se presentaron</h2>
              <TablaDatos
                minimo="min-w-[480px]"
                columnas={[
                  { titulo: 'Nombre completo', campo: 'nombre' },
                  { titulo: 'Código', campo: 'codigo' },
                  { titulo: 'Carrera', campo: 'carrera' },
                ]}
                filas={pendientes}
                vacio={
                  datos.pendientes.length
                    ? 'Sin resultados para la búsqueda.'
                    : datos.resumen.habilitados
                      ? 'Todos los estudiantes habilitados ya ingresaron.'
                      : 'El examen no tiene estudiantes habilitados.'
                }
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
