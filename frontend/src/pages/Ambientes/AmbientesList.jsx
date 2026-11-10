import Aviso, { useMensajeFlash } from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import { BuildingIcon } from '../../components/Iconos';
import { SelectorAmbiente } from '../../components/Selectores';

// "Buscar ambiente" (antes "Lista de ambientes"). Sprint 4 (observacion 21 de la licenciada): las
// listas no deben estar, salvo para buscar y seleccionar algo. Por eso la pantalla abre sin
// registros: se busca el ambiente (texto o filtros) y, al hacer clic en el resultado, se abre
// "Datos del ...", que solo muestra la informacion.
export default function AmbientesList() {
  const [mensaje, setMensaje] = useMensajeFlash();
  return (
    <div className="max-w-5xl">
      <Encabezado
        icono={<BuildingIcon size={22} />}
        titulo="Buscar ambiente"
        descripcion="Busca el ambiente por nombre o ubicación y haz clic en él para ver sus datos."
      />
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <SelectorAmbiente modo="datos" seleccionado={null} />
    </div>
  );
}
