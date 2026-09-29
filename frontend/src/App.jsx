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
        <Route path="estudiantes" element={<EstudiantesList />} />
        <Route path="estudiantes/nuevo" element={<EstudianteForm />} />
        <Route path="estudiantes/:id/editar" element={<EstudianteForm />} />
        <Route path="ambientes" element={<AmbientesList />} />
        <Route path="examenes" element={<ExamenesList />} />
        <Route path="examenes/programar" element={<ProgramarExamen />} />
        <Route path="examenes/:examenId/habilitar" element={<HabilitarEstudiantes />} />
        <Route path="usuarios" element={<UsuariosList />} />
        <Route path="usuarios/nuevo" element={<UsuarioForm />} />
        <Route path="usuarios/:id/editar" element={<UsuarioForm />} />
      </Route>
    </Routes>
  );
}
