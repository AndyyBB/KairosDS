import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

// HU-15: Registro de usuarios
export default function UsuariosList() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    const res = await api.get('/usuarios');
    setUsuarios(res.data);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleDesactivar(id) {
    if (!confirm('Desactivar este usuario? No podra iniciar sesion.')) return;
    await api.delete(`/usuarios/${id}`);
    cargar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Usuarios</h1>
        </div>
        <Link to="/usuarios/nuevo" className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm">
          + Nuevo usuario
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{u.nombre_completo}</td>
                <td className="px-4 py-2 text-gray-500">{u.correo_electronico}</td>
                <td className="px-4 py-2 capitalize">{u.rol?.nombre}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.activo ? 'bg-kairos-50 text-kairos-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  <Link to={`/usuarios/${u.id}/editar`} className="text-kairos-600 font-medium">Editar</Link>
                  {u.activo && (
                    <button onClick={() => handleDesactivar(u.id)} className="text-gray-400">Desactivar</button>
                  )}
                </td>
              </tr>
            ))}
            {!cargando && usuarios.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Aun no hay usuarios registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
