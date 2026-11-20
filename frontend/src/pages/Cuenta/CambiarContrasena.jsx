import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos, primerError } from '../../api/errores';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import { EyeIcon, EyeOffIcon, LockIcon, Etiqueta } from '../../components/Iconos';

const VACIO = { actual: '', nueva: '', confirmacion: '' };
const ETIQUETAS = { actual: 'Contraseña actual', nueva: 'Nueva contraseña', confirmacion: 'Confirmar nueva contraseña' };

// Campo de contrasena con el icono de ojo para mostrar u ocultar lo escrito.
function CampoClave({ id, valor, onCambiar, error, ayuda, autoComplete }) {
  const [ver, setVer] = useState(false);
  return (
    <div>
      <Etiqueta icon={<LockIcon />}>{ETIQUETAS[id]}</Etiqueta>
      <div className="relative">
        <input
          id={id}
          type={ver ? 'text' : 'password'}
          autoComplete={autoComplete}
          className="input pr-10"
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-kairos-600"
        >
          {ver ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {ayuda && <p className="text-xs text-gray-400 mt-1">{ayuda}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// HU-38: Cambio de contrasena del usuario (cualquier rol, solo su propia cuenta).
export default function CambiarContrasena() {
  const navigate = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  // Validaciones de la pantalla (el servidor vuelve a validarlas).
  function validar() {
    const e = {};
    Object.keys(VACIO).forEach((c) => {
      if (!form[c]) e[c] = `El campo ${ETIQUETAS[c]} es obligatorio.`;
    });
    if (!e.nueva && form.nueva.length < 8) e.nueva = 'La contraseña debe tener al menos 8 caracteres.';
    if (!e.nueva && form.actual && form.nueva === form.actual) e.nueva = 'La nueva contraseña debe ser distinta de la actual.';
    if (!e.confirmacion && !e.nueva && form.confirmacion !== form.nueva) e.confirmacion = 'Las contraseñas no coinciden.';
    return e;
  }

  async function guardar(ev) {
    ev.preventDefault();
    setMensaje('');
    setError('');
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length) return;
    setGuardando(true);
    try {
      const res = await api.post('/cuenta/contrasena', form);
      setForm(VACIO);
      setMensaje(res.data.message);
    } catch (err) {
      const campos = erroresCampos(err);
      if (Object.keys(campos).length) {
        setErrores(Object.fromEntries(Object.entries(campos).map(([c, m]) => [c, m[0]])));
      } else {
        setError(primerError(err, 'No se pudo cambiar la contraseña. Intente nuevamente.'));
      }
    } finally {
      setGuardando(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div className="max-w-xl">
      <Encabezado
        icono={<LockIcon size={22} />}
        titulo="Cambiar contraseña"
        descripcion='Ingresa tu contraseña actual y la nueva contraseña, y presiona "Guardar".'
      />
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />
      <p className="mb-4 rounded-lg border border-kairos-100 bg-kairos-50/60 px-4 py-3 text-sm text-kairos-800">
        Cambia la contraseña de tu propia cuenta. La nueva contraseña se usa desde el siguiente inicio de sesión.
      </p>
      <form onSubmit={guardar} noValidate className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-6 space-y-4">
        <CampoClave id="actual" valor={form.actual} onCambiar={(v) => cambiar('actual', v)} error={errores.actual} autoComplete="current-password" />
        <CampoClave
          id="nueva"
          valor={form.nueva}
          onCambiar={(v) => cambiar('nueva', v)}
          error={errores.nueva}
          ayuda="Al menos 8 caracteres y distinta de la contraseña actual."
          autoComplete="new-password"
        />
        <CampoClave id="confirmacion" valor={form.confirmacion} onCambiar={(v) => cambiar('confirmacion', v)} error={errores.confirmacion} autoComplete="new-password" />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="bg-kairos-gradient text-white rounded-lg px-5 py-2 text-sm font-medium shadow-glow disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
