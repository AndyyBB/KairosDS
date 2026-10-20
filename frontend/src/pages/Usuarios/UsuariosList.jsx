import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Paginacion from '../../components/Paginacion';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import { UsersIcon } from '../../components/Iconos';
import { claseEnlaceNombre } from '../../components/AccionPeligro';
import { useAuth } from '../../api/AuthContext';

const POR_PAGINA = 20;

// Lista de usuarios. Al hacer clic en el nombre se abre "Editar usuario",
// donde tambien se puede eliminar definitivamente.
export default function UsuariosList() {
  const { tiene } = useAuth();
  const puedeEditar = tiene('usuarios.editar') || tiene('usuarios.eliminar');
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [mensaje, setMensaje] = useMensajeFlash();
  const [error, setError] = useState('');

  async function cargar() {
    setCargando(true);
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      setError(primerError(err, 'No se pudo cargar la lista de usuarios.'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const lista = usuarios;
  const ultima = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const visibles = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div>
      <Encabezado
        icono={<UsersIcon size={22} />}
        titulo="Lista de usuarios"
        descripcion={
          puedeEditar
            ? 'Haz clic en el nombre de un usuario para ver sus datos, editarlo o eliminarlo.'
            : 'Usuarios registrados en el sistema.'
        }
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  {puedeEditar ? (
                    <Link to={`/usuarios/datos/${u.id}`} className={claseEnlaceNombre}>{u.nombre_completo}</Link>
                  ) : (
                    u.nombre_completo
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500">{u.correo_electronico}</td>
                <td className="px-4 py-2 capitalize">{u.rol?.nombre}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.activo ? 'bg-kairos-gradient text-white shadow-glow' : 'bg-gray-100 text-gray-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
            {!cargando && lista.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No hay usuarios para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} ultima={ultima} total={lista.length} onCambiar={setPagina} />
    </div>
  );
}
