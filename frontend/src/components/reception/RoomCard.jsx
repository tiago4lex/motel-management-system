import React from 'react';

const statusColors = {
  AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
  OCCUPIED: 'bg-red-100 text-red-800 border-red-200',
  CLEANING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  MAINTENANCE: 'bg-gray-100 text-gray-800 border-gray-200'
};

const statusLabels = {
  AVAILABLE: 'Disponível',
  OCCUPIED: 'Ocupado',
  CLEANING: 'Em Limpeza',
  MAINTENANCE: 'Manutenção'
};

const RoomCard = ({ room, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg bg-white"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-2xl font-bold text-gray-800">Quarto {room.number}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[room.status]}`}>
          {statusLabels[room.status]}
        </span>
      </div>
      
      <p className="text-gray-600 mb-2">{room.type.name}</p>
      
      {room.status === 'OCCUPIED' && room.bookings?.[0] && (
        <div className="mt-2 text-sm text-gray-500">
          <p>Entrada: {new Date(room.bookings[0].startTime).toLocaleTimeString()}</p>
        </div>
      )}
      
      <div className="mt-3 flex justify-between text-sm">
        <span className="text-gray-500">Andar: {room.floor || 'Térreo'}</span>
        <span className="text-gray-500">Janela: {room.hasWindow ? 'Sim' : 'Não'}</span>
      </div>
    </div>
  );
};

export default RoomCard;