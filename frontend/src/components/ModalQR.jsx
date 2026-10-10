import CodigoQR, { qrComoPng } from './CodigoQR';

// Muestra el QR de un estudiante (contiene su codigo universitario) para
// escanearlo en Control de ingreso, descargarlo o imprimirlo.
export default function ModalQR({ estudiante, onCerrar }) {
  const codigo = estudiante.codigo_universitario;

  function descargar() {
    const a = document.createElement('a');
    a.href = qrComoPng(codigo);
    a.download = `qr-${codigo}.png`;
    a.click();
  }

  function imprimir() {
    const ventana = window.open('', '_blank', 'width=480,height=620');
    if (!ventana) return;
    const nombre = String(estudiante.nombre_completo ?? '').replace(/</g, '&lt;');
    ventana.document.write(
      `<html><head><title>QR ${codigo}</title></head><body style="font-family:sans-serif;text-align:center;padding:24px">` +
        `<img src="${qrComoPng(codigo)}" style="width:320px;height:320px" />` +
        `<h2 style="margin:12px 0 4px">${nombre}</h2><p style="margin:0;font-size:18px">${codigo}</p>` +
        `<script>window.onload=function(){window.print();}</script></body></html>`
    );
    ventana.document.close();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Código QR del estudiante"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 text-left">Código QR</h2>
          <button type="button" onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none px-2" aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="flex justify-center">
          <CodigoQR valor={codigo} tamano={240} className="border border-gray-100 rounded-lg" />
        </div>
        <p className="mt-3 font-medium text-gray-800">{estudiante.nombre_completo}</p>
        <p className="text-sm text-gray-500">{codigo}</p>
        <div className="flex justify-center gap-2 mt-4">
          <button type="button" onClick={descargar} className="border border-kairos-600 text-kairos-700 hover:bg-kairos-50 rounded-lg px-3 py-1.5 text-sm font-medium">
            Descargar PNG
          </button>
          <button type="button" onClick={imprimir} className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 text-sm font-medium">
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
