import { useEffect, useState } from 'react';

// Barra de busqueda de las listas y de las tablas de seleccion: campo de texto con el
// boton "Buscar" (Enter tambien busca) y, si la pantalla tiene filtros, el boton
// "Filtros", que despliega el panel de filtros. Los filtros activos se muestran como
// etiquetas que se pueden quitar una por una.

function IconoBuscar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconoFiltro() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />
    </svg>
  );
}

const vacio = (v) => v === '' || v === null || v === undefined;

export function filtrosActivos(valores = {}) {
  return Object.entries(valores).filter(([, v]) => !vacio(v));
}

// Texto que se muestra en la etiqueta de un filtro activo.
function textoFiltro(campo, valor) {
  if (campo.tipo === 'select') {
    return campo.opciones?.find((o) => String(o.value) === String(valor))?.label ?? valor;
  }
  if (campo.tipo === 'fecha') {
    const [y, m, d] = String(valor).split('-');
    return d ? `${d}/${m}/${y}` : valor;
  }
  return valor;
}

function CampoFiltro({ campo, valor, onCambiar, deshabilitado }) {
  const id = `filtro-${campo.id}`;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">{campo.etiqueta}</label>
      {campo.tipo === 'select' ? (
        <select id={id} className="input" value={valor ?? ''} disabled={deshabilitado} onChange={(e) => onCambiar(e.target.value)}>
          <option value="">{campo.todos ?? 'Todos'}</option>
          {(campo.opciones ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className="input"
          type={campo.tipo === 'fecha' ? 'date' : campo.tipo === 'numero' ? 'number' : 'text'}
          min={campo.tipo === 'numero' ? 0 : undefined}
          placeholder={campo.placeholder}
          value={valor ?? ''}
          onChange={(e) => onCambiar(e.target.value)}
        />
      )}
      {deshabilitado && campo.ayuda && <p className="text-xs text-gray-400 mt-1">{campo.ayuda}</p>}
    </div>
  );
}

// Valida los rangos (fecha desde <= fecha hasta, capacidad minima <= maxima).
function errorDeRangos(campos, valores) {
  for (const c of campos) {
    const a = valores[c.id];
    const b = c.noMayorQue ? valores[c.noMayorQue] : '';
    if (vacio(a) || vacio(b)) continue;
    const mayor = c.tipo === 'numero' ? Number(a) > Number(b) : String(a) > String(b);
    if (mayor) return c.mensaje;
  }
  return '';
}

export default function Buscador({ valor, onCambiar, onBuscar, placeholder, campos, filtros = {}, onFiltrar, className = 'mb-4' }) {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState(filtros);
  const [errorFiltros, setErrorFiltros] = useState('');
  const hayFiltros = Boolean(campos?.length && onFiltrar);
  const activos = filtrosActivos(filtros);

  // El panel siempre parte de los filtros aplicados.
  useEffect(() => {
    if (abierto) {
      setBorrador(filtros);
      setErrorFiltros('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Cambia un filtro; si otro depende de el y queda vacio, tambien se limpia.
  function cambiar(id, valor) {
    setErrorFiltros('');
    setBorrador((b) => {
      const nuevo = { ...b, [id]: valor };
      campos.forEach((c) => {
        if (c.dependeDe === id && vacio(valor)) nuevo[c.id] = '';
      });
      return nuevo;
    });
  }

  function aplicar(e) {
    e?.preventDefault();
    const error = errorDeRangos(campos, borrador);
    if (error) {
      setErrorFiltros(error);
      return;
    }
    onFiltrar(borrador);
    setAbierto(false);
  }

  function limpiar() {
    const limpio = Object.fromEntries(campos.map((c) => [c.id, '']));
    setBorrador(limpio);
    onFiltrar(limpio);
    setAbierto(false);
  }

  function quitar(id) {
    const nuevo = { ...filtros, [id]: '' };
    campos.forEach((c) => {
      if (c.dependeDe === id) nuevo[c.id] = '';
    });
    onFiltrar(nuevo);
  }

  return (
    <div className={className}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onBuscar();
        }}
        className="flex flex-wrap sm:flex-nowrap gap-2"
        role="search"
      >
        <div className="relative flex-1 min-w-[180px]">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <IconoBuscar />
          </span>
          <input
            value={valor}
            onChange={(e) => onCambiar(e.target.value)}
            placeholder={placeholder}
            className="input pl-9"
            aria-label={placeholder}
          />
        </div>
        <button type="submit" className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Buscar
        </button>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border ${
              abierto || activos.length
                ? 'border-kairos-600 bg-kairos-50 text-kairos-800'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <IconoFiltro />
            Filtros
            {activos.length > 0 && (
              <span className="rounded-full bg-kairos-gradient text-white text-xs px-2 py-0.5">{activos.length}</span>
            )}
          </button>
        )}
      </form>

      {hayFiltros && abierto && (
        <form onSubmit={aplicar} className="mt-2 rounded-xl border border-kairos-100/70 bg-white p-4 shadow-md">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {campos.map((c) => (
              <CampoFiltro
                key={c.id}
                campo={c}
                valor={borrador[c.id]}
                deshabilitado={Boolean(c.dependeDe) && vacio(borrador[c.dependeDe])}
                onCambiar={(v) => cambiar(c.id, v)}
              />
            ))}
          </div>
          {errorFiltros && <p className="text-sm text-red-600 mt-3">{errorFiltros}</p>}
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={limpiar} className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium">
              Limpiar filtros
            </button>
            <button type="submit" className="bg-kairos-gradient text-white rounded-lg px-5 py-2 text-sm font-medium shadow-glow">
              Aplicar
            </button>
          </div>
        </form>
      )}

      {hayFiltros && !abierto && activos.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {activos.map(([id, v]) => {
            const campo = campos.find((c) => c.id === id);
            if (!campo) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-full border border-kairos-100 bg-kairos-50 px-3 py-1 text-xs text-kairos-800">
                {campo.etiqueta}: {textoFiltro(campo, v)}
                <button type="button" onClick={() => quitar(id)} aria-label={`Quitar filtro ${campo.etiqueta}`} className="ml-1 text-kairos-600 hover:text-kairos-900">
                  ✕
                </button>
              </span>
            );
          })}
          <button type="button" onClick={limpiar} className="text-xs font-medium text-kairos-700 hover:underline">
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
