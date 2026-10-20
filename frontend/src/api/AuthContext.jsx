import { createContext, useContext, useEffect, useState } from 'react';
import api from './client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kairos_token');
    if (!token) {
      setCargando(false);
      return;
    }
    api
      .get('/me')
      .then((res) => setUsuario(res.data))
      .catch(() => localStorage.removeItem('kairos_token'))
      .finally(() => setCargando(false));
  }, []);

  async function login(correo_electronico, password) {
    const res = await api.post('/login', { correo_electronico, password });
    localStorage.setItem('kairos_token', res.data.token);
    setUsuario(res.data.usuario);
    return res.data.usuario;
  }

  async function logout() {
    try {
      await api.post('/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('kairos_token');
    setUsuario(null);
  }

  // HU-17: permisos "modulo.accion" que el rol tenia al iniciar sesion.
  // "Ver" no se configura aparte: queda habilitado al tener Registrar, Editar o Eliminar.
  function tiene(permiso) {
    const lista = usuario?.permisos ?? [];
    if (lista.includes(permiso)) return true;
    if (permiso.endsWith('.ver')) {
      const modulo = permiso.slice(0, -'.ver'.length);
      return lista.some((p) => p.startsWith(`${modulo}.`));
    }
    return false;
  }

  const esAdministrador = usuario?.rol?.nombre === 'administrador';

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, tiene, esAdministrador }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
