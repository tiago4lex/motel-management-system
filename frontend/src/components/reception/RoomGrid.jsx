import React from 'react';
import RoomCard from './RoomCard';

const RoomGrid = ({ rooms, onRoomSelect }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Quartos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onClick={() => onRoomSelect(room)}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomGrid;