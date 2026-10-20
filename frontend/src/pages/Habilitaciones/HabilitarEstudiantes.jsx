import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { fechaDMA, horaHM } from '../../api/formato';
import Paginacion from '../../components/Paginacion';
import { primerError } from '../../api/errores';
import { useAuth } from '../../api/AuthContext';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import {
  CheckBadgeIcon,
  CheckIcon,
  XIcon,
  CheckAllIcon,
  UserPlusIcon,
} from '../../components/Iconos';
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
  const navigate = useNavigate();
  const [pagina, setPagina] = useState(1);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [examenes, setExamenes] = useState([]);
  const [mensaje, setMensaje] = useState('');

  // HU-04 (1): lista de examenes registrados que aun admiten habilitaciones.
  useEffect(() => {
    api
      .get('/examenes', { params: { per_page: 100 } })
      .then((res) => {
        const lista = (res.data.data ?? res.data).filter(
          (ex) => !['finalizado', 'cancelado'].includes(ex.estado_actual)
        );
        lista.sort((a, b) => `${a.fecha} ${a.hora_inicio}`.localeCompare(`${b.fecha} ${b.hora_inicio}`));
        setExamenes(lista);
      })
      .catch((err) => setError(primerError(err, 'No se pudo cargar la lista de exámenes.')));
  }, []);

  function seleccionarExamen(id) {
    setMensaje('');
    setPagina(1);
    navigate(id ? `/examenes/habilitar/${id}` : '/examenes/habilitar');
  }

  async function cargar() {
    if (!examenId) {
      setExamen(null);
      setInscritos([]);
      setEstado({});
      setCargando(false);
      return;
    }
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
    // Se puede guardar aunque haya estudiantes sin decidir: solo se envían
    // los que tienen Habilitado o No habilitado; los demás quedan pendientes.
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
      const decididos = inscritos.filter(({ estudiante }) => estado[estudiante.id]?.habilitado != null);
      await Promise.all(
        decididos.map(({ estudiante }) => {
          const e = estado[estudiante.id];
          return api.post(`/examenes/${examenId}/habilitaciones`, {
            estudiante_id: estudiante.id,
            habilitado: e.habilitado,
            observacion: e.habilitado ? null : e.motivo.trim(),
          });
        })
      );
      // HU-04 (10): el sistema muestra el mensaje de confirmacion en esta misma pantalla.
      setMensaje(
        `Habilitaciones registradas con éxito: ${totalHabilitados} habilitados / ${totalNoHabilitados} no habilitados` +
          (totalSinDecidir > 0 ? ` / ${totalSinDecidir} sin decidir.` : '.')
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await cargar();
    } catch (err) {
      setError(primerError(err, 'No se pudo guardar las habilitaciones.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <Encabezado
        icono={<CheckBadgeIcon size={22} />}
        titulo="Habilitar estudiantes"
        descripcion="Selecciona un examen y marca a cada estudiante inscrito como habilitado o no habilitado."
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
        <label htmlFor="examen-habilitar" className="block text-sm font-medium text-gray-600 mb-1">Examen</label>
        <select
          id="examen-habilitar"
          className="input"
          value={examenId ?? ''}
          onChange={(e) => seleccionarExamen(e.target.value)}
        >
          <option value="">Seleccione un examen</option>
          {examenes.map((ex) => (
            <option key={ex.id} value={String(ex.id)}>
              {`${ex.materia?.nombre} — ${fechaDMA(ex.fecha)} ${horaHM(ex.hora_inicio)} — ${
                ex.ambientes?.length ? ex.ambientes.map((a) => a.nombre).join(', ') : ex.ambiente?.nombre ?? ''
              }`}
            </option>
          ))}
          {/* Si se entra con un examen que ya no esta en la lista (finalizado), igual se muestra. */}
          {examen && !examenes.some((ex) => String(ex.id) === String(examen.id)) && (
            <option value={String(examen.id)}>
              {`${examen.materia?.nombre} — ${fechaDMA(examen.fecha)} ${horaHM(examen.hora_inicio)}`}
            </option>
          )}
        </select>
      </div>

      {!examenId && (
        <div className="rounded-xl border border-dashed border-kairos-200 bg-white/60 px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kairos-50 text-kairos-600">
            <CheckBadgeIcon size={24} />
          </div>
          <p className="font-medium text-gray-700">Selecciona un examen</p>
          <p className="text-sm text-gray-500 mt-1">Se mostrará la lista de estudiantes inscritos en ese examen.</p>
        </div>
      )}

      {examenId && (
      <>
      {cerrado && (
        <p className="text-sm text-amber-700 mb-4">Este examen está {examen.estado_actual}: ya no admite habilitaciones.</p>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {tiene('habilitaciones.registrar') && !cerrado && (
            <button
              type="button"
              onClick={() => setInscribiendo(true)}
              className="inline-flex items-center gap-2 bg-kairos-gradient text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition hover:shadow-md active:scale-[0.98]"
            >
              <UserPlusIcon size={16} />
              Inscribir estudiantes
            </button>
          )}
          <button
            type="button"
            onClick={habilitarATodos}
            disabled={cerrado || inscritos.length === 0}
            className="inline-flex items-center gap-2 bg-white border border-kairos-600 text-kairos-700 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-kairos-50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <CheckAllIcon size={16} />
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
                    <div className="flex items-center gap-2 whitespace-nowrap" role="group" aria-label="Estado de habilitación">
                      <button
                        type="button"
                        disabled={cerrado}
                        aria-pressed={e.habilitado === true}
                        onClick={() => marcar(estudiante.id, true)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] disabled:pointer-events-none ${
                          e.habilitado === true
                            ? 'bg-kairos-gradient text-white shadow-sm'
                            : 'border border-gray-300 text-gray-600 hover:border-kairos-500 hover:text-kairos-700 hover:bg-kairos-50'
                        }`}
                      >
                        <CheckIcon />
                        Habilitado
                      </button>
                      <button
                        type="button"
                        disabled={cerrado}
                        aria-pressed={e.habilitado === false}
                        onClick={() => marcar(estudiante.id, false)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] disabled:pointer-events-none ${
                          e.habilitado === false
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'border border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <XIcon />
                        No habilitado
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
        <button
          type="button"
          onClick={() => navigate('/')}
          className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || totalHabilitados + totalNoHabilitados === 0 || cerrado}
          className="inline-flex items-center gap-2 bg-kairos-gradient text-white text-sm font-medium rounded-lg px-5 py-2 shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
        >
          <CheckIcon size={16} />
          {guardando ? 'Guardando...' : 'Guardar habilitaciones'}
        </button>
      </div>

      </>
      )}

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
