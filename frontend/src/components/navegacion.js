import {
  HomeIcon,
  StudentIcon,
  BuildingIcon,
  ExamIcon,
  ClipboardCheckIcon,
  ShieldIcon,
  UsersIcon,
} from './Iconos';

// Menu del sistema. Cada accion es una pantalla independiente del menu de su modulo:
// "Lista de ...", "Registrar ...", "Editar ..." y "Eliminar ...". En la lista no hay botones
// de editar ni eliminar: al hacer clic en el nombre de un registro se abre "Datos de ...",
// que solo muestra la informacion. Al entrar al modulo, el sistema redirige a su primera
// pantalla permitida.
// HU-17 (10): solo se muestran las pantallas que el rol tiene permitidas en "Roles y
// permisos" (Registrar, Editar y Eliminar de cada modulo; la lista se ve con cualquiera).
export const MODULOS = [
  { to: '/', label: 'Inicio', icon: HomeIcon, exacto: true },
  {
    base: '/estudiantes',
    modulo: 'estudiantes',
    label: 'Estudiantes',
    icon: StudentIcon,
    descripcion: 'Datos personales y académicos de los estudiantes.',
    items: [
      // "tambien": la pantalla "Datos de ..." se abre desde la lista (clic en el nombre).
      { to: '/estudiantes/lista', label: 'Lista de estudiantes', permiso: 'estudiantes.ver', tambien: ['/estudiantes/datos'] },
      { to: '/estudiantes/registrar', label: 'Registrar estudiante', permiso: 'estudiantes.registrar', hu: 'HU-01' },
      { to: '/estudiantes/editar', label: 'Editar estudiante', permiso: 'estudiantes.editar', hu: 'HU-06' },
      { to: '/estudiantes/eliminar', label: 'Eliminar estudiante', permiso: 'estudiantes.eliminar', hu: 'HU-07' },
    ],
  },
  {
    base: '/ambientes',
    modulo: 'ambientes',
    label: 'Ambientes',
    icon: BuildingIcon,
    descripcion: 'Aulas y laboratorios disponibles para los exámenes.',
    items: [
      { to: '/ambientes/lista', label: 'Lista de ambientes', permiso: 'ambientes.ver', tambien: ['/ambientes/datos'] },
      { to: '/ambientes/registrar', label: 'Registrar ambiente', permiso: 'ambientes.registrar', hu: 'HU-03' },
      { to: '/ambientes/editar', label: 'Editar ambiente', permiso: 'ambientes.editar', hu: 'HU-30' },
      { to: '/ambientes/eliminar', label: 'Eliminar ambiente', permiso: 'ambientes.eliminar', hu: 'HU-31' },
    ],
  },
  {
    base: '/examenes',
    modulo: 'examenes',
    label: 'Exámenes',
    icon: ExamIcon,
    descripcion: 'Programación de exámenes y habilitación de estudiantes.',
    items: [
      { to: '/examenes/lista', label: 'Lista de exámenes', permiso: 'examenes.ver', tambien: ['/examenes/datos'] },
      { to: '/examenes/programar', label: 'Programar examen', permiso: 'examenes.registrar', hu: 'HU-02' },
      { to: '/examenes/editar', label: 'Editar examen', permiso: 'examenes.editar', hu: 'HU-08' },
      { to: '/examenes/eliminar', label: 'Eliminar examen', permiso: 'examenes.eliminar', hu: 'HU-09' },
      { to: '/examenes/habilitar', label: 'Habilitar estudiantes', permiso: 'habilitaciones.ver', hu: 'HU-04' },
    ],
  },
  {
    base: '/control-ingreso',
    modulo: 'control_ingreso',
    label: 'Control de ingreso',
    icon: ClipboardCheckIcon,
    descripcion: 'Verificación de identidad y registro de ingresos.',
    items: [
      { to: '/control-ingreso/registrar', label: 'Registrar ingreso', permiso: 'control_ingreso.registrar', hu: 'HU-10' },
      { to: '/control-ingreso/editar', label: 'Editar ingreso', permiso: 'control_ingreso.editar', hu: 'HU-10' },
      { to: '/control-ingreso/eliminar', label: 'Eliminar ingreso', permiso: 'control_ingreso.eliminar', hu: 'HU-10' },
    ],
  },
  {
    base: '/usuarios',
    modulo: 'usuarios',
    label: 'Usuarios',
    icon: UsersIcon,
    descripcion: 'Cuentas de docentes y personal de control de ingreso.',
    items: [
      { to: '/usuarios/lista', label: 'Lista de usuarios', permiso: 'usuarios.ver', tambien: ['/usuarios/datos'] },
      { to: '/usuarios/registrar', label: 'Registrar usuario', permiso: 'usuarios.registrar', hu: 'HU-15' },
      { to: '/usuarios/editar', label: 'Editar usuario', permiso: 'usuarios.editar', hu: 'HU-32' },
      { to: '/usuarios/eliminar', label: 'Eliminar usuario', permiso: 'usuarios.eliminar', hu: 'HU-33' },
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

// Opcion del menu que habilita cada permiso (se muestra en "Roles y permisos").
export function pantallaDePermiso(permiso) {
  for (const m of MODULOS) {
    const item = (m.items ?? []).find((i) => i.permiso === permiso);
    if (item) return item.label;
  }
  return null;
}

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
