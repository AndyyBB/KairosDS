import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Muestra un mensaje de exito recibido por navegacion (state.mensaje).
export function useMensajeFlash() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mensaje, setMensaje] = useState(location.state?.mensaje || '');

  useEffect(() => {
    if (location.state?.mensaje) {
      setMensaje(location.state.mensaje);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  return [mensaje, setMensaje];
}

export default function Aviso({ mensaje, tipo = 'exito', onCerrar }) {
  if (!mensaje) return null;
  const estilos = tipo === 'exito'
    ? 'bg-green-50 border-green-200 text-green-800'
    : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm flex items-center justify-between ${estilos}`}>
      <span>{mensaje}</span>
      {onCerrar && (
        <button type="button" onClick={onCerrar} className="ml-4 text-xs opacity-70">✕</button>
      )}
    </div>
  );
}
