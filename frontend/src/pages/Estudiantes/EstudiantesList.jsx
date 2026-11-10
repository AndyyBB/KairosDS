import Aviso, { useMensajeFlash } from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import { StudentIcon } from '../../components/Iconos';
import { SelectorEstudiante } from '../../components/Selectores';

// "Buscar estudiante" (antes "Lista de estudiantes"). Sprint 4 (observacion 21 de la licenciada): las
// listas no deben estar, salvo para buscar y seleccionar algo. Por eso la pantalla abre sin
// registros: se busca el estudiante (texto o filtros) y, al hacer clic en el resultado, se abre
// "Datos del ...", que solo muestra la informacion.
export default function EstudiantesList() {
  const [mensaje, setMensaje] = useMensajeFlash();
  return (
    <div className="max-w-5xl">
      <Encabezado
        icono={<StudentIcon size={22} />}
        titulo="Buscar estudiante"
        descripcion="Busca al estudiante por código, documento o nombre y haz clic en él para ver sus datos."
      />
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <SelectorEstudiante modo="datos" seleccionado={null} />
    </div>
  );
}
