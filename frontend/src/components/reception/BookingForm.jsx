import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const BookingForm = ({ room, onSuccess }) => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    bookingType: 'HOURLY'
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post('/bookings', {
        roomId: room.id,
        ...formData
      });
      
      toast.success(`Check-in do quarto ${room.number} realizado!`);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erro ao realizar check-in');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Check-in - Quarto {room.number}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Cliente *
          </label>
          <input
            type="text"
            required
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <input
            type="tel"
            value={formData.customerPhone}
            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Alocação *
          </label>
          <select
            value={formData.bookingType}
            onChange={(e) => setFormData({ ...formData, bookingType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="HOURLY">Por Hora</option>
            <option value="OVERNIGHT">Pernoite</option>
          </select>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Preços:</h3>
          {formData.bookingType === 'HOURLY' ? (
            <p className="text-sm text-gray-600">
              R$ {room.type.hourlyRate.toFixed(2)} / hora<br />
              (Mínimo {room.type.initialHours} horas)
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              R$ {room.type.overnightRate.toFixed(2)} (Pernoite)
            </p>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar Check-in'}
          </button>
          <button
            type="button"
            onClick={onSuccess}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;