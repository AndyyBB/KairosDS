import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos } from '../../api/errores';
import {
  IconoTitulo,
  StudentIcon,
  Etiqueta,
  HashIcon,
  IdCardIcon,
  UserIcon,
  MailIcon,
} from '../../components/Iconos';

const initial = {
  codigo_universitario: '',
  documento_identidad: '',
  nombre_completo: '',
  correo_institucional: '',
  carreras: [''],
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
      api.get(`/estudiantes/${id}`).then((res) => {
        const ids = (res.data.carreras?.length ? res.data.carreras.map((c) => c.id) : [res.data.carrera_id]).map(String);
        setForm({ ...res.data, carreras: ids });
      });
    }
  }, [id, editando]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // El correo institucional es CódigoUniversitario@est.umss.edu: mientras el
  // usuario no lo haya cambiado a mano, se completa solo al escribir el código.
  function cambiarCodigo(valor) {
    setForm((f) => {
      const anterior = f.codigo_universitario ? `${f.codigo_universitario}@est.umss.edu` : '';
      const sigueAutomatico = f.correo_institucional === '' || f.correo_institucional === anterior;
      return {
        ...f,
        codigo_universitario: valor,
        correo_institucional: sigueAutomatico && valor ? `${valor}@est.umss.edu` : sigueAutomatico ? '' : f.correo_institucional,
      };
    });
  }

  // Un estudiante puede pertenecer a mas de una carrera.
  function cambiarCarrera(indice, valor) {
    setForm((f) => ({ ...f, carreras: f.carreras.map((c, i) => (i === indice ? valor : c)) }));
  }

  function agregarCarrera() {
    setForm((f) => ({ ...f, carreras: [...f.carreras, ''] }));
  }

  function quitarCarrera(indice) {
    setForm((f) => ({ ...f, carreras: f.carreras.filter((_, i) => i !== indice) }));
  }

  const errorCarrera = Object.entries(errores).find(([clave]) => clave.startsWith('carreras'))?.[1];
  const hayCarrerasSinUsar = carreras.some((c) => !form.carreras.includes(String(c.id)));

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setErrores({});
    const payload = {
      codigo_universitario: form.codigo_universitario,
      documento_identidad: form.documento_identidad,
      nombre_completo: form.nombre_completo,
      correo_institucional: form.correo_institucional,
      carreras: form.carreras.filter(Boolean).map(Number),
    };
    try {
      if (editando) {
        await api.put(`/estudiantes/${id}`, payload);
      } else {
        await api.post('/estudiantes', payload);
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
      <div className="flex items-center gap-3 mb-6">
        <IconoTitulo><StudentIcon size={22} /></IconoTitulo>
        <h1 className="text-2xl font-semibold text-gray-800">
          {editando ? 'Editar estudiante' : 'Registrar estudiante'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <Campo label="Código universitario" icon={<HashIcon />} error={errores.codigo_universitario}>
          <input
            className="input"
            value={form.codigo_universitario}
            inputMode="numeric"
            onChange={(e) => cambiarCodigo(e.target.value)}
          />
        </Campo>

        <Campo label="Documento de identidad" icon={<IdCardIcon />} error={errores.documento_identidad}>
          <input
            className="input"
            value={form.documento_identidad}
            onChange={(e) => set('documento_identidad', e.target.value)}
          />
        </Campo>

        <Campo label="Nombre completo" icon={<UserIcon />} error={errores.nombre_completo}>
          <input
            className="input"
            value={form.nombre_completo}
            onChange={(e) => set('nombre_completo', e.target.value)}
          />
        </Campo>

        <Campo label="Correo institucional" icon={<MailIcon />} error={errores.correo_institucional}>
          <input
            className="input"
            placeholder="CódigoUniversitario@est.umss.edu"
            value={form.correo_institucional}
            onChange={(e) => set('correo_institucional', e.target.value)}
          />
        </Campo>

        <Campo label="Carrera" icon={<StudentIcon size={16} />} error={errorCarrera}>
          <div className="space-y-2">
            {form.carreras.map((seleccionada, indice) => (
              <div key={indice} className="flex items-center gap-2">
                <select
                  className="input"
                  value={seleccionada}
                  onChange={(e) => cambiarCarrera(indice, e.target.value)}
                >
                  <option value="">Seleccione una carrera</option>
                  {carreras
                    .filter((c) => String(c.id) === seleccionada || !form.carreras.includes(String(c.id)))
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
                {form.carreras.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarCarrera(indice)}
                    aria-label="Quitar carrera"
                    className="shrink-0 text-gray-400 hover:text-red-600 text-lg leading-none px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {hayCarrerasSinUsar && (
            <button
              type="button"
              onClick={agregarCarrera}
              className="mt-2 text-sm text-kairos-600 font-medium"
            >
              + Agregar otra carrera
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1">Un estudiante puede pertenecer a más de una carrera.</p>
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

function Campo({ label, icon, error, children }) {
  return (
    <div>
      <Etiqueta icon={icon}>{label}</Etiqueta>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error[0]}</p>}
    </div>
  );
}
