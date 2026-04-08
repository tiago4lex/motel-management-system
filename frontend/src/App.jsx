import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import PrivateRoute from './components/common/PrivateRoute';
import Login from './pages/Login';
import Reception from './pages/Reception';
import Entrance from './pages/Entrance';
import Exit from './pages/Exit';
import Admin from './pages/Admin';
import Reports from './pages/Reports';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen bg-gray-100">
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reception" element={
                <PrivateRoute>
                  <Reception />
                </PrivateRoute>
              } />
              <Route path="/entrance" element={
                <PrivateRoute>
                  <Entrance />
                </PrivateRoute>
              } />
              <Route path="/exit" element={
                <PrivateRoute>
                  <Exit />
                </PrivateRoute>
              } />
              <Route path="/admin" element={
                <PrivateRoute allowedRoles={['ADMIN']}>
                  <Admin />
                </PrivateRoute>
              } />
              <Route path="/reports" element={
                <PrivateRoute>
                  <Reports />
                </PrivateRoute>
              } />
              <Route path="/" element={<Navigate to="/reception" />} />
            </Routes>
          </div>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;