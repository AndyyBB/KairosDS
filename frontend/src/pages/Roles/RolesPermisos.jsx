import { useEffect, useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Aviso from '../../components/Aviso';
import { IconoTitulo, ShieldIcon } from '../../components/Iconos';
import { pantallaDePermiso } from '../../components/navegacion';

// "Ver" no se configura: al marcar Registrar, Editar o Eliminar el rol ya puede
// ver la lista del modulo (se calcula al guardar).
const ACCIONES = [
  { id: 'registrar', etiqueta: 'Registrar' },
  { id: 'editar', etiqueta: 'Editar' },
  { id: 'eliminar', etiqueta: 'Eliminar' },
];

// Opcion del menu que habilita cada casilla. Cada accion es una pantalla independiente
// ("Registrar ...", "Editar ...", "Eliminar ..."); la habilitacion de estudiantes se hace
// en una sola pantalla.
const PANTALLAS_EXTRA = {
  'habilitaciones.registrar': 'Inscribir estudiantes, Habilitar/Deshabilitar estudiantes',
  'habilitaciones.editar': 'Desinscribir estudiantes y cambiar habilitaciones',
};

function pantalla(modulo, accion) {
  const permiso = `${modulo}.${accion}`;
  return PANTALLAS_EXTRA[permiso] ?? pantallaDePermiso(permiso) ?? null;
}

function nombreRol(nombre) {
  return nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : '';
}

// HU-17: Configuracion de permisos por rol.
export default function RolesPermisos() {
  const [roles, setRoles] = useState([]);
  const [rolId, setRolId] = useState(null);
  const [guardado, setGuardado] = useState(null); // permisos tal como estan guardados
  const [edicion, setEdicion] = useState(null); // permisos con los cambios sin guardar
  const [bloqueado, setBloqueado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Sprint 4 (observacion 10): historial de permisos del rol por periodos de vigencia.
  const [historial, setHistorial] = useState([]);
  const [fechaConsulta, setFechaConsulta] = useState('');
  const [enFecha, setEnFecha] = useState(null); // { fecha, permisos }
  const [errorFecha, setErrorFecha] = useState('');

  async function cargarHistorial(id = rolId) {
    if (!id) return;
    try {
      const res = await api.get(`/roles/${id}/permisos/historial`);
      setHistorial(res.data.periodos ?? []);
    } catch (err) {
      setHistorial([]);
    }
  }

  // Permisos que el rol tenia en una fecha (auditoria).
  async function consultarFecha(e) {
    e.preventDefault();
    setErrorFecha('');
    setEnFecha(null);
    if (!fechaConsulta) {
      setErrorFecha('Seleccione una fecha.');
      return;
    }
    try {
      const res = await api.get(`/roles/${rolId}/permisos/historial`, { params: { fecha: fechaConsulta } });
      setEnFecha({ fecha: res.data.fecha, permisos: res.data.en_fecha ?? [] });
    } catch (err) {
      setErrorFecha(primerError(err, 'No se pudo consultar la fecha.'));
    }
  }

  // HU-17 (1): roles Administrador, Docente y Personal de control de ingreso.
  useEffect(() => {
    api
      .get('/roles')
      .then((res) => {
        setRoles(res.data);
        if (res.data.length) setRolId(res.data[0].id);
      })
      .catch((err) => setError(primerError(err)));
  }, []);

  // HU-17 (2): al seleccionar un rol se muestra la tabla de modulos y acciones.
  useEffect(() => {
    if (!rolId) return;
    setMensaje('');
    setError('');
    api
      .get(`/roles/${rolId}/permisos`)
      .then((res) => {
        setGuardado(res.data.modulos);
        setEdicion(res.data.modulos);
        setBloqueado(res.data.bloqueado);
      })
      .catch((err) => setError(primerError(err)));
    setEnFecha(null);
    setErrorFecha('');
    cargarHistorial(rolId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolId]);

  function alternar(modulo, accion) {
    if (bloqueado) return;
    setMensaje('');
    setEdicion((prev) =>
      prev.map((m) => (m.modulo === modulo ? { ...m, [accion]: !m[accion] } : m))
    );
  }

  // HU-17 (7): Cancelar descarta los cambios no guardados.
  function cancelar() {
    setEdicion(guardado);
    setMensaje('');
    setError('');
  }

  // HU-17 (5, 6): Guardar los permisos del rol seleccionado.
  async function guardar() {
    setGuardando(true);
    setMensaje('');
    setError('');
    const permisos = [];
    edicion.forEach((m) => ACCIONES.forEach((a) => m[a.id] && permisos.push(`${m.modulo}.${a.id}`)));
    try {
      const res = await api.put(`/roles/${rolId}/permisos`, { permisos });
      setGuardado(edicion);
      setMensaje(res.data.message);
      cargarHistorial();
    } catch (err) {
      setError(primerError(err));
    } finally {
      setGuardando(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <IconoTitulo><ShieldIcon size={22} /></IconoTitulo>
        <h1 className="text-2xl font-semibold text-gray-800">Roles y permisos</h1>
      </div>

      {/* Mensajes arriba, a la vista al guardar. */}
      <Aviso mensaje={mensaje ? `✓ ${mensaje}` : ''} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
        <p className="text-sm text-gray-600 mb-1">Rol</p>
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden mb-5">
          {roles.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRolId(r.id)}
              className={`px-4 py-2 text-sm ${i > 0 ? 'border-l border-gray-300' : ''} ${
                rolId === r.id ? 'bg-kairos-50 text-kairos-700 font-semibold' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {nombreRol(r.nombre)}
            </button>
          ))}
        </div>

        {edicion && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-kairos-50/80 text-kairos-800 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Módulo</th>
                  {ACCIONES.map((a) => (
                    <th key={a.id} className="px-3 py-2 font-semibold text-center">{a.etiqueta}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {edicion.map((m) => (
                  <tr key={m.modulo} className="border-t border-gray-100">
                    <td className="px-3 py-3 text-gray-800 font-medium align-top">{m.etiqueta}</td>
                    {ACCIONES.map((a) => (
                      <td key={a.id} className="px-3 py-3 text-center align-top">
                        {/* null: la accion no existe en el modulo (por ejemplo, los ingresos no se editan ni se eliminan). */}
                        {m[a.id] === null ? (
                          <span className="text-gray-300" title="Esta acción no existe en el módulo">—</span>
                        ) : (
                        <input
                          type="checkbox"
                          aria-label={`${a.etiqueta} ${m.etiqueta}`}
                          className="h-5 w-5 rounded accent-kairos-600 disabled:opacity-60"
                          checked={!!m[a.id]}
                          disabled={bloqueado}
                          onChange={() => alternar(m.modulo, a.id)}
                        />
                        )}
                        {m[a.id] !== null && pantalla(m.modulo, a.id) && (
                          <span className={`mt-1 block text-xs ${m[a.id] ? 'text-kairos-700' : 'text-gray-400'}`}>
                            {pantalla(m.modulo, a.id)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5">
          <div className="text-sm text-gray-500 space-y-0.5">
            <p>Cada casilla habilita la opción del menú indicada debajo; si no se marca, la opción no aparece en el menú del rol.</p>
            <p>Al marcar Registrar, Editar o Eliminar, el rol también puede ver la lista del módulo.</p>
            <p>Los cambios se aplican en el siguiente inicio de sesión.</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={cancelar}
              disabled={bloqueado}
              className="border border-gray-300 text-gray-800 text-sm font-medium rounded-lg px-5 py-2 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={bloqueado || guardando || !edicion}
              className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-5 py-2 shadow-glow disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* Sprint 4 (observacion 10): periodos de vigencia de los permisos, para auditorias. */}
      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5">
        <h2 className="text-lg font-semibold text-gray-800">Historial de permisos del rol</h2>
        <p className="text-sm text-gray-500 mb-4">
          Desde qué fecha y hasta qué fecha el rol {nombreRol(roles.find((r) => r.id === rolId)?.nombre)} tuvo cada permiso, y quién lo asignó o lo retiró.
        </p>

        <form onSubmit={consultarFecha} className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
          <div>
            <label htmlFor="fecha-permisos" className="block text-sm font-medium text-gray-600 mb-1">Consultar permisos a la fecha</label>
            <input
              id="fecha-permisos"
              type="date"
              className="input"
              value={fechaConsulta}
              onChange={(e) => {
                setFechaConsulta(e.target.value);
                setErrorFecha('');
              }}
            />
          </div>
          <button type="submit" className="border border-kairos-600 text-kairos-700 text-sm font-medium rounded-lg px-5 py-2 hover:bg-kairos-50">
            Consultar
          </button>
        </form>
        {errorFecha && <p className="text-sm text-red-600 -mt-2 mb-3">{errorFecha}</p>}
        {enFecha && (
          <div className="mb-4 rounded-lg border border-kairos-100 bg-kairos-50/60 px-4 py-3 text-sm">
            <p className="font-medium text-kairos-800 mb-2">Permisos que tenía el rol el {enFecha.fecha}:</p>
            {enFecha.permisos.length ? (
              <div className="flex flex-wrap gap-2">
                {enFecha.permisos.map((p) => (
                  <span key={p.id} className="rounded-full bg-white border border-kairos-200 px-3 py-1 text-xs text-kairos-800">
                    {p.modulo} · {p.accion}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">El rol no tenía permisos registrados en esa fecha.</p>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-100 max-h-[420px] overflow-y-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-kairos-50/80 text-kairos-800 text-left sticky top-0">
              <tr>
                <th className="px-3 py-2">Módulo</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Vigente desde</th>
                <th className="px-3 py-2">Vigente hasta</th>
                <th className="px-3 py-2">Asignado por</th>
                <th className="px-3 py-2">Retirado por</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{p.modulo}</td>
                  <td className="px-3 py-2">{p.accion}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.desde}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {p.hasta ?? <span className="text-kairos-700 font-medium">Vigente</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{p.asignado_por ?? 'Configuración inicial'}</td>
                  <td className="px-3 py-2 text-gray-600">{p.hasta ? p.retirado_por ?? '—' : '—'}</td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">No hay permisos registrados para este rol.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
