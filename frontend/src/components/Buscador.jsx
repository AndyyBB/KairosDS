// Campo de busqueda con icono y boton "Buscar" (Enter tambien busca).
export default function Buscador({ valor, onCambiar, onBuscar, placeholder }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onBuscar();
      }}
      className="flex gap-2 mb-4"
      role="search"
    >
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          placeholder={placeholder}
          className="input pl-9"
          aria-label={placeholder}
        />
      </div>
      <button type="submit" className="border border-gray-300 rounded-lg px-4 text-sm text-gray-700">
        Buscar
      </button>
    </form>
  );
}
