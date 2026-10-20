import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos, primerError } from '../../api/errores';
import Aviso from '../../components/Aviso';
import { useAuth } from '../../api/AuthContext';
import BotonesFormulario from '../../components/BotonesFormulario';
import Encabezado from '../../components/Encabezado';
import {
  UserPlusIcon,
  EyeIcon,
  EyeOffIcon,
  Etiqueta,
  UserIcon,
  MailIcon,
  LockIcon,
  ShieldIcon,
} from '../../components/Iconos';

const FORM_INICIAL = {
  nombre_completo: '',
  correo_electronico: '',
  password: '',
  rol_id: '',
  activo: true,
};

// HU-15: Registro de usuarios. Con un id en la ruta es "Datos del usuario" (se abre desde
// la Lista de usuarios): los campos se muestran sin poder modificarse y abajo estan
// Editar (habilita los campos) y Eliminar.
export default function UsuarioForm() {
  const { id } = useParams();
  const editando = Boolean(id); // pantalla "Datos del usuario"
  const [modoEdicion, setModoEdicion] = useState(false);
  const [original, setOriginal] = useState(null);
  const soloLectura = editando && !modoEdicion;
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const { tiene } = useAuth();

  async function eliminar() {
    if (!confirm(`¿Eliminar a ${form.nombre_completo}? Su cuenta se borrará definitivamente.`)) return;
    setEliminando(true);
    setError(null);
    try {
      await api.delete(`/usuarios/${id}`);
      navigate('/usuarios/lista', { state: { mensaje: 'Usuario eliminado con éxito.' } });
    } catch (err) {
      setError(primerError(err, 'No se pudo eliminar al usuario.'));
      setEliminando(false);
    }
  }

  useEffect(() => {
    async function cargar() {
      const rolesRes = await api.get('/roles');
      setRoles(rolesRes.data);

      if (editando) {
        const usuarioRes = await api.get(`/usuarios/${id}`);
        const u = usuarioRes.data;
        const datos = {
          nombre_completo: u.nombre_completo,
          correo_electronico: u.correo_electronico,
          password: '',
          rol_id: u.rol_id,
          activo: u.activo,
        };
        setForm(datos);
        setOriginal(datos);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // HU-15 (11, 12): "Cancelar" descarta los datos ingresados y cierra el formulario (el
  // sistema redirige a la pantalla de Inicio). En "Datos del usuario" descarta los
  // cambios y vuelve a mostrar los datos sin poder modificarlos.
  function cancelar() {
    setErrores({});
    setError(null);
    setVerPassword(false);
    if (editando) {
      setForm(original ?? FORM_INICIAL);
      setModoEdicion(false);
      return;
    }
    setForm(FORM_INICIAL);
    navigate('/');
  }

  function editar() {
    setMensaje('');
    setModoEdicion(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setErrores({});
    setMensaje('');
    setGuardando(true);
    try {
      if (editando) {
        const payload = {
          nombre_completo: form.nombre_completo,
          rol_id: form.rol_id,
          activo: form.activo,
        };
        if (form.password) payload.password = form.password;
        await api.put(`/usuarios/${id}`, payload);
        // Vuelve a mostrar los datos (ya guardados) sin poder modificarlos.
        const guardado = { ...form, password: '' };
        setForm(guardado);
        setOriginal(guardado);
        setVerPassword(false);
        setModoEdicion(false);
        setMensaje('Usuario actualizado con éxito.');
        return;
      }
      await api.post('/usuarios', {
        nombre_completo: form.nombre_completo,
        correo_electronico: form.correo_electronico,
        password: form.password,
        rol_id: form.rol_id,
      });
      // HU-15 (10): el sistema muestra el mensaje y deja el formulario listo para otro registro.
      setForm(FORM_INICIAL);
      setVerPassword(false);
      setMensaje('Usuario registrado con éxito.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const campos = erroresCampos(err);
      setErrores(campos);
      // Solo se muestra el aviso general cuando el error no pertenece a un campo.
      if (Object.keys(campos).length === 0) {
        setError(primerError(err, 'No se pudo guardar el usuario.'));
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Encabezado
        icono={<UserPlusIcon size={22} />}
        titulo={!editando ? 'Registrar usuario' : modoEdicion ? 'Editar usuario' : 'Datos del usuario'}
        descripcion={
          !editando
            ? 'Crea la cuenta de un docente o del personal de control de ingreso.'
            : modoEdicion
              ? 'Modifica los datos y presiona "Guardar".'
              : 'Información registrada del usuario.'
        }
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-6 space-y-4">
        <fieldset disabled={soloLectura} className="space-y-4">
        <div>
          <Etiqueta icon={<UserIcon />}>Nombre completo</Etiqueta>
          <input
            className="input"
            value={form.nombre_completo}
            onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
          />
          {errores.nombre_completo && <p className="text-xs text-red-600 mt-1">{errores.nombre_completo[0]}</p>}
        </div>

        <div>
          <Etiqueta icon={<MailIcon />}>Correo electrónico</Etiqueta>
          <input
            className="input"
            value={form.correo_electronico}
            onChange={(e) => setForm({ ...form, correo_electronico: e.target.value })}
            placeholder="nombre@correo.com"
            disabled={editando}
          />
          {errores.correo_electronico && <p className="text-xs text-red-600 mt-1">{errores.correo_electronico[0]}</p>}
        </div>

        {(!editando || modoEdicion) && (
        <div>
          <Etiqueta icon={<LockIcon />}>
            {editando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
          </Etiqueta>
          <div className="relative">
            <input
              type={verPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="input pr-10"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editando ? 'Dejar en blanco para no cambiarla' : ''}
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-kairos-600"
            >
              {verPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errores.password && <p className="text-xs text-red-600 mt-1">{errores.password[0]}</p>}
        </div>
        )}

        <div>
          <Etiqueta icon={<ShieldIcon />}>Rol</Etiqueta>
          <select
            className="input"
            value={form.rol_id}
            onChange={(e) => setForm({ ...form, rol_id: e.target.value })}
          >
            <option value="">Seleccione un rol</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
          {errores.rol_id && <p className="text-xs text-red-600 mt-1">{errores.rol_id[0]}</p>}
        </div>
        </fieldset>


        {error && <p className="text-sm text-red-600">{error}</p>}

        <BotonesFormulario
          esDetalle={editando}
          modoEdicion={modoEdicion}
          puedeEditar={tiene('usuarios.editar')}
          puedeEliminar={tiene('usuarios.eliminar')}
          guardando={guardando}
          eliminando={eliminando}
          onCancelar={cancelar}
          onSalir={() => navigate('/usuarios/lista')}
          onEditar={editar}
          onEliminar={eliminar}
        />
      </form>
    </div>
  );
}
