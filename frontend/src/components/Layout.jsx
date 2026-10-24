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

// Boton para ocultar / mostrar el menu lateral (en computadora queda solo la columna de
// iconos). La preferencia se recuerda en el navegador.
const CLAVE_MENU = 'kairos_menu_oculto';
function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE_MENU) === '1';
  } catch {
    return false;
  }
}

function IconoPanel({ oculto }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      {oculto ? <path d="m13 10 2 2-2 2" /> : <path d="m16 10-2 2 2 2" />}
    </svg>
  );
}

export default function Layout() {
  const { usuario, logout, tiene, esAdministrador } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const modulos = modulosPermitidos(tiene, esAdministrador);
  const moduloActual = modulos.find((m) => m.base && enModulo(pathname, m.base));
  // Solo un modulo desplegado a la vez: el de la pantalla actual (en Inicio, ninguno).
  const [abierto, setAbierto] = useState(moduloActual?.base ?? null);
  const [oculto, setOculto] = useState(leerPreferencia);
  // En celular el menu siempre se muestra completo (panel deslizable).
  const compacto = oculto && !menuAbierto;

  function alternarMenu() {
    setOculto((v) => {
      try {
        localStorage.setItem(CLAVE_MENU, v ? '0' : '1');
      } catch {
        // sin almacenamiento: solo se cambia en esta sesion
      }
      return !v;
    });
  }

  // En pantallas chicas el menu es un panel deslizable: se cierra al navegar o con Escape.
  // Al navegar, queda desplegado solo el modulo de la pantalla actual.
  useEffect(() => {
    setMenuAbierto(false);
    setAbierto(moduloActual?.base ?? null);
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
  // Con el menu oculto, el clic en el icono de un modulo vuelve a mostrar el menu.
  function clicModulo(modulo) {
    if (compacto) {
      alternarMenu();
    }
    if (!moduloActual || moduloActual.base !== modulo.base) {
      setAbierto(modulo.base);
      navigate(modulo.items[0].to);
      return;
    }
    setAbierto((a) => (a === modulo.base && !compacto ? null : modulo.base));
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
    `flex items-center gap-3 w-full rounded-lg text-sm font-medium transition ${compacto ? 'justify-center px-0 py-2.5' : 'px-3 py-2'} ${
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
        className={`fixed inset-y-0 left-0 z-50 ${compacto ? 'w-64 lg:w-20' : 'w-64'} max-w-[85vw] transition-[width,transform] bg-white border-r border-kairos-100 shadow-xl lg:shadow-lg flex flex-col overflow-y-auto overflow-x-hidden transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`flex border-b border-gray-100 ${compacto ? 'flex-col items-center gap-3 px-2 py-4' : 'items-center gap-3 px-5 py-5'}`}>
          <KairosLogo size={40} />
          {!compacto && (
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-800 leading-tight">Kairos</p>
              <p className="text-xs text-gray-400 leading-tight">Digital Systems</p>
            </div>
          )}
          <button
            type="button"
            onClick={alternarMenu}
            title={oculto ? 'Mostrar menú' : 'Ocultar menú'}
            aria-label={oculto ? 'Mostrar menú' : 'Ocultar menú'}
            className="hidden lg:inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-kairos-50 hover:text-kairos-700"
          >
            <IconoPanel oculto={oculto} />
          </button>
        </div>

        <nav className={`flex-1 py-4 space-y-1 ${compacto ? 'px-2' : 'px-3'}`} aria-label="Menú principal">
          {modulos.map((m) => {
            if (!m.items) {
              const activo = m.exacto ? pathname === m.to : enModulo(pathname, m.to);
              return (
                <NavLink key={m.to} to={m.to} className={claseItem(activo)} title={compacto ? m.label : undefined}>
                  <m.icon size={18} />
                  {!compacto && m.label}
                </NavLink>
              );
            }

            const activo = moduloActual?.base === m.base;
            const desplegado = abierto === m.base && !compacto;
            return (
              <div key={m.base}>
                <button
                  type="button"
                  onClick={() => clicModulo(m)}
                  aria-expanded={desplegado}
                  title={compacto ? m.label : undefined}
                  className={`flex items-center gap-3 w-full rounded-lg text-sm font-medium transition ${compacto ? 'justify-center px-0 py-2.5' : 'px-3 py-2'} ${
                    activo ? 'bg-kairos-50 text-kairos-800' : 'text-gray-600 hover:bg-kairos-50 hover:text-kairos-700'
                  }`}
                >
                  <m.icon size={18} />
                  {!compacto && m.label}
                  {!compacto && <Chevron abierto={desplegado} />}
                </button>

                {/* Submenu con animacion de altura */}
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    desplegado ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
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
                              tabIndex={desplegado ? 0 : -1}
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

        <div className={`border-t border-gray-100 ${compacto ? 'px-2 py-4' : 'px-4 py-4'}`}>
          {!compacto && (
            <>
              <p className="text-sm text-gray-700 truncate">{usuario?.nombre_completo}</p>
              <p className="text-xs text-gray-400 truncate">{usuario?.rol?.nombre}</p>
            </>
          )}
          <button
            onClick={handleLogout}
            title={compacto ? 'Cerrar sesión' : undefined}
            aria-label="Cerrar sesión"
            className={`${compacto ? '' : 'mt-3'} w-full flex items-center justify-center gap-2 text-sm border border-gray-300 text-gray-700 rounded-lg py-1.5 hover:bg-gray-50`}
          >
            <LogoutIcon />
            {!compacto && 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-transparent p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
