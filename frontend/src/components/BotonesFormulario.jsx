// Botones al pie de los formularios. Cada accion tiene su propia pantalla, por eso los
// botones dependen del "modo" de la pantalla:
// - registrar: Cancelar y Guardar.
// - editar: Cancelar y Guardar (Guardar se oculta si el registro ya no se puede editar).
// - eliminar: Cancelar y Eliminar (con confirmacion).
// - datos (se abre desde la lista, solo para ver): Volver a la lista.
// Cada boton lleva su propia "key" para que un boton no se convierta en otro (submit)
// en el mismo clic.
const claseSecundario = 'border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium';
const clasePrincipal =
  'bg-kairos-gradient text-white rounded-lg px-5 py-2 text-sm font-medium shadow-glow disabled:opacity-60';
const claseEliminar =
  'bg-red-600 hover:bg-red-700 text-white rounded-lg px-5 py-2 text-sm font-medium shadow-sm disabled:opacity-60';

export default function BotonesFormulario({
  modo = 'registrar',
  puedeGuardar = true,
  puedeEliminar = true,
  guardando = false,
  eliminando = false,
  textoEliminar = 'Eliminar',
  onCancelar,
  onSalir,
  onEliminar,
}) {
  if (modo === 'datos') {
    return (
      <div className="flex justify-end pt-2">
        <button key="salir" type="button" onClick={onSalir} className={claseSecundario}>
          Volver a la lista
        </button>
      </div>
    );
  }

  if (modo === 'eliminar') {
    return (
      <div className="flex justify-end gap-3 pt-2">
        <button key="cancelar" type="button" onClick={onCancelar} className={claseSecundario}>
          Cancelar
        </button>
        {puedeEliminar && (
          <button key="eliminar" type="button" onClick={onEliminar} disabled={eliminando} className={claseEliminar}>
            {eliminando ? 'Eliminando...' : textoEliminar}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-3 pt-2">
      <button key="cancelar" type="button" onClick={onCancelar} className={claseSecundario}>
        Cancelar
      </button>
      {puedeGuardar && (
        <button key="guardar" type="submit" disabled={guardando} className={clasePrincipal}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      )}
    </div>
  );
}
