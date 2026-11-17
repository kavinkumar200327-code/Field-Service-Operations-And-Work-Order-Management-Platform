import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { workOrdersApi, servicesApi, customersApi, techniciansApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  ClipboardList,
  Search,
  Plus,
  Eye,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  X,
} from 'lucide-react';

export const WorkOrdersListPage = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Modal form
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [newWO, setNewWO] = useState({
    customer_id: '',
    service_id: '',
    service_location: '',
    description: '',
    priority: 'MEDIUM',
    scheduled_start: '',
    scheduled_end: '',
    assigned_technician_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const { user, hasRole } = useAuth();
  const { success, error } = useToast();
  const [searchParams] = useSearchParams();

  const isStaff = hasRole(['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER', 'FIELD_TECHNICIAN']);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const res = await workOrdersApi.list({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined,
      });
      if (res.data?.success) setWorkOrders(res.data.data);
    } catch (err) {
      error("Failed to load work orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const statusParam = searchParams.get('status');
    setStatusFilter(statusParam || '');
  }, [searchParams]);

  useEffect(() => {
    fetchWorkOrders();
  }, [search, statusFilter, priorityFilter]);

  const loadDropdowns = async () => {
    try {
      const [custRes, svcRes, techRes] = await Promise.all([
        customersApi.list(),
        servicesApi.list({ status: 'ACTIVE' }),
        techniciansApi.list(),
      ]);
      if (custRes.data?.success) {
        setCustomers(custRes.data.data);
        if (custRes.data.data.length > 0 && !newWO.customer_id) {
          setNewWO(prev => ({
            ...prev,
            customer_id: custRes.data.data[0].id,
            service_location: custRes.data.data[0].service_location,
          }));
        }
      }
      if (svcRes.data?.success) {
        setServices(svcRes.data.data);
        if (svcRes.data.data.length > 0 && !newWO.service_id) {
          setNewWO(prev => ({ ...prev, service_id: svcRes.data.data[0].id }));
        }
      }
      if (techRes.data?.success) setTechnicians(techRes.data.data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (isStaff) loadDropdowns();
  }, [isStaff]);

  const handleCreateWorkOrder = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const formatDT = (val) => {
        if (!val) return undefined;
        return val.length === 16 ? `${val}:00` : val;
      };
      const payload = {
        customer_id: newWO.customer_id,
        service_id: newWO.service_id,
        service_location: newWO.service_location,
        description: newWO.description,
        priority: newWO.priority,
        scheduled_start: formatDT(newWO.scheduled_start),
        scheduled_end: formatDT(newWO.scheduled_end),
        assigned_technician_id: newWO.assigned_technician_id || undefined,
      };

      const res = await workOrdersApi.create(payload);
      if (res.data?.success) {
        success(`Work Order created: ${res.data.data.work_order_number}`);
        setShowCreateModal(false);
        fetchWorkOrders();
      }
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to create work order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Work Orders</h1>
          <p className="text-xs text-slate-500">Master operations ledger for field maintenance, repairs, and diagnostics</p>
        </div>
        {isStaff && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 transition flex items-center gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Create Work Order</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by WO #, client, service, location..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 w-full sm:w-auto"
        >
          <option value="">All Statuses</option>
          <option value="UNASSIGNED">Unassigned (Awaiting Tech)</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 w-full sm:w-auto"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Work Orders Table */}
      {loading ? (
        <LoadingSpinner text="Retrieving operational work orders..." />
      ) : workOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No work orders found matching the criteria.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">WO Number</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service Type</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {workOrders.map((wo) => (
                  <tr key={wo.id || wo.work_order_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{wo.work_order_number}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{wo.customer_name}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{wo.service_location}</p>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{wo.service_name}</td>
                    <td className="py-3 px-4">
                      {wo.technician_name ? (
                        <span className="font-semibold text-slate-800">{wo.technician_name}</span>
                      ) : (
                        <span className="text-amber-600 font-medium italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {wo.scheduled_start ? (
                        <span>
                          {(() => {
                            try {
                              const safeStr = typeof wo.scheduled_start === 'string' && !wo.scheduled_start.includes('T') ? wo.scheduled_start.replace(' ', 'T') : wo.scheduled_start;
                              const d = new Date(safeStr);
                              if (isNaN(d.getTime())) return wo.scheduled_start;
                              return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                            } catch {
                              return wo.scheduled_start;
                            }
                          })()}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Not scheduled</span>
                      )}
                    </td>
                    <td className="py-3 px-4"><PriorityBadge priority={wo.priority} /></td>
                    <td className="py-3 px-4"><StatusBadge status={wo.status} /></td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${(wo.actual_cost != null ? wo.actual_cost : wo.estimated_cost)?.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/work-orders/${wo.id || wo.work_order_id}`}
                        className="px-3 py-1 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg font-semibold inline-flex items-center gap-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Create New Work Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Account</label>
                <select
                  required
                  value={newWO.customer_id}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const found = customers.find(c => c.id === cId);
                    setNewWO({
                      ...newWO,
                      customer_id: cId,
                      service_location: found ? found.service_location : newWO.service_location,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.customer_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Type</label>
                <select
                  required
                  value={newWO.service_id}
                  onChange={(e) => setNewWO({ ...newWO, service_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} - Base: ${s.base_price?.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Location</label>
                <input
                  type="text"
                  required
                  value={newWO.service_location}
                  onChange={(e) => setNewWO({ ...newWO, service_location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Technician (Optional)</label>
                <select
                  value={newWO.assigned_technician_id}
                  onChange={(e) => setNewWO({ ...newWO, assigned_technician_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Leave Unassigned (Draft / Pending Dispatch)</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.assigned_region} - {t.availability_status})</option>
                  ))}
                </select>
                {newWO.assigned_technician_id ? (
                  <div className="mt-1.5 p-2 bg-sky-50 border border-sky-100 rounded-xl text-[11px] text-sky-800 flex items-center justify-between">
                    <span>⏰ <strong>Shift:</strong> {technicians.find(t => t.id === newWO.assigned_technician_id)?.work_start_time || '08:00'} - {technicians.find(t => t.id === newWO.assigned_technician_id)?.work_end_time || '17:00'}</span>
                    <span>🗓️ <strong>Days:</strong> Mon - Fri</span>
                    <span>📍 <strong>Region:</strong> {technicians.find(t => t.id === newWO.assigned_technician_id)?.assigned_region}</span>
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400 italic">
                    Optional: Leave unassigned to create a draft work order without technician scheduling constraints.
                  </p>
                )}
              </div>

              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Scheduled Start</label>
                    <input
                      type="datetime-local"
                      value={newWO.scheduled_start}
                      onChange={(e) => {
                        const val = e.target.value;
                        const curSvc = services.find(s => s.id === newWO.service_id);
                        let endVal = newWO.scheduled_end;
                        if (val && curSvc?.estimated_duration) {
                          try {
                            const d = new Date(val);
                            if (!isNaN(d.getTime())) {
                              const endD = new Date(d.getTime() + curSvc.estimated_duration * 60000);
                              const pad = n => String(n).padStart(2, '0');
                              endVal = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}T${pad(endD.getHours())}:${pad(endD.getMinutes())}`;
                            }
                          } catch (err) {}
                        }
                        setNewWO({ ...newWO, scheduled_start: val, scheduled_end: endVal });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Scheduled End</label>
                    <input
                      type="datetime-local"
                      value={newWO.scheduled_end}
                      onChange={(e) => setNewWO({ ...newWO, scheduled_end: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>💡 Service duration: {services.find(s => s.id === newWO.service_id)?.estimated_duration || 60} mins. Times must fall within technician hours (08:00 - 17:00).</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={newWO.priority}
                  onChange={(e) => setNewWO({ ...newWO, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Job Description & Scope</label>
                <textarea
                  rows={3}
                  required
                  value={newWO.description}
                  onChange={(e) => setNewWO({ ...newWO, description: e.target.value })}
                  placeholder="Specific tasks, equipment model, and special site instructions..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
