// Extrae mensajes de error del backend (ya vienen en espanol segun los
// criterios de aceptacion). Nunca se muestra el texto generico de Laravel.
//
// Seguridad: si la respuesta trae detalles tecnicos (errores de base de datos, rutas de
// archivos, trazas) o es un error interno del servidor (500), no se muestra ese texto: se
// muestra el mensaje de respaldo de la pantalla.
const TECNICO = /SQLSTATE|Exception|Stack trace|\.php|select \*|insert into|update "|delete from/i;

export function primerError(err, respaldo = 'Ocurrió un error. Intente nuevamente.') {
  const estado = err?.response?.status;
  const data = err?.response?.data;
  if (data?.errors) {
    const primero = Object.values(data.errors).flat()[0];
    if (primero && !TECNICO.test(primero)) return primero;
  }
  const mensaje = typeof data?.message === 'string' ? data.message : '';
  if (!mensaje || TECNICO.test(mensaje) || estado === 500) return respaldo;
  return mensaje;
}

export function erroresCampos(err) {
  return err?.response?.data?.errors || {};
}
