const { prisma } = require("../config/database");
const { AppError } = require("../middleware/errorHandler");
const { logger } = require("../config/logger");

class BookingController {
  // Listar todos os atendimentos ativos
  async getActiveBookings(req, res, next) {
    try {
      const bookings = await prisma.booking.findMany({
        where: { status: "ACTIVE" },
        include: {
          room: {
            include: { type: true },
          },
          consumptions: {
            include: { product: true },
          },
          timeExtras: true,
        },
        orderBy: { startTime: "asc" },
      });

      // Calcular tempo decorrido e valor atual para cada
      const bookingsWithCurrent = bookings.map((booking) => {
        const now = new Date();
        const start = new Date(booking.startTime);
        const hoursElapsed = Math.floor((now - start) / (1000 * 60 * 60));
        const minutesElapsed = Math.floor(
          ((now - start) % (1000 * 60 * 60)) / (1000 * 60),
        );

        let currentAmount = booking.initialAmount;

        if (booking.bookingType === "HOURLY" && hoursElapsed > 0) {
          const extraHours = hoursElapsed;
          currentAmount += extraHours * booking.room.type.hourlyRate;
        }

        // Adicionar consumos
        const consumptionsTotal = booking.consumptions.reduce(
          (sum, c) => sum + c.totalPrice,
          0,
        );
        currentAmount += consumptionsTotal;

        // Adicionar horas extras manuais
        const extrasTotal = booking.timeExtras.reduce(
          (sum, e) => sum + e.amount,
          0,
        );
        currentAmount += extrasTotal;

        return {
          ...booking,
          hoursElapsed,
          minutesElapsed,
          currentAmount,
          timeDisplay: `${hoursElapsed}h${minutesElapsed}m`,
        };
      });

      // Estatísticas
      const stats = {
        live: bookingsWithCurrent.filter((b) => b.bookingType === "HOURLY")
          .length,
        occupied: bookingsWithCurrent.length,
        confere: bookingsWithCurrent.filter(
          (b) => b.bookingType === "OVERNIGHT",
        ).length,
      };

      res.json({
        success: true,
        data: bookingsWithCurrent,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Criar nova reserva (check-in) - sem nome/telefone
  async createBooking(req, res, next) {
    try {
      const { roomId, bookingType } = req.body;

      // Verificar se quarto está disponível
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { type: true },
      });

      if (!room) {
        throw new AppError("Quarto não encontrado", 404);
      }

      if (room.status !== "AVAILABLE") {
        throw new AppError("Quarto não está disponível", 400);
      }

      // Valor inicial baseado no tipo do quarto
      const initialAmount = room.type.initialPrice;

      // Criar reserva (sem nome/telefone)
      const booking = await prisma.booking.create({
        data: {
          roomId,
          userId: req.user.id,
          bookingType,
          initialAmount,
          currentAmount: initialAmount,
          startTime: new Date(),
          status: "ACTIVE",
        },
        include: {
          room: {
            include: { type: true },
          },
        },
      });

      // Atualizar status do quarto
      await prisma.room.update({
        where: { id: roomId },
        data: { status: "OCCUPIED" },
      });

      // Registrar log
      await prisma.log.create({
        data: {
          userId: req.user.id,
          action: "CHECKIN",
          entity: "booking",
          entityId: booking.id,
          details: JSON.stringify({ roomId, bookingType, initialAmount }),
          ipAddress: req.ip,
        },
      });

      // Emitir evento WebSocket
      const io = req.app.get("io");
      io.emit("booking-created", { bookingId: booking.id, roomId });

      res.status(201).json({
        success: true,
        data: booking,
        message: `Check-in Quarto ${room.number} realizado com sucesso`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Adicionar consumo ao quarto
  async addConsumption(req, res, next) {
    try {
      const { id } = req.params;
      const { productId, quantity } = req.body;

      console.log("📝 Adicionando consumo:", { id, productId, quantity });

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { room: true },
      });

      if (!booking || booking.status !== "ACTIVE") {
        throw new AppError("Atendimento não encontrado", 404);
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new AppError("Produto não encontrado", 404);
      }

      if (product.stockControlled && product.stockQuantity < quantity) {
        throw new AppError("Estoque insuficiente", 400);
      }

      const totalPrice = product.price * quantity;

      // Criar consumo - sem include para evitar erro
      const consumption = await prisma.consumption.create({
        data: {
          bookingId: id,
          productId: productId,
          roomId: booking.roomId,
          quantity: quantity,
          unitPrice: product.price,
          totalPrice: totalPrice,
        },
      });

      // Atualizar valor atual da reserva
      await prisma.booking.update({
        where: { id },
        data: {
          currentAmount: {
            increment: totalPrice,
          },
        },
      });

      // Atualizar estoque
      if (product.stockControlled) {
        await prisma.product.update({
          where: { id: productId },
          data: { stockQuantity: { decrement: quantity } },
        });
      }

      // Buscar o consumo com o produto para retornar
      const consumptionWithProduct = await prisma.consumption.findUnique({
        where: { id: consumption.id },
        include: { product: true },
      });

      // Emitir evento
      const io = req.app.get("io");
      io.emit("consumption-added", {
        bookingId: id,
        roomId: booking.roomId,
        consumption: consumptionWithProduct,
      });

      res.status(201).json({
        success: true,
        data: consumptionWithProduct,
        message: `${product.name} adicionado ao quarto ${booking.room.number}`,
      });
    } catch (error) {
      console.error("❌ Erro ao adicionar consumo:", error);
      next(error);
    }
  }

  // Checkout
  async checkout(req, res, next) {
    try {
      const { id } = req.params;

      console.log("🏁 Iniciando checkout do booking:", id);

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          consumptions: {
            include: { product: true },
          },
          timeExtras: true,
          room: {
            include: { type: true },
          },
        },
      });

      if (!booking || booking.status !== "ACTIVE") {
        throw new AppError("Atendimento não encontrado", 404);
      }

      console.log("📊 Dados do booking:", {
        bookingType: booking.bookingType,
        currentAmount: booking.currentAmount,
        initialAmount: booking.initialAmount,
        consumptionsTotal: booking.consumptions.reduce(
          (sum, c) => sum + c.totalPrice,
          0,
        ),
      });

      // Usar o currentAmount que já está sendo atualizado em tempo real
      let totalAmount = booking.currentAmount;

      console.log("💰 Valor final do checkout:", totalAmount);

      // Finalizar reserva
      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          endTime: new Date(),
          totalAmount: totalAmount,
          status: "COMPLETED",
        },
      });

      // Atualizar status do quarto para limpeza
      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: "CLEANING" },
      });

      // Registrar log
      await prisma.log.create({
        data: {
          userId: req.user.id,
          action: "CHECKOUT",
          entity: "booking",
          entityId: id,
          details: JSON.stringify({ totalAmount }),
          ipAddress: req.ip,
        },
      });

      // Emitir evento WebSocket
      const io = req.app.get("io");
      io.emit("checkout-completed", {
        bookingId: id,
        roomId: booking.roomId,
        totalAmount,
      });

      console.log("✅ Checkout finalizado com sucesso. Total: R$", totalAmount);

      res.json({
        success: true,
        data: {
          booking: updatedBooking,
          totalAmount,
          consumptions: booking.consumptions,
        },
        message: `Check-out do quarto ${booking.room.number} finalizado. Total: R$ ${totalAmount.toFixed(2)}`,
      });
    } catch (error) {
      console.error("❌ Erro no checkout:", error);
      next(error);
    }
  }

  // Remover consumo
  async removeConsumption(req, res, next) {
    try {
      const { id, itemId } = req.params;

      const consumption = await prisma.consumption.findFirst({
        where: {
          id: itemId,
          bookingId: id,
        },
        include: { product: true },
      });

      if (!consumption) {
        throw new AppError("Consumo não encontrado", 404);
      }

      // Devolver ao estoque
      if (consumption.product.stockControlled) {
        await prisma.product.update({
          where: { id: consumption.productId },
          data: { stockQuantity: { increment: consumption.quantity } },
        });
      }

      // Remover do valor atual
      await prisma.booking.update({
        where: { id },
        data: {
          currentAmount: {
            decrement: consumption.totalPrice,
          },
        },
      });

      await prisma.consumption.delete({
        where: { id: itemId },
      });

      res.json({
        success: true,
        message: "Consumo removido com sucesso",
      });
    } catch (error) {
      next(error);
    }
  }

  // Alterar tipo de alocação
  async changeBookingType(req, res, next) {
    try {
      const { id } = req.params;
      const { bookingType } = req.body;

      console.log("🔄 Alterando tipo de alocação:", { id, bookingType });

      // Buscar o booking com todos os dados necessários
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          room: {
            include: { type: true },
          },
          consumptions: {
            include: { product: true },
          },
          timeExtras: true,
        },
      });

      if (!booking || booking.status !== "ACTIVE") {
        throw new AppError("Atendimento não encontrado", 404);
      }

      // Calcular o novo valor baseado no tipo
      let baseAmount = 0;

      if (bookingType === "OVERNIGHT") {
        // PERNOITE: valor fixo do tipo de quarto
        baseAmount = booking.room.type.overnightRate;
        console.log("🌙 PERNOITE - Valor fixo:", baseAmount);
      } else {
        // POR HORA: calcular baseado no tempo decorrido
        const now = new Date();
        const start = new Date(booking.startTime);
        const hoursElapsed = Math.ceil((now - start) / (1000 * 60 * 60));
        baseAmount =
          booking.room.type.initialPrice +
          hoursElapsed * booking.room.type.hourlyRate;
        console.log(
          "💰 POR HORA - Horas:",
          hoursElapsed,
          "Valor base:",
          baseAmount,
        );
      }

      // Somar consumos
      const consumptionsTotal =
        booking.consumptions?.reduce(
          (sum, c) => sum + (c.totalPrice || 0),
          0,
        ) || 0;
      console.log("🍕 Total consumos:", consumptionsTotal);

      // Somar horas extras manuais
      const extrasTotal =
        booking.timeExtras?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      console.log("⏰ Total extras:", extrasTotal);

      // Valor final
      const newCurrentAmount = baseAmount + consumptionsTotal + extrasTotal;
      console.log("💰 Valor final:", newCurrentAmount);

      // Atualizar o booking
      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          bookingType: bookingType,
          currentAmount: newCurrentAmount,
        },
        include: {
          room: {
            include: { type: true },
          },
          consumptions: {
            include: { product: true },
          },
        },
      });

      console.log("✅ Booking atualizado:", {
        id: updatedBooking.id,
        bookingType: updatedBooking.bookingType,
        currentAmount: updatedBooking.currentAmount,
        initialAmount: updatedBooking.initialAmount,
      });

      // Emitir evento WebSocket
      const io = req.app.get("io");
      io.emit("booking-type-changed", {
        bookingId: id,
        bookingType: bookingType,
        currentAmount: newCurrentAmount,
        roomId: booking.roomId,
      });

      res.json({
        success: true,
        data: updatedBooking,
        message: `Tipo alterado para ${bookingType === "HOURLY" ? "Por Hora" : "Pernoite"} - Valor: R$ ${newCurrentAmount.toFixed(2)}`,
      });
    } catch (error) {
      console.error("❌ Erro ao alterar tipo:", error);
      next(error);
    }
  }

  // Alterar status do quarto
  async changeRoomStatus(req, res, next) {
    try {
      const { roomId } = req.params;
      const { status } = req.body;

      const validStatuses = [
        "AVAILABLE",
        "OCCUPIED",
        "CLEANING",
        "MAINTENANCE",
      ];
      if (!validStatuses.includes(status)) {
        throw new AppError("Status inválido", 400);
      }

      const room = await prisma.room.update({
        where: { id: roomId },
        data: { status },
        include: { type: true },
      });

      // Emitir evento WebSocket
      const io = req.app.get("io");
      io.emit("room-status-update", {
        roomId,
        status,
        roomNumber: room.number,
      });

      res.json({
        success: true,
        data: room,
        message: `Status do quarto ${room.number} alterado para ${status}`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Buscar produto por código ou nome
  async searchProduct(req, res, next) {
    try {
      const { search } = req.query;

      console.log("🔍 Buscando produto:", search);

      if (!search || search.length < 1) {
        return res.json({ success: true, data: [] });
      }

      // Versão compatível - sem o parâmetro 'mode'
      const products = await prisma.product.findMany({
        where: {
          OR: [{ code: { contains: search } }, { name: { contains: search } }],
        },
        take: 10,
        orderBy: {
          name: "asc",
        },
      });

      console.log(`✅ Encontrados ${products.length} produtos`);

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("❌ Erro na busca de produtos:", error);
      next(error);
    }
  }

  // Recalcular valor atual (útil para debug)
  async recalculateAmount(req, res, next) {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          room: { include: { type: true } },
          consumptions: true,
          timeExtras: true,
        },
      });

      if (!booking) {
        throw new AppError("Atendimento não encontrado", 404);
      }

      let calculatedAmount = 0;

      if (booking.bookingType === "OVERNIGHT") {
        calculatedAmount = booking.room.type.overnightRate;
      } else {
        const now = new Date();
        const start = new Date(booking.startTime);
        const hoursElapsed = Math.ceil((now - start) / (1000 * 60 * 60));
        calculatedAmount =
          booking.room.type.initialPrice +
          hoursElapsed * booking.room.type.hourlyRate;
      }

      const consumptionsTotal = booking.consumptions.reduce(
        (sum, c) => sum + c.totalPrice,
        0,
      );
      const extrasTotal = booking.timeExtras.reduce(
        (sum, e) => sum + e.amount,
        0,
      );
      calculatedAmount += consumptionsTotal + extrasTotal;

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: { currentAmount: calculatedAmount },
      });

      res.json({
        success: true,
        data: updatedBooking,
        message: `Valor recalculado: R$ ${calculatedAmount.toFixed(2)}`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();
