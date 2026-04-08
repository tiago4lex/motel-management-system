import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/common/Header';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  CubeIcon,
  UserGroupIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';

const Reports = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [productsData, setProductsData] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard();
    } else if (activeTab === 'revenue') {
      loadRevenueReport();
    } else if (activeTab === 'products') {
      loadProductsReport();
    } else if (activeTab === 'occupancy') {
      loadOccupancyReport();
    }
  }, [activeTab, dateRange, groupBy]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      toast.error('Erro ao carregar dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueReport = async () => {
    setLoading(true);
    try {
      console.log('📊 Carregando relatório de faturamento...', { startDate: dateRange.startDate, endDate: dateRange.endDate, groupBy });
      const response = await api.get('/reports/revenue', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate, groupBy }
      });
      console.log('✅ Resposta do faturamento:', response.data);
      setRevenueData(response.data.data);
    } catch (error) {
      console.error('❌ Erro ao carregar relatório de faturamento:', error);
      toast.error('Erro ao carregar relatório de faturamento');
    } finally {
      setLoading(false);
    }
  };

  const loadProductsReport = async () => {
    setLoading(true);
    try {
      console.log('📊 Carregando relatório de produtos...', { startDate: dateRange.startDate, endDate: dateRange.endDate });
      const response = await api.get('/reports/products', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
      });
      console.log('✅ Resposta dos produtos:', response.data);
      setProductsData(response.data.data);
    } catch (error) {
      console.error('❌ Erro ao carregar relatório de produtos:', error);
      toast.error('Erro ao carregar relatório de produtos');
    } finally {
      setLoading(false);
    }
  };

  const loadOccupancyReport = async () => {
    setLoading(true);
    try {
      console.log('📊 Carregando relatório de ocupação...', { startDate: dateRange.startDate, endDate: dateRange.endDate });
      const response = await api.get('/reports/occupancy', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
      });
      console.log('✅ Resposta da ocupação:', response.data);
      setOccupancyData(response.data.data);
    } catch (error) {
      console.error('❌ Erro ao carregar relatório de ocupação:', error);
      toast.error('Erro ao carregar relatório de ocupação');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type) => {
    try {
      const response = await api.post('/reports/export', {
        type,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: 'excel'
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Relatório exportado com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
      console.error(error);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{title}</p>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );

  const TabButton = ({ tab, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab
        ? 'bg-primary-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header title="Relatórios" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header title="Relatórios" />

      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 p-4">
            <div className="flex flex-wrap gap-2">
              <TabButton tab="dashboard" label="Dashboard" icon={ChartBarIcon} />
              <TabButton tab="revenue" label="Faturamento" icon={CurrencyDollarIcon} />
              <TabButton tab="products" label="Produtos" icon={CubeIcon} />
              <TabButton tab="occupancy" label="Ocupação" icon={UserGroupIcon} />
            </div>
          </div>

          <div className="p-6">
            {/* Filtros de data */}
            {(activeTab !== 'dashboard') && (
              <div className="mb-6 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="px-3 py-2 border rounded-md"
                  />
                </div>
                {activeTab === 'revenue' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agrupar por</label>
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                      className="px-3 py-2 border rounded-md"
                    >
                      <option value="day">Dia</option>
                      <option value="week">Semana</option>
                      <option value="month">Mês</option>
                    </select>
                  </div>
                )}
                <button
                  onClick={() => exportReport(activeTab)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Exportar Excel
                </button>
              </div>
            )}

            {/* Dashboard */}
            {activeTab === 'dashboard' && dashboardData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    title="Faturamento Hoje"
                    value={`R$ ${dashboardData.today?.revenue?.toFixed(2) || '0,00'}`}
                    subtitle={`${dashboardData.today?.bookings || 0} reservas`}
                    icon={CurrencyDollarIcon}
                    color="text-green-600"
                  />
                  <StatCard
                    title="Faturamento Semana"
                    value={`R$ ${dashboardData.week?.revenue?.toFixed(2) || '0,00'}`}
                    subtitle={`${dashboardData.week?.bookings || 0} reservas`}
                    icon={ArrowTrendingUpIcon}
                    color="text-blue-600"
                  />
                  <StatCard
                    title="Faturamento Mês"
                    value={`R$ ${dashboardData.month?.revenue?.toFixed(2) || '0,00'}`}
                    subtitle={`${dashboardData.month?.bookings || 0} reservas`}
                    icon={ArrowTrendingUpIcon}
                    color="text-purple-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Produtos mais vendidos */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold mb-4">Produtos Mais Vendidos</h3>
                    <div className="space-y-3">
                      {dashboardData.topProducts?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{item.product?.name}</p>
                            <p className="text-xs text-gray-500">{item.totalQuantity} unidades</p>
                          </div>
                          <p className="font-bold text-green-600">
                            R$ {item.totalRevenue?.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quartos mais utilizados */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold mb-4">Quartos Mais Utilizados</h3>
                    <div className="space-y-3">
                      {dashboardData.topRooms?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Quarto {item.room?.number}</p>
                            <p className="text-xs text-gray-500">{item.room?.type?.name}</p>
                          </div>
                          <p className="font-bold">{item._count} reservas</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Taxa de ocupação */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold mb-4">Ocupação Atual</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold">{dashboardData.occupancy?.percentage}%</p>
                      <p className="text-sm text-gray-500">
                        {dashboardData.occupancy?.occupied} de {dashboardData.occupancy?.total} quartos ocupados
                      </p>
                    </div>
                    <div className="w-32 h-32">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Ocupados', value: dashboardData.occupancy?.occupied || 0 },
                              { name: 'Disponíveis', value: (dashboardData.occupancy?.total - dashboardData.occupancy?.occupied) || 0 }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={50}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[{ name: 'Ocupados', value: dashboardData.occupancy?.occupied || 0 },
                            { name: 'Disponíveis', value: (dashboardData.occupancy?.total - dashboardData.occupancy?.occupied) || 0 }].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Relatório de Faturamento */}
            {activeTab === 'revenue' && revenueData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    title="Faturamento Total"
                    value={`R$ ${revenueData.summary?.totalRevenue?.toFixed(2) || '0,00'}`}
                    icon={CurrencyDollarIcon}
                    color="text-green-600"
                  />
                  <StatCard
                    title="Total de Reservas"
                    value={revenueData.summary?.totalBookings || 0}
                    icon={ChartBarIcon}
                    color="text-blue-600"
                  />
                  <StatCard
                    title="Ticket Médio"
                    value={`R$ ${revenueData.summary?.averageTicket?.toFixed(2) || '0,00'}`}
                    icon={ArrowTrendingUpIcon}
                    color="text-purple-600"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold mb-4">Evolução do Faturamento</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData.groupedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={groupBy === 'day' ? 'date' : (groupBy === 'week' ? 'week' : 'month')} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Faturamento" />
                      <Line type="monotone" dataKey="bookings" stroke="#82ca9d" name="Reservas" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Relatório de Produtos */}
            {activeTab === 'products' && productsData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StatCard
                    title="Faturamento em Produtos"
                    value={`R$ ${productsData.summary?.totalRevenue?.toFixed(2) || '0,00'}`}
                    icon={CubeIcon}
                    color="text-green-600"
                  />
                  <StatCard
                    title="Itens Vendidos"
                    value={productsData.summary?.totalItems || 0}
                    icon={CubeIcon}
                    color="text-blue-600"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold mb-4">Ranking de Produtos</h3>
                  <div className="space-y-3">
                    {productsData.products?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white rounded">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-gray-400">#{idx + 1}</span>
                          <div>
                            <p className="font-medium">{item.product?.name}</p>
                            <p className="text-xs text-gray-500">
                              Código: {item.product?.code} | {item.product?.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">R$ {item.totalRevenue?.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{item.totalQuantity} unidades</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Relatório de Ocupação */}
            {activeTab === 'occupancy' && occupancyData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Taxa de Ocupação"
                    value={`${occupancyData.summary?.occupancyRate || 0}%`}
                    icon={UserGroupIcon}
                    color="text-green-600"
                  />
                  <StatCard
                    title="Total de Reservas"
                    value={occupancyData.summary?.totalBookings || 0}
                    icon={ChartBarIcon}
                    color="text-blue-600"
                  />
                  <StatCard
                    title="Média Diária"
                    value={occupancyData.summary?.averageDailyBookings || 0}
                    icon={CalendarIcon}
                    color="text-purple-600"
                  />
                  <StatCard
                    title="Ticket Médio"
                    value={`R$ ${occupancyData.summary?.averageTicket?.toFixed(2) || '0,00'}`}
                    icon={CurrencyDollarIcon}
                    color="text-yellow-600"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold mb-4">Ocupação por Tipo de Quarto</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={occupancyData.byRoomType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="bookings" fill="#8884d8" name="Reservas" />
                      <Bar yAxisId="right" dataKey="totalRevenue" fill="#82ca9d" name="Faturamento" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold mb-4">Detalhamento por Tipo</h3>
                  <div className="space-y-3">
                    {occupancyData.byRoomType?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white rounded">
                        <div>
                          <p className="font-medium">{item.type}</p>
                          <p className="text-xs text-gray-500">{item.bookings} reservas</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">R$ {item.totalRevenue?.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{item.totalHours?.toFixed(1)} horas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;