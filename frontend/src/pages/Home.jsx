import { Link } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import { HomeIcon } from '../components/Iconos';
import Encabezado from '../components/Encabezado';
import { modulosPermitidos } from '../components/navegacion';

function Flecha() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// Pantalla principal: accesos directos a las pantallas que el rol tiene permitidas.
export default function Home() {
  const { usuario, tiene, esAdministrador } = useAuth();
  const modulos = modulosPermitidos(tiene, esAdministrador).filter((m) => m.to !== '/');

  return (
    <div>
      <Encabezado
        icono={<HomeIcon size={22} />}
        titulo={`Hola, ${usuario?.nombre_completo?.split(' ')[0] ?? ''}`}
        descripcion="Sistema de Control de Ingreso a Exámenes Masivos · Kairos Digital Systems"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {modulos.map((m) => {
          const pantallas = m.items ?? [{ to: m.to, label: m.label }];
          return (
            <section
              key={m.base ?? m.to}
              className="group rounded-xl border border-kairos-100/70 bg-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-kairos-50 text-kairos-700 transition group-hover:bg-kairos-gradient group-hover:text-white">
                  <m.icon size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-800">{m.label}</h2>
                  {m.descripcion && <p className="text-xs text-gray-500">{m.descripcion}</p>}
                </div>
              </div>

              <ul className="mt-4 space-y-1">
                {pantallas.map((p) => (
                  <li key={p.to}>
                    <Link
                      to={p.to}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-kairos-50 hover:text-kairos-700"
                    >
                      {p.label}
                      <Flecha />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
