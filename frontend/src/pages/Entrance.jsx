import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Header from '../components/common/Header';
import { useTTS } from '../hooks/useTTS';
import { MegaphoneIcon } from '@heroicons/react/24/outline';

const Entrance = () => {
  const { api } = useAuth();
  const { socket } = useSocket();
  const { ttsService } = useTTS();
  const [availableRooms, setAvailableRooms] = useState([]);
  const [suggestedRoom, setSuggestedRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableRooms();
    
    if (socket) {
      socket.on('room-status-update', loadAvailableRooms);
      return () => socket.off('room-status-update');
    }
  }, [socket]);

  const loadAvailableRooms = async () => {
    try {
      const response = await api.get('/rooms/available?status=AVAILABLE');
      const rooms = response.data.data;
      setAvailableRooms(rooms);
      
      if (rooms.length > 0 && !suggestedRoom) {
        const suggested = rooms[0];
        setSuggestedRoom(suggested);
        
        // Anunciar via TTS
        ttsService.announceRoomAvailable(suggested.number, suggested.type.name);
      }
    } catch (error) {
      console.error('Erro ao carregar quartos:', error);
    } finally {
      setLoading(false);
    }
  };

  const announceAgain = () => {
    if (suggestedRoom) {
      ttsService.announceRoomAvailable(suggestedRoom.number, suggestedRoom.type.name);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header title="Tela de Entrada" />
      
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
            <h2 className="text-3xl font-bold text-center mb-6">
              🏨 Bem-vindo ao Motel Manager
            </h2>
            
            {suggestedRoom && (
              <div className="text-center mb-8">
                <div className="inline-block bg-green-100 rounded-lg p-6">
                  <p className="text-lg text-gray-600">Quarto Sugerido</p>
                  <p className="text-6xl font-bold text-green-600 my-2">
                    {suggestedRoom.number}
                  </p>
                  <p className="text-gray-500">Tipo: {suggestedRoom.type.name}</p>
                  <p className="text-gray-500">Andar: {suggestedRoom.floor || 'Térreo'}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={announceAgain}
              className="mx-auto flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <MegaphoneIcon className="h-5 w-5" />
              <span>Anunciar Novamente</span>
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4">Quartos Disponíveis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {availableRooms.map((room) => (
                <div
                  key={room.id}
                  className={`border rounded-lg p-4 text-center ${
                    suggestedRoom?.id === room.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  <p className="text-2xl font-bold">{room.number}</p>
                  <p className="text-sm text-gray-600">{room.type.name}</p>
                  {suggestedRoom?.id === room.id && (
                    <span className="inline-block mt-2 text-xs bg-green-500 text-white px-2 py-1 rounded">
                      Sugerido
                    </span>
                  )}
                </div>
              ))}
            </div>
            
            {availableRooms.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No momento não há quartos disponíveis.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Entrance;