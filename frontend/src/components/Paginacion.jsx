// Controles de paginacion para las listas (Anterior / Siguiente).
export default function Paginacion({ pagina, ultima, total, onCambiar }) {
  if (!ultima || ultima <= 1) {
    return total ? <p className="text-xs text-gray-400 mt-3">{total} en total</p> : null;
  }
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>
        Página {pagina} de {ultima} · {total} en total
      </span>
      <div className="space-x-2">
        <button
          type="button"
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina <= 1}
          className="border border-gray-300 rounded-lg px-3 py-1 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina >= ultima}
          className="border border-gray-300 rounded-lg px-3 py-1 disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
