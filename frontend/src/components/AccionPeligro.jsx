// Tarjeta al pie de una pantalla de edicion con una accion que no se puede deshacer
// facilmente (desactivar un estudiante, cancelar un examen...).
export default function AccionPeligro({ titulo, descripcion, boton, onConfirmar, deshabilitado = false, trabajando = false }) {
  return (
    <div className="mt-6 rounded-xl border border-red-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium text-gray-800">{titulo}</p>
        <p className="text-sm text-gray-500 mt-0.5">{descripcion}</p>
      </div>
      <button
        type="button"
        onClick={onConfirmar}
        disabled={deshabilitado || trabajando}
        className="shrink-0 border border-red-500 text-red-600 hover:bg-red-50 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {trabajando ? 'Procesando...' : boton}
      </button>
    </div>
  );
}

// Estilo comun del nombre clicable en las listas (abre la pantalla de edicion).
export const claseEnlaceNombre =
  'font-medium text-kairos-700 hover:text-kairos-900 hover:underline underline-offset-2';
