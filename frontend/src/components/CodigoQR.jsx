import { useMemo } from 'react';
import qrcode from '../vendor/qrcode';

// Matriz de modulos del QR. El contenido es el codigo universitario del
// estudiante (HU-10, criterio 8): es lo que lee el Control de ingreso.
export function matrizQR(texto) {
  const qr = qrcode(0, 'M');
  qr.addData(String(texto), 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  const filas = [];
  for (let r = 0; r < n; r += 1) {
    const fila = [];
    for (let c = 0; c < n; c += 1) fila.push(qr.isDark(r, c));
    filas.push(fila);
  }
  return filas;
}

const MARGEN = 4;

export default function CodigoQR({ valor, tamano = 220, className = '' }) {
  const filas = useMemo(() => matrizQR(valor), [valor]);
  const n = filas.length;
  const total = n + MARGEN * 2;
  let d = '';
  filas.forEach((fila, r) => {
    let c = 0;
    while (c < n) {
      if (fila[c]) {
        let fin = c;
        while (fin < n && fila[fin]) fin += 1;
        d += `M${c + MARGEN} ${r + MARGEN}h${fin - c}v1h-${fin - c}z`;
        c = fin;
      } else {
        c += 1;
      }
    }
  });

  return (
    <svg
      role="img"
      aria-label={`Código QR de ${valor}`}
      viewBox={`0 0 ${total} ${total}`}
      width={tamano}
      height={tamano}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={total} height={total} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}

// PNG (data URL) para descargar o imprimir el QR.
export function qrComoPng(valor, lado = 600) {
  const filas = matrizQR(valor);
  const total = filas.length + MARGEN * 2;
  const celda = Math.floor(lado / total);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = celda * total;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  filas.forEach((fila, r) => {
    fila.forEach((oscuro, c) => {
      if (oscuro) ctx.fillRect((c + MARGEN) * celda, (r + MARGEN) * celda, celda, celda);
    });
  });
  return canvas.toDataURL('image/png');
}
