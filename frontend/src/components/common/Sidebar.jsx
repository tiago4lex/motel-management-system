import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const menuItems = [
    { path: '/reception', icon: HomeIcon, label: 'Recepção', roles: ['ADMIN', 'OPERATOR'] },
    { path: '/entrance', icon: ArrowLeftOnRectangleIcon, label: 'Entrada', roles: ['ADMIN', 'OPERATOR'] },
    { path: '/exit', icon: ClipboardDocumentListIcon, label: 'Saída', roles: ['ADMIN', 'OPERATOR'] },
    { path: '/reports', icon: ChartBarIcon, label: 'Relatórios', roles: ['ADMIN', 'OPERATOR'] },
    { path: '/admin', icon: Cog6ToothIcon, label: 'Admin', roles: ['ADMIN'] },
  ];
  
  const filteredItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );
  
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-xl font-bold">Motel Manager</h2>
        <p className="text-sm text-gray-400 mt-1">Sistema de Gestão</p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-2 w-full rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;