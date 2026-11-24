import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import KairosLogo from '../../components/KairosLogo';

// HU-41: pantalla publica que se abre con el boton "Aceptar invitación" del correo.
// No requiere iniciar sesion: al abrirla se acepta la invitacion y el estudiante queda
// inscrito en el examen. Se muestran los datos del examen y el resultado.
export default function AceptarInvitacion() {
  const { token } = useParams();
  const [estado, setEstado] = useState('cargando'); // cargando | ok | error
  const [mensaje, setMensaje] = useState('');
  const [datos, setDatos] = useState(null);
  const enviado = useRef(false);

  useEffect(() => {
    // Se acepta una sola vez aunque React monte el componente dos veces en desarrollo.
    if (enviado.current) return;
    enviado.current = true;
    api
      .post(`/invitaciones/${token}/aceptar`)
      .then((res) => {
        setEstado('ok');
        setMensaje(res.data.message);
        setDatos(res.data);
      })
      .catch((err) => {
        setEstado('error');
        setMensaje(primerError(err, 'No se pudo aceptar la invitación. Intente nuevamente en unos minutos.'));
        setDatos(err?.response?.data?.examen ? err.response.data : null);
      });
  }, [token]);

  const examen = datos?.examen;

  return (
    <div className="min-h-screen flex items-center justify-center bg-kairos-gradient px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-white/20 p-8">
        <div className="flex flex-col items-center gap-3 mb-5">
          <KairosLogo size={56} />
          <h1 className="text-lg font-semibold text-gray-800">Invitación al examen</h1>
        </div>

        {estado === 'cargando' && <p className="text-center text-sm text-gray-500">Aceptando la invitación...</p>}

        {estado !== 'cargando' && (
          <div
            role="status"
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              estado === 'ok' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {mensaje}
          </div>
        )}

        {examen && (
          <dl className="rounded-lg border border-kairos-100 bg-kairos-50/50 divide-y divide-kairos-100 text-sm">
            {datos.estudiante && <Fila etiqueta="Estudiante" valor={datos.estudiante} />}
            <Fila etiqueta="Asignatura" valor={examen.materia} />
            <Fila etiqueta="Fecha" valor={examen.fecha} />
            <Fila etiqueta="Hora" valor={examen.hora} />
            <Fila etiqueta="Duración" valor={`${examen.duracion_min} minutos`} />
            <Fila etiqueta="Ambiente" valor={examen.ambientes || '-'} />
          </dl>
        )}

        {estado === 'ok' && (
          <p className="mt-4 text-xs text-gray-500">
            El docente te marcará como habilitado o no habilitado para rendir el examen. El día del examen presenta tu código
            universitario, tu documento de identidad o tu código QR en el control de ingreso.
          </p>
        )}
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor }) {
  return (
    <div className="flex gap-3 px-4 py-2">
      <dt className="w-24 shrink-0 text-gray-500">{etiqueta}</dt>
      <dd className="font-medium text-gray-800">{valor}</dd>
    </div>
  );
}
