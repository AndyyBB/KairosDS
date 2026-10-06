import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import KairosLogo from './KairosLogo';
import {
  HomeIcon,
  StudentIcon,
  BuildingIcon,
  ExamIcon,
  UsersIcon,
  LogoutIcon,
} from './Iconos';

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', end: true, icon: HomeIcon },
  { to: '/estudiantes', label: 'Estudiantes', icon: StudentIcon },
  { to: '/ambientes', label: 'Ambientes', icon: BuildingIcon },
  { to: '/examenes', label: 'Exámenes', icon: ExamIcon },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const esAdministrador = usuario?.rol?.nombre === 'administrador';
  const navItems = esAdministrador
    ? [...NAV_ITEMS, { to: '/usuarios', label: 'Usuarios', icon: UsersIcon }]
    : NAV_ITEMS;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <KairosLogo size={40} />
          <div>
            <p className="font-semibold text-gray-800 leading-tight">Kairos</p>
            <p className="text-xs text-gray-400 leading-tight">Digital Systems</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-kairos-50 text-kairos-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-700 truncate">{usuario?.nombre_completo}</p>
          <p className="text-xs text-gray-400 truncate">{usuario?.rol?.nombre}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 text-sm border border-gray-300 text-gray-700 rounded-lg py-1.5 hover:bg-gray-50"
          >
            <LogoutIcon />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
