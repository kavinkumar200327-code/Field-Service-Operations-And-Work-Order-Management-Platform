import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Filter, 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  X,
  MapPin,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { analyticsApi, workOrdersApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const ReportsPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('costs');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Completed Orders Pop-up Modal State
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedSearch, setCompletedSearch] = useState('');

  // Data states
  const [costsData, setCostsData] = useState(null);
  const [woData, setWoData] = useState([]);
  const [techData, setTechData] = useState([]);
  const [partsData, setPartsData] = useState([]);

  // Work Orders Filter state
  const [woStatus, setWoStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchOperationalCosts = async () => {
    try {
      const res = await analyticsApi.getOperationalCostsReport();
      if (res.data?.success) {
        setCostsData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load operational costs:', err);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      const params = {};
      if (woStatus) params.status = woStatus;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await analyticsApi.getWorkOrdersReport(params);
      if (res.data?.success) {
        setWoData(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load work orders report:', err);
    }
  };

  const fetchTechPerformance = async () => {
    try {
      const res = await analyticsApi.getTechnicianPerformanceReport();
      if (res.data?.success) {
        setTechData(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load technician performance report:', err);
    }
  };

  const fetchPartsConsumption = async () => {
    try {
      const res = await analyticsApi.getPartsConsumptionReport();
      if (res.data?.success) {
        setPartsData(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load parts consumption report:', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOperationalCosts(),
        fetchWorkOrders(),
        fetchTechPerformance(),
        fetchPartsConsumption(),
      ]);
    } catch (err) {
      console.error('Error loading analytics:', err);
      addToast('Some reporting data could not be retrieved', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowCompletedModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenCompletedOrdersModal = async () => {
    setShowCompletedModal(true);
    setCompletedSearch('');
    setCompletedLoading(true);
    try {
      const res = await workOrdersApi.list({ status: 'COMPLETED' });
      if (res.data?.success) {
        setCompletedOrders(res.data.data || []);
      } else {
        setCompletedOrders([]);
      }
    } catch (err) {
      console.error('Failed to load completed work orders:', err);
      addToast('Failed to load completed work orders', 'error');
      setCompletedOrders([]);
    } finally {
      setCompletedLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not recorded';
    try {
      const safeStr = typeof dateStr === 'string' && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
      const d = new Date(safeStr);
      if (isNaN(d.getTime())) return dateStr;
      return (
        d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
        ' • ' +
        d.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      return dateStr;
    }
  };

  const filteredCompletedOrders = completedOrders.filter((wo) => {
    if (!completedSearch.trim()) return true;
    const term = completedSearch.toLowerCase();
    return (
      (wo.work_order_number && wo.work_order_number.toLowerCase().includes(term)) ||
      (wo.customer_name && wo.customer_name.toLowerCase().includes(term)) ||
      (wo.service_name && wo.service_name.toLowerCase().includes(term)) ||
      (wo.service_location && wo.service_location.toLowerCase().includes(term)) ||
      (wo.technician_name && wo.technician_name.toLowerCase().includes(term)) ||
      (wo.priority && wo.priority.toLowerCase().includes(term)) ||
      (wo.completion_notes && wo.completion_notes.toLowerCase().includes(term))
    );
  });

  const handleDownloadCsv = async (type) => {
    try {
      setDownloading(true);
      let response;
      let filename = 'report.csv';

      if (type === 'work-orders') {
        const params = {};
        if (woStatus) params.status = woStatus;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        response = await analyticsApi.exportWorkOrdersCsv(params);
        filename = `work_orders_report_${new Date().toISOString().slice(0, 10)}.csv`;
      } else if (type === 'technicians') {
        response = await analyticsApi.exportTechnicianPerformanceCsv();
        filename = `technician_performance_${new Date().toISOString().slice(0, 10)}.csv`;
      } else if (type === 'parts') {
        response = await analyticsApi.exportPartsConsumptionCsv();
        filename = `parts_consumption_${new Date().toISOString().slice(0, 10)}.csv`;
      }

      if (response && response.data) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        addToast('CSV export downloaded successfully', 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to download CSV export', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Generating operational reports..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyze field service performance, cost variances, technician efficiency, and inventory usage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-1.5 text-gray-500" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { id: 'costs', name: 'Financial & Operational Costs', icon: DollarSign },
            { id: 'work-orders', name: 'Work Orders Export', icon: FileText },
            { id: 'technicians', name: 'Technician Performance', icon: Users },
            { id: 'parts', name: 'Parts & Inventory Consumption', icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-2 border-b-2 font-medium text-sm inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: Financial & Costs */}
      {activeTab === 'costs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Completed Orders"
              value={costsData?.total_completed_orders || 0}
              subtitle="Click to view in pop-up"
              icon={CheckCircle2}
              color="emerald"
              onClick={handleOpenCompletedOrdersModal}
            />
            <StatCard
              title="Estimated Revenue"
              value={`$${(costsData?.total_estimated_revenue ?? 0).toLocaleString()}`}
              icon={DollarSign}
              color="indigo"
            />
            <StatCard
              title="Actual Revenue"
              value={`$${(costsData?.total_actual_revenue ?? 0).toLocaleString()}`}
              icon={TrendingUp}
              color="emerald"
            />
            <StatCard
              title="Variance (Actual - Est)"
              value={`$${(costsData?.variance ?? 0).toLocaleString()}`}
              icon={AlertCircle}
              color={(costsData?.variance ?? 0) >= 0 ? 'emerald' : 'amber'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Financial Summary Breakdown</h2>
              <div className="space-y-4">
                <div 
                  onClick={handleOpenCompletedOrdersModal}
                  className="flex justify-between items-center py-2.5 border-b border-gray-100 hover:bg-slate-50 cursor-pointer rounded-lg px-2 -mx-2 transition group"
                  title="Click to view completed orders in pop-up"
                >
                  <span className="text-sm text-gray-600 flex items-center gap-1.5">
                    <span>Total Billed Work Orders</span>
                    <span className="text-[11px] text-sky-600 font-medium group-hover:underline">(View in pop-up)</span>
                  </span>
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    {costsData?.total_completed_orders || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Target / Estimated Revenue</span>
                  <span className="text-sm font-semibold text-blue-600">${costsData?.total_estimated_revenue || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Realized Gross Revenue</span>
                  <span className="text-sm font-semibold text-emerald-600">${costsData?.total_actual_revenue || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-gray-600">Operational Variance</span>
                  <span className={`text-sm font-bold ${(costsData?.variance ?? 0) >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {(costsData?.variance ?? 0) >= 0 ? `+$${(costsData?.variance ?? 0).toLocaleString()}` : `-$${Math.abs(costsData?.variance ?? 0).toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
              <h2 className="text-base font-semibold text-gray-900 mb-2">Cost Performance Overview</h2>
              <p className="text-sm text-gray-500 mb-6">
                Direct comparison between estimated job pricing and actual settled invoices including additional parts and labor time. Click Actual Rev to inspect completed jobs.
              </p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Estimated Rev', amount: costsData?.total_estimated_revenue || 0, isActual: false },
                      { name: 'Actual Rev', amount: costsData?.total_actual_revenue || 0, isActual: true },
                    ]}
                    onClick={(state) => {
                      if (state && state.activePayload && state.activePayload[0]?.payload?.isActual) {
                        handleOpenCompletedOrdersModal();
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(val) => [`$${val}`, 'Revenue']} />
                    <Bar
                      dataKey="amount"
                      radius={[4, 4, 0, 0]}
                      className="cursor-pointer"
                      onClick={(entry) => {
                        if (entry && entry.isActual) {
                          handleOpenCompletedOrdersModal();
                        }
                      }}
                    >
                      <Cell fill="#3B82F6" />
                      <Cell
                        fill="#10B981"
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleOpenCompletedOrdersModal}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Work Orders Report */}
      {activeTab === 'work-orders' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Work Orders Report & Export</h2>
              <p className="text-sm text-gray-500">Filter, inspect, and export work orders to CSV spreadsheet</p>
            </div>
            <button
              onClick={() => handleDownloadCsv('work-orders')}
              disabled={downloading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Exporting...' : 'Export Work Orders CSV'}
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status Filter</label>
              <select
                value={woStatus}
                onChange={(e) => setWoStatus(e.target.value)}
                className="w-full text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="EN_ROUTE">En Route</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchWorkOrders}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto border border-gray-100 rounded-lg mt-4">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">WO Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Service</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Est. Cost</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Actual Cost</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {woData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No work orders matching selected criteria
                    </td>
                  </tr>
                ) : (
                  woData.map((order, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-blue-600">{order.work_order_number}</td>
                      <td className="px-4 py-3 text-gray-900">{order.customer}</td>
                      <td className="px-4 py-3 text-gray-600">{order.service}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-700">${order.estimated_cost}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {order.actual_cost ? `$${order.actual_cost}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {order.created_at?.slice(0, 10)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Technician Performance */}
      {activeTab === 'technicians' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Technician Allocation & Performance</h2>
              <p className="text-sm text-gray-500">Service delivery completion rates and verified customer feedback ratings</p>
            </div>
            <button
              onClick={() => handleDownloadCsv('technicians')}
              disabled={downloading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Exporting...' : 'Export Performance CSV'}
            </button>
          </div>

          {/* Chart preview */}
          {techData.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Assigned vs Completed Jobs by Technician</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={techData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_assigned" name="Assigned Jobs" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed Jobs" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Technician Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Assigned Region</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Total Assigned</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Completed</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Completion Rate</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Avg CSAT Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {techData.map((t) => (
                  <tr key={t.technician_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.region || 'Standard Territory'}</td>
                    <td className="px-4 py-3 text-gray-700">{t.total_assigned}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">{t.completed}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(t.completion_rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{t.completion_rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-amber-600 font-semibold">
                      ★ {t.average_rating} / 5.0
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Parts & Inventory Consumption */}
      {activeTab === 'parts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Parts Consumption & Replenishment</h2>
              <p className="text-sm text-gray-500">Track parts consumed in field service and identify critical stock levels</p>
            </div>
            <button
              onClick={() => handleDownloadCsv('parts')}
              disabled={downloading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Exporting...' : 'Export Consumption CSV'}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Part Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Unit Cost</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Available Stock</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Consumed Quantity</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Total Consumption Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {partsData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No parts data available
                    </td>
                  </tr>
                ) : (
                  partsData.map((part, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{part.part_sku}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{part.name}</td>
                      <td className="px-4 py-3 text-gray-700">${part.unit_cost}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          part.available_stock <= 5 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {part.available_stock} units
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{part.consumed_quantity}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold">
                        ${part.total_consumption_value}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Orders Pop-up Modal */}
      {showCompletedModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowCompletedModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 via-white to-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">
                        Completed Work Orders
                      </h3>
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                        {completedOrders.length} {completedOrders.length === 1 ? 'Order' : 'Orders'} Billed
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Billed and verified service operations with finalized financial and service records
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompletedModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  title="Close popup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Financial Ticker inside Modal */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-100 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Billed Orders</span>
                  <span className="text-base font-bold text-slate-900">{costsData?.total_completed_orders || completedOrders.length}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Target / Est. Revenue</span>
                  <span className="text-base font-bold text-blue-600">${costsData?.total_estimated_revenue || 0}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Realized Revenue</span>
                  <span className="text-base font-bold text-emerald-600">${costsData?.total_actual_revenue || 0}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Net Variance</span>
                  <span className={`text-base font-bold ${(costsData?.variance ?? 0) >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {(costsData?.variance ?? 0) >= 0 ? `+$${(costsData?.variance ?? 0).toLocaleString()}` : `-$${Math.abs(costsData?.variance ?? 0).toLocaleString()}`}
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter completed orders by WO #, customer, technician, service, notes..."
                  value={completedSearch}
                  onChange={(e) => setCompletedSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400 shadow-2xs"
                />
                {completedSearch && (
                  <button
                    type="button"
                    onClick={() => setCompletedSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
              {completedLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-medium text-slate-500">
                    Retrieving completed work order details...
                  </p>
                </div>
              ) : filteredCompletedOrders.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-200 p-6">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    {completedSearch
                      ? `No completed orders matched "${completedSearch}"`
                      : 'No completed work orders found'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {completedSearch
                      ? 'Try clearing the search query to see all results.'
                      : 'There are currently no completed work orders on record.'}
                  </p>
                  {completedSearch && (
                    <button
                      type="button"
                      onClick={() => setCompletedSearch('')}
                      className="mt-3 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                filteredCompletedOrders.map((wo) => {
                  const est = Number(wo.estimated_cost || 0);
                  const act = Number(wo.actual_cost || wo.estimated_cost || 0);
                  const diff = act - est;
                  return (
                    <div
                      key={wo.id}
                      className="bg-white rounded-xl border border-slate-200/90 p-4 hover:border-emerald-300 hover:shadow-md transition-all space-y-3"
                    >
                      {/* Top Row: WO Number, Status, Priority, Financials */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 tracking-tight">
                            {wo.work_order_number}
                          </span>
                          <PriorityBadge priority={wo.priority} />
                          <StatusBadge status={wo.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div>
                            <span className="text-[11px] text-slate-400">Target: </span>
                            <span className="font-semibold text-slate-600">${est.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400">Billed: </span>
                            <span className="font-bold text-emerald-600">${act.toFixed(2)}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            diff >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {diff >= 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`}
                          </span>
                        </div>
                      </div>

                      {/* Middle Grid: Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {/* Customer */}
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Customer
                          </span>
                          <p className="font-bold text-slate-800 truncate">{wo.customer_name || 'Client'}</p>
                          {wo.customer_phone && (
                            <p className="text-[11px] text-slate-500 truncate">{wo.customer_phone}</p>
                          )}
                        </div>

                        {/* Service & Category */}
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Delivered Service
                          </span>
                          <p className="font-bold text-slate-800 truncate">{wo.service_name || 'General Service'}</p>
                          {wo.service_category_name && (
                            <span className="inline-block text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded font-medium mt-0.5">
                              {wo.service_category_name}
                            </span>
                          )}
                        </div>

                        {/* Assigned Tech */}
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Field Technician
                          </span>
                          {wo.technician_name ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                                {wo.technician_name.charAt(0)}
                              </span>
                              <span className="font-bold text-slate-800 truncate">{wo.technician_name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Technician unrecorded</span>
                          )}
                        </div>

                        {/* Timing */}
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Fulfilled Date / Time
                          </span>
                          <p className="font-medium text-slate-700">
                            {formatDateTime(wo.actual_end || wo.actual_start || wo.updated_at)}
                          </p>
                        </div>
                      </div>

                      {/* Service Location */}
                      {wo.service_location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{wo.service_location}</span>
                        </div>
                      )}

                      {/* Verified Completion Notes */}
                      {wo.completion_notes && (
                        <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 text-xs text-slate-700 space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified Service Completion Report:</span>
                          </div>
                          <p className="italic text-slate-600 pl-5">
                            "{wo.completion_notes}"
                          </p>
                        </div>
                      )}

                      {/* Footer Action */}
                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCompletedModal(false);
                            navigate(`/work-orders/${wo.id}`);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs group cursor-pointer"
                        >
                          <span>View Full Work Order</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Showing <strong className="text-slate-800">{filteredCompletedOrders.length}</strong> of{' '}
                <strong className="text-slate-800">{completedOrders.length}</strong> completed jobs
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompletedModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompletedModal(false);
                    navigate('/work-orders?status=COMPLETED');
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open in Work Orders Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { ReportsPage };
export default ReportsPage;
