import { IconoTitulo } from './Iconos';

// Titulo de cada pantalla: icono con degradado Kairos, nombre de la pantalla y una
// breve descripcion. "children" se muestra a la derecha (acciones propias de la pantalla).
export default function Encabezado({ icono, titulo, descripcion, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <IconoTitulo>{icono}</IconoTitulo>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-800 leading-tight">{titulo}</h1>
          {descripcion && <p className="text-sm text-gray-500 mt-0.5">{descripcion}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
