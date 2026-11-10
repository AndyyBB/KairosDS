import Aviso, { useMensajeFlash } from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import { UsersIcon } from '../../components/Iconos';
import { SelectorUsuario } from '../../components/Selectores';

// "Buscar usuario" (antes "Lista de usuarios"). Sprint 4 (observacion 21 de la licenciada): las
// listas no deben estar, salvo para buscar y seleccionar algo. Por eso la pantalla abre sin
// registros: se busca el usuario (texto o filtros) y, al hacer clic en el resultado, se abre
// "Datos del ...", que solo muestra la informacion.
export default function UsuariosList() {
  const [mensaje, setMensaje] = useMensajeFlash();
  return (
    <div className="max-w-5xl">
      <Encabezado
        icono={<UsersIcon size={22} />}
        titulo="Buscar usuario"
        descripcion="Busca al usuario por nombre o correo electrónico y haz clic en él para ver sus datos."
      />
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <SelectorUsuario modo="datos" seleccionado={null} />
    </div>
  );
}
