import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { fechaDMA, horaHM } from '../../api/formato';
import Paginacion from '../../components/Paginacion';
import Aviso, { useMensajeFlash } from '../../components/Aviso';

const ESTADO_STYLES = {
  programado: 'bg-kairos-50 text-kairos-700',
  'en curso': 'bg-amber-50 text-amber-700',
  finalizado: 'bg-gray-100 text-gray-600',
  cancelado: 'bg-red-50 text-red-600',
};

export default function ExamenesList() {
  const [examenes, setExamenes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });
  const [mensaje, setMensaje] = useMensajeFlash();

  async function cargar(p = pagina) {
    const res = await api.get('/examenes', { params: { page: p } });
    setExamenes(res.data.data ?? res.data);
    setMeta({ last_page: res.data.last_page ?? 1, total: res.data.total ?? 0 });
    setPagina(res.data.current_page ?? p);
  }

  useEffect(() => {
    cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancelar(id) {
    if (!confirm('¿Cancelar este examen?')) return;
    await api.delete(`/examenes/${id}`);
    cargar(pagina);
  }

  return (
    <div>
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Exámenes</h1>
        </div>
        <Link to="/examenes/programar" className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm">
          Programar examen
        </Link>
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
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {examenes.map((ex) => {
              // El estado se calcula con la fecha y hora reales del examen.
              const estado = ex.estado_actual || ex.estado;
              const cerrado = estado === 'finalizado' || estado === 'cancelado';
              return (
                <tr key={ex.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{ex.materia?.nombre}</td>
                  <td className="px-4 py-2">{fechaDMA(ex.fecha)}</td>
                  <td className="px-4 py-2">{horaHM(ex.hora_inicio)}</td>
                  <td className="px-4 py-2">{ex.duracion_min} min</td>
                  <td className="px-4 py-2">{ex.ambiente?.nombre}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${ESTADO_STYLES[estado] || ''}`}>{estado}</span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-3">
                    {cerrado ? (
                      <span className="text-gray-300 cursor-not-allowed" title="El examen ya no admite habilitaciones">Habilitar</span>
                    ) : (
                      <Link to={`/examenes/${ex.id}/habilitar`} className="text-kairos-600 font-medium">Habilitar</Link>
                    )}
                    <button
                      onClick={() => handleCancelar(ex.id)}
                      disabled={estado === 'cancelado'}
                      className={estado === 'cancelado' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400'}
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} ultima={meta.last_page} total={meta.total} onCambiar={cargar} />
    </div>
  );
}
