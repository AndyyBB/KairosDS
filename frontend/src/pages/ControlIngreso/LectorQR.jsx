import { useEffect, useRef } from 'react';
import jsQR from '../../vendor/jsqr';

// HU-10 (7, 8): activa la camara del dispositivo y lee el codigo QR del estudiante
// (el QR contiene el codigo universitario).
export default function LectorQR({ onLeido, onFalloCamara, error }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const alLeer = useRef(onLeido);
  const alFallar = useRef(onFalloCamara);
  alLeer.current = onLeido;
  alFallar.current = onFalloCamara;

  useEffect(() => {
    let flujo = null;
    let cuadro = 0;
    let activo = true;
    let ultimoTexto = '';
    let ultimaVez = 0;
    let ultimoAnalisis = 0;

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        alFallar.current?.();
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!activo) {
          flujo.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = flujo;
        await video.play();

        const analizar = (t) => {
          if (!activo) return;
          // Se analiza a ~8 cuadros por segundo para no recargar el equipo.
          if (t - ultimoAnalisis > 120 && video.readyState === video.HAVE_ENOUGH_DATA) {
            ultimoAnalisis = t;
            const canvas = canvasRef.current;
            const ancho = video.videoWidth;
            const alto = video.videoHeight;
            if (ancho && alto) {
              canvas.width = ancho;
              canvas.height = alto;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              ctx.drawImage(video, 0, 0, ancho, alto);
              const imagen = ctx.getImageData(0, 0, ancho, alto);
              const resultado = jsQR(imagen.data, ancho, alto, { inversionAttempts: 'dontInvert' });
              if (resultado && resultado.data) {
                const ahora = Date.now();
                // El mismo QR no se vuelve a procesar durante 3 segundos.
                if (resultado.data !== ultimoTexto || ahora - ultimaVez > 3000) {
                  ultimoTexto = resultado.data;
                  ultimaVez = ahora;
                  alLeer.current?.(resultado.data);
                }
              }
            }
          }
          cuadro = requestAnimationFrame(analizar);
        };
        cuadro = requestAnimationFrame(analizar);
      } catch {
        alFallar.current?.();
      }
    }

    iniciar();

    return () => {
      activo = false;
      cancelAnimationFrame(cuadro);
      if (flujo) flujo.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <div className="relative w-full sm:w-[340px] h-[250px] rounded-xl bg-slate-800 overflow-hidden shrink-0">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 rounded-xl border-4 border-kairos-300" />
          </div>
          <p className="absolute bottom-2 inset-x-0 text-center text-xs text-white/90">Cámara activa</p>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">Apunte la cámara al código QR del estudiante</p>
          <p className="text-sm text-gray-500 mt-1">El código QR contiene el código universitario del estudiante.</p>
          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 font-semibold text-sm px-4 py-3 max-w-md">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
