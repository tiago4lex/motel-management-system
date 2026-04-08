const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log('🔍 Verificando dados no banco...\n');
  
  // Verificar reservas
  const totalBookings = await prisma.booking.count();
  const completedBookings = await prisma.booking.count({
    where: { status: 'COMPLETED' }
  });
  const activeBookings = await prisma.booking.count({
    where: { status: 'ACTIVE' }
  });
  
  console.log(`📊 Total de reservas: ${totalBookings}`);
  console.log(`✅ Reservas COMPLETED: ${completedBookings}`);
  console.log(`🟢 Reservas ACTIVE: ${activeBookings}`);
  
  if (completedBookings === 0) {
    console.log('\n⚠️ Nenhuma reserva COMPLETED encontrada!');
    console.log('Os relatórios não mostrarão dados.\n');
    
    console.log('📝 Deseja criar dados de exemplo? (y/n)');
    // Se quiser criar automaticamente, execute o script createSampleData.js
  } else {
    // Mostrar algumas reservas
    const bookings = await prisma.booking.findMany({
      where: { status: 'COMPLETED' },
      take: 5,
      include: { room: true }
    });
    
    console.log('\n📋 Últimas reservas COMPLETED:');
    bookings.forEach(b => {
      console.log(`   Quarto ${b.room.number} - R$ ${b.totalAmount} - ${b.createdAt.toLocaleDateString()}`);
    });
  }
  
  // Verificar consumos
  const totalConsumptions = await prisma.consumption.count();
  console.log(`\n🍕 Total de consumos: ${totalConsumptions}`);
  
  await prisma.$disconnect();
}

checkData();