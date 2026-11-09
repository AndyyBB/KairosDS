import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos, primerError } from '../../api/errores';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import { SelectorUsuario } from '../../components/Selectores';
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
  nombres: '',
  apellidos: '',
  nombre_completo: '',
  correo_electronico: '',
  password: '',
  rol_id: '',
  activo: true,
};

// Titulo y descripcion de cada pantalla (cada accion tiene su propia pantalla del menu).
const TEXTOS = {
  registrar: { titulo: 'Registrar usuario', descripcion: 'Crea la cuenta de un docente o del personal de control de ingreso.' },
  datos: { titulo: 'Datos del usuario', descripcion: 'Información registrada del usuario.' },
  editar: { titulo: 'Editar usuario', descripcion: 'Selecciona al usuario, modifica sus datos y presiona "Guardar".' },
  eliminar: { titulo: 'Eliminar usuario', descripcion: 'Selecciona al usuario, revisa sus datos y presiona "Eliminar".' },
};

// HU-15 Registrar usuario, HU-32 Editar usuario y HU-33 Eliminar usuario: cada accion es una
// pantalla independiente del menu Usuarios. "Datos del usuario" se abre desde la Lista de
// usuarios (clic en el nombre) y solo muestra los datos.
export default function UsuarioForm({ modo = 'registrar' }) {
  const { id } = useParams();
  const editando = Boolean(id); // hay un usuario cargado (datos, editar o eliminar)
  const modoEdicion = modo === 'editar';
  const [original, setOriginal] = useState(null);
  const soloLectura = modo === 'datos' || modo === 'eliminar';
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [mensaje, setMensaje] = useMensajeFlash();
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
      navigate('/usuarios/eliminar', { state: { mensaje: 'Usuario eliminado con éxito.' } });
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
        setOriginal(null);
        const usuarioRes = await api.get(`/usuarios/${id}`);
        const u = usuarioRes.data;
        const datos = {
          nombres: u.nombres ?? '',
          apellidos: u.apellidos ?? '',
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

  // Al elegir otro registro se limpian los mensajes y errores anteriores.
  useEffect(() => {
    if (!id) return;
    setMensaje('');
    setError(null);
    setErrores({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // "Cancelar": en "Registrar" descarta los datos ingresados y redirige a la pantalla de
  // Inicio; en "Editar usuario" y "Eliminar usuario" descarta los cambios y vuelve a la
  // seleccion del registro.
  function cancelar() {
    setErrores({});
    setError(null);
    setVerPassword(false);
    if (modo === 'editar' || modo === 'eliminar') {
      // Descarta los cambios y vuelve a la seleccion del registro.
      navigate(`/usuarios/${modo}`);
      return;
    }
    setForm(FORM_INICIAL);
    navigate('/');
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
          nombres: form.nombres,
          apellidos: form.apellidos,
          rol_id: form.rol_id,
          activo: form.activo,
        };
        if (form.password) payload.password = form.password;
        await api.put(`/usuarios/${id}`, payload);
        // Vuelve a mostrar los datos (ya guardados) sin poder modificarlos.
        const guardado = { ...form, password: '', nombre_completo: `${form.nombres.trim()} ${form.apellidos.trim()}`.trim() };
        setForm(guardado);
        setOriginal(guardado);
        setVerPassword(false);
        setMensaje('Usuario actualizado con éxito.');
        return;
      }
      const res = await api.post('/usuarios', {
        nombres: form.nombres,
        apellidos: form.apellidos,
        correo_electronico: form.correo_electronico,
        password: form.password,
        rol_id: form.rol_id,
      });
      // HU-15 (10): el sistema muestra el mensaje y deja el formulario listo para otro registro.
      // Sprint 4: el mensaje indica si se envio el correo de aviso al usuario.
      setForm(FORM_INICIAL);
      setVerPassword(false);
      setMensaje(res.data?.message || 'Usuario registrado con éxito.');
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
    // Sin registro elegido en Editar / Eliminar se muestra la tabla de seleccion (mas ancha).
    <div className={(modo === 'editar' || modo === 'eliminar') && !editando ? 'max-w-5xl' : 'max-w-lg'}>
      <Encabezado
        icono={<UserPlusIcon size={22} />}
        titulo={TEXTOS[modo].titulo}
        descripcion={TEXTOS[modo].descripcion}
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      {(modo === 'editar' || modo === 'eliminar') && (
        <SelectorUsuario
          modo={modo}
          seleccionado={editando ? (original ? { titulo: original.nombre_completo, detalle: original.correo_electronico } : { titulo: 'Cargando...' }) : null}
        />
      )}

      {(modo === 'registrar' || editando) && (
        <>
          {modo === 'eliminar' && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Revisa los datos antes de eliminar. La cuenta se borrará definitivamente y el usuario ya no podrá ingresar al sistema.
            </p>
          )}

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-6 space-y-4">
        <fieldset disabled={soloLectura} className="space-y-4">
        {/* Sprint 4 (observacion 4): Nombres y Apellidos por separado. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Etiqueta icon={<UserIcon />}>Nombres</Etiqueta>
            <input
              className="input"
              maxLength={60}
              value={form.nombres}
              onChange={(e) => setForm({ ...form, nombres: e.target.value })}
            />
            {errores.nombres && <p className="text-xs text-red-600 mt-1">{errores.nombres[0]}</p>}
          </div>
          <div>
            <Etiqueta icon={<UserIcon />}>Apellidos</Etiqueta>
            <input
              className="input"
              maxLength={60}
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
            />
            {errores.apellidos && <p className="text-xs text-red-600 mt-1">{errores.apellidos[0]}</p>}
          </div>
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

        {/* HU-32: estado de la cuenta. Un usuario inactivo conserva su historial pero no puede iniciar sesion. */}
        {editando && (
        <div>
          <Etiqueta icon={<ShieldIcon />}>Estado</Etiqueta>
          <select
            className="input"
            value={form.activo ? '1' : '0'}
            onChange={(e) => setForm({ ...form, activo: e.target.value === '1' })}
          >
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </select>
          {!soloLectura && (
            <p className="text-xs text-gray-400 mt-1">Un usuario inactivo no puede iniciar sesión en el sistema.</p>
          )}
          {errores.activo && <p className="text-xs text-red-600 mt-1">{errores.activo[0]}</p>}
        </div>
        )}
        </fieldset>


        {error && <p className="text-sm text-red-600">{error}</p>}

        {modo === 'registrar' && (
          <p className="text-xs text-gray-500">
            Al guardar, el sistema envía un correo al usuario para avisarle que se creó su cuenta (por seguridad, sin la contraseña).
          </p>
        )}

        <BotonesFormulario
          modo={modo}
          puedeGuardar={true}
          puedeEliminar={tiene('usuarios.eliminar')}
          guardando={guardando}
          eliminando={eliminando}
          onCancelar={cancelar}
          onSalir={() => navigate('/usuarios/lista')}
          onEliminar={eliminar}
        />
      </form>
        </>
      )}
    </div>
  );
}
