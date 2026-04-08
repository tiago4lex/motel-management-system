import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/common/Header';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  UserGroupIcon,
  HomeIcon,
  TagIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Admin = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('rooms');
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'rooms') {
        const [roomsRes, typesRes] = await Promise.all([
          api.get('/admin/rooms'),
          api.get('/admin/room-types')
        ]);
        setRooms(roomsRes.data.data);
        setRoomTypes(typesRes.data.data);
      } else if (activeTab === 'roomTypes') {
        const response = await api.get('/admin/room-types');
        setRoomTypes(response.data.data);
      } else if (activeTab === 'products') {
        const response = await api.get('/admin/products');
        setProducts(response.data.data);
      } else if (activeTab === 'users') {
        const response = await api.get('/admin/users');
        setUsers(response.data.data);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'rooms') {
        if (editingItem) {
          await api.put(`/admin/rooms/${editingItem.id}`, formData);
          toast.success('Quarto atualizado com sucesso');
        } else {
          await api.post('/admin/rooms', formData);
          toast.success('Quarto criado com sucesso');
        }
      } else if (activeTab === 'roomTypes') {
        if (editingItem) {
          await api.put(`/admin/room-types/${editingItem.id}`, formData);
          toast.success('Tipo de quarto atualizado com sucesso');
        } else {
          await api.post('/admin/room-types', formData);
          toast.success('Tipo de quarto criado com sucesso');
        }
      } else if (activeTab === 'products') {
        if (editingItem) {
          await api.put(`/admin/products/${editingItem.id}`, formData);
          toast.success('Produto atualizado com sucesso');
        } else {
          await api.post('/admin/products', formData);
          toast.success('Produto criado com sucesso');
        }
      } else if (activeTab === 'users') {
        if (editingItem) {
          await api.put(`/admin/users/${editingItem.id}`, formData);
          toast.success('Usuário atualizado com sucesso');
        } else {
          await api.post('/admin/users', formData);
          toast.success('Usuário criado com sucesso');
        }
      }
      
      setShowModal(false);
      setEditingItem(null);
      setFormData({});
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id, type, name) => {
    if (window.confirm(`Tem certeza que deseja excluir ${name}?`)) {
      try {
        if (type === 'room') {
          await api.delete(`/admin/rooms/${id}`);
        } else if (type === 'roomType') {
          await api.delete(`/admin/room-types/${id}`);
        } else if (type === 'product') {
          await api.delete(`/admin/products/${id}`);
        } else if (type === 'user') {
          await api.delete(`/admin/users/${id}`);
        }
        toast.success('Excluído com sucesso');
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir');
      }
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData(getDefaultFormData());
    }
    setShowModal(true);
  };

  const getDefaultFormData = () => {
    if (activeTab === 'rooms') {
      return { number: '', typeId: '', floor: '', description: '' };
    } else if (activeTab === 'roomTypes') {
      return { name: '', description: '', initialPrice: 0, hourlyRate: 0, overnightRate: 0, cleaningTime: 30 };
    } else if (activeTab === 'products') {
      return { code: '', name: '', description: '', price: 0, cost: 0, category: '', stockQuantity: 0, stockControlled: true, minStockAlert: 5 };
    } else if (activeTab === 'users') {
      return { username: '', email: '', password: '', fullName: '', role: 'OPERATOR' };
    }
    return {};
  };

  const TabButton = ({ tab, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-primary-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );

  const renderModalForm = () => {
    if (activeTab === 'rooms') {
      return (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Número do Quarto *"
            value={formData.number || ''}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          <select
            value={formData.typeId || ''}
            onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          >
            <option value="">Selecione o Tipo</option>
            {roomTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Andar"
            value={formData.floor || ''}
            onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
          />
          <textarea
            placeholder="Descrição"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            rows="3"
          />
        </div>
      );
    }
    
    if (activeTab === 'roomTypes') {
      return (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Nome *"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          <textarea
            placeholder="Descrição"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            rows="2"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Preço Inicial"
              value={formData.initialPrice || 0}
              onChange={(e) => setFormData({ ...formData, initialPrice: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor por Hora"
              value={formData.hourlyRate || 0}
              onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor Pernoite"
              value={formData.overnightRate || 0}
              onChange={(e) => setFormData({ ...formData, overnightRate: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            <input
              type="number"
              placeholder="Tempo Limpeza (min)"
              value={formData.cleaningTime || 30}
              onChange={(e) => setFormData({ ...formData, cleaningTime: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
      );
    }
    
    if (activeTab === 'products') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Código (3 dígitos) *"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              maxLength="3"
              required
            />
            <input
              type="text"
              placeholder="Nome *"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <textarea
            placeholder="Descrição"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            rows="2"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Categoria"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Preço *"
              value={formData.price || 0}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Custo"
              value={formData.cost || 0}
              onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="number"
              placeholder="Estoque Inicial"
              value={formData.stockQuantity || 0}
              onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.stockControlled !== false}
              onChange={(e) => setFormData({ ...formData, stockControlled: e.target.checked })}
              className="rounded"
            />
            <span>Controlar estoque</span>
          </label>
        </div>
      );
    }
    
    if (activeTab === 'users') {
      return (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Usuário *"
            value={formData.username || ''}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          <input
            type="email"
            placeholder="Email *"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          <input
            type="password"
            placeholder={editingItem ? "Nova senha (deixe em branco para manter)" : "Senha *"}
            value={formData.password || ''}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required={!editingItem}
          />
          <input
            type="text"
            placeholder="Nome Completo *"
            value={formData.fullName || ''}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          <select
            value={formData.role || 'OPERATOR'}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="OPERATOR">Operador</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
      );
    }
    
    return null;
  };

  const renderTable = () => {
    if (activeTab === 'rooms') {
      return (
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Nº</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Andar</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2 font-bold">{item.number}</td>
                <td className="px-4 py-2">{item.type?.name}</td>
                <td className="px-4 py-2">{item.floor || '-'}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                    item.status === 'OCCUPIED' ? 'bg-red-100 text-red-800' :
                    item.status === 'CLEANING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status === 'AVAILABLE' ? 'Disponível' :
                     item.status === 'OCCUPIED' ? 'Ocupado' :
                     item.status === 'CLEANING' ? 'Limpeza' : 'Manutenção'}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-700 mx-1">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(item.id, 'room', `Quarto ${item.number}`)} className="text-red-600 hover:text-red-700 mx-1">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    
    if (activeTab === 'roomTypes') {
      return (
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">Preço Inicial</th>
              <th className="px-4 py-2 text-left">Hora</th>
              <th className="px-4 py-2 text-left">Pernoite</th>
              <th className="px-4 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {roomTypes.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2 font-bold">{item.name}</td>
                <td className="px-4 py-2">R$ {item.initialPrice.toFixed(2)}</td>
                <td className="px-4 py-2">R$ {item.hourlyRate.toFixed(2)}</td>
                <td className="px-4 py-2">R$ {item.overnightRate.toFixed(2)}</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-700 mx-1">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(item.id, 'roomType', item.name)} className="text-red-600 hover:text-red-700 mx-1">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    
    if (activeTab === 'products') {
      return (
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Código</th>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">Categoria</th>
              <th className="px-4 py-2 text-left">Preço</th>
              <th className="px-4 py-2 text-left">Estoque</th>
              <th className="px-4 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2 font-mono">{item.code}</td>
                <td className="px-4 py-2">{item.name}</td>
                <td className="px-4 py-2">{item.category}</td>
                <td className="px-4 py-2">R$ {item.price.toFixed(2)}</td>
                <td className="px-4 py-2">{item.stockControlled ? item.stockQuantity : 'N/C'}</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-700 mx-1">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(item.id, 'product', item.name)} className="text-red-600 hover:text-red-700 mx-1">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    
    if (activeTab === 'users') {
      return (
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Usuário</th>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Perfil</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2 font-bold">{item.username}</td>
                <td className="px-4 py-2">{item.fullName}</td>
                <td className="px-4 py-2">{item.email}</td>
                <td className="px-4 py-2">
                  {item.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {item.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-700 mx-1">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(item.id, 'user', item.fullName)} className="text-red-600 hover:text-red-700 mx-1">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header title="Administração" />
      
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 p-4">
            <div className="flex flex-wrap gap-2">
              <TabButton tab="rooms" label="Quartos" icon={HomeIcon} />
              <TabButton tab="roomTypes" label="Tipos de Quarto" icon={TagIcon} />
              <TabButton tab="products" label="Produtos" icon={CubeIcon} />
              <TabButton tab="users" label="Usuários" icon={UserGroupIcon} />
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {activeTab === 'rooms' && 'Gerenciar Quartos'}
                {activeTab === 'roomTypes' && 'Tipos de Quarto'}
                {activeTab === 'products' && 'Produtos'}
                {activeTab === 'users' && 'Usuários'}
              </h2>
              <button
                onClick={() => openModal()}
                className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Adicionar</span>
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {renderTable()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">
                {editingItem ? 'Editar' : 'Adicionar'}
                {activeTab === 'rooms' && ' Quarto'}
                {activeTab === 'roomTypes' && ' Tipo de Quarto'}
                {activeTab === 'products' && ' Produto'}
                {activeTab === 'users' && ' Usuário'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4">
              {renderModalForm()}
            </div>
            
            <div className="flex space-x-3 p-4 border-t">
              <button
                onClick={handleSave}
                className="flex-1 bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 flex items-center justify-center gap-2"
              >
                <CheckIcon className="h-5 w-5" />
                Salvar
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;