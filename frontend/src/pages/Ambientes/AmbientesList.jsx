import { useEffect, useState } from 'react';
import api from '../../api/client';

const initial = { nombre: '', capacidad_maxima: '', ubicacion: '' };

export default function AmbientesList() {
  const [ambientes, setAmbientes] = useState([]);
  const [form, setForm] = useState(initial);
  const [errores, setErrores] = useState({});
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    const res = await api.get('/ambientes');
    setAmbientes(res.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrores({});
    try {
      await api.post('/ambientes', form);
      setForm(initial);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setErrores(err.response?.data?.errors || {});
    }
  }

  async function handleDesactivar(id) {
    if (!confirm('Desactivar este ambiente?')) return;
    await api.delete(`/ambientes/${id}`);
    cargar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Ambientes</h1>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="bg-kairos-gradient text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm"
        >
          {mostrarForm ? 'Cerrar' : '+ Nuevo ambiente'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Nombre</label>
            <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            {errores.nombre && <p className="text-xs text-red-600 mt-1">{errores.nombre[0]}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Capacidad maxima</label>
            <input type="number" min="1" className="input" value={form.capacidad_maxima} onChange={(e) => setForm({ ...form, capacidad_maxima: e.target.value })} required />
            {errores.capacidad_maxima && <p className="text-xs text-red-600 mt-1">{errores.capacidad_maxima[0]}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Ubicacion</label>
            <input className="input" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} required />
          </div>
          <div className="sm:col-span-3 flex justify-end gap-3">
            <button type="button" onClick={() => setMostrarForm(false)} className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm">
              Cancelar
            </button>
            <button type="submit" className="bg-kairos-gradient text-white rounded-lg px-4 py-2 text-sm font-medium">
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
              <th className="px-4 py-2">Ubicacion</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {ambientes.map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{a.nombre}</td>
                <td className="px-4 py-2">{a.capacidad_maxima}</td>
                <td className="px-4 py-2 text-gray-500">{a.ubicacion}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleDesactivar(a.id)} className="text-gray-400">Desactivar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
