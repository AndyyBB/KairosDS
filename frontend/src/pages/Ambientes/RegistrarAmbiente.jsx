import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos, primerError } from '../../api/errores';
import { useAuth } from '../../api/AuthContext';
import BotonesFormulario from '../../components/BotonesFormulario';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import { SelectorAmbiente } from '../../components/Selectores';
import Encabezado from '../../components/Encabezado';
import { BuildingIcon, UsersIcon, Etiqueta } from '../../components/Iconos';

const initial = { nombre: '', capacidad_maxima: '', ubicacion: '' };

// Titulo y descripcion de cada pantalla (cada accion tiene su propia pantalla del menu).
const TEXTOS = {
  registrar: { titulo: 'Registrar ambiente', descripcion: 'Agrega un aula o laboratorio disponible para programar exámenes.' },
  datos: { titulo: 'Datos del ambiente', descripcion: 'Información registrada del ambiente.' },
  editar: { titulo: 'Editar ambiente', descripcion: 'Selecciona el ambiente, modifica sus datos y presiona "Guardar".' },
  eliminar: { titulo: 'Eliminar ambiente', descripcion: 'Selecciona el ambiente, revisa sus datos y presiona "Eliminar".' },
};

// HU-03 Registrar ambiente, HU-30 Editar ambiente y HU-31 Eliminar ambiente: cada accion
// es una pantalla independiente del menu Ambientes. "Datos del ambiente" se abre desde la
// Lista de ambientes (clic en el nombre) y solo muestra los datos.
export default function RegistrarAmbiente({ modo = 'registrar' }) {
  const { id } = useParams();
  const editando = Boolean(id); // hay un ambiente cargado (datos, editar o eliminar)
  const { tiene } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [original, setOriginal] = useState(null);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useMensajeFlash();
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const soloLectura = modo === 'datos' || modo === 'eliminar';

  useEffect(() => {
    if (!editando) return;
    setOriginal(null);
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

  // Al elegir otro registro se limpian los mensajes y errores anteriores.
  useEffect(() => {
    if (!id) return;
    setMensaje('');
    setError('');
    setErrores({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // "Cancelar": en "Registrar" descarta los datos ingresados y redirige a la pantalla de
  // Inicio; en "Editar ambiente" y "Eliminar ambiente" descarta los cambios y vuelve a la
  // seleccion del registro.
  function cancelar() {
    setErrores({});
    if (modo === 'editar' || modo === 'eliminar') {
      // Descarta los cambios y vuelve a la seleccion del registro.
      navigate(`/ambientes/${modo}`);
      return;
    }
    setForm(initial);
    navigate('/');
  }


  async function eliminar() {
    if (!confirm(`¿Eliminar el ambiente "${form.nombre}"? Se borrará definitivamente.`)) return;
    setEliminando(true);
    setError('');
    try {
      await api.delete(`/ambientes/${id}`);
      navigate('/ambientes/eliminar', { state: { mensaje: 'Ambiente eliminado con éxito.' } });
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
    // Sin registro elegido en Editar / Eliminar se muestra la tabla de seleccion (mas ancha).
    <div className={(modo === 'editar' || modo === 'eliminar') && !editando ? 'max-w-5xl' : 'max-w-xl'}>
      <Encabezado
        icono={<BuildingIcon size={22} />}
        titulo={TEXTOS[modo].titulo}
        descripcion={TEXTOS[modo].descripcion}
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />
      {(modo === 'editar' || modo === 'eliminar') && (
        <SelectorAmbiente
          modo={modo}
          seleccionado={editando ? (original ? { titulo: original.nombre, detalle: `Capacidad ${original.capacidad_maxima}${original.ubicacion ? ` · ${original.ubicacion}` : ''}` } : { titulo: 'Cargando...' }) : null}
        />
      )}

      {(modo === 'registrar' || editando) && (
        <>
          {modo === 'eliminar' && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Revisa los datos antes de eliminar. El ambiente se borrará definitivamente (no se puede eliminar si está asignado a un examen).
            </p>
          )}

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
          modo={modo}
          puedeGuardar={true}
          puedeEliminar={tiene('ambientes.eliminar')}
          guardando={guardando}
          eliminando={eliminando}
          onCancelar={cancelar}
          onSalir={() => navigate('/ambientes/lista')}
          onEliminar={eliminar}
        />
      </form>
        </>
      )}
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
