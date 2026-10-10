import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Paginacion from '../../components/Paginacion';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import { IconoTitulo, UsersIcon } from '../../components/Iconos';
import { useAuth } from '../../api/AuthContext';

const POR_PAGINA = 20;

// HU-15: Registro de usuarios
export default function UsuariosList() {
  const { tiene } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [mensaje, setMensaje] = useMensajeFlash();

  async function cargar() {
    setCargando(true);
    const res = await api.get('/usuarios');
    setUsuarios(res.data);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const ultima = Math.max(1, Math.ceil(usuarios.length / POR_PAGINA));
  const visibles = usuarios.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  async function handleDesactivar(id) {
    if (!confirm('¿Desactivar este usuario? No podrá iniciar sesión.')) return;
    await api.delete(`/usuarios/${id}`);
    cargar();
  }

  return (
    <div>
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconoTitulo><UsersIcon size={22} /></IconoTitulo>
          <h1 className="text-2xl font-semibold text-gray-800">Usuarios</h1>
        </div>
        {tiene('usuarios.registrar') && (
          <Link to="/usuarios/nuevo" className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm">
            Registrar usuario
          </Link>
        )}
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
            {visibles.map((u) => (
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
                  {tiene('usuarios.editar') && (
                    <Link to={`/usuarios/${u.id}/editar`} className="text-kairos-600 font-medium">Editar</Link>
                  )}
                  {u.activo && tiene('usuarios.eliminar') && (
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

      <Paginacion pagina={pagina} ultima={ultima} total={usuarios.length} onCambiar={setPagina} />
    </div>
  );
}
