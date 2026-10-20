// Botones al pie de los formularios.
// - Registro: Cancelar y Guardar.
// - Datos de un registro (solo lectura): Eliminar a la izquierda, separado; "Volver a
//   la lista" y Editar a la derecha.
// - Datos en edicion (despues de presionar Editar): Cancelar y Guardar.
// Cada boton lleva su propia "key" para que el boton Editar no se convierta en el
// boton Guardar (submit) en el mismo clic.
export default function BotonesFormulario({
  esDetalle = false,
  modoEdicion = false,
  puedeEditar = true,
  puedeEliminar = false,
  guardando = false,
  eliminando = false,
  onCancelar,
  onSalir,
  onEditar,
  onEliminar,
}) {
  const claseSecundario = 'border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium';
  const clasePrincipal =
    'bg-kairos-gradient text-white rounded-lg px-5 py-2 text-sm font-medium shadow-glow disabled:opacity-60';

  if (esDetalle && !modoEdicion) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {puedeEliminar ? (
          <button
            key="eliminar"
            type="button"
            onClick={onEliminar}
            disabled={eliminando}
            className="border border-red-500 text-red-600 hover:bg-red-50 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {eliminando ? 'Eliminando...' : 'Eliminar'}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-3 ml-auto">
          <button key="salir" type="button" onClick={onSalir} className={claseSecundario}>
            Volver a la lista
          </button>
          {puedeEditar && (
            <button key="editar" type="button" onClick={onEditar} className={clasePrincipal}>
              Editar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-3 pt-2">
      <button key="cancelar" type="button" onClick={onCancelar} className={claseSecundario}>
        Cancelar
      </button>
      <button key="guardar" type="submit" disabled={guardando} className={clasePrincipal}>
        {guardando ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  );
}
