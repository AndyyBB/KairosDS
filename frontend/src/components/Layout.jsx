import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import KairosLogo from './KairosLogo';
import {
  HomeIcon,
  StudentIcon,
  BuildingIcon,
  ExamIcon,
  ClipboardCheckIcon,
  ShieldIcon,
  UsersIcon,
  LogoutIcon,
} from './Iconos';

// HU-17 (10): el menu lateral muestra solo los modulos que el rol tiene permitido ver.
const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: HomeIcon, activo: (p) => p === '/' },
  { to: '/estudiantes', label: 'Estudiantes', icon: StudentIcon, permiso: 'estudiantes.ver', activo: (p) => p.startsWith('/estudiantes') },
  { to: '/ambientes', label: 'Ambientes', icon: BuildingIcon, permiso: 'ambientes.ver', activo: (p) => p.startsWith('/ambientes') },
  { to: '/examenes', label: 'Exámenes', icon: ExamIcon, permiso: 'examenes.ver', activo: (p) => p.startsWith('/examenes') },
  { to: '/control-ingreso', label: 'Control de ingreso', icon: ClipboardCheckIcon, permiso: 'control_ingreso.ver', activo: (p) => p.startsWith('/control-ingreso') },
  { to: '/usuarios', label: 'Usuarios', icon: UsersIcon, permiso: 'usuarios.ver', activo: (p) => p.startsWith('/usuarios') },
  { to: '/roles-permisos', label: 'Roles y permisos', icon: ShieldIcon, soloAdmin: true, activo: (p) => p.startsWith('/roles-permisos') },
];

export default function Layout() {
  const { usuario, logout, tiene, esAdministrador } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // En pantallas chicas el menu es un panel deslizable: se cierra al navegar o con Escape.
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alTeclear = (e) => e.key === 'Escape' && setMenuAbierto(false);
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [menuAbierto]);

  const navItems = NAV_ITEMS.filter((item) => {
    if (item.soloAdmin) return esAdministrador;
    return !item.permiso || tiene(item.permiso);
  });

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Barra superior (solo en pantallas chicas) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-white/90 backdrop-blur border-b border-kairos-100 px-4 py-3 shadow-md">
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <KairosLogo size={32} />
        <p className="font-semibold text-gray-800 leading-tight">Kairos</p>
      </header>

      {menuAbierto && (
        <div className="lg:hidden fixed inset-0 z-40 bg-kairos-950/40 backdrop-blur-sm" onClick={() => setMenuAbierto(false)} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-white border-r border-kairos-100 shadow-xl lg:shadow-lg flex flex-col overflow-y-auto transform transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                item.activo(pathname)
                  ? 'bg-kairos-gradient text-white shadow-glow'
                  : 'text-gray-600 hover:bg-kairos-50 hover:text-kairos-700'
              }`}
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

      <main className="flex-1 min-w-0 bg-transparent p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
