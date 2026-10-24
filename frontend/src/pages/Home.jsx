import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
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

// Resumen de cada modulo: un dato principal (las opciones de cada modulo ya estan en el
// menu lateral, por eso aqui no se repiten).
const RESUMENES = {
  '/estudiantes': {
    texto: 'estudiantes registrados',
    cargar: async () => (await api.get('/estudiantes', { params: { per_page: 1, solo_activos: 0 } })).data.total ?? 0,
  },
  '/ambientes': {
    texto: 'ambientes registrados',
    cargar: async () => (await api.get('/ambientes', { params: { solo_activos: 0 } })).data.length,
  },
  '/examenes': {
    texto: 'exámenes programados',
    cargar: async () => (await api.get('/examenes', { params: { per_page: 1, estado: 'programado' } })).data.total ?? 0,
  },
  '/control-ingreso': {
    texto: 'exámenes hoy',
    cargar: async () => (await api.get('/control-ingreso/examenes')).data.length,
  },
  '/usuarios': {
    texto: 'usuarios del sistema',
    cargar: async () => (await api.get('/usuarios')).data.length,
  },
};

function Resumen({ base }) {
  const resumen = RESUMENES[base];
  const [valor, setValor] = useState(null);

  useEffect(() => {
    if (!resumen) return;
    let vigente = true;
    resumen
      .cargar()
      .then((v) => vigente && setValor(v))
      .catch(() => vigente && setValor('—'));
    return () => {
      vigente = false;
    };
  }, [resumen]);

  if (!resumen) return null;
  return (
    <p className="mt-4 flex items-baseline gap-2">
      <span className="text-3xl font-semibold text-kairos-800">{valor ?? '…'}</span>
      <span className="text-sm text-gray-500">{resumen.texto}</span>
    </p>
  );
}

// Pantalla principal: un acceso por modulo permitido, con su dato principal.
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
          const destino = m.items ? m.items[0].to : m.to;
          return (
            <Link
              key={m.base ?? m.to}
              to={destino}
              className="group flex flex-col rounded-xl border border-kairos-100/70 bg-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-kairos-400"
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

              <Resumen base={m.base} />

              <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-medium text-kairos-700 group-hover:text-kairos-900">
                Ir a {m.label.toLowerCase()} <Flecha />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
