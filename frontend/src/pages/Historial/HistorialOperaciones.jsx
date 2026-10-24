import { useEffect, useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Encabezado from '../../components/Encabezado';
import Aviso from '../../components/Aviso';
import { HistorialIcon } from '../../components/Iconos';
import { TablaDatos, btnPrincipal, tarjeta } from '../../components/Sprint3';

const MSG_RANGO = 'La fecha Desde no puede ser posterior a la fecha Hasta.';
const VACIO = { usuario_id: '', modulo: '', desde: '', hasta: '' };

// HU-27: Historial de operaciones del sistema (solo el administrador). Solo consulta: los
// registros no se pueden modificar ni eliminar.
export default function HistorialOperaciones() {
  const [opciones, setOpciones] = useState({ usuarios: [], modulos: [] });
  const [filtros, setFiltros] = useState(VACIO);
  const [aplicados, setAplicados] = useState(VACIO);
  const [datos, setDatos] = useState({ data: [], current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [cargando, setCargando] = useState(true);
  const [errorRango, setErrorRango] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/historial/filtros').then((res) => setOpciones(res.data)).catch(() => {});
  }, []);

  async function cargar(pagina = 1, f = aplicados) {
    setCargando(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries({ ...f, page: pagina }).filter(([, v]) => v !== ''));
      const { data } = await api.get('/historial', { params });
      setDatos(data);
    } catch (err) {
      setError(primerError(err, 'No se pudo cargar el historial.'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar(1, VACIO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function filtrar(e) {
    e.preventDefault();
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      setErrorRango(MSG_RANGO);
      return;
    }
    setErrorRango('');
    setAplicados(filtros);
    cargar(1, filtros);
  }

  function limpiar() {
    setFiltros(VACIO);
    setAplicados(VACIO);
    setErrorRango('');
    cargar(1, VACIO);
  }

  const set = (campo) => (e) => {
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    if (campo === 'desde' || campo === 'hasta') setErrorRango('');
  };
  const hayFiltros = Object.values(aplicados).some(Boolean);

  return (
    <div>
      <Encabezado
        icono={<HistorialIcon size={22} />}
        titulo="Historial de operaciones"
        descripcion="Registro de las acciones realizadas en el sistema, con su usuario, fecha y hora."
      />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <form onSubmit={filtrar} noValidate className={`${tarjeta} p-5 mb-5`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-start">
          <div>
            <label htmlFor="f-usuario" className="block text-sm font-medium text-gray-600 mb-1">Usuario</label>
            <select id="f-usuario" className="input" value={filtros.usuario_id} onChange={set('usuario_id')}>
              <option value="">Todos</option>
              {opciones.usuarios.map((u) => (
                <option key={u.id} value={String(u.id)}>{u.nombre_completo}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-modulo" className="block text-sm font-medium text-gray-600 mb-1">Módulo</label>
            <select id="f-modulo" className="input" value={filtros.modulo} onChange={set('modulo')}>
              <option value="">Todos</option>
              {opciones.modulos.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-desde" className="block text-sm font-medium text-gray-600 mb-1">Desde</label>
            <input id="f-desde" type="date" className="input" value={filtros.desde} onChange={set('desde')} />
            {errorRango && <p className="text-xs text-red-600 mt-1">{errorRango}</p>}
          </div>
          <div>
            <label htmlFor="f-hasta" className="block text-sm font-medium text-gray-600 mb-1">Hasta</label>
            <input id="f-hasta" type="date" className="input" value={filtros.hasta} onChange={set('hasta')} />
          </div>
          <div className="flex gap-2 lg:mt-6">
            <button type="submit" className={btnPrincipal}>Filtrar</button>
            {hayFiltros && (
              <button type="button" onClick={limpiar} className="text-sm font-medium text-kairos-700 hover:underline px-2">
                Limpiar
              </button>
            )}
          </div>
        </div>
      </form>

      <section className={`${tarjeta} p-5`}>
        <TablaDatos
          minimo="min-w-[900px]"
          columnas={[
            { titulo: 'Fecha', campo: 'fecha', clase: 'whitespace-nowrap' },
            { titulo: 'Hora', campo: 'hora', clase: 'whitespace-nowrap' },
            { titulo: 'Usuario', campo: 'usuario' },
            { titulo: 'Rol', campo: 'rol', celda: (f) => (f.rol ? f.rol.charAt(0).toUpperCase() + f.rol.slice(1) : '—') },
            { titulo: 'Módulo', campo: 'modulo' },
            { titulo: 'Acción', campo: 'accion' },
            { titulo: 'Detalle', campo: 'detalle', clase: 'text-gray-600' },
          ]}
          filas={cargando ? [] : datos.data}
          vacio={cargando ? 'Cargando...' : 'No hay operaciones registradas con los filtros seleccionados.'}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-sm text-gray-500">
          <span>
            {datos.total ? `Mostrando ${datos.from} – ${datos.to} de ${datos.total} operaciones` : 'Mostrando 0 operaciones'} · Los registros del
            historial no se pueden modificar ni eliminar.
          </span>
          {datos.last_page > 1 && (
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => cargar(datos.current_page - 1)}
                disabled={datos.current_page <= 1 || cargando}
                className="border border-gray-300 rounded-lg px-3 py-1 disabled:opacity-40"
              >
                Anterior
              </button>
              <span>Página {datos.current_page} de {datos.last_page}</span>
              <button
                type="button"
                onClick={() => cargar(datos.current_page + 1)}
                disabled={datos.current_page >= datos.last_page || cargando}
                className="border border-gray-300 rounded-lg px-3 py-1 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
