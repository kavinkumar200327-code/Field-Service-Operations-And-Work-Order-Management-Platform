import React, { useState, useEffect } from 'react';
import { partsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  DollarSign,
  PackageCheck,
  PackageX,
  X,
  Edit2,
} from 'lucide-react';

export const PartsInventoryPage = () => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  const [newPart, setNewPart] = useState({
    sku: '',
    name: '',
    description: '',
    available_quantity: 10,
    unit_cost: 25.0,
    reorder_threshold: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const isStaffAdmin = hasRole(['SUPER_ADMIN', 'OPERATIONS_MANAGER']);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const res = await partsApi.list({
        search: search || undefined,
        low_stock_only: lowStockOnly || undefined,
      });
      if (res.data?.success) setParts(res.data.data);
    } catch (err) {
      error("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, [search, lowStockOnly]);

  const handleAddPartSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await partsApi.create({
        sku: newPart.sku,
        name: newPart.name,
        description: newPart.description,
        available_quantity: parseInt(newPart.available_quantity, 10),
        unit_cost: parseFloat(newPart.unit_cost),
        reorder_threshold: parseInt(newPart.reorder_threshold, 10),
      });
      if (res.data?.success) {
        success("Part cataloged in inventory.");
        setShowAddModal(false);
        setNewPart({
          sku: '',
          name: '',
          description: '',
          available_quantity: 10,
          unit_cost: 25.0,
          reorder_threshold: 5,
        });
        fetchParts();
      }
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to add part.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPartSubmit = async (e) => {
    e.preventDefault();
    if (!editingPart) return;
    try {
      setSubmitting(true);
      await partsApi.update(editingPart.id, {
        name: editingPart.name,
        description: editingPart.description,
        available_quantity: parseInt(editingPart.available_quantity, 10),
        unit_cost: parseFloat(editingPart.unit_cost),
        reorder_threshold: parseInt(editingPart.reorder_threshold, 10),
      });
      success("Part inventory updated.");
      setShowEditModal(false);
      fetchParts();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to update part.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Parts & Materials Inventory</h1>
          <p className="text-xs text-slate-500">Track spare parts, available stock, unit costs, and reorder thresholds</p>
        </div>
        {isStaffAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 transition flex items-center gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add Inventory Part</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, part name, description..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
          />
        </div>

        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 shrink-0 ${
            lowStockOnly
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Low Stock Alerts Only</span>
        </button>
      </div>

      {/* Parts Table */}
      {loading ? (
        <LoadingSpinner text="Counting warehouse stock..." />
      ) : parts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No parts found matching query.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Part Name</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4 text-center">Reorder Threshold</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4">Status</th>
                  {isStaffAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {parts.map((p) => {
                  const isLow = p.available_quantity <= p.reorder_threshold;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.sku}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{p.description}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold ${
                          p.available_quantity === 0
                            ? 'bg-rose-100 text-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.available_quantity} units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-medium">
                        {p.reorder_threshold} units
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${p.unit_cost?.toFixed(2)}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                      {isStaffAdmin && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingPart(p);
                              setShowEditModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-sky-600 rounded transition"
                            title="Edit part / adjust stock"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Register New Part</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPartSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Part SKU</label>
                  <input
                    type="text"
                    required
                    value={newPart.sku}
                    onChange={(e) => setNewPart({ ...newPart, sku: e.target.value })}
                    placeholder="e.g. FILT-HVAC-01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={newPart.unit_cost}
                    onChange={(e) => setNewPart({ ...newPart, unit_cost: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Part Name</label>
                <input
                  type="text"
                  required
                  value={newPart.name}
                  onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                  placeholder="e.g. High-Efficiency Pleated Filter 20x25"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Specifications</label>
                <textarea
                  rows={2}
                  value={newPart.description}
                  onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                  placeholder="Specifications, compatible models, warehouse location..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock Quantity</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newPart.available_quantity}
                    onChange={(e) => setNewPart({ ...newPart, available_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPart.reorder_threshold}
                    onChange={(e) => setNewPart({ ...newPart, reorder_threshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
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
                  {submitting ? 'Cataloging...' : 'Save Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Part Modal */}
      {showEditModal && editingPart && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Adjust Part Stock & Pricing</h3>
                <p className="text-[11px] text-slate-500 font-mono">SKU: {editingPart.sku}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditPartSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Part Name</label>
                <input
                  type="text"
                  required
                  value={editingPart.name}
                  onChange={(e) => setEditingPart({ ...editingPart, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Available Qty</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingPart.available_quantity}
                    onChange={(e) => setEditingPart({ ...editingPart, available_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={editingPart.unit_cost}
                    onChange={(e) => setEditingPart({ ...editingPart, unit_cost: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingPart.reorder_threshold}
                    onChange={(e) => setEditingPart({ ...editingPart, reorder_threshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingPart.description || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Update Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
