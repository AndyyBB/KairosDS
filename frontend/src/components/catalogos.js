import { useEffect, useState } from 'react';
import api from '../api/client';

// Filtros de cada modulo (boton "Filtros" de las listas y de las tablas de seleccion de
// las pantallas Editar / Eliminar). Cada campo:
// - id, etiqueta, tipo ('select' | 'fecha' | 'numero' | 'texto'), opciones (select)
// - todos: texto de la opcion vacia del select ("Todos" por defecto)
// - dependeDe: el campo solo se habilita cuando el otro tiene un valor
// - noMayorQue / mensaje: validacion de rangos (desde <= hasta, minimo <= maximo)

export const ESTADOS_EXAMEN = [
  { value: 'programado', label: 'Programado' },
  { value: 'en curso', label: 'En curso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const RANGO_FECHAS = [
  {
    id: 'desde',
    etiqueta: 'Fecha desde',
    tipo: 'fecha',
    noMayorQue: 'hasta',
    mensaje: 'La fecha desde no puede ser posterior a la fecha hasta.',
  },
  { id: 'hasta', etiqueta: 'Fecha hasta', tipo: 'fecha' },
];

const opcion = (value, label) => ({ value: String(value), label: String(label) });
const distintos = (lista) => [...new Set(lista.filter((v) => v !== null && v !== undefined && v !== ''))];

// Primeros 4 digitos del codigo universitario (por ejemplo, 202244567 -> 2022), usados
// por el filtro "Código (primeros 4 dígitos)".
export function anioIngreso(codigo) {
  const m = String(codigo ?? '').match(/^(\d{4})/);
  return m ? m[1] : '';
}

function fechaCorta(fecha) {
  const [y, m, d] = String(fecha ?? '').slice(0, 10).split('-');
  return d ? `${d}/${m}/${y}` : '';
}

const etiquetaExamen = (ex) => `${ex.materia?.nombre ?? 'Examen'} — ${fechaCorta(ex.fecha)} ${String(ex.hora_inicio ?? '').slice(0, 5)}`;

// ---------------- Estudiantes ----------------
// Carrera, primeros 4 digitos del codigo, examen en el que esta inscrito, estado de
// habilitacion en ese examen y orden de la lista.
export function useCamposEstudiantes() {
  const [carreras, setCarreras] = useState([]);
  const [anios, setAnios] = useState([]);
  const [examenes, setExamenes] = useState([]);
  useEffect(() => {
    api.get('/carreras').then((res) => setCarreras(res.data)).catch(() => setCarreras([]));
    api.get('/estudiantes-anios').then((res) => setAnios(res.data)).catch(() => setAnios([]));
    api
      .get('/examenes', { params: { per_page: 100 } })
      .then((res) => setExamenes(res.data.data ?? res.data))
      .catch(() => setExamenes([]));
  }, []);
  return [
    { id: 'carrera_id', etiqueta: 'Carrera', tipo: 'select', todos: 'Todas', opciones: carreras.map((c) => opcion(c.id, c.nombre)) },
    {
      id: 'anio_ingreso',
      etiqueta: 'Código (primeros 4 dígitos)',
      tipo: 'select',
      opciones: anios.map((a) => opcion(a, `${a}…`)),
    },
    { id: 'examen_id', etiqueta: 'Inscrito en el examen', tipo: 'select', opciones: examenes.map((ex) => opcion(ex.id, etiquetaExamen(ex))) },
    {
      id: 'habilitacion',
      etiqueta: 'Estado de habilitación en el examen',
      tipo: 'select',
      dependeDe: 'examen_id',
      ayuda: 'Primero elige un examen.',
      opciones: [opcion('habilitado', 'Habilitado'), opcion('no_habilitado', 'No habilitado')],
    },
    {
      id: 'orden',
      etiqueta: 'Ordenar por',
      tipo: 'select',
      todos: 'Nombre (A-Z)',
      opciones: [
        opcion('codigo', 'Código (menor a mayor)'),
        opcion('anio_reciente', 'Código (mayor a menor)'),
      ],
    },
  ];
}

// ---------------- Examenes ----------------
// modo 'lista' / 'eliminar': todos los estados; modo 'editar': solo los que todavia se
// pueden editar (programado o en curso).
export function useCamposExamenes({ modo = 'lista' } = {}) {
  const [ambientes, setAmbientes] = useState([]);
  const [materias, setMaterias] = useState([]);
  useEffect(() => {
    api.get('/ambientes', { params: { solo_activos: 0 } }).then((res) => setAmbientes(res.data)).catch(() => setAmbientes([]));
    // Solo las asignaturas que tienen examenes registrados.
    api
      .get('/examenes', { params: { per_page: 100, incluir_cancelados: 1 } })
      .then((res) => {
        const vistos = new Map();
        (res.data.data ?? res.data).forEach((ex) => ex.materia && vistos.set(ex.materia_id, ex.materia.nombre));
        setMaterias([...vistos.entries()].sort((a, b) => a[1].localeCompare(b[1])));
      })
      .catch(() => setMaterias([]));
  }, []);
  const estados = modo === 'editar' ? ESTADOS_EXAMEN.slice(0, 2) : ESTADOS_EXAMEN;
  return [
    { id: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: estados },
    { id: 'materia_id', etiqueta: 'Asignatura', tipo: 'select', todos: 'Todas', opciones: materias.map(([id, n]) => opcion(id, n)) },
    { id: 'ambiente_id', etiqueta: 'Ambiente', tipo: 'select', opciones: ambientes.map((a) => opcion(a.id, a.nombre)) },
    ...RANGO_FECHAS,
  ];
}

// ---------------- Ambientes ----------------
export function useCamposAmbientes() {
  const [ubicaciones, setUbicaciones] = useState([]);
  useEffect(() => {
    api
      .get('/ambientes', { params: { solo_activos: 0 } })
      .then((res) => setUbicaciones(distintos(res.data.map((a) => a.ubicacion)).sort()))
      .catch(() => setUbicaciones([]));
  }, []);
  return [
    { id: 'ubicacion', etiqueta: 'Ubicación', tipo: 'select', todos: 'Todas', opciones: ubicaciones.map((u) => opcion(u, u)) },
    {
      id: 'capacidad_min',
      etiqueta: 'Capacidad mínima',
      tipo: 'numero',
      placeholder: 'Ej. 30',
      noMayorQue: 'capacidad_max',
      mensaje: 'La capacidad mínima no puede ser mayor que la capacidad máxima.',
    },
    { id: 'capacidad_max', etiqueta: 'Capacidad máxima', tipo: 'numero', placeholder: 'Ej. 100' },
    {
      id: 'orden',
      etiqueta: 'Ordenar por',
      tipo: 'select',
      todos: 'Nombre (A-Z)',
      opciones: [opcion('capacidad_desc', 'Capacidad (mayor a menor)'), opcion('capacidad_asc', 'Capacidad (menor a mayor)')],
    },
  ];
}

// ---------------- Usuarios ----------------
const nombreRol = (n) => (n ? n.charAt(0).toUpperCase() + n.slice(1) : '');

export function useCamposUsuarios() {
  const [roles, setRoles] = useState([]);
  useEffect(() => {
    api.get('/roles').then((res) => setRoles(res.data)).catch(() => setRoles([]));
  }, []);
  return [
    { id: 'rol_id', etiqueta: 'Rol', tipo: 'select', opciones: roles.map((r) => opcion(r.id, nombreRol(r.nombre))) },
    { id: 'activo', etiqueta: 'Estado', tipo: 'select', opciones: [opcion('1', 'Activo'), opcion('0', 'Inactivo')] },
    {
      id: 'orden',
      etiqueta: 'Ordenar por',
      tipo: 'select',
      todos: 'Nombre (A-Z)',
      opciones: [opcion('nombre_desc', 'Nombre (Z-A)'), opcion('rol', 'Rol')],
    },
  ];
}

// ---------------- Ingresos (Editar / Eliminar ingreso) ----------------
export function camposIngresos(ingresos) {
  const sel = (f) => distintos(ingresos.map(f)).sort();
  return [
    { id: 'ambiente', etiqueta: 'Ambiente', tipo: 'select', opciones: sel((i) => i.ambiente).map((a) => opcion(a, a)) },
    { id: 'carrera', etiqueta: 'Carrera', tipo: 'select', todos: 'Todas', opciones: sel((i) => i.carrera).map((c) => opcion(c, c)) },
    { id: 'anio', etiqueta: 'Código (primeros 4 dígitos)', tipo: 'select', opciones: sel((i) => anioIngreso(i.codigo)).reverse().map((a) => opcion(a, `${a}…`)) },
    { id: 'registrado_por', etiqueta: 'Registrado por', tipo: 'select', opciones: sel((i) => i.registrado_por).map((u) => opcion(u, u)) },
  ];
}

export function filtrarIngresos(lista, buscar = '', f = {}) {
  const t = buscar.trim().toLowerCase();
  return lista.filter(
    (i) =>
      (!t || [i.codigo, i.documento, i.nombre].some((v) => String(v ?? '').toLowerCase().includes(t))) &&
      (!f.ambiente || i.ambiente === f.ambiente) &&
      (!f.carrera || i.carrera === f.carrera) &&
      (!f.anio || anioIngreso(i.codigo) === f.anio) &&
      (!f.registrado_por || i.registrado_por === f.registrado_por)
  );
}

// ---------------- Filtros que se aplican en el navegador ----------------
const incluye = (v, t) => String(v ?? '').toLowerCase().includes(t);

export function filtrarAmbientes(lista, buscar = '', f = {}) {
  const t = buscar.trim().toLowerCase();
  const res = lista.filter(
    (a) =>
      (!t || incluye(a.nombre, t) || incluye(a.ubicacion, t)) &&
      (!f.ubicacion || a.ubicacion === f.ubicacion) &&
      (!f.capacidad_min || Number(a.capacidad_maxima) >= Number(f.capacidad_min)) &&
      (!f.capacidad_max || Number(a.capacidad_maxima) <= Number(f.capacidad_max))
  );
  if (f.orden === 'capacidad_desc') return [...res].sort((a, b) => b.capacidad_maxima - a.capacidad_maxima);
  if (f.orden === 'capacidad_asc') return [...res].sort((a, b) => a.capacidad_maxima - b.capacidad_maxima);
  return [...res].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
}

export function filtrarUsuarios(lista, buscar = '', f = {}) {
  const t = buscar.trim().toLowerCase();
  const res = lista.filter(
    (u) =>
      (!t || incluye(u.nombre_completo, t) || incluye(u.correo_electronico, t)) &&
      (!f.rol_id || String(u.rol_id) === String(f.rol_id)) &&
      (f.activo === undefined || f.activo === '' || Boolean(u.activo) === (f.activo === '1'))
  );
  const porNombre = (a, b) => String(a.nombre_completo).localeCompare(String(b.nombre_completo));
  if (f.orden === 'nombre_desc') return [...res].sort((a, b) => porNombre(b, a));
  if (f.orden === 'rol') return [...res].sort((a, b) => String(a.rol?.nombre).localeCompare(String(b.rol?.nombre)) || porNombre(a, b));
  return [...res].sort(porNombre);
}

// Parametros de la API sin los filtros vacios.
export function parametros(objeto) {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== '' && v !== null && v !== undefined));
}
