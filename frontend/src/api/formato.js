// Formatos de presentacion (dia/mes/ano y hora:minuto) segun HU-02.
export function fechaDMA(valor) {
  if (!valor) return '';
  const [y, m, d] = String(valor).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(valor);
}

export function horaHM(valor) {
  return valor ? String(valor).slice(0, 5) : '';
}
