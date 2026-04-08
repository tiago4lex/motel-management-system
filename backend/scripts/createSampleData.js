const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSampleData() {
  console.log('📊 Criando dados de exemplo para relatórios...');
  
  // Buscar usuário admin
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (!admin) {
    console.error('❌ Admin não encontrado');
    return;
  }
  
  // Buscar quartos disponíveis
  const rooms = await prisma.room.findMany({
    take: 10
  });
  
  if (rooms.length === 0) {
    console.error('❌ Nenhum quarto encontrado');
    return;
  }
  
  // Criar reservas concluídas nos últimos 30 dias
  const today = new Date();
  const bookingsCreated = [];
  
  for (let i = 1; i <= 30; i++) {
    const daysAgo = i;
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0);
    
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const roomType = await prisma.roomType.findUnique({
      where: { id: room.typeId }
    });
    
    const bookingType = Math.random() > 0.5 ? 'HOURLY' : 'OVERNIGHT';
    let totalAmount;
    
    if (bookingType === 'HOURLY') {
      const hours = Math.floor(Math.random() * 4) + 1;
      totalAmount = roomType.initialPrice + (hours * roomType.hourlyRate);
    } else {
      totalAmount = roomType.overnightRate;
    }
    
    const startTime = new Date(date);
    const endTime = new Date(date);
    endTime.setHours(endTime.getHours() + (Math.floor(Math.random() * 4) + 1));
    
    const booking = await prisma.booking.create({
      data: {
        roomId: room.id,
        userId: admin.id,
        bookingType: bookingType,
        status: 'COMPLETED',
        startTime: startTime,
        endTime: endTime,
        initialAmount: bookingType === 'HOURLY' ? roomType.initialPrice : roomType.overnightRate,
        currentAmount: totalAmount,
        totalAmount: totalAmount,
        notes: `Reserva de exemplo - ${daysAgo} dias atrás`
      }
    });
    
    bookingsCreated.push(booking);
    
    // Adicionar alguns consumos aleatórios
    const products = await prisma.product.findMany({ take: 5 });
    const numConsumptions = Math.floor(Math.random() * 3);
    
    for (let j = 0; j < numConsumptions; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 2) + 1;
      const totalPrice = product.price * quantity;
      
      await prisma.consumption.create({
        data: {
          bookingId: booking.id,
          productId: product.id,
          roomId: room.id,
          quantity: quantity,
          unitPrice: product.price,
          totalPrice: totalPrice
        }
      });
    }
  }
  
  console.log(`✅ Criadas ${bookingsCreated.length} reservas concluídas`);
  
  // Estatísticas
  const stats = await prisma.booking.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { totalAmount: true },
    _count: true
  });
  
  console.log(`📊 Total de reservas concluídas: ${stats._count}`);
  console.log(`💰 Faturamento total: R$ ${(stats._sum.totalAmount || 0).toFixed(2)}`);
}

createSampleData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());