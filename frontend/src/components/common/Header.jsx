import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { HomeIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const Header = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <HomeIcon className="h-8 w-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              className="flex items-center space-x-2 text-gray-600 hover:text-primary-600"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              <span>Admin</span>
            </Link>
          )}
          <span className="text-sm text-gray-600">
            {user?.fullName} ({user?.role === 'ADMIN' ? 'Admin' : 'Operador'})
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;