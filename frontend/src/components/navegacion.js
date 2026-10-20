import {
  HomeIcon,
  StudentIcon,
  BuildingIcon,
  ExamIcon,
  ClipboardCheckIcon,
  ShieldIcon,
  UsersIcon,
} from './Iconos';

// Menu del sistema: cada modulo tiene su "Lista de ..." (primera opcion) y su pantalla
// "Registrar ..." independiente. Al hacer clic en el nombre de un registro de la lista se
// abre "Datos de ...", con los botones Editar y Eliminar. Al entrar al modulo, el sistema redirige a
// su primera pantalla permitida.
// HU-17 (10): solo se muestran las pantallas que el rol tiene permitidas.
export const MODULOS = [
  { to: '/', label: 'Inicio', icon: HomeIcon, exacto: true },
  {
    base: '/estudiantes',
    label: 'Estudiantes',
    icon: StudentIcon,
    descripcion: 'Datos personales y académicos de los estudiantes.',
    items: [
      // "tambien": la pantalla "Datos de ..." se abre desde la lista (clic en el nombre).
      { to: '/estudiantes/lista', label: 'Lista de estudiantes', permiso: 'estudiantes.ver', tambien: ['/estudiantes/datos'] },
      { to: '/estudiantes/registrar', label: 'Registrar estudiante', permiso: 'estudiantes.registrar', hu: 'HU-01' },
    ],
  },
  {
    base: '/ambientes',
    label: 'Ambientes',
    icon: BuildingIcon,
    descripcion: 'Aulas y laboratorios disponibles para los exámenes.',
    items: [
      { to: '/ambientes/lista', label: 'Lista de ambientes', permiso: 'ambientes.ver', tambien: ['/ambientes/datos'] },
      { to: '/ambientes/registrar', label: 'Registrar ambiente', permiso: 'ambientes.registrar', hu: 'HU-03' },
    ],
  },
  {
    base: '/examenes',
    label: 'Exámenes',
    icon: ExamIcon,
    descripcion: 'Programación de exámenes y habilitación de estudiantes.',
    items: [
      { to: '/examenes/lista', label: 'Lista de exámenes', permiso: 'examenes.ver', tambien: ['/examenes/datos'] },
      { to: '/examenes/programar', label: 'Programar examen', permiso: 'examenes.registrar', hu: 'HU-02' },
      { to: '/examenes/habilitar', label: 'Habilitar estudiantes', permiso: 'habilitaciones.ver', hu: 'HU-04' },
    ],
  },
  {
    to: '/control-ingreso',
    label: 'Control de ingreso',
    icon: ClipboardCheckIcon,
    permiso: 'control_ingreso.ver',
    descripcion: 'Verificación de identidad y registro de ingresos.',
  },
  {
    base: '/usuarios',
    label: 'Usuarios',
    icon: UsersIcon,
    descripcion: 'Cuentas de docentes y personal de control de ingreso.',
    items: [
      { to: '/usuarios/lista', label: 'Lista de usuarios', permiso: 'usuarios.ver', tambien: ['/usuarios/datos'] },
      { to: '/usuarios/registrar', label: 'Registrar usuario', permiso: 'usuarios.registrar', hu: 'HU-15' },
    ],
  },
  {
    to: '/roles-permisos',
    label: 'Roles y permisos',
    icon: ShieldIcon,
    soloAdmin: true,
    descripcion: 'Permisos de cada rol sobre los módulos del sistema.',
  },
];

// Devuelve el menu filtrado segun los permisos del usuario.
export function modulosPermitidos(tiene, esAdministrador) {
  const permitido = (e) => (e.soloAdmin ? esAdministrador : !e.permiso || tiene(e.permiso));
  return MODULOS.map((m) => (m.items ? { ...m, items: m.items.filter(permitido) } : m)).filter((m) =>
    m.items ? m.items.length > 0 : permitido(m)
  );
}

// Primera pantalla permitida de un modulo (a donde se entra al hacer clic en el modulo).
export function primeraPantalla(base, tiene, esAdministrador) {
  const modulo = modulosPermitidos(tiene, esAdministrador).find((m) => m.base === base);
  return modulo?.items?.[0]?.to ?? null;
}

// La opcion del submenu corresponde a la ruta actual (incluye sus pantallas internas).
export function rutaDeItem(pathname, item) {
  const coincide = (r) => pathname === r || pathname.startsWith(`${r}/`);
  return coincide(item.to) || (item.tambien ?? []).some(coincide);
}
