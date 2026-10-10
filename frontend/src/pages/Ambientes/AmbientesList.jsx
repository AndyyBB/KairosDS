import { useEffect, useState } from 'react';
import api from '../../api/client';
import { erroresCampos } from '../../api/errores';
import Aviso from '../../components/Aviso';
import Paginacion from '../../components/Paginacion';
import { useAuth } from '../../api/AuthContext';

const initial = { nombre: '', capacidad_maxima: '', ubicacion: '' };
const POR_PAGINA = 20;

// HU-03: Registro de ambientes. El formulario se muestra sobre la lista y usa
// el mismo estilo (iconos, tarjeta y botones) que "Programar examen".
export default function AmbientesList() {
  const { tiene } = useAuth();
  const [ambientes, setAmbientes] = useState([]);
  const [form, setForm] = useState(initial);
  const [errores, setErrores] = useState({});
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [pagina, setPagina] = useState(1);

  async function cargar() {
    const res = await api.get('/ambientes');
    setAmbientes(res.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  const ultima = Math.max(1, Math.ceil(ambientes.length / POR_PAGINA));
  const visibles = ambientes.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Descarta lo ingresado y cierra el formulario (criterios 11 y 12).
  function cancelar() {
    setForm(initial);
    setErrores({});
    setMostrarForm(false);
  }

  function alternarForm() {
    if (mostrarForm) {
      cancelar();
    } else {
      setMensaje('');
      setMostrarForm(true);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrores({});
    setMensaje('');
    try {
      await api.post('/ambientes', form);
      setForm(initial);
      setMostrarForm(false);
      setMensaje('Ambiente registrado con éxito.');
      await cargar();
    } catch (err) {
      setErrores(erroresCampos(err));
    }
  }

  async function handleDesactivar(id) {
    if (!confirm('¿Desactivar este ambiente?')) return;
    await api.delete(`/ambientes/${id}`);
    await cargar();
    setPagina((p) => Math.min(p, Math.max(1, Math.ceil((ambientes.length - 1) / POR_PAGINA))));
  }

  return (
    <div>
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-kairos-gradient flex items-center justify-center text-white shadow-md">
            <BuildingIcon size={22} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">Ambientes</h1>
        </div>
        {tiene('ambientes.registrar') && (
          <button
            onClick={alternarForm}
            className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm"
          >
            {mostrarForm ? 'Cerrar' : '+ Nuevo ambiente'}
          </button>
        )}
      </div>

      {mostrarForm && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Campo label="Nombre del ambiente" icon={<BuildingIcon />} error={errores.nombre}>
              <input
                className="input"
                placeholder="Ej. Laboratorio 3"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </Campo>

            <Campo label="Capacidad máxima" icon={<UsersIcon />} error={errores.capacidad_maxima}>
              <input
                type="number"
                className="input"
                placeholder="Ej. 40"
                value={form.capacidad_maxima}
                onChange={(e) => setForm({ ...form, capacidad_maxima: e.target.value })}
              />
            </Campo>

            <Campo label="Ubicación" icon={<PinIcon />} error={errores.ubicacion}>
              <input
                className="input"
                placeholder="Ej. Edificio central, 2.º piso"
                value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
              />
            </Campo>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={cancelar}
              className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-kairos-gradient text-white rounded-lg px-5 py-2 text-sm font-medium shadow-sm"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Capacidad</th>
              <th className="px-4 py-2">Ubicación</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{a.nombre}</td>
                <td className="px-4 py-2">{a.capacidad_maxima}</td>
                <td className="px-4 py-2 text-gray-500">{a.ubicacion}</td>
                <td className="px-4 py-2 text-right">
                  {tiene('ambientes.eliminar') && (
                    <button onClick={() => handleDesactivar(a.id)} className="text-gray-400">Desactivar</button>
                  )}
                </td>
              </tr>
            ))}
            {ambientes.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Aún no hay ambientes registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} ultima={ultima} total={ambientes.length} onCambiar={setPagina} />
    </div>
  );
}

function Campo({ label, icon, error, children }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
        <span className="text-kairos-500">{icon}</span>
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error[0]}</p>}
    </div>
  );
}

function BuildingIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 9h2a2 2 0 0 1 2 2v10" />
      <path d="M9 7h2M9 11h2M9 15h2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
