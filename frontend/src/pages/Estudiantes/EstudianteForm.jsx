import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos } from '../../api/errores';

const initial = {
  codigo_universitario: '',
  documento_identidad: '',
  nombre_completo: '',
  correo_institucional: '',
  carrera_id: '',
};

export default function EstudianteForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [carreras, setCarreras] = useState([]);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/carreras').then((res) => setCarreras(res.data));
    if (editando) {
      api.get(`/estudiantes/${id}`).then((res) => setForm(res.data));
    }
  }, [id, editando]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setErrores({});
    try {
      if (editando) {
        await api.put(`/estudiantes/${id}`, form);
      } else {
        await api.post('/estudiantes', form);
      }
      navigate('/estudiantes', {
        state: { mensaje: editando ? 'Estudiante actualizado con éxito.' : 'Estudiante registrado con éxito.' },
      });
    } catch (err) {
      setErrores(erroresCampos(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        {editando ? 'Editar estudiante' : 'Registrar estudiante'}
      </h1>

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <Campo label="Código universitario" error={errores.codigo_universitario}>
          <input
            className="input"
            value={form.codigo_universitario}
            onChange={(e) => set('codigo_universitario', e.target.value)}
          />
        </Campo>

        <Campo label="Documento de identidad" error={errores.documento_identidad}>
          <input
            className="input"
            value={form.documento_identidad}
            onChange={(e) => set('documento_identidad', e.target.value)}
          />
        </Campo>

        <Campo label="Nombre completo" error={errores.nombre_completo}>
          <input
            className="input"
            value={form.nombre_completo}
            onChange={(e) => set('nombre_completo', e.target.value)}
          />
        </Campo>

        <Campo label="Correo institucional" error={errores.correo_institucional}>
          <input
            className="input"
            placeholder="CódigoUniversitario@est.umss.edu"
            value={form.correo_institucional}
            onChange={(e) => set('correo_institucional', e.target.value)}
          />
        </Campo>

        <Campo label="Carrera" error={errores.carrera_id}>
          <select
            className="input"
            value={form.carrera_id}
            onChange={(e) => set('carrera_id', e.target.value)}
          >
            <option value="">Seleccione una carrera</option>
            {carreras.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </Campo>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/estudiantes')}
            className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="bg-kairos-gradient text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Campo({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error[0]}</p>}
    </div>
  );
}
