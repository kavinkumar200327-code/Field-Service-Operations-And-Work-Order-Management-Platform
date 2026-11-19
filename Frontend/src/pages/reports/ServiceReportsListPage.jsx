import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { workOrdersApi, serviceReportsApi } from '../../api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  FileCheck2,
  FileDown,
  Calendar,
  User,
  Wrench,
  Search,
  ExternalLink,
} from 'lucide-react';

export const ServiceReportsListPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Fetch completed work orders which have reports
      const res = await workOrdersApi.list({ status: 'COMPLETED' });
      if (res.data?.success) {
        // Fetch detailed reports for completed WOs
        const wos = res.data.data;
        const repPromises = wos.map(async (w) => {
          try {
            const rRes = await serviceReportsApi.getByWorkOrder(w.id);
            if (rRes.data?.data) {
              return { ...rRes.data.data, work_order: w };
            }
          } catch (e) {
            return null;
          }
          return null;
        });

        const resolved = (await Promise.all(repPromises)).filter(Boolean);
        setReports(resolved);
      }
    } catch (err) {
      error("Failed to load service reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownloadPdf = async (reportId, woNumber) => {
    try {
      const res = await serviceReportsApi.downloadPdf(reportId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Service_Report_${woNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      success("Report downloaded successfully.");
    } catch (err) {
      error("Failed to download PDF.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Certified Service Reports</h1>
          <p className="text-xs text-slate-500">Official technical records, field diagnoses, part allocations, and PDF certifications</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Compiling service reports ledger..." />
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No completed service reports generated yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reports.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{r.work_order?.work_order_number}</h3>
                      <p className="text-[11px] text-slate-500">{r.work_order?.service_name}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadPdf(r.id, r.work_order?.work_order_number)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition"
                  >
                    <FileDown className="w-3.5 h-3.5 text-sky-400" />
                    <span>PDF</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <p>
                    <strong className="text-slate-900">Client:</strong> {r.work_order?.customer_name}
                  </p>
                  <p>
                    <strong className="text-slate-900">Technician:</strong> {r.technician_name}
                  </p>
                  <p className="line-clamp-2">
                    <strong className="text-slate-900">Diagnosis:</strong> {r.diagnosis}
                  </p>
                  <p className="line-clamp-2">
                    <strong className="text-slate-900">Actions:</strong> {r.actions_performed}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {r.completion_time ? new Date(typeof r.completion_time === 'string' && !r.completion_time.includes('T') ? r.completion_time.replace(' ', 'T') : r.completion_time).toLocaleDateString() : 'N/A'}
                </span>
                <Link
                  to={`/work-orders/${r.work_order_id}`}
                  className="font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                >
                  <span>Work Order Workspace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
