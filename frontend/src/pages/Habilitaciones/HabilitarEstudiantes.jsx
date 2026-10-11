import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import { fechaDMA, horaHM } from '../../api/formato';
import Paginacion from '../../components/Paginacion';
import { primerError } from '../../api/errores';
import { useAuth } from '../../api/AuthContext';
import { IconoTitulo, CheckBadgeIcon } from '../../components/Iconos';
import ModalInscribir from './ModalInscribir';

const POR_PAGINA = 20;

// Todas las carreras del estudiante (puede tener más de una).
function carrerasDe(estudiante) {
  const lista = estudiante.carreras?.length ? estudiante.carreras : estudiante.carrera ? [estudiante.carrera] : [];
  return lista.map((c) => c.nombre).join(', ') || '-';
}

// HU-04: Asociación de estudiantes habilitados a un examen
export default function HabilitarEstudiantes() {
  const { examenId } = useParams();
  const { tiene } = useAuth();
  const [examen, setExamen] = useState(null);
  const [inscritos, setInscritos] = useState([]);
  const [estado, setEstado] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [erroresMotivo, setErroresMotivo] = useState({});
  const [exito, setExito] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [inscribiendo, setInscribiendo] = useState(false);

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

  function habilitarATodos() {
    setEstado((prev) => {
      const next = { ...prev };
      inscritos.forEach(({ estudiante }) => {
        next[estudiante.id] = { ...next[estudiante.id], habilitado: true };
      });
      return next;
    });
    setErroresMotivo({});
  }

  const totalHabilitados = inscritos.filter(({ estudiante }) => estado[estudiante.id]?.habilitado === true).length;
  const totalNoHabilitados = inscritos.filter(({ estudiante }) => estado[estudiante.id]?.habilitado === false).length;
  const cerrado = ['finalizado', 'cancelado'].includes(examen?.estado_actual);
  const ultimaPagina = Math.max(1, Math.ceil(inscritos.length / POR_PAGINA));
  const visibles = inscritos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
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
      // Solo se muestra el mensaje junto a cada estudiante sin motivo.
      setErroresMotivo(faltantes);
      setError(null);
      const primerIndice = inscritos.findIndex(({ estudiante }) => faltantes[estudiante.id]);
      setPagina(Math.floor(primerIndice / POR_PAGINA) + 1);
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
      setError(primerError(err, 'No se pudo guardar las habilitaciones.'));
    } finally {
      setGuardando(false);
    }
  }

  if (exito) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-10 text-center">
          <p className="text-lg font-semibold text-gray-800">Habilitaciones registradas con éxito.</p>
          <p className="text-sm text-gray-500 mt-2">
            {exito.habilitados} habilitados / {exito.noHabilitados} no habilitados
          </p>
          <Link
            to="/examenes"
            className="inline-block mt-6 bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-glow whitespace-nowrap"
          >
            Volver a exámenes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <IconoTitulo><CheckBadgeIcon size={22} /></IconoTitulo>
        <h1 className="text-2xl font-semibold text-gray-800">Habilitar estudiantes</h1>
      </div>
      {examen && (
        <p className="text-gray-500 text-sm mb-4">
          {examen.materia?.nombre} · {fechaDMA(examen.fecha)} {horaHM(examen.hora_inicio)} · {examen.ambientes?.length ? examen.ambientes.map((a) => a.nombre).join(', ') : examen.ambiente?.nombre}
        </p>
      )}

      {cerrado && (
        <p className="text-sm text-amber-700 mb-4">Este examen está {examen.estado_actual}: ya no admite habilitaciones.</p>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
        {tiene('habilitaciones.registrar') && !cerrado && (
          <button
            type="button"
            onClick={() => setInscribiendo(true)}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 text-sm font-medium"
          >
            Inscribir estudiantes
          </button>
        )}
        <button
          onClick={habilitarATodos}
          disabled={cerrado}
          className="border border-kairos-600 text-kairos-700 hover:bg-kairos-50 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Habilitar a todos
        </button>
        </div>
        <p className="text-sm text-gray-500">
          {totalHabilitados} habilitados / {totalNoHabilitados} no habilitados
          {totalSinDecidir > 0 && ` / ${totalSinDecidir} sin decidir`}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              <th className="px-4 py-2">Estudiante</th>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">CI</th>
              <th className="px-4 py-2">Carrera</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Motivo de inhabilitación</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(({ estudiante }) => {
              const e = estado[estudiante.id] || { habilitado: null, motivo: '' };
              return (
                <tr key={estudiante.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2">{estudiante.nombre_completo}</td>
                  <td className="px-4 py-2 text-gray-500">{estudiante.codigo_universitario}</td>
                  <td className="px-4 py-2 text-gray-500">{estudiante.documento_identidad || '-'}</td>
                  <td className="px-4 py-2 text-gray-500">{carrerasDe(estudiante)}</td>
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
                          <p className="text-red-500 text-xs mt-1">El motivo de inhabilitación es obligatorio.</p>
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
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Ningún estudiante está inscrito en este examen.
                  {tiene('habilitaciones.registrar') && !cerrado && (
                    <>
                      {' '}
                      <button type="button" onClick={() => setInscribiendo(true)} className="text-kairos-600 font-medium">
                        Inscribir estudiantes
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} ultima={ultimaPagina} total={inscritos.length} onCambiar={setPagina} />

      <div className="flex justify-end gap-3 mt-4">
        <Link to="/examenes" className="text-sm text-gray-400 self-center">
          Cancelar
        </Link>
        <button
          onClick={guardar}
          disabled={guardando || inscritos.length === 0 || cerrado}
          className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-glow disabled:opacity-60"
        >
          Guardar habilitaciones
        </button>
      </div>

      {inscribiendo && (
        <ModalInscribir
          examenId={examenId}
          cerrado={cerrado}
          onCerrar={(huboCambios) => {
            setInscribiendo(false);
            if (huboCambios) cargar();
          }}
        />
      )}
    </div>
  );
}
