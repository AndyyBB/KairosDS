import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../api/AuthContext';
import { claseEnlaceNombre } from '../../components/AccionPeligro';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import { fechaDMA, horaHM } from '../../api/formato';
import Paginacion from '../../components/Paginacion';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import { ExamIcon } from '../../components/Iconos';

const ESTADO_STYLES = {
  programado: 'bg-kairos-gradient text-white shadow-glow',
  'en curso': 'bg-amber-50 text-amber-700',
  finalizado: 'bg-gray-100 text-gray-600',
  cancelado: 'bg-red-50 text-red-600',
};

// Lista de examenes. Al hacer clic en la asignatura se abre "Editar examen" (HU-08),
// donde tambien se puede eliminar el examen (HU-09).
export default function ExamenesList() {
  const { tiene } = useAuth();
  const puedeEditar = tiene('examenes.editar') || tiene('examenes.eliminar');
  const [examenes, setExamenes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });
  const [mensaje, setMensaje] = useMensajeFlash();
  const [fallo, setFallo] = useState('');
  const [abierto, setAbierto] = useState(null); // examen con las normas desplegadas

  async function cargar(p = pagina) {
    let res;
    try {
      res = await api.get('/examenes', { params: { page: p, incluir_cancelados: 1 } });
    } catch (err) {
      setFallo(primerError(err, 'No se pudo cargar la lista de exámenes.'));
      return;
    }
    // Si se cancelo el ultimo examen de una pagina, se vuelve a la anterior.
    if (p > 1 && (res.data.data ?? []).length === 0) {
      return cargar(p - 1);
    }
    setExamenes(res.data.data ?? res.data);
    setMeta({ last_page: res.data.last_page ?? 1, total: res.data.total ?? 0 });
    setPagina(res.data.current_page ?? p);
  }

  useEffect(() => {
    cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Encabezado
        icono={<ExamIcon size={22} />}
        titulo="Lista de exámenes"
        descripcion={
          puedeEditar
            ? 'Haz clic en la asignatura de un examen para ver sus datos, editarlo o eliminarlo.'
            : 'Exámenes programados.'
        }
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={fallo} tipo="error" onCerrar={() => setFallo('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              <th className="px-4 py-2">Materia</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Hora</th>
              <th className="px-4 py-2">Duración</th>
              <th className="px-4 py-2">Ambiente</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Normas</th>
            </tr>
          </thead>
          <tbody>
            {examenes.map((ex) => {
              // El estado se calcula con la fecha y hora reales del examen.
              const estado = ex.estado_actual || ex.estado;
              const normas = ex.normas ?? [];
              const verNormas = abierto === ex.id;
              return (
                <Fragment key={ex.id}>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    {puedeEditar ? (
                      <Link to={`/examenes/datos/${ex.id}`} className={claseEnlaceNombre}>
                        {ex.materia?.nombre}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-800">{ex.materia?.nombre}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{fechaDMA(ex.fecha)}</td>
                  <td className="px-4 py-2">{horaHM(ex.hora_inicio)}</td>
                  <td className="px-4 py-2">{ex.duracion_min} min</td>
                  <td className="px-4 py-2">
                    {ex.ambientes?.length ? ex.ambientes.map((a) => a.nombre).join(', ') : ex.ambiente?.nombre}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${ESTADO_STYLES[estado] || ''}`}>{estado}</span>
                  </td>
                  <td className="px-4 py-2">
                    {normas.length === 0 ? (
                      <span className="text-xs text-gray-400">Sin normas</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAbierto(verNormas ? null : ex.id)}
                        aria-expanded={verNormas}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-kairos-700 hover:underline"
                      >
                        {verNormas ? 'Ocultar' : 'Ver normas'}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${verNormas ? 'rotate-180' : ''}`}>
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
                {verNormas && (
                  <tr className="bg-kairos-50/40">
                    <td colSpan={7} className="px-4 pb-3 pt-1">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Normas del examen</p>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                        {normas.map((n) => (
                          <li key={n.id} className="whitespace-pre-line">{n.descripcion}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} ultima={meta.last_page} total={meta.total} onCambiar={cargar} />
    </div>
  );
}
