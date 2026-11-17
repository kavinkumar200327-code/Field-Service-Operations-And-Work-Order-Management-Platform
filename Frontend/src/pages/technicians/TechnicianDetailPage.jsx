import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { techniciansApi } from '../../api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Mail,
  Phone,
  CheckCircle,
  Plus,
  Star,
  X,
  ExternalLink,
} from 'lucide-react';

export const TechnicianDetailPage = () => {
  const params = useParams();
  const technicianId = params.technicianId || params.id;
  const [tech, setTech] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    start_time: '',
    end_time: '',
    type: 'LEAVE',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const fetchTechDetails = async () => {
    if (!technicianId || technicianId === 'undefined') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [techRes, woRes] = await Promise.all([
        techniciansApi.get(technicianId),
        techniciansApi.getWorkOrders(technicianId),
      ]);
      if (techRes.data?.success) setTech(techRes.data.data);
      if (woRes.data?.success) setWorkOrders(woRes.data.data);
    } catch (err) {
      error("Failed to load technician details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (technicianId && technicianId !== 'undefined') {
      fetchTechDetails();
    }
  }, [technicianId]);

  const handleScheduleLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.start_time || !leaveForm.end_time) return;

    try {
      setSubmitting(true);
      await techniciansApi.addAvailability(technicianId, {
        start_time: new Date(leaveForm.start_time).toISOString(),
        end_time: new Date(leaveForm.end_time).toISOString(),
        type: leaveForm.type,
        reason: leaveForm.reason,
      });
      success("Leave / Unavailability scheduled.");
      setShowLeaveModal(false);
      setLeaveForm({ start_time: '', end_time: '', type: 'LEAVE', reason: '' });
      fetchTechDetails();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to schedule leave.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading technician profile..." />;
  if (!tech) return <div className="p-8 text-center text-slate-500">Technician not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/technicians"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Technicians</span>
        </Link>
      </div>

      {/* Header Info Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center uppercase shadow-md">
            {tech.full_name?.charAt(0) || 'T'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{tech.full_name}</h1>
              <StatusBadge status={tech.availability_status} />
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                {tech.employment_status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {tech.assigned_region}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Working Hours: {tech.work_start_time} - {tech.work_end_time}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {tech.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {tech.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div className="text-center px-3">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Completed</p>
            <p className="text-xl font-bold text-slate-900">{tech.completed_jobs_count || 0}</p>
          </div>
          <div className="text-center px-3 border-l border-slate-100">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Avg Rating</p>
            <p className="text-xl font-bold text-amber-500 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{tech.average_rating || 5.0}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Skills + Leaves Scheduled */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-3">Skills & Certifications</h3>
          <div className="space-y-2">
            {tech.skills?.map((s) => (
              <div key={s.skill_name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="font-semibold text-slate-800">{s.skill_name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700">
                  {s.proficiency_level}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Leaves & Unavailable Periods */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Scheduled Leaves & Time Off</h3>
              <p className="text-xs text-slate-500">Blocks technician from receiving bookings</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Time Off</span>
            </button>
          </div>

          <div className="space-y-2">
            {tech.availabilities?.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No leaves or unavailable blocks recorded.</p>
            ) : (
              tech.availabilities?.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-800 uppercase tracking-wider text-[10px] bg-rose-100 px-1.5 py-0.5 rounded">
                      {a.type}
                    </span>
                    <p className="text-slate-700 font-medium mt-1">
                      {new Date(a.start_time).toLocaleString()} - {new Date(a.end_time).toLocaleString()}
                    </p>
                    {a.reason && <p className="text-slate-500 text-[11px] mt-0.5">{a.reason}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Assigned Work Orders */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Assigned Work Orders</h3>
          <p className="text-xs text-slate-500">Scheduled, active, and completed jobs for {tech.full_name}</p>
        </div>

        <div className="overflow-x-auto">
          {workOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No work orders currently assigned to this technician.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">WO Number</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Scheduled Window</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{wo.work_order_number}</td>
                    <td className="py-3 px-4">{wo.customer_name}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{wo.service_name}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {wo.scheduled_start ? new Date(wo.scheduled_start).toLocaleString() : 'Unscheduled'}
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={wo.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/work-orders/${wo.id}`}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold inline-flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Schedule Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Schedule Leave / Unavailability</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleLeave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="LEAVE">Vacation / Planned Leave</option>
                  <option value="SICK">Medical / Sick Day</option>
                  <option value="BREAK">Training / Operational Break</option>
                  <option value="UNAVAILABLE">General Unavailability</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={leaveForm.start_time}
                  onChange={(e) => setLeaveForm({ ...leaveForm, start_time: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={leaveForm.end_time}
                  onChange={(e) => setLeaveForm({ ...leaveForm, end_time: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Optional notes regarding the absence..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Confirm Leave Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
