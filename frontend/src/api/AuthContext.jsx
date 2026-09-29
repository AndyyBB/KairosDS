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

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
