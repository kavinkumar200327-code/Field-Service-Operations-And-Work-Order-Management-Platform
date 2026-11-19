import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { serviceRequestsApi, servicesApi, customersApi, techniciansApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  FileQuestion,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  Building,
  ArrowRight,
  X,
  FileCheck2,
} from 'lucide-react';

export const ServiceRequestsListPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form states
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [createForm, setCreateForm] = useState({
    service_id: '',
    customer_id: '',
    service_location: '',
    preferred_schedule: '',
    priority: 'MEDIUM',
    issue_description: '',
  });
  const [convertForm, setConvertForm] = useState({
    scheduled_start: '',
    scheduled_end: '',
    assigned_technician_id: '',
    priority: 'MEDIUM',
  });
  const [submitting, setSubmitting] = useState(false);

  const { user, hasRole } = useAuth();
  const { success, error } = useToast();
  const [searchParams] = useSearchParams();

  const isStaff = hasRole(['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER']);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await serviceRequestsApi.list({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined,
      });
      if (res.data?.success) setRequests(res.data.data);
    } catch (err) {
      error("Failed to load service requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const loadDropdowns = async () => {
    try {
      const [svcRes, custRes, techRes] = await Promise.all([
        servicesApi.list({ status: 'ACTIVE' }),
        isStaff ? customersApi.list() : Promise.resolve({ data: { success: true, data: [] } }),
        isStaff ? techniciansApi.list() : Promise.resolve({ data: { success: true, data: [] } }),
      ]);
      if (svcRes.data?.success) {
        setServices(svcRes.data.data);
        if (svcRes.data.data.length > 0 && !createForm.service_id) {
          setCreateForm(prev => ({ ...prev, service_id: svcRes.data.data[0].id }));
        }
      }
      if (custRes.data?.success) setCustomers(custRes.data.data);
      if (techRes.data?.success) setTechnicians(techRes.data.data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadDropdowns();
  }, [isStaff]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        service_id: createForm.service_id,
        customer_id: createForm.customer_id || undefined,
        service_location: createForm.service_location,
        preferred_schedule: createForm.preferred_schedule ? new Date(createForm.preferred_schedule).toISOString() : undefined,
        priority: createForm.priority,
        issue_description: createForm.issue_description,
      };

      const res = await serviceRequestsApi.create(payload);
      if (res.data?.success) {
        success("Service request submitted successfully.");
        setShowCreateModal(false);
        fetchRequests();
      }
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to create request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      setSubmitting(true);
      const payload = {
        scheduled_start: convertForm.scheduled_start ? new Date(convertForm.scheduled_start).toISOString() : undefined,
        scheduled_end: convertForm.scheduled_end ? new Date(convertForm.scheduled_end).toISOString() : undefined,
        assigned_technician_id: convertForm.assigned_technician_id || undefined,
        priority: convertForm.priority,
      };

      const res = await serviceRequestsApi.convertToWorkOrder(selectedRequest.id, payload);
      if (res.data?.success) {
        success(`Request converted to Work Order: ${res.data.data.work_order_number} and removed from queue.`);
        setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
        setShowConvertModal(false);
        fetchRequests();
      }
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to convert request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (srId) => {
    const reason = window.prompt("Please enter the reason for cancellation:");
    if (!reason) return;
    try {
      await serviceRequestsApi.cancel(srId, { cancellation_reason: reason });
      success("Service request cancelled.");
      fetchRequests();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to cancel request.");
    }
  };

  const displayedRequests = requests.filter((r) => {
    if (statusFilter === 'CONVERTED') return r.status === 'CONVERTED';
    if (statusFilter === 'ALL') return true;
    if (!statusFilter) return r.status !== 'CONVERTED';
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Requests</h1>
          <p className="text-xs text-slate-500">Customer requests awaiting review, approval, or conversion to work orders</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 transition flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>New Service Request</span>
        </button>
      </div>

      {/* Workflow notice explaining removal upon conversion */}
      <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-sky-900">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            Converted service requests are automatically removed from this queue and dispatched into <strong>Work Orders</strong>.
          </span>
        </div>
        <Link
          to="/work-orders"
          className="font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 shrink-0"
        >
          <span>View Work Orders</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by request #, location, issue description..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 w-full sm:w-auto"
        >
          <option value="">Active Requests (Excludes Converted)</option>
          <option value="NEW">New</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="CONVERTED">Archived (Converted to WO)</option>
          <option value="ALL">All Requests (Including Converted)</option>
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

      {/* Requests Table */}
      {loading ? (
        <LoadingSpinner text="Retrieving service requests..." />
      ) : displayedRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No active service requests found matching your query.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Request #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Requested Service</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Preferred Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayedRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.request_number}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{r.customer_name}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{r.service_location}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{r.service_name}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{r.issue_description}</p>
                    </td>
                    <td className="py-3 px-4"><PriorityBadge priority={r.priority} /></td>
                    <td className="py-3 px-4"><StatusBadge status={r.status} /></td>
                    <td className="py-3 px-4 text-slate-500">
                      {r.preferred_schedule ? (
                        (() => {
                          try {
                            const s = typeof r.preferred_schedule === 'string' && !r.preferred_schedule.includes('T') ? r.preferred_schedule.replace(' ', 'T') : r.preferred_schedule;
                            const d = new Date(s);
                            return isNaN(d.getTime()) ? r.preferred_schedule : d.toLocaleString();
                          } catch {
                            return r.preferred_schedule;
                          }
                        })()
                      ) : 'Flexible'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {isStaff && ['NEW', 'UNDER_REVIEW', 'APPROVED'].includes(r.status) && (
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setConvertForm({
                              scheduled_start: '',
                              scheduled_end: '',
                              assigned_technician_id: '',
                              priority: r.priority,
                            });
                            setShowConvertModal(true);
                          }}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold inline-flex items-center gap-1 shadow-sm transition"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Convert to WO</span>
                        </button>
                      )}
                      {!['CONVERTED', 'CANCELLED', 'REJECTED'].includes(r.status) && (
                        <button
                          onClick={() => handleCancelRequest(r.id)}
                          className="px-2 py-1 text-slate-400 hover:text-rose-600 font-semibold rounded-lg transition"
                          title="Cancel request"
                        >
                          <XCircle className="w-4 h-4 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Service Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Book New Service Request</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Service</label>
                <select
                  required
                  value={createForm.service_id}
                  onChange={(e) => setCreateForm({ ...createForm, service_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} - ${s.base_price?.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              {isStaff && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Account</label>
                  <select
                    value={createForm.customer_id}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const found = customers.find(c => c.id === cId);
                      setCreateForm({
                        ...createForm,
                        customer_id: cId,
                        service_location: found ? found.service_location : createForm.service_location,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Location & Address</label>
                <input
                  type="text"
                  required
                  value={createForm.service_location}
                  onChange={(e) => setCreateForm({ ...createForm, service_location: e.target.value })}
                  placeholder="e.g. 742 Evergreen Terrace, Springfield, IL (Main House)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Preferred Date & Time</label>
                  <input
                    type="datetime-local"
                    value={createForm.preferred_schedule}
                    onChange={(e) => setCreateForm({ ...createForm, preferred_schedule: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Describe the Issue</label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  value={createForm.issue_description}
                  onChange={(e) => setCreateForm({ ...createForm, issue_description: e.target.value })}
                  placeholder="Detail the symptom, equipment type, unusual noise, leaks, or error codes..."
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
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Work Order Modal */}
      {showConvertModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Convert to Work Order</h3>
                <p className="text-[11px] text-slate-500">Originating Request: {selectedRequest.request_number}</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p><strong>Customer:</strong> {selectedRequest.customer_name}</p>
                <p><strong>Service:</strong> {selectedRequest.service_name}</p>
                <p><strong>Location:</strong> {selectedRequest.service_location}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Technician (Optional)</label>
                <select
                  value={convertForm.assigned_technician_id}
                  onChange={(e) => setConvertForm({ ...convertForm, assigned_technician_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Leave Unassigned (Schedule Later)</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.assigned_region} - {t.availability_status})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheduled Start</label>
                  <input
                    type="datetime-local"
                    value={convertForm.scheduled_start}
                    onChange={(e) => setConvertForm({ ...convertForm, scheduled_start: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheduled End</label>
                  <input
                    type="datetime-local"
                    value={convertForm.scheduled_end}
                    onChange={(e) => setConvertForm({ ...convertForm, scheduled_end: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={convertForm.priority}
                  onChange={(e) => setConvertForm({ ...convertForm, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Converting...' : 'Generate Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
