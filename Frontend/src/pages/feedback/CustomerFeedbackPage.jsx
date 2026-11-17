import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { feedbackApi } from '../../api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  Star,
  MessageSquare,
  User,
  Calendar,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

export const CustomerFeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minRating, setMinRating] = useState('');
  const { error } = useToast();

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const res = await feedbackApi.listAll({
        min_rating: minRating || undefined,
      });
      if (res.data?.success) setFeedbacks(res.data.data);
    } catch (err) {
      error("Failed to load feedback records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [minRating]);

  const avgScore = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Feedback & Reviews</h1>
          <p className="text-xs text-slate-500">Verified service satisfaction ratings, timeliness scores, and customer remarks</p>
        </div>

        {/* Aggregate Pill */}
        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="w-5 h-5 fill-amber-400" />
            <span className="text-lg font-black text-slate-900">{avgScore}</span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
          <span className="text-xs font-semibold text-amber-900">
            ({feedbacks.length} Verified {feedbacks.length === 1 ? 'Review' : 'Reviews'})
          </span>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500">Filter by Star Rating:</span>
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars Only</option>
          <option value="4">4 Stars & Above</option>
          <option value="3">3 Stars & Above</option>
        </select>
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <LoadingSpinner text="Loading customer feedback..." />
      ) : feedbacks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No feedback reviews recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {feedbacks.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{f.customer_name}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">Work Order: {f.work_order_number}</p>
                  </div>

                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                </div>

                {f.comments && (
                  <p className="text-xs text-slate-700 italic my-3 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                    "{f.comments}"
                  </p>
                )}

                {/* Sub-ratings */}
                <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Timeliness</span>
                    <strong className="text-slate-800">{f.timeliness_rating || 5}/5</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Quality</span>
                    <strong className="text-slate-800">{f.quality_rating || 5}/5</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Professionalism</span>
                    <strong className="text-slate-800">{f.professionalism_rating || 5}/5</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
                  {new Date(f.created_at).toLocaleDateString()}
                </span>
                <Link
                  to={`/work-orders/${f.work_order_id}`}
                  className="font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1 text-xs"
                >
                  <span>Work Order</span>
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
