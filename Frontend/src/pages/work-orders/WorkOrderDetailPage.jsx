import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { workOrdersApi, techniciansApi, partsApi, serviceReportsApi, feedbackApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  DollarSign,
  Package,
  Wrench,
  FileCheck2,
  FileDown,
  Star,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Navigation,
  Plus,
  RotateCcw,
  X,
  Upload,
} from 'lucide-react';

export const WorkOrderDetailPage = () => {
  const params = useParams();
  const workOrderId = params.workOrderId || params.id;
  const [wo, setWo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Modal form states
  const [technicians, setTechnicians] = useState([]);
  const [inventoryParts, setInventoryParts] = useState([]);
  const [assignForm, setAssignForm] = useState({
    technician_id: '',
    scheduled_start: '',
    scheduled_end: '',
    notes: '',
  });
  const [completeForm, setCompleteForm] = useState({
    work_summary: '',
    diagnosis: '',
    actions_performed: '',
    actual_cost: '',
    customer_remarks: '',
    recommendations: '',
  });
  const [holdReason, setHoldReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [partForm, setPartForm] = useState({ part_id: '', quantity: 1, action: 'CONSUMED' });
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    timeliness_rating: 5,
    quality_rating: 5,
    professionalism_rating: 5,
    comments: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const { user, hasRole } = useAuth();
  const { success, error } = useToast();

  const isStaff = hasRole(['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER', 'FIELD_TECHNICIAN']);
  const isDispatcher = hasRole(['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER']);
  const isTechnician = hasRole(['FIELD_TECHNICIAN']);
  const isCustomer = hasRole(['CUSTOMER']);

  const fetchWorkOrder = async () => {
    if (!workOrderId || workOrderId === 'undefined') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await workOrdersApi.get(workOrderId);
      if (res.data?.success) {
        setWo(res.data.data);
      }

      // Fetch service report if available
      try {
        const repRes = await serviceReportsApi.getByWorkOrder(workOrderId);
        if (repRes.data?.success) setReport(repRes.data.data);
      } catch (e) {}

      // Fetch feedback if available
      try {
        const fbRes = await feedbackApi.getByWorkOrder(workOrderId);
        if (fbRes.data?.success) setFeedback(fbRes.data.data);
      } catch (e) {}
    } catch (err) {
      error("Failed to load work order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workOrderId && workOrderId !== 'undefined') {
      fetchWorkOrder();
    }
  }, [workOrderId]);

  const loadTechsAndParts = async () => {
    try {
      const [techRes, partRes] = await Promise.all([
        techniciansApi.list(),
        partsApi.list(),
      ]);
      if (techRes.data?.success) {
        setTechnicians(techRes.data.data);
        if (techRes.data.data.length > 0 && !assignForm.technician_id) {
          setAssignForm(prev => ({ ...prev, technician_id: techRes.data.data[0].id }));
        }
      }
      if (partRes.data?.success) {
        setInventoryParts(partRes.data.data);
        if (partRes.data.data.length > 0 && !partForm.part_id) {
          setPartForm(prev => ({ ...prev, part_id: partRes.data.data[0].id }));
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isStaff) loadTechsAndParts();
  }, [isStaff]);

  const safeFormatDateTime = (val, fallback = 'Not Scheduled') => {
    if (!val) return fallback;
    try {
      const safeStr = typeof val === 'string' && !val.includes('T') ? val.replace(' ', 'T') : val;
      const d = new Date(safeStr);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleString();
    } catch {
      return String(val);
    }
  };

  const safeFormatTime = (val, fallback = 'TBD') => {
    if (!val) return fallback;
    try {
      const safeStr = typeof val === 'string' && !val.includes('T') ? val.replace(' ', 'T') : val;
      const d = new Date(safeStr);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(val);
    }
  };

  // Actions
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const formatDT = (val) => {
        if (!val) return undefined;
        return val.length === 16 ? `${val}:00` : val;
      };
      const payload = {
        technician_id: assignForm.technician_id,
        scheduled_start: formatDT(assignForm.scheduled_start),
        scheduled_end: formatDT(assignForm.scheduled_end),
        notes: assignForm.notes || undefined,
      };

      await workOrdersApi.assign(workOrderId, payload);
      success("Technician assigned and appointment scheduled.");
      setShowAssignModal(false);
      fetchWorkOrder();
    } catch (err) {
      error(err.response?.data?.error?.message || "Scheduling conflict or technician unavailable.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartWork = async () => {
    try {
      await workOrdersApi.start(workOrderId);
      success("Work started. Status updated to IN PROGRESS.");
      fetchWorkOrder();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to start job.");
    }
  };

  const handleHoldSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await workOrdersApi.hold(workOrderId, { hold_reason: holdReason });
      success("Work order placed on hold.");
      setShowHoldModal(false);
      fetchWorkOrder();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to put on hold.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResumeWork = async () => {
    try {
      await workOrdersApi.resume(workOrderId);
      success("Work resumed.");
      fetchWorkOrder();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to resume work.");
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        work_summary: completeForm.work_summary,
        diagnosis: completeForm.diagnosis || undefined,
        actions_performed: completeForm.actions_performed || undefined,
        actual_cost: completeForm.actual_cost ? parseFloat(completeForm.actual_cost) : undefined,
        customer_remarks: completeForm.customer_remarks || undefined,
        recommendations: completeForm.recommendations || undefined,
      };

      await workOrdersApi.complete(workOrderId, payload);
      success("Work order completed and certified report generated!");
      setShowCompleteModal(false);
      fetchWorkOrder();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to complete work order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await workOrdersApi.cancel(workOrderId, { cancellation_reason: cancelReason });
      success("Work order cancelled.");
      setShowCancelModal(false);
      fetchWorkOrder();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to cancel work order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPartSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await partsApi.recordWorkOrderPart(workOrderId, {
        part_id: partForm.part_id,
        quantity: parseInt(partForm.quantity, 10),
        action: partForm.action,
      });
      success("Part allocated to work order.");
      setShowAddPartModal(false);
      fetchWorkOrder();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to consume part.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnPart = async (partId, maxQty) => {
    const qtyStr = window.prompt(`How many items would you like to return to inventory? (Max: ${maxQty})`, '1');
    if (!qtyStr) return;
    const qty = parseInt(qtyStr, 10);
    if (isNaN(qty) || qty <= 0) return;

    try {
      await partsApi.returnWorkOrderPart(workOrderId, partId, { quantity: qty, reason: 'Unused on site' });
      success("Part returned to stock.");
      fetchWorkOrder();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to return part.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!report?.id) return;
    try {
      const res = await serviceReportsApi.downloadPdf(report.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Service_Report_${wo.work_order_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      success("Service Report downloaded.");
    } catch (err) {
      error("Failed to download PDF report.");
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await feedbackApi.submit(workOrderId, feedbackForm);
      success("Thank you for your rating!");
      setShowFeedbackModal(false);
      fetchWorkOrder();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving work order workspace..." />;
  if (!wo) return <div className="p-8 text-center text-slate-500">Work order not found.</div>;

  const pipelineStages = ['DRAFT', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];
  const currentStageIndex = pipelineStages.indexOf(wo.status === 'ON_HOLD' ? 'IN_PROGRESS' : wo.status);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/work-orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Work Orders</span>
        </Link>
      </div>

      {/* Main Header Card with Pipeline */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{wo.work_order_number}</span>
              <PriorityBadge priority={wo.priority} />
              <StatusBadge status={wo.status} />
            </div>
            <p className="text-sm font-semibold text-slate-700">{wo.service_name}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{wo.service_location}</span>
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isDispatcher && !['COMPLETED', 'CANCELLED'].includes(wo.status) && (
              <button
                onClick={() => {
                  setAssignForm({
                    technician_id: wo.assigned_technician_id || (technicians[0]?.id || ''),
                    scheduled_start: wo.scheduled_start ? wo.scheduled_start.substring(0, 16) : '',
                    scheduled_end: wo.scheduled_end ? wo.scheduled_end.substring(0, 16) : '',
                    notes: '',
                  });
                  setShowAssignModal(true);
                }}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{wo.assigned_technician_id ? 'Reschedule / Reassign' : 'Schedule & Assign'}</span>
              </button>
            )}

            {isStaff && ['ASSIGNED', 'SCHEDULED'].includes(wo.status) && (
              <button
                onClick={handleStartWork}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-slate-900" />
                <span>Start Work on Site</span>
              </button>
            )}

            {isStaff && wo.status === 'IN_PROGRESS' && (
              <>
                <button
                  onClick={() => setShowHoldModal(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Put on Hold</span>
                </button>
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Job & Report</span>
                </button>
              </>
            )}

            {isStaff && wo.status === 'ON_HOLD' && (
              <button
                onClick={handleResumeWork}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Resume Work</span>
              </button>
            )}

            {!['COMPLETED', 'CANCELLED'].includes(wo.status) && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl border border-rose-200 transition"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Visual Workflow Pipeline */}
        {wo.status !== 'CANCELLED' && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Service Progression</p>
            <div className="grid grid-cols-5 gap-2">
              {pipelineStages.map((stage, idx) => {
                const isPassed = currentStageIndex >= idx;
                const isCurrent = currentStageIndex === idx;
                return (
                  <div key={stage} className="text-center">
                    <div
                      className={`h-2 rounded-full mb-2 transition-all ${
                        isPassed ? 'bg-sky-600' : 'bg-slate-100'
                      }`}
                    />
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isCurrent ? 'text-sky-600' : isPassed ? 'text-slate-700' : 'text-slate-400'}`}>
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Details + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Operational Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Description Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-400">
              Work Order Scope & Description
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">{wo.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-semibold">Scheduled Start</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {safeFormatDateTime(wo.scheduled_start)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-semibold">Scheduled End</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {safeFormatDateTime(wo.scheduled_end)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-semibold">Estimated Cost</p>
                <p className="font-semibold text-slate-800 mt-0.5">${wo.estimated_cost?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-semibold">Actual Cost</p>
                <p className="font-bold text-emerald-600 mt-0.5">
                  ${(wo.actual_cost != null ? wo.actual_cost : wo.estimated_cost)?.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Technician Profile Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer info */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Account</span>
              <h4 className="font-bold text-slate-900 text-sm">{wo.customer_name}</h4>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{wo.customer_email || 'N/A'}</span>
              </p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{wo.customer_phone || 'N/A'}</span>
              </p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{wo.service_location}</span>
              </p>
            </div>

            {/* Technician info */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Technician</span>
              {wo.technician_name ? (
                <>
                  <h4 className="font-bold text-slate-900 text-sm">{wo.technician_name}</h4>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{wo.technician_phone || 'Radio Contact Only'}</span>
                  </p>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Arrival Window: {safeFormatTime(wo.scheduled_start)}</span>
                  </p>
                </>
              ) : (
                <div className="py-3 text-center">
                  <p className="text-amber-600 font-semibold mb-2">Technician not yet assigned</p>
                  {isDispatcher && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-3 py-1.5 bg-sky-600 text-white font-semibold rounded-lg text-xs"
                    >
                      Assign Now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Parts Consumed Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Materials & Parts Consumed</h3>
                <p className="text-xs text-slate-500">Tracked inventory deductions for this work order</p>
              </div>
              {isStaff && !['COMPLETED', 'CANCELLED'].includes(wo.status) && (
                <button
                  onClick={() => setShowAddPartModal(true)}
                  className="px-3 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Issue Part</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              {wo.parts_consumed?.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No parts recorded for this job.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4">Part / SKU</th>
                      <th className="py-2.5 px-4 text-center">Quantity</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      {isStaff && !['COMPLETED', 'CANCELLED'].includes(wo.status) && (
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {wo.parts_consumed.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-4">
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.sku}</p>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{p.quantity}</td>
                        <td className="py-2.5 px-4 text-right">${p.unit_price?.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">${p.total_price?.toFixed(2)}</td>
                        {isStaff && !['COMPLETED', 'CANCELLED'].includes(wo.status) && (
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => handleReturnPart(p.part_id, p.quantity)}
                              title="Return unused part to stock"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-semibold transition"
                            >
                              Return
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Certified Service Report (if exists) */}
          {report && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Certified Service Report</h3>
                    <p className="text-[11px] text-slate-500">Filed by {report.technician_name}</p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadPdf}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition"
                >
                  <FileDown className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download PDF Report</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <strong className="text-slate-800">Technician Diagnosis:</strong>
                  <p className="text-slate-600 mt-0.5">{report.diagnosis}</p>
                </div>
                <div>
                  <strong className="text-slate-800">Actions Performed:</strong>
                  <p className="text-slate-600 mt-0.5">{report.actions_performed}</p>
                </div>
                <div>
                  <strong className="text-slate-800">Work Summary:</strong>
                  <p className="text-slate-600 mt-0.5">{report.work_summary}</p>
                </div>
                {report.recommendations && (
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                    <strong className="text-amber-900">Specialist Recommendations:</strong>
                    <p className="text-amber-800 mt-0.5">{report.recommendations}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer Feedback Card */}
          {feedback ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Review</span>
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < feedback.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                  />
                ))}
                <span className="font-bold text-slate-800 ml-2">{feedback.rating} / 5</span>
              </div>
              {feedback.comments && <p className="text-slate-700 italic mt-1">"{feedback.comments}"</p>}
            </div>
          ) : (
            wo.status === 'COMPLETED' && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Customer Satisfaction Feedback</h4>
                  <p className="text-[11px] text-slate-500">Rate the punctuality, expertise, and service quality</p>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="px-3.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-semibold transition"
                >
                  Leave Feedback
                </button>
              </div>
            )
          )}
        </div>

        {/* Right Column (1 span): Audit History & Timelines */}
        <div className="space-y-6">
          {/* Status History Timeline */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <History className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Status Change History</h3>
            </div>

            <div className="space-y-4">
              {wo.status_history?.map((h, i) => (
                <div key={h.id} className="relative flex items-start gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-600 mt-1 shrink-0 ring-4 ring-sky-50" />
                  <div>
                    <p className="font-bold text-slate-900">
                      {h.new_status}
                      {h.previous_status && <span className="text-slate-400 font-normal"> (from {h.previous_status})</span>}
                    </p>
                    <p className="text-[11px] text-slate-500">{h.notes || 'Status updated'}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {safeFormatDateTime(h.created_at, 'Recently')} by {h.changed_by_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Technician Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Assign / Reschedule Technician</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Technician</label>
                <select
                  required
                  value={assignForm.technician_id}
                  onChange={(e) => setAssignForm({ ...assignForm, technician_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.assigned_region}) - {t.availability_status} ({t.current_workload} active)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Appointment Start</label>
                  <input
                    type="datetime-local"
                    required
                    value={assignForm.scheduled_start}
                    onChange={(e) => setAssignForm({ ...assignForm, scheduled_start: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Appointment End</label>
                  <input
                    type="datetime-local"
                    required
                    value={assignForm.scheduled_end}
                    onChange={(e) => setAssignForm({ ...assignForm, scheduled_end: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scheduling / Dispatch Notes</label>
                <textarea
                  rows={2}
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder="Gate code, specific instructions for technician..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Validating Conflicts...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Work Order Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Complete Job & File Report</h3>
              <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technician Diagnosis</label>
                <input
                  type="text"
                  required
                  value={completeForm.diagnosis}
                  onChange={(e) => setCompleteForm({ ...completeForm, diagnosis: e.target.value })}
                  placeholder="e.g. Ground fault detected on line 2; contactor pitted"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actions Performed</label>
                <textarea
                  rows={2}
                  required
                  value={completeForm.actions_performed}
                  onChange={(e) => setCompleteForm({ ...completeForm, actions_performed: e.target.value })}
                  placeholder="Replaced dual capacitor, flushed drain line, tested thermal cutoff..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Comprehensive Work Summary</label>
                <textarea
                  rows={2}
                  required
                  value={completeForm.work_summary}
                  onChange={(e) => setCompleteForm({ ...completeForm, work_summary: e.target.value })}
                  placeholder="Final summary for the customer invoice and report..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Actual Billable ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={completeForm.actual_cost}
                    onChange={(e) => setCompleteForm({ ...completeForm, actual_cost: e.target.value })}
                    placeholder={`Estimated: $${wo.estimated_cost}`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Sign-off Remarks</label>
                  <input
                    type="text"
                    value={completeForm.customer_remarks}
                    onChange={(e) => setCompleteForm({ ...completeForm, customer_remarks: e.target.value })}
                    placeholder="e.g. Client verified unit operational"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recommendations for Client</label>
                <input
                  type="text"
                  value={completeForm.recommendations}
                  onChange={(e) => setCompleteForm({ ...completeForm, recommendations: e.target.value })}
                  placeholder="e.g. Clean condenser filters quarterly"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Finalizing...' : 'Certify & Complete Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hold Work Order Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Place Work Order on Hold</h3>
              <button onClick={() => setShowHoldModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHoldSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Hold</label>
                <textarea
                  rows={3}
                  required
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="e.g. Awaiting customer authorization for replacement compressor..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHoldModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Confirm Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Work Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Cancel Work Order</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Cancellation</label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Specify why this job cannot proceed..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Part Modal */}
      {showAddPartModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Issue Part from Inventory</h3>
              <button onClick={() => setShowAddPartModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPartSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Inventory Part</label>
                <select
                  required
                  value={partForm.part_id}
                  onChange={(e) => setPartForm({ ...partForm, part_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {inventoryParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Avail: {p.available_quantity} - ${p.unit_cost?.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={partForm.quantity}
                    onChange={(e) => setPartForm({ ...partForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Action Type</label>
                  <select
                    value={partForm.action}
                    onChange={(e) => setPartForm({ ...partForm, action: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="CONSUMED">Consume on Site</option>
                    <option value="RESERVED">Reserve for Job</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Deducting Stock...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Rate Your Service Experience</h3>
              <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-4 text-xs">
              <div className="text-center py-2">
                <p className="font-semibold text-slate-700 mb-2">Overall Satisfaction Rating</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                      className="p-1 focus:outline-none transition transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= feedbackForm.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Written Feedback / Comments</label>
                <textarea
                  rows={3}
                  value={feedbackForm.comments}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, comments: e.target.value })}
                  placeholder="Share details regarding timeliness, technician manners, and overall results..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
