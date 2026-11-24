import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import KairosLogo from '../../components/KairosLogo';
import { Etiqueta, MailIcon } from '../../components/Iconos';

// Sprint 4 (bug HU-39): formato estricto, el mismo que valida el backend (CorreoPermitido::FORMATO).
// Rechaza, por ejemplo, "maria@gmail", "maria@gmail.c", "maria@gmail.123" y "maría@gmail.com".
const FORMATO = /^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

// HU-39: Recuperacion de contrasena por correo. Se usa sin iniciar sesion.
export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState('');
  const [exito, setExito] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setExito('');
    setError('');
    const valor = correo.trim();
    if (!valor) {
      setError('El campo Correo electrónico es obligatorio.');
      return;
    }
    if (!FORMATO.test(valor)) {
      setError('El correo electrónico no es válido.');
      return;
    }
    setEnviando(true);
    try {
      const res = await api.post('/recuperar-contrasena', { correo_electronico: valor });
      setExito(res.data.message);
    } catch (err) {
      setError(primerError(err, 'No se pudo enviar el correo. Intente nuevamente en unos minutos.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-kairos-gradient px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl ring-1 ring-white/20 p-8">
        <div className="flex flex-col items-center gap-3 mb-5">
          <KairosLogo size={56} />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-800">Recuperar contraseña</h1>
            <p className="text-sm text-gray-500 mt-1">
              Ingresa el correo con el que inicias sesión y te enviaremos una contraseña temporal.
            </p>
          </div>
        </div>

        {exito && (
          <div role="status" className="mb-4 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
            {exito}
          </div>
        )}

        <form onSubmit={enviar} noValidate className="space-y-4">
          <div>
            <Etiqueta icon={<MailIcon />}>Correo electrónico</Etiqueta>
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              className="input"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                setError('');
              }}
            />
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-kairos-gradient text-white rounded-lg py-2 text-sm font-medium shadow-glow disabled:opacity-60"
          >
            {enviando ? 'Enviando...' : 'Enviar contraseña temporal'}
          </button>
          <p className="text-center text-sm">
            <Link to="/login" className="text-kairos-600 font-medium hover:underline">
              Volver al inicio de sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
