import { useEffect, useState } from 'react';

export const useBookingTimer = (booking) => {
  const [timeDisplay, setTimeDisplay] = useState('');
  const [currentAmount, setCurrentAmount] = useState(0);
  
  useEffect(() => {
    // Se não tiver booking ou não estiver ativo, não faz nada
    if (!booking || booking.status !== 'ACTIVE') {
      setTimeDisplay('');
      setCurrentAmount(0);
      return;
    }
    
    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(booking.startTime);
      const diffMs = now - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setTimeDisplay(`${hours}h ${minutes}m ${seconds}s`);
      
      // Calcular valor atual baseado no tipo de alocação
      let amount = 0;
      
      if (booking.bookingType === 'OVERNIGHT') {
        // PERNOITE: valor fixo
        amount = booking.room?.type?.overnightRate || 0;
      } else {
        // POR HORA: valor inicial + horas * valor hora
        const initialPrice = booking.room?.type?.initialPrice || 0;
        const hourlyRate = booking.room?.type?.hourlyRate || 0;
        amount = initialPrice + (hours * hourlyRate);
      }
      
      // Adicionar consumos
      const consumptionsTotal = booking.consumptions?.reduce((sum, c) => sum + (c.totalPrice || 0), 0) || 0;
      amount += consumptionsTotal;
      
      // Adicionar horas extras
      const extrasTotal = booking.timeExtras?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      amount += extrasTotal;
      
      setCurrentAmount(amount);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [booking]);
  
  return { timeDisplay, currentAmount };
};