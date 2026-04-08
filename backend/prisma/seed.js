const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do database...");

  // 1. Criar usuário admin
  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@motel.com",
      password: adminPassword,
      fullName: "Administrador",
      role: "ADMIN",
      active: true,
    },
  });
  console.log("✅ Admin criado (admin/admin123)");

  // 2. Criar operador
  const operatorPassword = await bcrypt.hash("operator123", 10);

  await prisma.user.create({
    data: {
      username: "operador",
      email: "operador@motel.com",
      password: operatorPassword,
      fullName: "Operador",
      role: "OPERATOR",
      active: true,
    },
  });
  console.log("✅ Operador criado (operador/operator123)");

  // 3. Criar tipos de quarto
  const roomTypes = [
    {
      name: "STANDARD",
      description: "Quarto Standard",
      initialPrice: 50.0,
      hourlyRate: 20.0,
      overnightRate: 150.0,
    },
    {
      name: "MASTER",
      description: "Quarto Master",
      initialPrice: 80.0,
      hourlyRate: 30.0,
      overnightRate: 220.0,
    },
    {
      name: "LUXO",
      description: "Quarto Luxo",
      initialPrice: 120.0,
      hourlyRate: 45.0,
      overnightRate: 350.0,
    },
    {
      name: "PREMIUM",
      description: "Quarto Premium",
      initialPrice: 150.0,
      hourlyRate: 55.0,
      overnightRate: 450.0,
    },
  ];

  for (const type of roomTypes) {
    await prisma.roomType.create({
      data: type,
    });
  }
  console.log("✅ Tipos de quarto criados");

  // 4. Buscar os tipos criados
  const types = await prisma.roomType.findMany();
  const standardType = types.find((t) => t.name === "STANDARD");
  const masterType = types.find((t) => t.name === "MASTER");
  const luxoType = types.find((t) => t.name === "LUXO");
  const premiumType = types.find((t) => t.name === "PREMIUM");

  // 5. Criar quartos (1-40)
  console.log("📝 Criando 40 quartos...");

  for (let i = 1; i <= 40; i++) {
    let typeId;
    if (i <= 10) typeId = standardType?.id;
    else if (i <= 20) typeId = masterType?.id;
    else if (i <= 30) typeId = luxoType?.id;
    else typeId = premiumType?.id;

    // Definir status: primeiros 17 como ocupados
    let status = "AVAILABLE";
    if (i <= 17) status = "OCCUPIED";
    else if (i <= 20) status = "CLEANING";

    await prisma.room.create({
      data: {
        number: i.toString().padStart(2, "0"),
        typeId: typeId,
        status: status,
        floor: Math.ceil(i / 10),
        description: `Quarto ${i}`,
      },
    });
  }
  console.log("✅ 40 quartos criados");

  // 6. Criar produtos com códigos (usando create em vez de upsert)
  console.log("📝 Criando produtos...");

  const products = [
    {
      code: "001",
      name: "Água Mineral",
      price: 5.0,
      category: "Bebidas",
      stockQuantity: 100,
    },
    {
      code: "002",
      name: "Refrigerante Lata",
      price: 7.0,
      category: "Bebidas",
      stockQuantity: 150,
    },
    {
      code: "003",
      name: "Cerveja Long Neck",
      price: 12.0,
      category: "Bebidas",
      stockQuantity: 200,
    },
    {
      code: "004",
      name: "Energético",
      price: 15.0,
      category: "Bebidas",
      stockQuantity: 80,
    },
    {
      code: "005",
      name: "Suco Natural",
      price: 10.0,
      category: "Bebidas",
      stockQuantity: 50,
    },
    {
      code: "006",
      name: "Chocolate",
      price: 8.0,
      category: "Alimentos",
      stockQuantity: 100,
    },
    {
      code: "007",
      name: "Amendoim",
      price: 6.0,
      category: "Alimentos",
      stockQuantity: 80,
    },
    {
      code: "008",
      name: "Pizza (fatia)",
      price: 15.0,
      category: "Alimentos",
      stockQuantity: 40,
    },
    {
      code: "009",
      name: "Sanduíche",
      price: 12.0,
      category: "Alimentos",
      stockQuantity: 50,
    },
    {
      code: "010",
      name: "Camisinha",
      price: 5.0,
      category: "Íntimos",
      stockQuantity: 200,
    },
    {
      code: "011",
      name: "Lubrificante",
      price: 18.0,
      category: "Íntimos",
      stockQuantity: 60,
    },
    {
      code: "012",
      name: "Vibrador",
      price: 89.0,
      category: "Acessórios",
      stockQuantity: 20,
    },
    {
      code: "013",
      name: "Preservativo Feminino",
      price: 8.0,
      category: "Íntimos",
      stockQuantity: 60,
    },
    {
      code: "014",
      name: "Óleo de Massagem",
      price: 25.0,
      category: "Bem-estar",
      stockQuantity: 40,
    },
    {
      code: "015",
      name: "Água com Gás",
      price: 6.0,
      category: "Bebidas",
      stockQuantity: 90,
    },
    {
      code: "016",
      name: "Whisky (dose)",
      price: 25.0,
      category: "Bebidas",
      stockQuantity: 100,
    },
    {
      code: "017",
      name: "Vodka (dose)",
      price: 18.0,
      category: "Bebidas",
      stockQuantity: 100,
    },
    {
      code: "018",
      name: "Cigarro",
      price: 10.0,
      category: "Outros",
      stockQuantity: 150,
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        code: product.code,
        name: product.name,
        price: product.price,
        category: product.category,
        stockQuantity: product.stockQuantity,
        stockControlled: true,
        minStockAlert: 10,
      },
    });
  }
  console.log(`✅ ${products.length} produtos criados`);

  // 7. Criar algumas reservas de exemplo para quartos ocupados
  console.log("📝 Criando reservas de exemplo...");

  const occupiedRooms = await prisma.room.findMany({
    where: { status: "OCCUPIED" },
  });

  for (let i = 0; i < occupiedRooms.length; i++) {
    const room = occupiedRooms[i];
    const roomType = types.find((t) => t.id === room.typeId);
    const startTime = new Date();
    // Diminuir horas aleatórias para simular diferentes tempos de ocupação
    startTime.setHours(
      startTime.getHours() - (Math.floor(Math.random() * 5) + 1),
    );

    await prisma.booking.create({
      data: {
        roomId: room.id,
        userId: admin.id,
        bookingType: "HOURLY",
        status: "ACTIVE",
        startTime: startTime,
        initialAmount: roomType.initialPrice,
        currentAmount: roomType.initialPrice,
        notes: "Reserva automática do seed",
      },
    });
  }
  console.log(`✅ ${occupiedRooms.length} reservas ativas criadas`);

  // 8. Criar configurações do sistema
  const configs = [
    { key: "system_name", value: "SISMOTEL", description: "Nome do sistema" },
    {
      key: "timezone",
      value: "America/Sao_Paulo",
      description: "Fuso horário",
    },
    { key: "currency", value: "BRL", description: "Moeda" },
    { key: "tax_rate", value: "0.00", description: "Taxa de serviço" },
    {
      key: "overnight_start",
      value: "22:00",
      description: "Início do período pernoite",
    },
    {
      key: "overnight_end",
      value: "08:00",
      description: "Fim do período pernoite",
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.create({
      data: {
        key: config.key,
        value: config.value,
        description: config.description,
      },
    });
  }
  console.log("✅ Configurações criadas");

  console.log("\n🎉 SEED CONCLUÍDO COM SUCESSO!");
  console.log("📋 Credenciais de acesso:");
  console.log("   Admin: admin / admin123");
  console.log("   Operador: operador / operator123");
  console.log(`📊 Total de quartos: 40`);
  console.log(`📊 Quartos ocupados: ${occupiedRooms.length}`);
  console.log(`📊 Produtos disponíveis: ${products.length}`);
  console.log("\n📝 Códigos dos produtos para busca:");
  products.forEach((p) =>
    console.log(`   ${p.code} - ${p.name} - R$ ${p.price.toFixed(2)}`),
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
