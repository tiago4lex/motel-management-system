// backend/src/controllers/bookingController.js
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
          ((now - start) % (1000 * 60 * 60)) / (1000 * 60)
        );

        let currentAmount = booking.initialAmount;

        if (booking.bookingType === "HOURLY" && hoursElapsed > 0) {
          const extraHours = hoursElapsed;
          currentAmount += extraHours * booking.room.type.hourlyRate;
        }

        // Adicionar consumos
        const consumptionsTotal = booking.consumptions.reduce(
          (sum, c) => sum + c.totalPrice,
          0
        );
        currentAmount += consumptionsTotal;

        // Adicionar horas extras manuais
        const extrasTotal = booking.timeExtras.reduce(
          (sum, e) => sum + e.amount,
          0
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
          (b) => b.bookingType === "OVERNIGHT"
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

  // Buscar booking por ID
  async getBookingById(req, res, next) {
    try {
      const { id } = req.params;

      console.log("🔍 Buscando booking:", id);

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
          user: {
            select: { id: true, fullName: true },
          },
        },
      });

      if (!booking) {
        throw new AppError("Atendimento não encontrado", 404);
      }

      // Calcular tempo decorrido e valor atual
      const now = new Date();
      const start = new Date(booking.startTime);
      const hoursElapsed = Math.floor((now - start) / (1000 * 60 * 60));
      const minutesElapsed = Math.floor(
        ((now - start) % (1000 * 60 * 60)) / (1000 * 60)
      );

      let currentAmount = booking.currentAmount;

      // Se o booking estiver ativo, recalcular o valor
      if (booking.status === "ACTIVE") {
        let baseAmount = 0;

        if (booking.bookingType === "OVERNIGHT") {
          baseAmount = booking.room.type.overnightRate;
        } else {
          baseAmount =
            booking.room.type.initialPrice +
            hoursElapsed * booking.room.type.hourlyRate;
        }

        const consumptionsTotal =
          booking.consumptions?.reduce(
            (sum, c) => sum + (c.totalPrice || 0),
            0
          ) || 0;
        const extrasTotal =
          booking.timeExtras?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
        currentAmount = baseAmount + consumptionsTotal + extrasTotal;
      }

      const bookingWithDetails = {
        ...booking,
        hoursElapsed,
        minutesElapsed,
        currentAmount,
        timeDisplay: `${hoursElapsed}h${minutesElapsed}m`,
      };

      res.json({
        success: true,
        data: bookingWithDetails,
      });
    } catch (error) {
      console.error("❌ Erro ao buscar booking:", error);
      next(error);
    }
  }

  // Buscar histórico de checkouts
  async getCheckoutHistory(req, res, next) {
    try {
      const { limit = 10 } = req.query;

      const checkouts = await prisma.booking.findMany({
        where: {
          status: "COMPLETED",
          endTime: { not: null },
        },
        include: {
          room: true,
          consumptions: {
            include: { product: true },
            take: 5,
          },
        },
        orderBy: { endTime: "desc" },
        take: parseInt(limit),
      });

      res.json({
        success: true,
        data: checkouts,
      });
    } catch (error) {
      next(error);
    }
  }

  // Criar nova reserva (check-in)
  async createBooking(req, res, next) {
    try {
      const { roomId, bookingType } = req.body;

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

      const initialAmount = room.type.initialPrice;

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

      await prisma.room.update({
        where: { id: roomId },
        data: { status: "OCCUPIED" },
      });

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

      await prisma.booking.update({
        where: { id },
        data: {
          currentAmount: {
            increment: totalPrice,
          },
        },
      });

      if (product.stockControlled) {
        await prisma.product.update({
          where: { id: productId },
          data: { stockQuantity: { decrement: quantity } },
        });
      }

      const consumptionWithProduct = await prisma.consumption.findUnique({
        where: { id: consumption.id },
        include: { product: true },
      });

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

      if (consumption.product.stockControlled) {
        await prisma.product.update({
          where: { id: consumption.productId },
          data: { stockQuantity: { increment: consumption.quantity } },
        });
      }

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

      let baseAmount = 0;

      if (bookingType === "OVERNIGHT") {
        baseAmount = booking.room.type.overnightRate;
        console.log("🌙 PERNOITE - Valor fixo:", baseAmount);
      } else {
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
          baseAmount
        );
      }

      const consumptionsTotal =
        booking.consumptions?.reduce(
          (sum, c) => sum + (c.totalPrice || 0),
          0
        ) || 0;
      console.log("🍕 Total consumos:", consumptionsTotal);

      const extrasTotal =
        booking.timeExtras?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      console.log("⏰ Total extras:", extrasTotal);

      const newCurrentAmount = baseAmount + consumptionsTotal + extrasTotal;
      console.log("💰 Valor final:", newCurrentAmount);

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
        message: `Tipo alterado para ${
          bookingType === "HOURLY" ? "Por Hora" : "Pernoite"
        } - Valor: R$ ${newCurrentAmount.toFixed(2)}`,
      });
    } catch (error) {
      console.error("❌ Erro ao alterar tipo:", error);
      next(error);
    }
  }

  // Iniciar processo de checkout (mostrar na tela de saída)
  async startCheckout(req, res, next) {
    try {
      const { id } = req.params;

      console.log("🏁 Iniciando processo de checkout do booking:", id);

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

      if (!booking) {
        throw new AppError("Atendimento não encontrado", 404);
      }

      if (booking.status !== "ACTIVE") {
        throw new AppError("Atendimento não está ativo", 400);
      }

      const now = new Date();
      const start = new Date(booking.startTime);
      const diffMs = now - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      let baseAmount = 0;
      if (booking.bookingType === "OVERNIGHT") {
        baseAmount = booking.room.type.overnightRate;
      } else {
        baseAmount =
          booking.room.type.initialPrice + hours * booking.room.type.hourlyRate;
      }

      const consumptionsTotal =
        booking.consumptions?.reduce(
          (sum, c) => sum + (c.totalPrice || 0),
          0
        ) || 0;
      const extrasTotal =
        booking.timeExtras?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const totalAmount = baseAmount + consumptionsTotal + extrasTotal;

      await prisma.booking.update({
        where: { id },
        data: { currentAmount: totalAmount },
      });

      const checkoutData = {
        bookingId: id,
        roomNumber: booking.room.number,
        roomType: booking.room.type.name,
        startTime: booking.startTime,
        elapsedTime: { hours, minutes },
        consumptions: booking.consumptions.map((c) => ({
          id: c.id,
          name: c.product.name,
          code: c.product.code,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          totalPrice: c.totalPrice,
        })),
        totalAmount: totalAmount,
        initialAmount: booking.initialAmount,
        extrasTotal: extrasTotal,
        bookingType: booking.bookingType,
      };

      const io = req.app.get("io");
      io.emit("checkout-started", checkoutData);

      console.log(
        "✅ Checkout iniciado com sucesso para o quarto:",
        booking.room.number
      );

      res.json({
        success: true,
        data: checkoutData,
        message: `Processo de checkout do quarto ${booking.room.number} iniciado`,
      });
    } catch (error) {
      console.error("❌ Erro ao iniciar checkout:", error);
      next(error);
    }
  }

  // Finalizar checkout (confirmar pagamento)
  async confirmCheckout(req, res, next) {
    try {
      const { id } = req.params;

      console.log("✅ Confirmando checkout do booking:", id);

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

      if (!booking) {
        throw new AppError("Atendimento não encontrado", 404);
      }

      if (booking.status !== "ACTIVE") {
        throw new AppError("Atendimento não está ativo", 400);
      }

      const now = new Date();
      const start = new Date(booking.startTime);
      const hours = Math.floor((now - start) / (1000 * 60 * 60));

      let finalAmount = 0;
      if (booking.bookingType === "OVERNIGHT") {
        finalAmount = booking.room.type.overnightRate;
      } else {
        finalAmount =
          booking.room.type.initialPrice + hours * booking.room.type.hourlyRate;
      }

      const consumptionsTotal =
        booking.consumptions?.reduce(
          (sum, c) => sum + (c.totalPrice || 0),
          0
        ) || 0;
      const extrasTotal =
        booking.timeExtras?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      finalAmount += consumptionsTotal + extrasTotal;

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          endTime: now,
          totalAmount: finalAmount,
          currentAmount: finalAmount,
          status: "COMPLETED",
        },
      });

      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: "CLEANING" },
      });

      await prisma.log.create({
        data: {
          userId: req.user.id,
          action: "CHECKOUT",
          entity: "booking",
          entityId: id,
          details: JSON.stringify({
            totalAmount: finalAmount,
            hoursElapsed: hours,
          }),
          ipAddress: req.ip,
        },
      });

      const io = req.app.get("io");
      io.emit("checkout-completed", {
        bookingId: id,
        roomId: booking.roomId,
        roomNumber: booking.room.number,
        totalAmount: finalAmount,
      });

      io.emit("checkout-confirmed", {
        bookingId: id,
        roomId: booking.roomId,
        roomNumber: booking.room.number,
        totalAmount: finalAmount,
      });

      console.log(
        "✅ Checkout confirmado para o quarto:",
        booking.room.number,
        "Valor:",
        finalAmount
      );

      res.json({
        success: true,
        data: {
          booking: updatedBooking,
          totalAmount: finalAmount,
        },
        message: `Check-out do quarto ${booking.room.number} finalizado. Total: R$ ${finalAmount.toFixed(2)}`,
      });
    } catch (error) {
      console.error("❌ Erro ao confirmar checkout:", error);
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
        0
      );
      const extrasTotal = booking.timeExtras.reduce(
        (sum, e) => sum + e.amount,
        0
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