import { useState } from 'react';
import api from '../../api/client';
import { primerError } from '../../api/errores';
import Aviso from '../../components/Aviso';
import Encabezado from '../../components/Encabezado';
import { BaseDatosIcon } from '../../components/Iconos';

function Dato({ etiqueta, valor }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-6 py-1.5 text-sm border-t border-gray-50 first:border-0">
      <dt className="sm:w-44 sm:shrink-0 text-gray-500">{etiqueta}</dt>
      <dd className="text-gray-800 break-all">{valor}</dd>
    </div>
  );
}

// HU-28: Respaldo de registros (solo el administrador).
export default function RespaldarRegistros() {
  const [generando, setGenerando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [respaldo, setRespaldo] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function generar() {
    setMensaje('');
    setError('');
    setGenerando(true);
    try {
      const res = await api.post('/respaldos');
      setRespaldo(res.data.respaldo);
      setMensaje(res.data.message);
    } catch (err) {
      setRespaldo(null);
      setError(primerError(err, 'No se pudo generar el respaldo. Intente nuevamente.'));
    } finally {
      setGenerando(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Descarga el archivo .sql al dispositivo del usuario.
  async function descargar() {
    if (!respaldo) return;
    setError('');
    setDescargando(true);
    try {
      const res = await api.get(`/respaldos/${respaldo.id}/descargar`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = respaldo.archivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError('No se pudo descargar el respaldo. Intente nuevamente.');
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Encabezado
        icono={<BaseDatosIcon size={22} />}
        titulo="Respaldar registros"
        descripcion='Genera una copia de seguridad de los registros del sistema y presiona "Descargar respaldo" para guardarla.'
      />
      <Aviso mensaje={mensaje} onCerrar={() => setMensaje('')} />
      <Aviso mensaje={error} tipo="error" onCerrar={() => setError('')} />

      <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-6 mb-5">
        <h2 className="text-base font-semibold text-gray-800 mb-2">Generar respaldo</h2>
        <p className="text-sm text-gray-600">
          El respaldo incluye todos los registros del sistema: estudiantes, ambientes, exámenes, inscripciones y habilitaciones,
          ingresos, intentos de ingreso, expulsiones, incidencias, usuarios, roles y permisos, e historial de operaciones.
        </p>
        <p className="text-xs text-gray-400 mt-2">Generar el respaldo no modifica ni detiene el sistema.</p>
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={generar}
            disabled={generando}
            className="bg-kairos-gradient text-white rounded-lg px-5 py-2 text-sm font-medium shadow-glow disabled:opacity-60"
          >
            {generando ? 'Generando respaldo...' : 'Generar respaldo'}
          </button>
        </div>
      </div>

      {respaldo && (
        <div className="bg-white rounded-xl border border-kairos-100/70 shadow-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-base font-semibold text-gray-800">Respaldo generado</h2>
            <span className="rounded-full border border-green-300 bg-green-50 text-green-700 font-semibold text-xs px-3 py-1">
              {respaldo.estado}
            </span>
          </div>
          <dl>
            <Dato etiqueta="Archivo" valor={respaldo.archivo} />
            <Dato etiqueta="Tamaño" valor={respaldo.tamano} />
            <Dato etiqueta="Fecha y hora" valor={respaldo.fecha_hora} />
            <Dato etiqueta="Generado por" valor={respaldo.generado_por} />
          </dl>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={descargar}
              disabled={descargando}
              className="border border-kairos-600 text-kairos-700 text-sm font-medium rounded-lg px-5 py-2 hover:bg-kairos-50 disabled:opacity-60"
            >
              {descargando ? 'Descargando...' : 'Descargar respaldo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
