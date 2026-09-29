import { useAuth } from '../api/AuthContext';

export default function Home() {
  const { usuario } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800">
        Hola, {usuario?.nombre_completo?.split(' ')[0]}
      </h1>
      <p className="text-gray-500 mt-1">
        Sistema de Control de Ingreso a Examenes Masivos - Kairos Digital Systems.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-400">Modulo</p>
          <p className="text-lg font-semibold text-kairos-700 mt-1">Estudiantes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-400">Modulo</p>
          <p className="text-lg font-semibold text-kairos-700 mt-1">Examenes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-400">Modulo</p>
          <p className="text-lg font-semibold text-kairos-700 mt-1">Habilitaciones</p>
        </div>
      </div>
    </div>
  );
}
