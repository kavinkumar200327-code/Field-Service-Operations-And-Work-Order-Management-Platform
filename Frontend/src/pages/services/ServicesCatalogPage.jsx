import React, { useState, useEffect } from 'react';
import { servicesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  SlidersHorizontal,
  Clock,
  DollarSign,
  Package,
  Wrench,
  Plus,
  X,
  Tag,
} from 'lucide-react';

export const ServicesCatalogPage = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    category_id: '',
    description: '',
    estimated_duration: 60,
    base_price: 150.0,
    required_skills: '',
    status: 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const isStaffAdmin = hasRole(['SUPER_ADMIN', 'OPERATIONS_MANAGER']);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [svcRes, catRes] = await Promise.all([
        servicesApi.list({ category_id: selectedCategory || undefined }),
        servicesApi.listCategories(),
      ]);
      if (svcRes.data?.success) setServices(svcRes.data.data);
      if (catRes.data?.success) {
        setCategories(catRes.data.data);
        if (!newService.category_id && catRes.data.data.length > 0) {
          setNewService(prev => ({ ...prev, category_id: catRes.data.data[0].id }));
        }
      }
    } catch (err) {
      error("Failed to load service catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const skillsArray = newService.required_skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        name: newService.name,
        category_id: newService.category_id,
        description: newService.description,
        estimated_duration: parseInt(newService.estimated_duration, 10),
        base_price: parseFloat(newService.base_price),
        required_skills: skillsArray,
        status: newService.status,
      };

      const res = await servicesApi.create(payload);
      if (res.data?.success) {
        success("New service offering added to catalog.");
        setShowAddModal(false);
        setNewService({
          name: '',
          category_id: categories[0]?.id || '',
          description: '',
          estimated_duration: 60,
          base_price: 150.0,
          required_skills: '',
          status: 'ACTIVE',
        });
        fetchData();
      }
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to create service.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Catalog</h1>
          <p className="text-xs text-slate-500">Standardized field service offerings, durations, and pricing</p>
        </div>
        {isStaffAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 transition flex items-center gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service Offering</span>
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            selectedCategory === ''
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Categories ({services.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === c.id
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {loading ? (
        <LoadingSpinner text="Retrieving service offerings..." />
      ) : services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No services found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                    {svc.category_name}
                  </span>
                  <StatusBadge status={svc.status} />
                </div>

                <h3 className="font-bold text-slate-900 text-base mb-1.5">{svc.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                  {svc.description || 'Standard on-site operational inspection and maintenance protocol.'}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs py-3 border-y border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Est: <strong>{svc.estimated_duration} mins</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Base: <strong>${svc.base_price?.toFixed(2)}</strong></span>
                  </div>
                </div>

                {/* Skills tags */}
                {svc.required_skills?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Required Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {svc.required_skills.map((skill) => (
                        <span key={skill} className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Create Service Offering</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder="e.g. Industrial Transformer Testing"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newService.category_id}
                  onChange={(e) => setNewService({ ...newService, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  placeholder="Scope of work and safety checklist..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Est. Duration (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    required
                    value={newService.estimated_duration}
                    onChange={(e) => setNewService({ ...newService, estimated_duration: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={newService.base_price}
                    onChange={(e) => setNewService({ ...newService, base_price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Required Skills (Comma-separated)</label>
                <input
                  type="text"
                  value={newService.required_skills}
                  onChange={(e) => setNewService({ ...newService, required_skills: e.target.value })}
                  placeholder="HVAC Repair, Commercial Electrical, EPA 608"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
