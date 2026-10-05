import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos, primerError } from '../../api/errores';

// HU-15: Registro de usuarios (crear y editar)
export default function UsuarioForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    nombre_completo: '',
    correo_electronico: '',
    password: '',
    rol_id: '',
    activo: true,
  });
  const [error, setError] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargar() {
      const rolesRes = await api.get('/roles');
      setRoles(rolesRes.data);

      if (editando) {
        const usuarioRes = await api.get(`/usuarios/${id}`);
        const u = usuarioRes.data;
        setForm({
          nombre_completo: u.nombre_completo,
          correo_electronico: u.correo_electronico,
          password: '',
          rol_id: u.rol_id,
          activo: u.activo,
        });
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setErrores({});
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
      } else {
        await api.post('/usuarios', {
          nombre_completo: form.nombre_completo,
          correo_electronico: form.correo_electronico,
          password: form.password,
          rol_id: form.rol_id,
        });
      }
      navigate('/usuarios', {
        state: { mensaje: editando ? 'Usuario actualizado con éxito.' : 'Usuario registrado con éxito.' },
      });
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
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">{editando ? 'Editar usuario' : 'Registrar usuario'}</h1>

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Nombre completo</label>
          <input
            className="input"
            value={form.nombre_completo}
            onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
          />
          {errores.nombre_completo && <p className="text-xs text-red-600 mt-1">{errores.nombre_completo[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Correo electrónico</label>
          <input
            className="input"
            value={form.correo_electronico}
            onChange={(e) => setForm({ ...form, correo_electronico: e.target.value })}
            disabled={editando}
          />
          {errores.correo_electronico && <p className="text-xs text-red-600 mt-1">{errores.correo_electronico[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            {editando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
          </label>
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editando ? 'Dejar en blanco para no cambiarla' : ''}
          />
          {errores.password && <p className="text-xs text-red-600 mt-1">{errores.password[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Rol</label>
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

        {editando && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Usuario activo (puede iniciar sesión)
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/usuarios')} className="text-sm text-gray-500 px-4 py-2">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="bg-kairos-gradient text-white rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
