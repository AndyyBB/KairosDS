import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';

// HU-04: Asociacion de estudiantes habilitados a un examen
export default function HabilitarEstudiantes() {
  const { examenId } = useParams();
  const [examen, setExamen] = useState(null);
  const [inscritos, setInscritos] = useState([]);
  const [estado, setEstado] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [erroresMotivo, setErroresMotivo] = useState({});
  const [exito, setExito] = useState(null);

  async function cargar() {
    setCargando(true);
    const [examenRes, inscritosRes] = await Promise.all([
      api.get(`/examenes/${examenId}`),
      api.get(`/examenes/${examenId}/inscritos`),
    ]);
    setExamen(examenRes.data);
    setInscritos(inscritosRes.data);

    // Nada viene premarcado: solo se refleja lo que ya se guardo antes desde
    // esta misma pagina. Un estudiante sin habilitacion previa queda sin
    // decidir (null) hasta que el docente elija Habilitado o No hab.
    const inicial = {};
    inscritosRes.data.forEach(({ estudiante, habilitacion }) => {
      inicial[estudiante.id] = {
        habilitado: habilitacion ? habilitacion.habilitado : null,
        motivo: habilitacion?.observacion || '',
      };
    });
    setEstado(inicial);
    setErroresMotivo({});
    setError(null);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examenId]);

  function marcar(estudianteId, habilitado) {
    setEstado((prev) => ({ ...prev, [estudianteId]: { ...prev[estudianteId], habilitado } }));
    setErroresMotivo((prev) => ({ ...prev, [estudianteId]: false }));
  }

  function cambiarMotivo(estudianteId, motivo) {
    setEstado((prev) => ({ ...prev, [estudianteId]: { ...prev[estudianteId], motivo } }));
    setErroresMotivo((prev) => ({ ...prev, [estudianteId]: false }));
  }

  function seleccionarTodos() {
    setEstado((prev) => {
      const next = { ...prev };
      inscritos.forEach(({ estudiante }) => {
        next[estudiante.id] = { ...next[estudiante.id], habilitado: true };
      });
      return next;
    });
    setErroresMotivo({});
  }

  // "Deseleccionar todos" desmarca a todos los estudiantes a la vez, tal
  // como pide el criterio de aceptacion: los deja sin decidir de nuevo,
  // no los marca como No habilitado.
  function deseleccionarTodos() {
    setEstado((prev) => {
      const next = { ...prev };
      inscritos.forEach(({ estudiante }) => {
        next[estudiante.id] = { habilitado: null, motivo: '' };
      });
      return next;
    });
    setErroresMotivo({});
  }

  const totalHabilitados = inscritos.filter(({ estudiante }) => estado[estudiante.id]?.habilitado === true).length;
  const totalNoHabilitados = inscritos.filter(({ estudiante }) => estado[estudiante.id]?.habilitado === false).length;
  const totalSinDecidir = inscritos.length - totalHabilitados - totalNoHabilitados;

  async function guardar() {
    const sinDecidir = inscritos.some(({ estudiante }) => estado[estudiante.id]?.habilitado == null);
    if (sinDecidir) {
      setError('Debes marcar a todos los estudiantes como Habilitado o No habilitado antes de guardar.');
      return;
    }

    const faltantes = {};
    inscritos.forEach(({ estudiante }) => {
      const e = estado[estudiante.id];
      if (e && e.habilitado === false && !e.motivo?.trim()) {
        faltantes[estudiante.id] = true;
      }
    });

    if (Object.keys(faltantes).length > 0) {
      setErroresMotivo(faltantes);
      setError('No se pudo guardar: hay estudiantes marcados como "No habilitado" sin motivo registrado.');
      return;
    }

    setError(null);
    setGuardando(true);
    try {
      await Promise.all(
        inscritos.map(({ estudiante }) => {
          const e = estado[estudiante.id];
          return api.post(`/examenes/${examenId}/habilitaciones`, {
            estudiante_id: estudiante.id,
            habilitado: e.habilitado,
            observacion: e.habilitado ? null : e.motivo.trim(),
          });
        })
      );
      setExito({ habilitados: totalHabilitados, noHabilitados: totalNoHabilitados });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar las habilitaciones.');
    } finally {
      setGuardando(false);
    }
  }

  if (exito) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-lg font-semibold text-gray-800">Habilitaciones registradas con exito.</p>
          <p className="text-sm text-gray-500 mt-2">
            {exito.habilitados} habilitados / {exito.noHabilitados} no habilitados
          </p>
          <Link
            to="/examenes"
            className="inline-block mt-6 bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm"
          >
            Volver a examenes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-800">Habilitar estudiantes</h1>
      {examen && (
        <p className="text-gray-500 text-sm mb-4">
          {examen.materia?.nombre} - {examen.fecha} {examen.hora_inicio?.slice(0, 5)} - {examen.ambiente?.nombre}
        </p>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex items-center justify-between mb-3">
        <div className="space-x-3">
          <button onClick={seleccionarTodos} className="text-sm text-kairos-600 font-medium">
            Seleccionar todos
          </button>
          <button onClick={deseleccionarTodos} className="text-sm text-gray-500">
            Deseleccionar todos
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {totalHabilitados} habilitados / {totalNoHabilitados} no habilitados
          {totalSinDecidir > 0 && ` / ${totalSinDecidir} sin decidir`}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Estudiante</th>
              <th className="px-4 py-2">Codigo</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Motivo de inhabilitacion</th>
            </tr>
          </thead>
          <tbody>
            {inscritos.map(({ estudiante }) => {
              const e = estado[estudiante.id] || { habilitado: null, motivo: '' };
              return (
                <tr key={estudiante.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2">{estudiante.nombre_completo}</td>
                  <td className="px-4 py-2 text-gray-500">{estudiante.codigo_universitario}</td>
                  <td className="px-4 py-2">
                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => marcar(estudiante.id, true)}
                        className={`text-xs px-2 py-1 ${e.habilitado === true ? 'bg-kairos-600 text-white' : 'bg-white text-gray-500'}`}
                      >
                        Habilitado
                      </button>
                      <button
                        onClick={() => marcar(estudiante.id, false)}
                        className={`text-xs px-2 py-1 border-l border-gray-200 ${e.habilitado === false ? 'bg-red-600 text-white' : 'bg-white text-gray-500'}`}
                      >
                        No hab.
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {e.habilitado === false ? (
                      <div>
                        <input
                          className="input text-xs py-1"
                          placeholder="Ingresa el motivo..."
                          maxLength={200}
                          value={e.motivo}
                          onChange={(ev) => cambiarMotivo(estudiante.id, ev.target.value)}
                        />
                        {erroresMotivo[estudiante.id] && (
                          <p className="text-red-500 text-xs mt-1">El motivo de inhabilitacion es obligatorio.</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!cargando && inscritos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Ningun estudiante esta inscrito en esta materia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <Link to="/examenes" className="text-sm text-gray-400 self-center">
          Cancelar
        </Link>
        <button
          onClick={guardar}
          disabled={guardando || inscritos.length === 0}
          className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm disabled:opacity-60"
        >
          Guardar habilitaciones
        </button>
      </div>
    </div>
  );
}
