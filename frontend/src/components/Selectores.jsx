import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { primerError } from '../api/errores';
import { fechaDMA, horaHM } from '../api/formato';
import Buscador from './Buscador';
import Paginacion from './Paginacion';
import {
  useCamposAmbientes,
  useCamposExamenes,
  useCamposEstudiantes,
  useCamposUsuarios,
  filtrarAmbientes,
  filtrarUsuarios,
  parametros,
} from './catalogos';

// Seleccion del registro en las pantallas "Editar ..." y "Eliminar ...".
// La pantalla abre con la tabla de registros (busqueda, filtros y paginas). Al hacer clic
// en una fila se selecciona el registro, la tabla se oculta y aparece su formulario: con los campos habilitados
// para editar, o en solo lectura con el boton "Eliminar". La tabla no tiene botones de
// editar ni eliminar: solo sirve para elegir el registro de esta pantalla.

const tarjeta = 'bg-white rounded-xl border border-kairos-100/70 shadow-md p-5 mb-5';
const POR_PAGINA = 10;

// Tabla de seleccion con busqueda, filtros y paginas.
export function TablaSeleccion({
  etiqueta,
  titulo,
  placeholder,
  campos,
  columnas,
  cargar,
  seleccionado,
  onElegir,
  onCambiar,
  vacio = 'No se encontraron registros.',
}) {
  const [buscar, setBuscar] = useState('');
  const [filtros, setFiltros] = useState({});
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState({ items: [], ultima: 1, total: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const ultima = useRef(0);

  async function consultar(p = 1, f = filtros, b = buscar) {
    const n = ++ultima.current;
    setCargando(true);
    setError('');
    try {
      const res = await cargar({ buscar: b.trim(), filtros: f, pagina: p });
      if (n !== ultima.current) return;
      setDatos(res);
      setPagina(p);
    } catch (err) {
      if (n === ultima.current) setError(primerError(err, 'No se pudieron cargar los registros.'));
    } finally {
      if (n === ultima.current) setCargando(false);
    }
  }

  useEffect(() => {
    if (!seleccionado) consultar(pagina);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(seleccionado)]);

  // Con un registro elegido la tabla se oculta: debajo se muestran sus datos y el boton
  // "Cancelar" vuelve a esta tabla.
  if (seleccionado) return null;

  return (
    <div className={tarjeta}>
      <h2 className="text-base font-semibold text-gray-800">{titulo}</h2>
      <p className="text-xs text-gray-500 mb-3">Haz clic en una fila para seleccionarla.</p>

      <Buscador
        valor={buscar}
        onCambiar={setBuscar}
        onBuscar={() => consultar(1)}
        placeholder={placeholder}
        campos={campos}
        filtros={filtros}
        onFiltrar={(f) => {
          setFiltros(f);
          consultar(1, f);
        }}
      />

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-kairos-50/80 text-kairos-800 text-left">
            <tr>
              {columnas.map((c) => (
                <th key={c.titulo} className="px-3 py-2">{c.titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={columnas.length} className="px-3 py-6 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && datos.items.length === 0 && (
              <tr><td colSpan={columnas.length} className="px-3 py-6 text-center text-gray-400">{vacio}</td></tr>
            )}
            {!cargando &&
              datos.items.map((item) => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  title="Haz clic para seleccionar"
                  onClick={() => onElegir(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onElegir(item);
                    }
                  }}
                  className="border-t border-gray-100 cursor-pointer hover:bg-kairos-50/60 focus:bg-kairos-50/60 focus:outline-none"
                >
                  {columnas.map((c) => (
                    <td key={c.titulo} className={`px-3 py-2 ${c.clase ?? ''}`}>{c.celda(item)}</td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} ultima={datos.ultima} total={datos.total} onCambiar={(p) => consultar(p)} />
    </div>
  );
}

// Paginas armadas en el navegador (ambientes, usuarios, ingresos: se cargan completos).
export function paginarLocal(lista, pagina) {
  return {
    items: lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    ultima: Math.max(1, Math.ceil(lista.length / POR_PAGINA)),
    total: lista.length,
  };
}

// Lista desplegable (seleccion del examen en Editar / Eliminar ingreso).
export function SelectorLista({ etiqueta, placeholder, opciones, valor, onElegir, cargando, vacio, ayuda }) {
  return (
    <div className={tarjeta}>
      <label htmlFor="elegir-registro" className="block text-sm font-medium text-gray-700 mb-1">
        {etiqueta}
      </label>
      <select
        id="elegir-registro"
        className="input"
        value={valor ?? ''}
        onChange={(e) => onElegir(e.target.value)}
        disabled={cargando}
      >
        <option value="">{cargando ? 'Cargando...' : placeholder}</option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {!cargando && opciones.length === 0 && vacio && <p className="text-sm text-gray-500 mt-2">{vacio}</p>}
      {ayuda && !valor && <p className="text-xs text-gray-400 mt-2">{ayuda}</p>}
    </div>
  );
}

const VERBO = { editar: 'editar', eliminar: 'eliminar' };

// ---------------- Tablas de seleccion de cada modulo ----------------

export function SelectorEstudiante({ modo, seleccionado }) {
  const navigate = useNavigate();
  const campos = useCamposEstudiantes();
  return (
    <TablaSeleccion
      etiqueta="Estudiante"
      titulo={`Selecciona el estudiante que quieres ${VERBO[modo]}`}
      placeholder="Buscar por código, documento o nombre..."
      campos={campos}
      columnas={[
        { titulo: 'Código', celda: (e) => e.codigo_universitario },
        { titulo: 'Documento', celda: (e) => e.documento_identidad },
        { titulo: 'Nombre', celda: (e) => <span className="font-medium text-gray-800">{e.nombre_completo}</span> },
        { titulo: 'Carreras', celda: (e) => (e.carreras?.length ? e.carreras.map((c) => c.nombre) : [e.carrera?.nombre]).join(', ') },
      ]}
      cargar={async ({ buscar, filtros, pagina }) => {
        const res = await api.get('/estudiantes', {
          params: parametros({ buscar, page: pagina, per_page: POR_PAGINA, solo_activos: 0, ...filtros }),
        });
        return { items: res.data.data ?? [], ultima: res.data.last_page ?? 1, total: res.data.total ?? 0 };
      }}
      seleccionado={seleccionado}
      onElegir={(e) => navigate(`/estudiantes/${modo}/${e.id}`)}
      onCambiar={() => navigate(`/estudiantes/${modo}`)}
      vacio="No se encontraron estudiantes."
    />
  );
}

export function SelectorUsuario({ modo, seleccionado }) {
  const navigate = useNavigate();
  const campos = useCamposUsuarios();
  const usuarios = useRef(null);
  return (
    <TablaSeleccion
      etiqueta="Usuario"
      titulo={`Selecciona el usuario que quieres ${VERBO[modo]}`}
      placeholder="Buscar por nombre o correo electrónico..."
      campos={campos}
      columnas={[
        { titulo: 'Nombre', celda: (u) => <span className="font-medium text-gray-800">{u.nombre_completo}</span> },
        { titulo: 'Correo electrónico', celda: (u) => u.correo_electronico },
        { titulo: 'Rol', celda: (u) => <span className="capitalize">{u.rol?.nombre}</span> },
        { titulo: 'Estado', celda: (u) => (u.activo ? 'Activo' : 'Inactivo') },
      ]}
      cargar={async ({ buscar, filtros, pagina }) => {
        if (!usuarios.current) usuarios.current = (await api.get('/usuarios')).data;
        return paginarLocal(filtrarUsuarios(usuarios.current, buscar, filtros), pagina);
      }}
      seleccionado={seleccionado}
      onElegir={(u) => navigate(`/usuarios/${modo}/${u.id}`)}
      onCambiar={() => navigate(`/usuarios/${modo}`)}
      vacio="No se encontraron usuarios."
    />
  );
}

export function SelectorAmbiente({ modo, seleccionado }) {
  const navigate = useNavigate();
  const campos = useCamposAmbientes();
  const ambientes = useRef(null);
  return (
    <TablaSeleccion
      etiqueta="Ambiente"
      titulo={`Selecciona el ambiente que quieres ${VERBO[modo]}`}
      placeholder="Buscar por nombre o ubicación..."
      campos={campos}
      columnas={[
        { titulo: 'Nombre', celda: (a) => <span className="font-medium text-gray-800">{a.nombre}</span> },
        { titulo: 'Capacidad', celda: (a) => a.capacidad_maxima },
        { titulo: 'Ubicación', celda: (a) => a.ubicacion, clase: 'text-gray-500' },
      ]}
      cargar={async ({ buscar, filtros, pagina }) => {
        if (!ambientes.current) ambientes.current = (await api.get('/ambientes', { params: { solo_activos: 0 } })).data;
        return paginarLocal(filtrarAmbientes(ambientes.current, buscar, filtros), pagina);
      }}
      seleccionado={seleccionado}
      onElegir={(a) => navigate(`/ambientes/${modo}/${a.id}`)}
      onCambiar={() => navigate(`/ambientes/${modo}`)}
      vacio="No se encontraron ambientes."
    />
  );
}

export function ambientesDeExamen(ex) {
  return (ex.ambientes?.length ? ex.ambientes : [ex.ambiente]).filter(Boolean).map((a) => a.nombre).join(', ');
}

const ESTILO_ESTADO = {
  programado: 'bg-kairos-50 text-kairos-800',
  'en curso': 'bg-amber-50 text-amber-700',
  finalizado: 'bg-gray-100 text-gray-600',
  cancelado: 'bg-red-50 text-red-600',
};

export function SelectorExamen({ modo, seleccionado }) {
  const navigate = useNavigate();
  const campos = useCamposExamenes({ modo });
  return (
    <TablaSeleccion
      etiqueta="Examen"
      titulo={
        modo === 'editar'
          ? 'Selecciona el examen que quieres editar (solo los que todavía no finalizaron)'
          : 'Selecciona el examen que quieres eliminar'
      }
      placeholder="Buscar por asignatura..."
      campos={campos}
      columnas={[
        { titulo: 'Asignatura', celda: (ex) => <span className="font-medium text-gray-800">{ex.materia?.nombre}</span> },
        { titulo: 'Fecha', celda: (ex) => fechaDMA(ex.fecha), clase: 'whitespace-nowrap' },
        { titulo: 'Hora', celda: (ex) => horaHM(ex.hora_inicio) },
        { titulo: 'Ambientes', celda: (ex) => ambientesDeExamen(ex) },
        {
          titulo: 'Estado',
          celda: (ex) => {
            const estado = ex.estado_actual || ex.estado;
            return <span className={`text-xs px-2 py-1 rounded-full ${ESTILO_ESTADO[estado] ?? ''}`}>{estado}</span>;
          },
        },
      ]}
      cargar={async ({ buscar, filtros, pagina }) => {
        const res = await api.get('/examenes', {
          params: parametros({
            buscar,
            page: pagina,
            per_page: POR_PAGINA,
            incluir_cancelados: modo === 'editar' ? 0 : 1,
            solo_editables: modo === 'editar' ? 1 : '',
            ...filtros,
          }),
        });
        return { items: res.data.data ?? [], ultima: res.data.last_page ?? 1, total: res.data.total ?? 0 };
      }}
      seleccionado={seleccionado}
      onElegir={(ex) => navigate(`/examenes/${modo}/${ex.id}`)}
      onCambiar={() => navigate(`/examenes/${modo}`)}
      vacio={modo === 'editar' ? 'No hay exámenes que se puedan editar.' : 'No se encontraron exámenes.'}
    />
  );
}
