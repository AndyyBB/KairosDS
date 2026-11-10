import Aviso, { useMensajeFlash } from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import { ExamIcon } from '../../components/Iconos';
import { SelectorExamen } from '../../components/Selectores';

// "Buscar examen" (antes "Lista de exámenes"). Sprint 4 (observacion 21 de la licenciada): las
// listas no deben estar, salvo para buscar y seleccionar algo. Por eso la pantalla abre sin
// registros: se busca el examen (texto o filtros) y, al hacer clic en el resultado, se abre
// "Datos del ...", que solo muestra la informacion.
export default function ExamenesList() {
  const [mensaje, setMensaje] = useMensajeFlash();
  return (
    <div className="max-w-5xl">
      <Encabezado
        icono={<ExamIcon size={22} />}
        titulo="Buscar examen"
        descripcion="Busca el examen por asignatura, fecha, estado o ambiente y haz clic en él para ver sus datos."
      />
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <SelectorExamen modo="datos" seleccionado={null} />
    </div>
  );
}
