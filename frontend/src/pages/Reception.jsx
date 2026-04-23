// frontend/src/pages/Reception.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useTTS } from "../hooks/useTTS";
import toast from "react-hot-toast";
import {
  ClockIcon,
  HomeIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  SpeakerWaveIcon,
  TrashIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

const Reception = () => {
  const { api } = useAuth();
  const { socket } = useSocket();
  const { ttsService } = useTTS();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ live: 0, occupied: 0, confere: 0 });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showProducts, setShowProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [currentTimes, setCurrentTimes] = useState({});
  const [showStatusMenu, setShowStatusMenu] = useState(null);

  // Timer para atualizar tempos em tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      updateCurrentTimes();
    }, 1000);
    return () => clearInterval(timer);
  }, [bookings]);

  // Monitorar mudanças no selectedBooking para atualizar o tempo real
  useEffect(() => {
    if (!selectedBooking) return;

    const interval = setInterval(() => {
      if (selectedBooking && selectedBooking.status === "ACTIVE") {
        const now = new Date();
        const start = new Date(selectedBooking.startTime);
        const hours = Math.floor((now - start) / (1000 * 60 * 60));

        let currentAmount = 0;

        if (selectedBooking.bookingType === "OVERNIGHT") {
          currentAmount = selectedBooking.room?.type?.overnightRate || 0;
        } else {
          const initialPrice = selectedBooking.room?.type?.initialPrice || 0;
          const hourlyRate = selectedBooking.room?.type?.hourlyRate || 0;
          currentAmount = initialPrice + hours * hourlyRate;
        }

        const consumptionsTotal =
          selectedBooking.consumptions?.reduce(
            (sum, c) => sum + (c.totalPrice || 0),
            0,
          ) || 0;
        currentAmount += consumptionsTotal;

        const extrasTotal =
          selectedBooking.timeExtras?.reduce(
            (sum, e) => sum + (e.amount || 0),
            0,
          ) || 0;
        currentAmount += extrasTotal;

        setSelectedBooking((prev) => ({
          ...prev,
          currentAmount,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedBooking]);

  // WebSocket listeners
  useEffect(() => {
    loadData();

    if (socket) {
      socket.on("booking-created", () => {
        console.log("📢 WebSocket: booking-created");
        loadData();
      });

      socket.on("checkout-confirmed", (data) => {
        console.log("📢 WebSocket: checkout-confirmed", data);
        loadData();
        if (selectedBooking && selectedBooking.id === data.bookingId) {
          setSelectedBooking(null);
          toast.success(`Check-out do quarto ${data.roomNumber} confirmado!`);
        }
      });

      socket.on("room-status-update", () => {
        console.log("📢 WebSocket: room-status-update");
        loadData();
      });

      socket.on("consumption-added", (data) => {
        console.log("📢 WebSocket: consumption-added", data);
        loadData();

        if (selectedBooking && selectedBooking.id === data.bookingId) {
          const fetchUpdatedBooking = async () => {
            const response = await api.get("/bookings/active");
            const updated = response.data.data.find(
              (b) => b.id === data.bookingId,
            );
            if (updated) {
              setSelectedBooking(updated);
            }
          };
          fetchUpdatedBooking();
        }
      });

      socket.on("booking-type-changed", (data) => {
        console.log("📢 WebSocket: booking-type-changed", data);
        loadData();

        if (selectedBooking && selectedBooking.id === data.bookingId) {
          setSelectedBooking((prev) => ({
            ...prev,
            bookingType: data.bookingType,
            currentAmount: data.currentAmount,
          }));
        }
      });

      socket.on("checkout-consumption-updated", (data) => {
        console.log("📢 WebSocket: checkout-consumption-updated", data);
        if (selectedBooking && selectedBooking.id === data.bookingId) {
          setSelectedBooking((prev) => ({
            ...prev,
            consumptions: data.consumptions,
            currentAmount: data.newCurrentAmount,
          }));
        }
        loadData();
      });

      return () => {
        socket.off("booking-created");
        socket.off("checkout-confirmed");
        socket.off("room-status-update");
        socket.off("consumption-added");
        socket.off("booking-type-changed");
        socket.off("checkout-consumption-updated");
      };
    }
  }, [socket, selectedBooking]);

  const updateCurrentTimes = () => {
    const newTimes = {};
    const now = new Date();

    bookings.forEach((booking) => {
      if (booking.status === "ACTIVE" && booking.room && booking.room.type) {
        const start = new Date(booking.startTime);
        const diffMs = now - start;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        // Calcular o valor atual
        let currentAmount = 0;
        if (booking.bookingType === "OVERNIGHT") {
          currentAmount = booking.room.type.overnightRate || 0;
        } else {
          const initialPrice = booking.room.type.initialPrice || 0;
          const hourlyRate = booking.room.type.hourlyRate || 0;
          currentAmount = initialPrice + hours * hourlyRate;
        }

        const consumptionsTotal = (booking.consumptions || []).reduce(
          (sum, c) => sum + (c.totalPrice || 0),
          0,
        );
        currentAmount += consumptionsTotal;

        const extrasTotal = (booking.timeExtras || []).reduce(
          (sum, e) => sum + (e.amount || 0),
          0,
        );
        currentAmount += extrasTotal;

        newTimes[booking.id] = {
          display: `${hours}h ${minutes}m ${seconds}s`,
          hours,
          minutes,
          seconds,
          totalMs: diffMs,
          currentAmount,
        };

        // Atualizar o booking no estado
        if (booking.currentAmount !== currentAmount) {
          booking.currentAmount = currentAmount;
        }
      }
    });

    setCurrentTimes(newTimes);
  };

  const loadData = async () => {
    try {
      console.log("🔄 Carregando dados...");
      const [bookingsRes, roomsRes] = await Promise.all([
        api.get("/bookings/active"),
        api.get("/rooms"),
      ]);

      setBookings(bookingsRes.data.data);
      setStats(bookingsRes.data.stats);
      setRooms(roomsRes.data.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (roomId, bookingType = "HOURLY") => {
    try {
      await api.post("/bookings", { roomId, bookingType });
      await loadData();
    } catch (error) {
      console.error("Erro no check-in:", error);
      alert(error.response?.data?.error?.message || "Erro no check-in");
    }
  };

  const handleChangeBookingType = async (bookingId, bookingType) => {
    try {
      console.log("🔄 Alterando tipo para:", bookingType);
      const response = await api.patch(`/bookings/${bookingId}/type`, {
        bookingType,
      });

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === bookingId
            ? {
                ...response.data.data,
                currentAmount: response.data.data.currentAmount,
              }
            : booking,
        ),
      );

      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(response.data.data);
      }

      updateCurrentTimes();
      toast.success(response.data.message);
    } catch (error) {
      console.error("❌ Erro ao alterar tipo:", error);
      toast.error(
        error.response?.data?.error?.message ||
          "Erro ao alterar tipo de alocação",
      );
    }
  };

  const handleChangeRoomStatus = async (roomId, status) => {
    try {
      await api.patch(`/bookings/rooms/${roomId}/status`, { status });
      await loadData();
      setShowStatusMenu(null);
      if (selectedBooking?.roomId === roomId) {
        setSelectedBooking(null);
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  // Função para iniciar checkout (abrir modal e notificar tela de saída)
  const handleStartCheckout = async (bookingId) => {
    try {
      console.log("🏁 Iniciando checkout do booking:", bookingId);

      // Buscar o booking completo
      const response = await api.get(`/bookings/${bookingId}`);
      const booking = response.data.data;

      console.log("📋 Booking encontrado:", booking);

      // Verificar se o booking tem os dados necessários
      if (!booking.room || !booking.room.type) {
        toast.error("Dados do quarto incompletos");
        return;
      }

      // Abrir o modal diretamente
      setSelectedBooking(booking);

      // Notificar a tela de saída
      await api.post(`/bookings/${bookingId}/start-checkout`);

      toast.info(
        `Checkout do quarto ${booking.room.number} iniciado. Finalize no modal.`,
      );
    } catch (error) {
      console.error("❌ Erro ao iniciar checkout:", error);
      toast.error(
        error.response?.data?.error?.message || "Erro ao iniciar checkout",
      );
    }
  };

  // Função para confirmar checkout (finalizar)
  const handleConfirmCheckout = async (bookingId) => {
    if (window.confirm("Confirmar finalização do check-out?")) {
      try {
        const response = await api.post(
          `/bookings/${bookingId}/confirm-checkout`,
        );
        toast.success(response.data.message);
        setSelectedBooking(null);
        await loadData();
      } catch (error) {
        console.error("❌ Erro ao confirmar checkout:", error);
        toast.error(
          error.response?.data?.error?.message || "Erro ao confirmar checkout",
        );
      }
    }
  };

  const handleSearchProduct = async (search) => {
    setSearchTerm(search);
    if (search.length >= 1) {
      try {
        const response = await api.get(
          `/bookings/products/search?search=${search}`,
        );
        setSearchResults(response.data.data);
      } catch (error) {
        console.error("Erro na busca:", error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddConsumption = async (bookingId, productId, quantity = 1) => {
    try {
      console.log("➕ Adicionando consumo...");
      await api.post(`/bookings/${bookingId}/consumption`, {
        productId,
        quantity,
      });
      await loadData();

      setShowProducts(false);
      setSearchTerm("");
      setSearchResults([]);

      if (selectedBooking && selectedBooking.id === bookingId) {
        const response = await api.get("/bookings/active");
        const updated = response.data.data.find((b) => b.id === bookingId);
        if (updated) {
          setSelectedBooking(updated);
        }
      }
    } catch (error) {
      console.error("Erro ao adicionar consumo:", error);
      alert(
        error.response?.data?.error?.message || "Erro ao adicionar consumo",
      );
    }
  };

  const handleRemoveConsumption = async (bookingId, consumptionId) => {
    try {
      await api.delete(`/bookings/${bookingId}/consumption/${consumptionId}`);
      await loadData();

      if (selectedBooking && selectedBooking.id === bookingId) {
        const response = await api.get("/bookings/active");
        const updated = response.data.data.find((b) => b.id === bookingId);
        if (updated) {
          setSelectedBooking(updated);
        }
      }
    } catch (error) {
      console.error("Erro ao remover consumo:", error);
    }
  };

  const announceCheckoutValue = () => {
    if (selectedBooking) {
      const currentAmount = selectedBooking.currentAmount || 0;
      ttsService.speak(
        `Quarto ${selectedBooking.room.number}, valor total: ${currentAmount.toFixed(2)} reais.`,
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-500";
      case "OCCUPIED":
        return "bg-red-500";
      case "CLEANING":
        return "bg-yellow-500";
      case "MAINTENANCE":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "AVAILABLE":
        return "Livre";
      case "OCCUPIED":
        return "Ocupado";
      case "CLEANING":
        return "Limpeza";
      case "MAINTENANCE":
        return "Manutenção";
      default:
        return status;
    }
  };

  const statusOptions = [
    { value: "AVAILABLE", label: "Disponível", color: "bg-green-500" },
    { value: "CLEANING", label: "Limpeza", color: "bg-yellow-500" },
    { value: "MAINTENANCE", label: "Manutenção", color: "bg-gray-500" },
    { value: "OCCUPIED", label: "Ocupado", color: "bg-red-500" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-white">SISMOTEL</h1>
            <div className="text-right">
              <p className="text-sm text-gray-400">ADMIN - SUPERVISOR</p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-900/50 rounded-lg p-3 text-center">
              <p className="text-3xl font-bold text-blue-400">{stats.live}</p>
              <p className="text-sm text-gray-300">Live</p>
            </div>
            <div className="bg-red-900/50 rounded-lg p-3 text-center">
              <p className="text-3xl font-bold text-red-400">
                {stats.occupied}
              </p>
              <p className="text-sm text-gray-300">Ocupado</p>
            </div>
            <div className="bg-green-900/50 rounded-lg p-3 text-center">
              <p className="text-3xl font-bold text-green-400">
                {stats.confere}
              </p>
              <p className="text-sm text-gray-300">Confere</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de quartos */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-2">
            {rooms.map((room) => {
              const activeBooking = bookings.find((b) => b.roomId === room.id);
              const isOccupied = room.status === "OCCUPIED";
              const currentTime = activeBooking
                ? currentTimes[activeBooking.id]
                : null;

              return (
                <div
                  key={room.id}
                  className={`relative rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 ${
                    isOccupied
                      ? "bg-red-900/30 border-2 border-red-500"
                      : "bg-gray-800 border border-gray-700"
                  }`}
                >
                  <div className={`h-1 ${getStatusColor(room.status)}`} />
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                      <span className="text-2xl font-bold text-white">
                        {room.number}
                      </span>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowStatusMenu(
                              showStatusMenu === room.id ? null : room.id,
                            );
                          }}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded flex items-center gap-1"
                        >
                          <PencilIcon className="h-3 w-3" />
                          <span className="text-xs">
                            {getStatusText(room.status)}
                          </span>
                        </button>

                        {showStatusMenu === room.id && (
                          <div className="absolute top-full right-0 mt-1 bg-gray-800 rounded-lg shadow-lg z-10 min-w-[120px]">
                            {statusOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChangeRoomStatus(room.id, option.value);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2"
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${option.color}`}
                                ></div>
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {room.type?.name}
                    </p>

                    {isOccupied &&
                      activeBooking &&
                      activeBooking.room &&
                      activeBooking.room.type && (
                        <div className="mt-2 text-xs">
                          <p className="text-yellow-400 font-mono">
                            {currentTime?.display || "Calculando..."}
                          </p>
                          <p className="text-green-400 font-bold">
                            R$ {(activeBooking.currentAmount || 0).toFixed(2)}
                          </p>
                          <select
                            value={activeBooking.bookingType}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleChangeBookingType(
                                activeBooking.id,
                                e.target.value,
                              );
                            }}
                            className="mt-1 text-xs bg-gray-700 text-white rounded px-1 py-0.5 w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="HOURLY">💰 Por Hora</option>
                            <option value="OVERNIGHT">🌙 Pernoite</option>
                          </select>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartCheckout(activeBooking.id);
                            }}
                            className="mt-2 w-full bg-red-600 text-white text-xs py-1 rounded hover:bg-red-700 flex items-center justify-center gap-1"
                          >
                            <CheckIcon className="h-3 w-3" />
                            CHECK-OUT
                          </button>
                        </div>
                      )}
                    {!isOccupied && room.status === "AVAILABLE" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckin(room.id, "HOURLY");
                        }}
                        className="mt-2 w-full bg-green-600 text-white text-xs py-1 rounded hover:bg-green-700"
                      >
                        CHECK-IN
                      </button>
                    )}
                    {room.status === "CLEANING" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChangeRoomStatus(room.id, "AVAILABLE");
                        }}
                        className="mt-2 w-full bg-blue-600 text-white text-xs py-1 rounded hover:bg-blue-700"
                      >
                        DISPONIBILIZAR
                      </button>
                    )}
                    {room.status === "MAINTENANCE" && (
                      <p className="mt-2 text-xs text-gray-400 text-center">
                        🔧 MANUTENÇÃO
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de checkout */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-800">
              <h2 className="text-2xl font-bold text-white">
                Quarto {selectedBooking.room.number} - Checkout
              </h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <button
                onClick={announceCheckoutValue}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <SpeakerWaveIcon className="h-5 w-5" />
                Falar Valor do Check-out
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-3">
                  <p className="text-sm text-gray-400">Tempo</p>
                  <p className="text-2xl font-bold text-yellow-400 font-mono">
                    {currentTimes[selectedBooking.id]?.display ||
                      "Calculando..."}
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <p className="text-sm text-gray-400">Valor Atual</p>
                  <p className="text-2xl font-bold text-green-400">
                    R$ {selectedBooking.currentAmount?.toFixed(2) || "0"}
                  </p>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-400 mb-2">Tipo de Alocação</p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleChangeBookingType(selectedBooking.id, "HOURLY")
                    }
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      selectedBooking.bookingType === "HOURLY"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                    }`}
                  >
                    Por Hora
                  </button>
                  <button
                    onClick={() =>
                      handleChangeBookingType(selectedBooking.id, "OVERNIGHT")
                    }
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      selectedBooking.bookingType === "OVERNIGHT"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                    }`}
                  >
                    Pernoite
                  </button>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-bold">Adicionar Consumo</h3>
                  <button
                    onClick={() => setShowProducts(!showProducts)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 inline mr-1" />
                    Adicionar
                  </button>
                </div>

                {showProducts && (
                  <div className="mb-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nome ou código (ex: 001)"
                        value={searchTerm}
                        onChange={(e) => handleSearchProduct(e.target.value)}
                        className="w-full bg-gray-600 text-white rounded-lg pl-9 pr-3 py-2 text-sm"
                        autoFocus
                      />
                    </div>

                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          onClick={() =>
                            handleAddConsumption(selectedBooking.id, product.id)
                          }
                          className="w-full bg-gray-600 text-white p-2 rounded text-sm hover:bg-gray-500 text-left flex justify-between items-center"
                        >
                          <div>
                            <span className="text-yellow-400 font-mono">
                              [{product.code}]
                            </span>
                            <span className="ml-2">{product.name}</span>
                          </div>
                          <span className="text-green-400 font-bold">
                            R$ {product.price.toFixed(2)}
                          </span>
                        </button>
                      ))}
                      {searchTerm && searchResults.length === 0 && (
                        <p className="text-gray-400 text-center py-2">
                          Nenhum produto encontrado
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {/* Lista de consumos atuais */}
                <div className="space-y-2 max-h-48 overflow-y-auto mt-3">
                  <h4 className="text-sm text-gray-400">Consumos Atuais:</h4>
                  {selectedBooking.consumptions &&
                  selectedBooking.consumptions.length > 0 ? (
                    selectedBooking.consumptions.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center text-sm bg-gray-600 p-2 rounded"
                      >
                        <div>
                          <span className="text-gray-300">
                            {item.quantity}x {item.product?.name || "Produto"}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            [{item.product?.code || "---"}]
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">
                            R$ {(item.totalPrice || 0).toFixed(2)}
                          </span>
                          <button
                            onClick={() =>
                              handleRemoveConsumption(
                                selectedBooking.id,
                                item.id,
                              )
                            }
                            className="text-red-400 hover:text-red-300"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-2">
                      Nenhum consumo registrado
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleConfirmCheckout(selectedBooking.id)}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 text-lg flex items-center justify-center gap-2"
              >
                <CheckIcon className="h-5 w-5" />
                FINALIZAR CHECKOUT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reception;
