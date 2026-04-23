import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useTTS } from "../hooks/useTTS";
import Header from "../components/common/Header";
import {
  CurrencyDollarIcon,
  ClockIcon,
  ShoppingBagIcon,
  HomeIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

const Exit = () => {
  const { api } = useAuth();
  const { socket } = useSocket();
  const { ttsService } = useTTS();
  const [activeCheckout, setActiveCheckout] = useState(null);
  const [checkoutHistory, setCheckoutHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdatedItemId, setLastUpdatedItemId] = useState(null);

  // Timer para atualizar o tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadRecentCheckouts();

    if (socket) {
      // Escutar evento de checkout iniciado
      socket.on("checkout-started", (data) => {
        console.log("📢 Checkout iniciado:", data);
        setActiveCheckout(data);

        // Anunciar via TTS
        ttsService.speak(
          `Check-out do quarto ${data.roomNumber} iniciado. ` +
            `Tempo de permanência: ${data.elapsedTime.hours} horas e ${data.elapsedTime.minutes} minutos. ` +
            `Valor total: ${data.totalAmount.toFixed(2)} reais.`
        );

        toast.success(`Checkout do quarto ${data.roomNumber} iniciado!`, {
          duration: 5000,
          position: "top-right",
        });
      });

      // Escutar evento de atualização de consumos no checkout
      socket.on("checkout-consumption-updated", (data) => {
        console.log("📢 Consumo atualizado no checkout:", data);

        // Encontrar o item recém-adicionado (se houver)
        if (activeCheckout && data.consumptions.length > (activeCheckout.consumptions?.length || 0)) {
          const newItem = data.consumptions.find(
            (c) => !activeCheckout.consumptions?.some((ac) => ac.id === c.id)
          );
          if (newItem) {
            setLastUpdatedItemId(newItem.id);
            setTimeout(() => setLastUpdatedItemId(null), 1000);
          }
        }

        setActiveCheckout((prev) => {
          if (!prev || prev.bookingId !== data.bookingId) return prev;
          return {
            ...prev,
            consumptions: data.consumptions,
            totalAmount: data.newCurrentAmount,
          };
        });
      });

      // Escutar evento de checkout completado
      socket.on("checkout-completed", (data) => {
        console.log("📢 Checkout completado:", data);

        // Limpar checkout ativo
        setActiveCheckout(null);

        // Recarregar histórico
        loadRecentCheckouts();

        // Anunciar finalização
        ttsService.speak(
          `Check-out do quarto ${data.roomNumber} finalizado. Total pago: ${data.totalAmount.toFixed(2)} reais.`
        );

        toast.success(`Check-out do quarto ${data.roomNumber} finalizado!`, {
          duration: 5000,
          position: "top-right",
        });
      });

      return () => {
        socket.off("checkout-started");
        socket.off("checkout-consumption-updated");
        socket.off("checkout-completed");
      };
    }
  }, [socket, activeCheckout, ttsService]);

  const loadRecentCheckouts = async () => {
    try {
      const response = await api.get("/bookings/history", {
        params: { limit: 10 },
      });
      setCheckoutHistory(response.data.data);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const announceBillAgain = () => {
    if (activeCheckout) {
      ttsService.speak(
        `Quarto ${activeCheckout.roomNumber}, ` +
          `tipo ${activeCheckout.roomType}, ` +
          `tempo de permanência: ${activeCheckout.elapsedTime.hours} horas e ${activeCheckout.elapsedTime.minutes} minutos, ` +
          `valor total: ${activeCheckout.totalAmount.toFixed(2)} reais. ` +
          `${activeCheckout.consumptions?.length || 0} consumos realizados.`
      );
    }
  };

  const formatTime = (startTime) => {
    const start = new Date(startTime);
    const now = currentTime;
    const diffMs = now - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const printBill = () => {
    if (!activeCheckout) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante - Quarto ${activeCheckout.roomNumber}</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            .bill { max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; text-align: right; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="bill">
            <div class="header">
              <h2>SISMOTEL</h2>
              <p>Comprovante de Check-out</p>
              <p>Data: ${new Date().toLocaleString()}</p>
            </div>
            <div class="info">
              <p><strong>Quarto:</strong> ${activeCheckout.roomNumber}</p>
              <p><strong>Tipo:</strong> ${activeCheckout.roomType}</p>
              <p><strong>Entrada:</strong> ${new Date(activeCheckout.startTime).toLocaleString()}</p>
              <p><strong>Saída:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Tempo:</strong> ${activeCheckout.elapsedTime.hours}h ${activeCheckout.elapsedTime.minutes}m</p>
            </div>
            <table>
              <thead>
                <tr><th>Produto</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${activeCheckout.consumptions?.map((item) => `
                  <tr>
                    <td>${item.name}</td>
                    <td style="text-align: center">${item.quantity}</td>
                    <td style="text-align: right">R$ ${item.unitPrice.toFixed(2)}</td>
                    <td style="text-align: right">R$ ${item.totalPrice.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="text-align: right"><strong>Total:</strong></td>
                  <td style="text-align: right"><strong>R$ ${activeCheckout.totalAmount.toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
            <div class="footer" style="text-align: center; margin-top: 30px;">
              <p>Obrigado pela preferência!</p>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header title="Tela de Saída" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      <Header title="Tela de Saída - Checkout" />

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Checkout Ativo */}
          {activeCheckout && (
            <div className="bg-white rounded-lg shadow-2xl mb-6 overflow-hidden border-2 border-red-300">
              <div className="bg-red-600 text-white px-6 py-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75"></div>
                      <HomeIcon className="h-8 w-8 relative z-10" />
                    </div>
                    <h2 className="text-2xl font-bold">
                      CHECKOUT EM ANDAMENTO
                    </h2>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={printBill}
                      className="bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <PrinterIcon className="h-5 w-5" />
                      Imprimir
                    </button>
                    <button
                      onClick={announceBillAgain}
                      className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <SpeakerWaveIcon className="h-5 w-5" />
                      Falar Novamente
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Informações do Quarto */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">Quarto</p>
                    <p className="text-4xl font-bold text-gray-800">
                      {activeCheckout.roomNumber}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {activeCheckout.roomType}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">
                      Tipo de Alocação
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      {activeCheckout.bookingType === "OVERNIGHT" ? (
                        <>
                          <span className="text-2xl">🌙</span>
                          <span className="font-bold">Pernoite</span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl">💰</span>
                          <span className="font-bold">Por Hora</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">
                      Tempo de Permanência
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <ClockIcon className="h-6 w-6 text-yellow-600" />
                      <p className="text-3xl font-bold text-yellow-600 font-mono">
                        {formatTime(activeCheckout.startTime)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {activeCheckout.elapsedTime.hours}h{" "}
                      {activeCheckout.elapsedTime.minutes}m
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 text-center border-2 border-green-300">
                    <p className="text-sm text-gray-500 mb-1">Valor Total</p>
                    <p className="text-3xl font-bold text-green-600">
                      R$ {activeCheckout.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Inicial: R${" "}
                      {activeCheckout.initialAmount?.toFixed(2) || "0,00"}
                    </p>
                  </div>
                </div>

                {/* Detalhamento dos Valores */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5" />
                    Detalhamento dos Valores
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span>
                        Valor Base (
                        {activeCheckout.bookingType === "OVERNIGHT"
                          ? "Pernoite"
                          : "Por Hora"}
                        )
                      </span>
                      <span className="font-medium">
                        R$ {activeCheckout.initialAmount?.toFixed(2) || "0,00"}
                      </span>
                    </div>
                    {activeCheckout.extrasTotal > 0 && (
                      <div className="flex justify-between py-2 border-b text-orange-600">
                        <span>Horas Extras</span>
                        <span className="font-medium">
                          R$ {activeCheckout.extrasTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {activeCheckout.consumptions &&
                      activeCheckout.consumptions.length > 0 && (
                        <div className="flex justify-between py-2 border-b text-blue-600">
                          <span>Consumos</span>
                          <span className="font-medium">
                            R${" "}
                            {activeCheckout.consumptions
                              .reduce((sum, c) => sum + c.totalPrice, 0)
                              .toFixed(2)}
                          </span>
                        </div>
                      )}
                    <div className="flex justify-between py-2 text-lg font-bold text-green-600">
                      <span>TOTAL</span>
                      <span>R$ {activeCheckout.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Lista de Consumos */}
                {activeCheckout.consumptions &&
                  activeCheckout.consumptions.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <ShoppingBagIcon className="h-5 w-5" />
                        Consumos Realizados (
                        {activeCheckout.consumptions.length} itens)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-200">
                            <tr>
                              <th className="px-4 py-2 text-left">Código</th>
                              <th className="px-4 py-2 text-left">Produto</th>
                              <th className="px-4 py-2 text-center">
                                Quantidade
                              </th>
                              <th className="px-4 py-2 text-right">
                                Valor Unitário
                              </th>
                              <th className="px-4 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeCheckout.consumptions.map((item) => (
                              <tr
                                key={item.id}
                                className={`border-b hover:bg-gray-100 transition-colors ${
                                  lastUpdatedItemId === item.id ? "bg-green-100" : ""
                                }`}
                              >
                                <td className="px-4 py-2 font-mono text-sm">
                                  {item.code}
                                </td>
                                <td className="px-4 py-2">{item.name}</td>
                                <td className="px-4 py-2 text-center">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  R$ {item.unitPrice.toFixed(2)}
                                </td>
                                <td className="px-4 py-2 text-right font-medium">
                                  R$ {item.totalPrice.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100">
                            <tr>
                              <td
                                colSpan="4"
                                className="px-4 py-2 text-right font-bold"
                              >
                                Total Consumos
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-green-600">
                                R${" "}
                                {activeCheckout.consumptions
                                  .reduce((sum, c) => sum + c.totalPrice, 0)
                                  .toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Status do Checkout */}
                <div className="mt-6 flex justify-center">
                  <div className="bg-yellow-100 text-yellow-800 px-6 py-3 rounded-lg flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-800"></div>
                    <span>
                      Aguardando confirmação do pagamento na recepção...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Checkouts Finalizados Recentemente */}
          {checkoutHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="bg-gray-800 text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-bold">
                  Últimos Checkouts Realizados
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {checkoutHistory.map((checkout) => (
                    <div
                      key={checkout.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-bold">
                            Quarto {checkout.room?.number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(checkout.endTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {checkout.consumptions?.length || 0} consumos
                          </p>
                          <p className="text-xs text-gray-400">
                            {checkout.bookingType === "OVERNIGHT"
                              ? "Pernoite"
                              : "Por hora"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            R$ {checkout.totalAmount?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!activeCheckout && checkoutHistory.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-400 mb-4">
                <HomeIcon className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-gray-600 mb-2">
                Nenhum checkout ativo
              </h3>
              <p className="text-gray-500">
                Quando um checkout for iniciado na recepção, ele aparecerá
                automaticamente aqui.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Exit;