import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

const ESTADO_STYLES = {
  programado: 'bg-kairos-50 text-kairos-700',
  'en curso': 'bg-amber-50 text-amber-700',
  finalizado: 'bg-gray-100 text-gray-600',
  cancelado: 'bg-red-50 text-red-600',
};

export default function ExamenesList() {
  const [examenes, setExamenes] = useState([]);

  async function cargar() {
    const res = await api.get('/examenes');
    setExamenes(res.data.data ?? res.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleCancelar(id) {
    if (!confirm('Cancelar este examen?')) return;
    await api.delete(`/examenes/${id}`);
    cargar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Examenes</h1>
        </div>
        <Link to="/examenes/programar" className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm">
          + Programar examen
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Materia</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Hora</th>
              <th className="px-4 py-2">Ambiente</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {examenes.map((ex) => (
              <tr key={ex.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{ex.materia?.nombre}</td>
                <td className="px-4 py-2">{ex.fecha}</td>
                <td className="px-4 py-2">{ex.hora_inicio}</td>
                <td className="px-4 py-2">{ex.ambiente?.nombre}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${ESTADO_STYLES[ex.estado] || ''}`}>{ex.estado}</span>
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  <Link to={`/examenes/${ex.id}/habilitar`} className="text-kairos-600 font-medium">Habilitar</Link>
                  <button onClick={() => handleCancelar(ex.id)} className="text-gray-400">Cancelar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
