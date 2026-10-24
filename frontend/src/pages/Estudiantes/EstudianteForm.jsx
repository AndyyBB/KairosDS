import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { erroresCampos, primerError } from '../../api/errores';
import { useAuth } from '../../api/AuthContext';
import BotonesFormulario from '../../components/BotonesFormulario';
import Aviso, { useMensajeFlash } from '../../components/Aviso';
import { SelectorEstudiante } from '../../components/Selectores';
import Encabezado from '../../components/Encabezado';
import CodigoQR from '../../components/CodigoQR';
import ModalQR from '../../components/ModalQR';
import {
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

// Titulo y descripcion de cada pantalla (cada accion tiene su propia pantalla del menu).
const TEXTOS = {
  registrar: { titulo: 'Registrar estudiante', descripcion: 'Ingresa los datos personales y académicos del estudiante.' },
  datos: { titulo: 'Datos del estudiante', descripcion: 'Información registrada del estudiante.' },
  editar: { titulo: 'Editar estudiante', descripcion: 'Selecciona al estudiante, modifica sus datos y presiona "Guardar".' },
  eliminar: { titulo: 'Eliminar estudiante', descripcion: 'Selecciona al estudiante, revisa sus datos y presiona "Eliminar".' },
};

// HU-01 Registrar estudiante, HU-06 Editar estudiante y HU-07 Eliminar estudiante: cada
// accion es una pantalla independiente del menu Estudiantes. "Datos del estudiante" se abre
// desde la Lista de estudiantes (clic en el nombre) y solo muestra los datos.
export default function EstudianteForm({ modo = 'registrar' }) {
  const { id } = useParams();
  const editando = Boolean(id); // hay un estudiante cargado (datos, editar o eliminar)
  const [original, setOriginal] = useState(null);
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [carreras, setCarreras] = useState([]);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useMensajeFlash();
  const [registrado, setRegistrado] = useState(null); // ultimo estudiante registrado (para su QR)
  const [verQr, setVerQr] = useState(false);
  const [error, setError] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const { tiene } = useAuth();
  const soloLectura = modo === 'datos' || modo === 'eliminar';

  useEffect(() => {
    api.get('/carreras').then((res) => setCarreras(res.data));
    if (editando) {
      setOriginal(null);
      api
        .get(`/estudiantes/${id}`)
        .then((res) => {
          const ids = (res.data.carreras?.length ? res.data.carreras.map((c) => c.id) : [res.data.carrera_id]).map(String);
          const datos = {
            codigo_universitario: res.data.codigo_universitario ?? '',
            documento_identidad: res.data.documento_identidad ?? '',
            nombre_completo: res.data.nombre_completo ?? '',
            correo_institucional: res.data.correo_institucional ?? '',
            carreras: ids,
          };
          setForm(datos);
          setOriginal(datos);
          setRegistrado({ nombre_completo: datos.nombre_completo, codigo_universitario: datos.codigo_universitario });
        })
        .catch((err) => setError(primerError(err, 'No se pudo cargar al estudiante.')));
    }
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
  // Inicio; en "Editar estudiante" y "Eliminar estudiante" descarta los cambios y vuelve a la
  // seleccion del registro.
  function cancelar() {
    setErrores({});
    if (modo === 'editar' || modo === 'eliminar') {
      // Descarta los cambios y vuelve a la seleccion del registro.
      navigate(`/estudiantes/${modo}`);
      return;
    }
    setForm(initial);
    navigate('/');
  }

  // HU-07: en la pantalla "Eliminar estudiante" se elimina definitivamente.
  async function eliminar() {
    if (!confirm(`¿Eliminar a ${form.nombre_completo}? Se borrará definitivamente junto con sus inscripciones, habilitaciones e ingresos.`)) return;
    setEliminando(true);
    setError('');
    try {
      await api.delete(`/estudiantes/${id}`);
      navigate('/estudiantes/eliminar', { state: { mensaje: 'Estudiante eliminado con éxito.' } });
    } catch (err) {
      setError(primerError(err, 'No se pudo eliminar al estudiante.'));
      setEliminando(false);
    }
  }

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
    setMensaje('');
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
        // Vuelve a mostrar los datos (ya guardados) sin poder modificarlos.
        setOriginal(form);
        setRegistrado({ nombre_completo: form.nombre_completo, codigo_universitario: form.codigo_universitario });
        setMensaje('Estudiante actualizado con éxito.');
        return;
      }
      const res = await api.post('/estudiantes', payload);
      // HU-01 (14): el sistema muestra el mensaje y deja el formulario listo para otro registro.
      setRegistrado({
        nombre_completo: res.data?.nombre_completo ?? payload.nombre_completo,
        codigo_universitario: res.data?.codigo_universitario ?? payload.codigo_universitario,
      });
      setForm(initial);
      setMensaje('Estudiante registrado con éxito.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        icono={<StudentIcon size={22} />}
        titulo={TEXTOS[modo].titulo}
        descripcion={TEXTOS[modo].descripcion}
      />

      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      {/* Codigo QR: en Registrar (ultimo registrado) y en Datos del estudiante. */}
      {registrado && (modo === 'registrar' || (modo === 'datos' && editando)) && (
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-kairos-100/70 bg-white p-4 shadow-md">
          <button
            type="button"
            onClick={() => setVerQr(true)}
            className="shrink-0 rounded-lg border border-gray-200 p-1 hover:border-kairos-400"
            aria-label={`Ver código QR de ${registrado.nombre_completo}`}
          >
            <CodigoQR valor={registrado.codigo_universitario} tamano={64} />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{registrado.nombre_completo}</p>
            <p className="text-xs text-gray-500">Código QR para el Control de ingreso ({registrado.codigo_universitario})</p>
            <button type="button" onClick={() => setVerQr(true)} className="mt-1 text-sm font-medium text-kairos-600 hover:underline">
              Ver, descargar o imprimir
            </button>
          </div>
        </div>
      )}
      {(modo === 'editar' || modo === 'eliminar') && (
        <SelectorEstudiante
          modo={modo}
          seleccionado={editando ? (original ? { titulo: original.nombre_completo, detalle: `${original.codigo_universitario} · ${original.documento_identidad}` } : { titulo: 'Cargando...' }) : null}
        />
      )}

      {(modo === 'registrar' || editando) && (
        <>
          {modo === 'eliminar' && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Revisa los datos antes de eliminar. El estudiante se borrará definitivamente junto con sus carreras, inscripciones, habilitaciones e ingresos.
            </p>
          )}

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-6 space-y-4">
        <fieldset disabled={soloLectura} className="space-y-4">
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
                {form.carreras.length > 1 && !soloLectura && (
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
          {hayCarrerasSinUsar && !soloLectura && (
            <button
              type="button"
              onClick={agregarCarrera}
              className="mt-2 text-sm text-kairos-600 font-medium"
            >
              + Agregar otra carrera
            </button>
          )}
          {!soloLectura && (
            <p className="text-xs text-gray-400 mt-1">Un estudiante puede pertenecer a más de una carrera.</p>
          )}
        </Campo>
        </fieldset>

        <BotonesFormulario
          modo={modo}
          puedeGuardar={true}
          puedeEliminar={tiene('estudiantes.eliminar')}
          guardando={guardando}
          eliminando={eliminando}
          onCancelar={cancelar}
          onSalir={() => navigate('/estudiantes/lista')}
          onEliminar={eliminar}
        />
      </form>
        </>
      )}

      {verQr && registrado && <ModalQR estudiante={registrado} onCerrar={() => setVerQr(false)} />}
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
