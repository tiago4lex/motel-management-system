import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));

  // URL base da API - IMPORTANTE: sem barra no final
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  const api = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Importante para CORS com credenciais
  });

  // Interceptor para adicionar token
  api.interceptors.request.use((config) => {
    const currentToken = localStorage.getItem('accessToken');
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    console.log('📤 Requisição:', config.method.toUpperCase(), config.url);
    return config;
  });

  // Interceptor para refresh token
  api.interceptors.response.use(
    (response) => {
      console.log('📥 Resposta:', response.status, response.config.url);
      return response;
    },
    async (error) => {
      console.error('❌ Erro na requisição:', error.response?.status, error.config?.url);
      
      const originalRequest = error.config;
      
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          const response = await axios.post(
            `${API_URL}/api/v1/auth/refresh`,
            { refreshToken },
            { withCredentials: true }
          );
          
          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          
          return api(originalRequest);
        } catch (refreshError) {
          logout();
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );

  const login = async (username, password) => {
    try {
      console.log('🔐 Tentando login com:', username);
      const response = await api.post('/auth/login', { username, password });
      const { user, accessToken, refreshToken } = response.data.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setToken(accessToken);
      setUser(user);
      
      console.log('✅ Login bem sucedido:', user.fullName);
      toast.success(`Bem-vindo, ${user.fullName}!`);
      return true;
    } catch (error) {
      console.error('❌ Erro no login:', error.response?.data);
      toast.error(error.response?.data?.error?.message || 'Erro ao fazer login');
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setToken(null);
      setUser(null);
      toast.success('Logout realizado com sucesso');
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.data);
        } catch (error) {
          console.error('Erro ao carregar usuário:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setToken(null);
        }
      }
      setLoading(false);
    };
    
    loadUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, api }}>
      {children}
    </AuthContext.Provider>
  );
};