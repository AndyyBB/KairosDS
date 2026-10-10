import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Auth/Login';
import Home from './pages/Home';
import EstudiantesList from './pages/Estudiantes/EstudiantesList';
import EstudianteForm from './pages/Estudiantes/EstudianteForm';
import AmbientesList from './pages/Ambientes/AmbientesList';
import ExamenesList from './pages/Examenes/ExamenesList';
import ProgramarExamen from './pages/Examenes/ProgramarExamen';
import HabilitarEstudiantes from './pages/Habilitaciones/HabilitarEstudiantes';
import UsuariosList from './pages/Usuarios/UsuariosList';
import UsuarioForm from './pages/Usuarios/UsuarioForm';
import ControlIngreso from './pages/ControlIngreso/ControlIngreso';
import RolesPermisos from './pages/Roles/RolesPermisos';
import RutaPermiso from './components/RutaPermiso';

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
        <Route path="estudiantes" element={<RutaPermiso permiso="estudiantes.ver"><EstudiantesList /></RutaPermiso>} />
        <Route path="estudiantes/nuevo" element={<RutaPermiso permiso="estudiantes.registrar"><EstudianteForm /></RutaPermiso>} />
        <Route path="estudiantes/:id/editar" element={<RutaPermiso permiso="estudiantes.editar"><EstudianteForm /></RutaPermiso>} />
        <Route path="ambientes" element={<RutaPermiso permiso="ambientes.ver"><AmbientesList /></RutaPermiso>} />
        <Route path="examenes" element={<RutaPermiso permiso="examenes.ver"><ExamenesList /></RutaPermiso>} />
        <Route path="examenes/programar" element={<RutaPermiso permiso="examenes.registrar"><ProgramarExamen /></RutaPermiso>} />
        <Route path="examenes/:examenId/habilitar" element={<RutaPermiso permiso="habilitaciones.ver"><HabilitarEstudiantes /></RutaPermiso>} />
        <Route path="control-ingreso" element={<RutaPermiso permiso="control_ingreso.ver"><ControlIngreso /></RutaPermiso>} />
        <Route path="usuarios" element={<RutaPermiso permiso="usuarios.ver"><UsuariosList /></RutaPermiso>} />
        <Route path="usuarios/nuevo" element={<RutaPermiso permiso="usuarios.registrar"><UsuarioForm /></RutaPermiso>} />
        <Route path="usuarios/:id/editar" element={<RutaPermiso permiso="usuarios.editar"><UsuarioForm /></RutaPermiso>} />
        <Route path="roles-permisos" element={<RutaPermiso soloAdmin><RolesPermisos /></RutaPermiso>} />
      </Route>
    </Routes>
  );
}
