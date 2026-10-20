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
import ControlIngreso from './pages/ControlIngreso/ControlIngreso';
import UsuarioForm from './pages/Usuarios/UsuarioForm';
import UsuariosList from './pages/Usuarios/UsuariosList';
import RolesPermisos from './pages/Roles/RolesPermisos';

// Cada modulo tiene su Lista y su pantalla de Registro independientes; editar y
// eliminar se hacen en "Datos de ...", que se abre desde la lista (clic en el nombre).
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

        {/* Estudiantes: Lista (clic en el nombre -> Editar / Desactivar) y Registrar */}
        <Route path="estudiantes" element={<EntrarModulo base="/estudiantes" />} />
        <Route path="estudiantes/lista" element={con('estudiantes.ver', <EstudiantesList />)} />
        <Route path="estudiantes/registrar" element={con('estudiantes.registrar', <EstudianteForm key="registrar" />)} />
        <Route path="estudiantes/datos/:id" element={con(['estudiantes.editar', 'estudiantes.eliminar'], <EstudianteForm key="editar" />)} />

        {/* Ambientes */}
        <Route path="ambientes" element={<EntrarModulo base="/ambientes" />} />
        <Route path="ambientes/lista" element={con('ambientes.ver', <AmbientesList />)} />
        <Route path="ambientes/registrar" element={con('ambientes.registrar', <RegistrarAmbiente key="registrar" />)} />
        <Route path="ambientes/datos/:id" element={con(['ambientes.editar', 'ambientes.eliminar'], <RegistrarAmbiente key="editar" />)} />

        {/* Examenes: Lista (clic en la asignatura -> Editar / Cancelar), Programar y Habilitar */}
        <Route path="examenes" element={<EntrarModulo base="/examenes" />} />
        <Route path="examenes/lista" element={con('examenes.ver', <ExamenesList />)} />
        <Route path="examenes/programar" element={con('examenes.registrar', <ProgramarExamen key="programar" />)} />
        <Route path="examenes/datos/:id" element={con(['examenes.editar', 'examenes.eliminar'], <ProgramarExamen key="editar" />)} />
        <Route path="examenes/habilitar" element={con('habilitaciones.ver', <HabilitarEstudiantes />)} />
        <Route path="examenes/habilitar/:examenId" element={con('habilitaciones.ver', <HabilitarEstudiantes />)} />

        {/* Control de ingreso */}
        <Route path="control-ingreso" element={con('control_ingreso.ver', <ControlIngreso />)} />

        {/* Usuarios */}
        <Route path="usuarios" element={<EntrarModulo base="/usuarios" />} />
        <Route path="usuarios/lista" element={con('usuarios.ver', <UsuariosList />)} />
        <Route path="usuarios/registrar" element={con('usuarios.registrar', <UsuarioForm key="registrar" />)} />
        <Route path="usuarios/datos/:id" element={con(['usuarios.editar', 'usuarios.eliminar'], <UsuarioForm key="editar" />)} />

        {/* Roles y permisos */}
        <Route path="roles-permisos" element={<RutaPermiso soloAdmin><RolesPermisos /></RutaPermiso>} />

        {/* Rutas anteriores: se redirigen a las pantallas nuevas */}
        <Route path="estudiantes/nuevo" element={<Navigate to="/estudiantes/registrar" replace />} />
        <Route path="estudiantes/:id/editar" element={<RedirigirConId a="/estudiantes/datos/:id" />} />
        <Route path="usuarios/nuevo" element={<Navigate to="/usuarios/registrar" replace />} />
        <Route path="usuarios/:id/editar" element={<RedirigirConId a="/usuarios/datos/:id" />} />
        <Route path="examenes/:examenId/habilitar" element={<RedirigirConId a="/examenes/habilitar/:id" />} />
        <Route path="estudiantes/editar" element={<Navigate to="/estudiantes/lista" replace />} />
        <Route path="estudiantes/editar/:id" element={<RedirigirConId a="/estudiantes/datos/:id" />} />
        <Route path="ambientes/editar/:id" element={<RedirigirConId a="/ambientes/datos/:id" />} />
        <Route path="examenes/editar/:id" element={<RedirigirConId a="/examenes/datos/:id" />} />
        <Route path="usuarios/editar/:id" element={<RedirigirConId a="/usuarios/datos/:id" />} />
        <Route path="estudiantes/eliminar" element={<Navigate to="/estudiantes/lista" replace />} />
        <Route path="ambientes/eliminar" element={<Navigate to="/ambientes/lista" replace />} />
        <Route path="examenes/cancelar" element={<Navigate to="/examenes/lista" replace />} />
        <Route path="usuarios/editar" element={<Navigate to="/usuarios/lista" replace />} />
        <Route path="usuarios/eliminar" element={<Navigate to="/usuarios/lista" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
