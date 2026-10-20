import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import KairosLogo from './KairosLogo';
import { LogoutIcon } from './Iconos';
import { modulosPermitidos, rutaDeItem } from './navegacion';

function Chevron({ abierto }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={`ml-auto shrink-0 transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`}
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

const enModulo = (pathname, base) => pathname === base || pathname.startsWith(`${base}/`);

export default function Layout() {
  const { usuario, logout, tiene, esAdministrador } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const modulos = modulosPermitidos(tiene, esAdministrador);
  const moduloActual = modulos.find((m) => m.base && enModulo(pathname, m.base));
  const [abiertos, setAbiertos] = useState(() => new Set(moduloActual ? [moduloActual.base] : []));

  // En pantallas chicas el menu es un panel deslizable: se cierra al navegar o con Escape.
  // Al navegar, el modulo de la pantalla actual queda desplegado.
  useEffect(() => {
    setMenuAbierto(false);
    if (moduloActual) {
      setAbiertos((prev) => (prev.has(moduloActual.base) ? prev : new Set(prev).add(moduloActual.base)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alTeclear = (e) => e.key === 'Escape' && setMenuAbierto(false);
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [menuAbierto]);

  // Clic en un modulo: si no se esta en el, el sistema redirige a su primera pantalla
  // (Lista de ...); si ya se esta en el, solo se pliega o despliega el submenu.
  function clicModulo(modulo) {
    if (!moduloActual || moduloActual.base !== modulo.base) {
      setAbiertos((prev) => new Set(prev).add(modulo.base));
      navigate(modulo.items[0].to);
      return;
    }
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(modulo.base)) next.delete(modulo.base);
      else next.add(modulo.base);
      return next;
    });
  }

  const pantallaActual =
    moduloActual?.items.find((i) => rutaDeItem(pathname, i))?.label ??
    modulos.find((m) => m.to && (m.exacto ? pathname === m.to : enModulo(pathname, m.to)))?.label ??
    'Kairos';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const claseItem = (activo) =>
    `flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition ${
      activo ? 'bg-kairos-gradient text-white shadow-glow' : 'text-gray-600 hover:bg-kairos-50 hover:text-kairos-700'
    }`;

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
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 leading-tight">Kairos</p>
          <p className="text-xs text-gray-400 leading-tight truncate">{pantallaActual}</p>
        </div>
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

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Menú principal">
          {modulos.map((m) => {
            if (!m.items) {
              const activo = m.exacto ? pathname === m.to : enModulo(pathname, m.to);
              return (
                <NavLink key={m.to} to={m.to} className={claseItem(activo)}>
                  <m.icon size={18} />
                  {m.label}
                </NavLink>
              );
            }

            const activo = moduloActual?.base === m.base;
            const abierto = abiertos.has(m.base);
            return (
              <div key={m.base}>
                <button
                  type="button"
                  onClick={() => clicModulo(m)}
                  aria-expanded={abierto}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activo ? 'bg-kairos-50 text-kairos-800' : 'text-gray-600 hover:bg-kairos-50 hover:text-kairos-700'
                  }`}
                >
                  <m.icon size={18} />
                  {m.label}
                  <Chevron abierto={abierto} />
                </button>

                {/* Submenu con animacion de altura */}
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <ul className="ml-[1.35rem] mt-1 mb-1 border-l border-kairos-100 pl-3 space-y-0.5">
                      {m.items.map((item) => {
                        const itemActivo = rutaDeItem(pathname, item);
                        return (
                          <li key={item.to}>
                            <NavLink
                              to={item.to}
                              tabIndex={abierto ? 0 : -1}
                              className={`relative block rounded-md px-3 py-1.5 text-sm transition ${
                                itemActivo
                                  ? 'bg-kairos-gradient text-white font-medium shadow-glow'
                                  : 'text-gray-500 hover:bg-kairos-50 hover:text-kairos-700'
                              }`}
                            >
                              {item.label}
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
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
