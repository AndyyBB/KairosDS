import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos, primerError } from '../../api/errores';
import { useAuth } from '../../api/AuthContext';
import BotonesFormulario from '../../components/BotonesFormulario';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import { BuildingIcon, UsersIcon, Etiqueta } from '../../components/Iconos';

const initial = { nombre: '', capacidad_maxima: '', ubicacion: '' };

// HU-03: Registro de ambientes (pantalla propia, solo el formulario).
// Con un id en la ruta es "Datos del ambiente" (se abre desde la Lista de ambientes):
// los campos se muestran sin poder modificarse y abajo estan Editar y Eliminar.
export default function RegistrarAmbiente() {
  const { id } = useParams();
  const editando = Boolean(id); // pantalla "Datos del ambiente"
  const { tiene } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [original, setOriginal] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const soloLectura = editando && !modoEdicion;

  useEffect(() => {
    if (!editando) return;
    api
      .get(`/ambientes/${id}`)
      .then((res) => {
        const datos = {
          nombre: res.data.nombre ?? '',
          capacidad_maxima: res.data.capacidad_maxima ?? '',
          ubicacion: res.data.ubicacion ?? '',
        };
        setForm(datos);
        setOriginal(datos);
      })
      .catch((err) => setError(primerError(err, 'No se pudo cargar el ambiente.')));
  }, [id, editando]);

  // Criterios 11 y 12: descarta los datos ingresados y cierra el formulario (el sistema
  // redirige a la pantalla de Inicio). En "Datos del ambiente" descarta los cambios y
  // vuelve a mostrar los datos sin poder modificarlos.
  function cancelar() {
    setErrores({});
    if (editando) {
      setForm(original ?? initial);
      setModoEdicion(false);
      return;
    }
    setForm(initial);
    navigate('/');
  }

  function editar() {
    setMensaje('');
    setModoEdicion(true);
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el ambiente "${form.nombre}"? Se borrará definitivamente.`)) return;
    setEliminando(true);
    setError('');
    try {
      await api.delete(`/ambientes/${id}`);
      navigate('/ambientes/lista', { state: { mensaje: 'Ambiente eliminado con éxito.' } });
    } catch (err) {
      setError(primerError(err, 'No se pudo eliminar el ambiente.'));
      setEliminando(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrores({});
    setMensaje('');
    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/ambientes/${id}`, form);
        setOriginal(form);
        setModoEdicion(false);
        setMensaje('Ambiente actualizado con éxito.');
        return;
      }
      await api.post('/ambientes', form);
      setForm(initial);
      setMensaje('Ambiente registrado con éxito.');
    } catch (err) {
      setErrores(erroresCampos(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-xl">
      <Encabezado
        icono={<BuildingIcon size={22} />}
        titulo={!editando ? 'Registrar ambiente' : modoEdicion ? 'Editar ambiente' : 'Datos del ambiente'}
        descripcion={
          !editando
            ? 'Agrega un aula o laboratorio disponible para programar exámenes.'
            : modoEdicion
              ? 'Modifica los datos y presiona "Guardar".'
              : 'Información registrada del ambiente.'
        }
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-6 space-y-4"
      >
        <fieldset disabled={soloLectura} className="space-y-4">
          <Campo label="Nombre del ambiente" icon={<BuildingIcon size={16} />} error={errores.nombre}>
            <input
              className="input"
              placeholder="Ej. Laboratorio 3"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </Campo>

          <Campo label="Capacidad máxima" icon={<UsersIcon size={16} />} error={errores.capacidad_maxima}>
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
        </fieldset>

        <BotonesFormulario
          esDetalle={editando}
          modoEdicion={modoEdicion}
          puedeEditar={tiene('ambientes.editar')}
          puedeEliminar={tiene('ambientes.eliminar')}
          guardando={guardando}
          eliminando={eliminando}
          onCancelar={cancelar}
          onSalir={() => navigate('/ambientes/lista')}
          onEditar={editar}
          onEliminar={eliminar}
        />
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

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
