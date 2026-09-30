// Extrae mensajes de error del backend (ya vienen en espanol segun los
// criterios de aceptacion). Nunca se muestra el texto generico de Laravel.
export function primerError(err, respaldo = 'Ocurrió un error. Intente nuevamente.') {
  const data = err?.response?.data;
  if (data?.errors) {
    const primero = Object.values(data.errors).flat()[0];
    if (primero) return primero;
  }
  return data?.message || respaldo;
}

export function erroresCampos(err) {
  return err?.response?.data?.errors || {};
}
