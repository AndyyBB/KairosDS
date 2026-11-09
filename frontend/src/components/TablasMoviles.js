import { useEffect } from 'react';

// Hito 5 (Sprint 4): adaptacion a dispositivos moviles.
// En pantallas chicas las tablas se muestran como tarjetas (ver index.css, clase
// "tablas-moviles"): cada fila es una tarjeta y cada celda muestra el titulo de su columna.
// Este hook copia el titulo de cada columna (<th>) al atributo data-label de las celdas
// (<td>) de todas las tablas que hay dentro del contenedor, tambien cuando las tablas cambian
// (paginas, filtros, actualizaciones automaticas).
function etiquetar(contenedor) {
  contenedor.querySelectorAll('table').forEach((tabla) => {
    const titulos = [...tabla.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    if (!titulos.length) return;
    tabla.querySelectorAll('tbody tr, tfoot tr').forEach((fila) => {
      let columna = 0;
      [...fila.children].forEach((celda) => {
        const titulo = celda.colSpan > 1 ? '' : titulos[columna] ?? '';
        if (celda.getAttribute('data-label') !== titulo) celda.setAttribute('data-label', titulo);
        columna += celda.colSpan || 1;
      });
    });
  });
}

export function useTablasMoviles(ref) {
  useEffect(() => {
    const contenedor = ref.current;
    if (!contenedor) return undefined;
    let pendiente = null;
    const programar = () => {
      if (pendiente) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = null;
        etiquetar(contenedor);
      });
    };
    etiquetar(contenedor);
    const observador = new MutationObserver(programar);
    observador.observe(contenedor, { childList: true, subtree: true, characterData: true });
    return () => {
      observador.disconnect();
      if (pendiente) cancelAnimationFrame(pendiente);
    };
  }, [ref]);
}
