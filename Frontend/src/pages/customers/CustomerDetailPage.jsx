import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customersApi } from '../../api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ArrowLeft,
  Star,
  ExternalLink,
} from 'lucide-react';

export const CustomerDetailPage = () => {
  const params = useParams();
  const customerId = params.customerId || params.id;
  const [customer, setCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId || customerId === 'undefined') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [custRes, histRes] = await Promise.all([
          customersApi.get(customerId),
          customersApi.getServiceHistory(customerId),
        ]);
        if (custRes.data?.success) setCustomer(custRes.data.data);
        if (histRes.data?.success) setHistory(histRes.data.data.history);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (customerId && customerId !== 'undefined') {
      fetchData();
    }
  }, [customerId]);

  if (loading) return <LoadingSpinner text="Retrieving customer service dossier..." />;
  if (!customer) return <div className="p-8 text-center text-slate-500">Customer not found.</div>;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xl uppercase border border-sky-100 shrink-0">
            {customer.name?.charAt(0) || 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
              <StatusBadge status={customer.status} />
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                {customer.customer_type}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {customer.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {customer.phone}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {customer.service_location}
              </span>
            </div>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div className="text-center px-3">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Active Jobs</p>
            <p className="text-xl font-bold text-slate-900">{customer.active_work_orders_count || 0}</p>
          </div>
          <div className="text-center px-3 border-l border-slate-100">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Total Spent</p>
            <p className="text-xl font-bold text-emerald-600">${customer.total_spent?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Service History Timeline & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Historical Service Orders</h3>
          <p className="text-xs text-slate-500">Track record of all maintenance and repair appointments</p>
        </div>

        <div className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No historical service orders recorded for this customer yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">WO Number</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Scheduled / Completed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4 text-right">Charge</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.map((h) => (
                  <tr key={h.work_order_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{h.work_order_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{h.service_name}</td>
                    <td className="py-3 px-4">{h.technician_name || 'Pending assignment'}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {h.completed_at ? (
                        <span>Completed: {new Date(h.completed_at).toLocaleDateString()}</span>
                      ) : h.scheduled_start ? (
                        <span>Scheduled: {new Date(h.scheduled_start).toLocaleDateString()}</span>
                      ) : (
                        'Unscheduled'
                      )}
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={h.status} /></td>
                    <td className="py-3 px-4">
                      {h.rating ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {h.rating} / 5
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${h.cost?.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/work-orders/${h.work_order_id}`}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold inline-flex items-center gap-1"
                      >
                        <span>View</span>
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
    </div>
  );
};
