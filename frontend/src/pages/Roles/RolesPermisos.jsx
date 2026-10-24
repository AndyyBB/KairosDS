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
  'habilitaciones.registrar': 'Inscribir estudiantes, Habilitar estudiantes',
  'habilitaciones.editar': 'Quitar inscripciones y cambiar habilitaciones',
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
                        <input
                          type="checkbox"
                          aria-label={`${a.etiqueta} ${m.etiqueta}`}
                          className="h-5 w-5 rounded accent-kairos-600 disabled:opacity-60"
                          checked={!!m[a.id]}
                          disabled={bloqueado}
                          onChange={() => alternar(m.modulo, a.id)}
                        />
                        {pantalla(m.modulo, a.id) && (
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

    </div>
  );
}
