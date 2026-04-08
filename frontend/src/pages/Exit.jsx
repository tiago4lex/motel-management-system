import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Header from '../components/common/Header';
import { useTTS } from '../hooks/useTTS';
import { CurrencyDollarIcon, ClockIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

const Exit = () => {
  const { api } = useAuth();
  const { socket } = useSocket();
  const { ttsService } = useTTS();
  const [activeBookings, setActiveBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveBookings();
    
    if (socket) {
      socket.on('booking-created', loadActiveBookings);
      socket.on('checkout-completed', loadActiveBookings);
      return () => {
        socket.off('booking-created');
        socket.off('checkout-completed');
      };
    }
  }, [socket]);

  const loadActiveBookings = async () => {
    try {
      const response = await api.get('/bookings/active');
      setActiveBookings(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar reservas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBillDetails = async (bookingId) => {
    try {
      const response = await api.get(`/bookings/${bookingId}`);
      const booking = response.data.data;
      setBillDetails(booking);
      setSelectedBooking(booking);
      
      // Anunciar via TTS
      ttsService.announceCheckout(booking.room.number, booking.totalAmount || booking.initialAmount);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
  };

  const processCheckout = async () => {
    if (!selectedBooking) return;
    
    try {
      await api.post(`/bookings/${selectedBooking.id}/checkout`);
      
      // Anunciar conclusão
      ttsService.speak(`Check-out do quarto ${selectedBooking.room.number} finalizado.`);
      
      setSelectedBooking(null);
      setBillDetails(null);
      loadActiveBookings();
    } catch (error) {
      console.error('Erro no checkout:', error);
    }
  };

  const announceBillAgain = () => {
    if (billDetails) {
      ttsService.announceCheckout(
        billDetails.room.number, 
        billDetails.totalAmount || billDetails.initialAmount
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      <Header title="Tela de Saída" />
      
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Quartos Ocupados */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-xl font-bold mb-4">Quartos Ocupados</h2>
              
              <div className="space-y-3">
                {activeBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => loadBillDetails(booking.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedBooking?.id === booking.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-2xl font-bold">Quarto {booking.room.number}</p>
                        <p className="text-sm text-gray-600">
                          Entrada: {new Date(booking.startTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{booking.customerName}</p>
                        <p className="text-sm text-gray-500">
                          {booking.bookingType === 'HOURLY' ? 'Por Hora' : 'Pernoite'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                
                {activeBookings.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum quarto ocupado no momento.
                  </p>
                )}
              </div>
            </div>
            
            {/* Detalhes da Conta */}
            {billDetails && (
              <div className="bg-white rounded-lg shadow-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Conta - Quarto {billDetails.room.number}</h2>
                  <button
                    onClick={announceBillAgain}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    🔊 Anunciar
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-5 w-5 text-gray-500" />
                      <span>Tempo utilizado</span>
                    </div>
                    <span className="font-medium">
                      {Math.ceil((new Date() - new Date(billDetails.startTime)) / (1000 * 60 * 60))} horas
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <CurrencyDollarIcon className="h-5 w-5 text-gray-500" />
                      <span>Valor base</span>
                    </div>
                    <span className="font-medium">R$ {billDetails.initialAmount.toFixed(2)}</span>
                  </div>
                  
                  {billDetails.consumptions && billDetails.consumptions.length > 0 && (
                    <div className="border-t pt-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <ShoppingBagIcon className="h-5 w-5 text-gray-500" />
                        <span className="font-medium">Consumos</span>
                      </div>
                      <div className="space-y-2">
                        {billDetails.consumptions.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.product.name} x{item.quantity}</span>
                            <span>R$ {item.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>TOTAL</span>
                      <span className="text-2xl text-green-600">
                        R$ {(billDetails.totalAmount || billDetails.initialAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={processCheckout}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors mt-4"
                  >
                    Confirmar Pagamento e Check-out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exit;