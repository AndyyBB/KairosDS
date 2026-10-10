import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import { fechaDMA, horaHM } from '../../api/formato';
import Paginacion from '../../components/Paginacion';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import { IconoTitulo, ExamIcon } from '../../components/Iconos';
import { useAuth } from '../../api/AuthContext';

const ESTADO_STYLES = {
  programado: 'bg-kairos-50 text-kairos-700',
  'en curso': 'bg-amber-50 text-amber-700',
  finalizado: 'bg-gray-100 text-gray-600',
  cancelado: 'bg-red-50 text-red-600',
};

export default function ExamenesList() {
  const { tiene } = useAuth();
  const [examenes, setExamenes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });
  const [mensaje, setMensaje] = useMensajeFlash();
  const [fallo, setFallo] = useState('');
  const [abierto, setAbierto] = useState(null); // examen con las normas desplegadas

  async function cargar(p = pagina) {
    const res = await api.get('/examenes', { params: { page: p } });
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

  async function handleCancelar(id) {
    if (!confirm('¿Cancelar este examen? Dejará de aparecer en la lista.')) return;
    setFallo('');
    try {
      await api.delete(`/examenes/${id}`);
      setMensaje('Examen cancelado.');
      await cargar(pagina);
    } catch (err) {
      setFallo(primerError(err, 'No se pudo cancelar el examen.'));
    }
  }

  return (
    <div>
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={fallo} tipo="error" onCerrar={() => setFallo('')} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconoTitulo><ExamIcon size={22} /></IconoTitulo>
          <h1 className="text-2xl font-semibold text-gray-800">Exámenes</h1>
        </div>
        {tiene('examenes.registrar') && (
          <Link to="/examenes/programar" className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm">
            Programar examen
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Materia</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Hora</th>
              <th className="px-4 py-2">Duración</th>
              <th className="px-4 py-2">Ambiente</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Normas</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {examenes.map((ex) => {
              // El estado se calcula con la fecha y hora reales del examen.
              const estado = ex.estado_actual || ex.estado;
              const cerrado = estado === 'finalizado' || estado === 'cancelado';
              const normas = ex.normas ?? [];
              const verNormas = abierto === ex.id;
              return (
                <Fragment key={ex.id}>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-2">{ex.materia?.nombre}</td>
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
                        className="inline-flex items-center gap-1 text-xs font-medium text-kairos-700 hover:underline"
                      >
                        {verNormas ? 'Ocultar' : 'Ver normas'}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${verNormas ? 'rotate-180' : ''}`}>
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      {!tiene('habilitaciones.ver') ? null : cerrado ? (
                        <span
                          title="El examen ya no admite habilitaciones"
                          className="border border-gray-200 text-gray-300 rounded-lg px-3 py-1 text-xs font-medium cursor-not-allowed"
                        >
                          Habilitar
                        </span>
                      ) : (
                        <Link
                          to={`/examenes/${ex.id}/habilitar`}
                          className="border border-kairos-600 text-kairos-700 hover:bg-kairos-50 rounded-lg px-3 py-1 text-xs font-medium"
                        >
                          Habilitar
                        </Link>
                      )}
                      {tiene('examenes.eliminar') && (
                        <button
                          onClick={() => handleCancelar(ex.id)}
                          className="border border-red-500 text-red-600 hover:bg-red-50 rounded-lg px-3 py-1 text-xs font-medium"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {verNormas && (
                  <tr className="bg-kairos-50/40">
                    <td colSpan={8} className="px-4 pb-3 pt-1">
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
