import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';

// HU-04: Asociacion de estudiantes habilitados a un examen
// HU-05: Consulta del motivo de inhabilitacion de un estudiante
export default function HabilitarEstudiantes() {
  const { examenId } = useParams();
  const [examen, setExamen] = useState(null);
  const [inscritos, setInscritos] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);
  const [inhabilitarId, setInhabilitarId] = useState(null);
  const [motivoForm, setMotivoForm] = useState({ motivo_id: '', observacion: '' });

  async function cargar() {
    setCargando(true);
    const [examenRes, inscritosRes, motivosRes] = await Promise.all([
      api.get(`/examenes/${examenId}`),
      api.get(`/examenes/${examenId}/inscritos`),
      api.get('/motivos-inhabilitacion'),
    ]);
    setExamen(examenRes.data);
    setInscritos(inscritosRes.data);
    setMotivos(motivosRes.data);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examenId]);

  async function habilitar(estudianteId) {
    setError(null);
    setGuardandoId(estudianteId);
    try {
      await api.post(`/examenes/${examenId}/habilitaciones`, {
        estudiante_id: estudianteId,
        habilitado: true,
      });
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo habilitar al estudiante.');
    } finally {
      setGuardandoId(null);
    }
  }

  function abrirInhabilitar(estudianteId) {
    setInhabilitarId(estudianteId);
    setMotivoForm({ motivo_id: '', observacion: '' });
  }

  async function confirmarInhabilitar(estudianteId) {
    if (!motivoForm.motivo_id) {
      setError('Selecciona un motivo de inhabilitacion.');
      return;
    }
    setError(null);
    setGuardandoId(estudianteId);
    try {
      await api.post(`/examenes/${examenId}/habilitaciones`, {
        estudiante_id: estudianteId,
        habilitado: false,
        motivo_id: motivoForm.motivo_id,
        observacion: motivoForm.observacion || null,
      });
      setInhabilitarId(null);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar la inhabilitacion.');
    } finally {
      setGuardandoId(null);
    }
  }

  const totalHabilitados = inscritos.filter((i) => i.habilitacion?.habilitado).length;
  const totalInhabilitados = inscritos.filter((i) => i.habilitacion && !i.habilitacion.habilitado).length;
  const totalPendientes = inscritos.length - totalHabilitados - totalInhabilitados;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-800">Habilitar estudiantes</h1>
      {examen && (
        <p className="text-gray-500 text-sm mb-4">
          {examen.materia?.nombre} - {examen.fecha} {examen.hora_inicio?.slice(0, 5)} - {examen.ambiente?.nombre}
        </p>
      )}

      <div className="flex gap-3 mb-6">
        <span className="text-xs px-3 py-1 rounded-full bg-kairos-50 text-kairos-700">{totalHabilitados} habilitados</span>
        <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600">{totalInhabilitados} no habilitados</span>
        <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-500">{totalPendientes} pendientes</span>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Estudiante</th>
              <th className="px-4 py-2">Codigo</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Motivo</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {inscritos.map(({ estudiante, habilitacion }) => (
              <tr key={estudiante.id} className="border-t border-gray-100 align-top">
                <td className="px-4 py-2">{estudiante.nombre_completo}</td>
                <td className="px-4 py-2 text-gray-500">{estudiante.codigo_universitario}</td>
                <td className="px-4 py-2">
                  {habilitacion ? (
                    <span className={`text-xs px-2 py-1 rounded-full ${habilitacion.habilitado ? 'bg-kairos-50 text-kairos-700' : 'bg-red-50 text-red-600'}`}>
                      {habilitacion.habilitado ? 'Habilitado' : 'No habilitado'}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Pendiente</span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500">{habilitacion?.motivo?.descripcion || '-'}</td>
                <td className="px-4 py-2 text-right">
                  {inhabilitarId === estudiante.id ? (
                    <div className="flex flex-col items-end gap-2 w-64 ml-auto">
                      <select
                        className="input text-xs py-1"
                        value={motivoForm.motivo_id}
                        onChange={(e) => setMotivoForm({ ...motivoForm, motivo_id: e.target.value })}
                      >
                        <option value="">Motivo...</option>
                        {motivos.map((m) => (
                          <option key={m.id} value={m.id}>{m.descripcion}</option>
                        ))}
                      </select>
                      <input
                        className="input text-xs py-1"
                        placeholder="Observacion (opcional)"
                        maxLength={200}
                        value={motivoForm.observacion}
                        onChange={(e) => setMotivoForm({ ...motivoForm, observacion: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setInhabilitarId(null)}
                          className="text-xs text-gray-400"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => confirmarInhabilitar(estudiante.id)}
                          disabled={guardandoId === estudiante.id}
                          className="text-xs bg-red-600 text-white rounded-md px-3 py-1 disabled:opacity-60"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-x-3">
                      <button
                        onClick={() => habilitar(estudiante.id)}
                        disabled={guardandoId === estudiante.id}
                        className="text-kairos-600 font-medium disabled:opacity-60"
                      >
                        Habilitar
                      </button>
                      <button
                        onClick={() => abrirInhabilitar(estudiante.id)}
                        disabled={guardandoId === estudiante.id}
                        className="text-red-500 disabled:opacity-60"
                      >
                        Inhabilitar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!cargando && inscritos.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Ningun estudiante esta inscrito en esta materia.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
