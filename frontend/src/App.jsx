import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RutaPermiso from './components/RutaPermiso';
import EntrarModulo, { RedirigirConId } from './components/EntrarModulo';
import Login from './pages/Auth/Login';
import Home from './pages/Home';
import EstudianteForm from './pages/Estudiantes/EstudianteForm';
import EstudiantesList from './pages/Estudiantes/EstudiantesList';
import RegistrarAmbiente from './pages/Ambientes/RegistrarAmbiente';
import AmbientesList from './pages/Ambientes/AmbientesList';
import ProgramarExamen from './pages/Examenes/ProgramarExamen';
import ExamenesList from './pages/Examenes/ExamenesList';
import HabilitarEstudiantes from './pages/Habilitaciones/HabilitarEstudiantes';
import InscribirEstudiantes from './pages/Habilitaciones/InscribirEstudiantes';
import ControlIngreso from './pages/ControlIngreso/ControlIngreso';
import GestionIngreso from './pages/ControlIngreso/GestionIngreso';
import UsuarioForm from './pages/Usuarios/UsuarioForm';
import UsuariosList from './pages/Usuarios/UsuariosList';
import RolesPermisos from './pages/Roles/RolesPermisos';
import ConsultaMotivo from './pages/Consultas/ConsultaMotivo';
import EstudiantesIngresados from './pages/Consultas/EstudiantesIngresados';
import RegistrarExpulsion from './pages/Incidencias/RegistrarExpulsion';
import RegistrarSituacion from './pages/Incidencias/RegistrarSituacion';
import ReporteAsistencia from './pages/Reportes/ReporteAsistencia';
import ReporteAusentismo from './pages/Reportes/ReporteAusentismo';
import ReporteIntentos from './pages/Reportes/ReporteIntentos';
import ReporteRegistrados from './pages/Reportes/ReporteRegistrados';
import HistorialOperaciones from './pages/Historial/HistorialOperaciones';

// Cada accion es una pantalla independiente: Lista, Registrar, Editar y Eliminar. La lista
// abre "Datos de ..." (solo lectura) al hacer clic en el nombre. Cada ruta exige el permiso
// de su accion (HU-17); la lista y los datos se ven con cualquier permiso del modulo.
const con = (permiso, elemento) => <RutaPermiso permiso={permiso}>{elemento}</RutaPermiso>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />

        {/* Estudiantes: Lista (clic en el nombre -> Datos, solo lectura), Registrar, Editar y Eliminar */}
        <Route path="estudiantes" element={<EntrarModulo base="/estudiantes" />} />
        <Route path="estudiantes/lista" element={con('estudiantes.ver', <EstudiantesList />)} />
        <Route path="estudiantes/registrar" element={con('estudiantes.registrar', <EstudianteForm key="registrar" modo="registrar" />)} />
        <Route path="estudiantes/datos/:id" element={con('estudiantes.ver', <EstudianteForm key="datos" modo="datos" />)} />
        <Route path="estudiantes/editar" element={con('estudiantes.editar', <EstudianteForm key="editar" modo="editar" />)} />
        <Route path="estudiantes/editar/:id" element={con('estudiantes.editar', <EstudianteForm key="editar" modo="editar" />)} />
        <Route path="estudiantes/eliminar" element={con('estudiantes.eliminar', <EstudianteForm key="eliminar" modo="eliminar" />)} />
        <Route path="estudiantes/eliminar/:id" element={con('estudiantes.eliminar', <EstudianteForm key="eliminar" modo="eliminar" />)} />

        {/* Ambientes */}
        <Route path="ambientes" element={<EntrarModulo base="/ambientes" />} />
        <Route path="ambientes/lista" element={con('ambientes.ver', <AmbientesList />)} />
        <Route path="ambientes/registrar" element={con('ambientes.registrar', <RegistrarAmbiente key="registrar" modo="registrar" />)} />
        <Route path="ambientes/datos/:id" element={con('ambientes.ver', <RegistrarAmbiente key="datos" modo="datos" />)} />
        <Route path="ambientes/editar" element={con('ambientes.editar', <RegistrarAmbiente key="editar" modo="editar" />)} />
        <Route path="ambientes/editar/:id" element={con('ambientes.editar', <RegistrarAmbiente key="editar" modo="editar" />)} />
        <Route path="ambientes/eliminar" element={con('ambientes.eliminar', <RegistrarAmbiente key="eliminar" modo="eliminar" />)} />
        <Route path="ambientes/eliminar/:id" element={con('ambientes.eliminar', <RegistrarAmbiente key="eliminar" modo="eliminar" />)} />

        {/* Examenes: Lista, Programar, Editar, Eliminar y Habilitar estudiantes */}
        <Route path="examenes" element={<EntrarModulo base="/examenes" />} />
        <Route path="examenes/lista" element={con('examenes.ver', <ExamenesList />)} />
        <Route path="examenes/programar" element={con('examenes.registrar', <ProgramarExamen key="registrar" modo="registrar" />)} />
        <Route path="examenes/datos/:id" element={con('examenes.ver', <ProgramarExamen key="datos" modo="datos" />)} />
        <Route path="examenes/editar" element={con('examenes.editar', <ProgramarExamen key="editar" modo="editar" />)} />
        <Route path="examenes/editar/:id" element={con('examenes.editar', <ProgramarExamen key="editar" modo="editar" />)} />
        <Route path="examenes/eliminar" element={con('examenes.eliminar', <ProgramarExamen key="eliminar" modo="eliminar" />)} />
        <Route path="examenes/eliminar/:id" element={con('examenes.eliminar', <ProgramarExamen key="eliminar" modo="eliminar" />)} />
        <Route path="examenes/inscribir" element={con(['habilitaciones.registrar', 'habilitaciones.editar'], <InscribirEstudiantes />)} />
        <Route path="examenes/inscribir/:examenId" element={con(['habilitaciones.registrar', 'habilitaciones.editar'], <InscribirEstudiantes />)} />
        <Route path="examenes/habilitar" element={con('habilitaciones.ver', <HabilitarEstudiantes />)} />
        <Route path="examenes/habilitar/:examenId" element={con('habilitaciones.ver', <HabilitarEstudiantes />)} />

        {/* Control de ingreso: Registrar ingreso, Editar ingreso y Eliminar ingreso */}
        <Route path="control-ingreso" element={<EntrarModulo base="/control-ingreso" />} />
        <Route path="control-ingreso/registrar" element={con('control_ingreso.registrar', <ControlIngreso />)} />
        <Route path="control-ingreso/editar" element={con('control_ingreso.editar', <GestionIngreso key="editar" modo="editar" />)} />
        <Route path="control-ingreso/eliminar" element={con('control_ingreso.eliminar', <GestionIngreso key="eliminar" modo="eliminar" />)} />

        {/* Usuarios */}
        <Route path="usuarios" element={<EntrarModulo base="/usuarios" />} />
        <Route path="usuarios/lista" element={con('usuarios.ver', <UsuariosList />)} />
        <Route path="usuarios/registrar" element={con('usuarios.registrar', <UsuarioForm key="registrar" modo="registrar" />)} />
        <Route path="usuarios/datos/:id" element={con('usuarios.ver', <UsuarioForm key="datos" modo="datos" />)} />
        <Route path="usuarios/editar" element={con('usuarios.editar', <UsuarioForm key="editar" modo="editar" />)} />
        <Route path="usuarios/editar/:id" element={con('usuarios.editar', <UsuarioForm key="editar" modo="editar" />)} />
        <Route path="usuarios/eliminar" element={con('usuarios.eliminar', <UsuarioForm key="eliminar" modo="eliminar" />)} />
        <Route path="usuarios/eliminar/:id" element={con('usuarios.eliminar', <UsuarioForm key="eliminar" modo="eliminar" />)} />

        {/* Sprint 3: Consultas (HU-05, HU-18) */}
        <Route path="consultas" element={<EntrarModulo base="/consultas" />} />
        <Route path="consultas/motivo" element={con('control_ingreso.ver', <ConsultaMotivo />)} />
        <Route
          path="consultas/ingresados"
          element={<RutaPermiso permiso="control_ingreso.ver" roles={['administrador', 'docente']}><EstudiantesIngresados /></RutaPermiso>}
        />

        {/* Sprint 3: Incidencias (HU-24, HU-25) */}
        <Route path="incidencias" element={<EntrarModulo base="/incidencias" />} />
        <Route path="incidencias/expulsion" element={con('control_ingreso.registrar', <RegistrarExpulsion />)} />
        <Route path="incidencias/situacion" element={con('control_ingreso.registrar', <RegistrarSituacion />)} />

        {/* Sprint 3: Reportes (HU-19, HU-20, HU-21, HU-22): Administrador y Docente */}
        <Route path="reportes" element={<EntrarModulo base="/reportes" />} />
        <Route path="reportes/asistencia" element={<RutaPermiso roles={['administrador', 'docente']}><ReporteAsistencia /></RutaPermiso>} />
        <Route path="reportes/ausentismo" element={<RutaPermiso roles={['administrador', 'docente']}><ReporteAusentismo /></RutaPermiso>} />
        <Route path="reportes/intentos" element={<RutaPermiso roles={['administrador', 'docente']}><ReporteIntentos /></RutaPermiso>} />
        <Route path="reportes/registrados" element={<RutaPermiso roles={['administrador', 'docente']}><ReporteRegistrados /></RutaPermiso>} />

        {/* Sprint 3: Historial de operaciones (HU-27): solo el administrador; otro rol vuelve a Inicio */}
        <Route path="historial" element={<RutaPermiso soloAdmin alInicio><HistorialOperaciones /></RutaPermiso>} />

        {/* Roles y permisos */}
        <Route path="roles-permisos" element={<RutaPermiso soloAdmin><RolesPermisos /></RutaPermiso>} />

        {/* Rutas anteriores: se redirigen a las pantallas nuevas */}
        <Route path="estudiantes/nuevo" element={<Navigate to="/estudiantes/registrar" replace />} />
        <Route path="estudiantes/:id/editar" element={<RedirigirConId a="/estudiantes/editar/:id" />} />
        <Route path="usuarios/nuevo" element={<Navigate to="/usuarios/registrar" replace />} />
        <Route path="usuarios/:id/editar" element={<RedirigirConId a="/usuarios/editar/:id" />} />
        <Route path="examenes/:examenId/habilitar" element={<RedirigirConId a="/examenes/habilitar/:id" />} />
        <Route path="examenes/cancelar" element={<Navigate to="/examenes/eliminar" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
