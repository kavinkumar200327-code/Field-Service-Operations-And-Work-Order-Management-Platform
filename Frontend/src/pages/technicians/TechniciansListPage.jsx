import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { techniciansApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  Users2,
  MapPin,
  Clock,
  Briefcase,
  Calendar,
  Eye,
  CheckCircle2,
  Filter,
  Plus,
  X,
  UserPlus,
  Mail,
  Phone,
  Lock,
  Tag,
  Award,
  Sparkles,
} from 'lucide-react';

const COMMON_REGIONS = [
  'North Region',
  'South Metro',
  'Metro Area',
  'West Industrial',
  'East Suburbs',
];

const AVAILABLE_CATEGORIES = [
  'HVAC & Climate Control',
  'Electrical Systems',
  'Plumbing & Piping',
  'Industrial Machinery',
];

const PRESET_SKILLS = [
  'HVAC Repair',
  'Refrigerant Handling EPA 608',
  'Commercial Electrical',
  'High-Voltage Switchgear',
  'Pipe Fitting',
  'PLC Diagnostics',
  'Hydraulic Seals',
  'Thermal Scanning',
];

const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
];

export const TechniciansListPage = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add Technician Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    assigned_region: 'North Region',
    custom_region: '',
    employment_status: 'FULL_TIME',
    work_start_time: '08:00',
    work_end_time: '17:00',
    working_days: [1, 2, 3, 4, 5],
    service_categories: ['HVAC & Climate Control'],
    skills: [
      { skill_name: 'HVAC Repair', proficiency_level: 'EXPERT' },
    ],
  });

  // Skill input row state
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillProficiency, setNewSkillProficiency] = useState('INTERMEDIATE');

  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const canManage = hasRole(['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER']);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const res = await techniciansApi.list({
        region: regionFilter || undefined,
        availability: statusFilter || undefined,
      });
      if (res.data?.success) {
        setTechnicians(res.data.data);
      }
    } catch (err) {
      error("Failed to load technicians.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [regionFilter, statusFilter]);

  const handleToggleDay = (dayId) => {
    setFormData((prev) => {
      const exists = prev.working_days.includes(dayId);
      const updated = exists
        ? prev.working_days.filter((d) => d !== dayId)
        : [...prev.working_days, dayId].sort();
      return { ...prev, working_days: updated };
    });
  };

  const handleToggleCategory = (category) => {
    setFormData((prev) => {
      const exists = prev.service_categories.includes(category);
      const updated = exists
        ? prev.service_categories.filter((c) => c !== category)
        : [...prev.service_categories, category];
      return { ...prev, service_categories: updated };
    });
  };

  const handleAddSkill = () => {
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    if (formData.skills.some((s) => s.skill_name.toLowerCase() === trimmed.toLowerCase())) {
      error(`Skill "${trimmed}" is already added.`);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, { skill_name: trimmed, proficiency_level: newSkillProficiency }],
    }));
    setNewSkillName('');
  };

  const handleQuickAddSkill = (skillName) => {
    if (formData.skills.some((s) => s.skill_name.toLowerCase() === skillName.toLowerCase())) return;
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, { skill_name: skillName, proficiency_level: 'INTERMEDIATE' }],
    }));
  };

  const handleRemoveSkill = (skillName) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.skill_name !== skillName),
    }));
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      assigned_region: 'North Region',
      custom_region: '',
      employment_status: 'FULL_TIME',
      work_start_time: '08:00',
      work_end_time: '17:00',
      working_days: [1, 2, 3, 4, 5],
      service_categories: ['HVAC & Climate Control'],
      skills: [{ skill_name: 'HVAC Repair', proficiency_level: 'EXPERT' }],
    });
    setNewSkillName('');
    setNewSkillProficiency('INTERMEDIATE');
  };

  const handleCreateTechnician = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      error("Technician full name is required.");
      return;
    }
    if (!formData.email.trim()) {
      error("Email address is required.");
      return;
    }
    if (formData.working_days.length === 0) {
      error("Please select at least one working day.");
      return;
    }

    try {
      setSubmitting(true);
      const region = formData.assigned_region === 'CUSTOM'
        ? formData.custom_region.trim() || 'Metro Area'
        : formData.assigned_region;

      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        password: formData.password.trim() || 'Tech@123',
        assigned_region: region,
        employment_status: formData.employment_status,
        work_start_time: formData.work_start_time,
        work_end_time: formData.work_end_time,
        working_days: formData.working_days,
        service_categories: formData.service_categories,
        skills: formData.skills,
      };

      const res = await techniciansApi.create(payload);
      if (res.data?.success) {
        success(`Technician ${formData.full_name} added to fleet successfully!`);
        setShowAddModal(false);
        resetForm();
        fetchTechnicians();
      }
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to create technician.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Technician Fleet & Availability</h1>
          <p className="text-xs text-slate-500">Field workforce skills, working hours, and operational status</p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 transition flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Technician</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 w-full sm:w-auto"
          >
            <option value="">All Operating Regions</option>
            <option value="North Region">North Region</option>
            <option value="South Metro">South Metro</option>
            <option value="Metro Area">Metro Area</option>
            <option value="West Industrial">West Industrial</option>
            <option value="East Suburbs">East Suburbs</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 w-full sm:w-auto"
          >
            <option value="">All Availability Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">Busy on Job</option>
            <option value="ON_LEAVE">On Scheduled Leave</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500 self-end sm:self-center">
          Fleet Capacity: <strong className="text-slate-900">{technicians.length}</strong> active technicians
        </div>
      </div>

      {/* Grid of Technician Cards */}
      {loading ? (
        <LoadingSpinner text="Locating field technicians..." />
      ) : technicians.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <Users2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700 text-sm">No technicians found</p>
          <p className="text-xs text-slate-400 mt-1">No field specialists match the current filter selection.</p>
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Technician</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {technicians.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] shrink-0 aspect-square rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center uppercase shadow-sm select-none">
                      {t.full_name?.charAt(0) || 'T'}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2" title={t.full_name}>
                        {t.full_name}
                      </h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{t.assigned_region}</span>
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <StatusBadge status={t.availability_status} />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 shrink-0" /> Working Hours:
                    </span>
                    <span className="font-semibold text-slate-800">{t.work_start_time} - {t.work_end_time}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 shrink-0" /> Active Workload:
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${t.current_workload > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {t.current_workload} active {t.current_workload === 1 ? 'job' : 'jobs'}
                    </span>
                  </div>

                  {t.service_categories && t.service_categories.length > 0 && (
                    <div className="flex items-start justify-between gap-2 pt-0.5">
                      <span className="text-slate-400 shrink-0">Categories:</span>
                      <span className="font-medium text-slate-700 text-right truncate max-w-[180px]">
                        {t.service_categories.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Skills tags */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Specialized Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {t.skills?.length > 0 ? (
                      t.skills.map((s) => (
                        <span
                          key={s.skill_name}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md"
                        >
                          {s.skill_name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">General Technician</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Status: {t.employment_status}</span>
                <Link
                  to={`/technicians/${t.id}`}
                  className="px-3 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 font-semibold text-xs rounded-xl transition flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>View Schedule</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD TECHNICIAN MODAL POP-UP */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add New Field Technician</h3>
                  <p className="text-[11px] text-slate-500">Configure technician credentials, working hours, and operational skills</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleCreateTechnician} className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Section 1: Personal & Contact Information */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-sky-700">
                  <Users2 className="w-3.5 h-3.5" />
                  <span>1. Personnel & Login Credentials</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Marcus Vance"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g., marcus.vance@servisync.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mobile Phone</label>
                    <input
                      type="text"
                      placeholder="e.g., +1 312-555-0144"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Initial Password <span className="text-slate-400 font-normal">(Default: Tech@123)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Leave blank for Tech@123"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Deployment & Employment */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-sky-700">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>2. Region & Employment Status</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Operating Region</label>
                    <select
                      value={formData.assigned_region}
                      onChange={(e) => setFormData({ ...formData, assigned_region: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      {COMMON_REGIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                      <option value="CUSTOM">+ Custom Region</option>
                    </select>
                    {formData.assigned_region === 'CUSTOM' && (
                      <input
                        type="text"
                        placeholder="Enter custom region..."
                        value={formData.custom_region}
                        onChange={(e) => setFormData({ ...formData, custom_region: e.target.value })}
                        className="w-full px-3 py-2 mt-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
                    <select
                      value={formData.employment_status}
                      onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="FULL_TIME">Full Time Employee</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contractor</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Working Hours & Days */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-sky-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>3. Shift Schedule & Working Days</span>
                </h4>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Shift Start Time</label>
                    <input
                      type="time"
                      required
                      value={formData.work_start_time}
                      onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Shift End Time</label>
                    <input
                      type="time"
                      required
                      value={formData.work_end_time}
                      onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Scheduled Working Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = formData.working_days.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleToggleDay(d.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 4: Service Categories */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-sky-700">
                  <Tag className="w-3.5 h-3.5" />
                  <span>4. Qualified Service Categories</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_CATEGORIES.map((cat) => {
                    const isChecked = formData.service_categories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                          isChecked
                            ? 'bg-sky-50/70 border-sky-300 text-sky-950 font-semibold'
                            : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCategory(cat)}
                          className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                        />
                        <span className="text-xs">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 5: Specialized Skills & Certifications */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-sky-700">
                  <Award className="w-3.5 h-3.5" />
                  <span>5. Specialized Skills & Certifications</span>
                </h4>

                {/* Skill input form */}
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-2.5">
                  <input
                    type="text"
                    placeholder="Enter skill name (e.g. EPA 608 Certified)"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    className="w-full sm:flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <select
                    value={newSkillProficiency}
                    onChange={(e) => setNewSkillProficiency(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                  >
                    + Add
                  </button>
                </div>

                {/* Preset quick-add suggestions */}
                <div className="mb-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Quick Add Presets:</p>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_SKILLS.map((sk) => (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => handleQuickAddSkill(sk)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 text-[10px] rounded-md transition border border-slate-200/60"
                      >
                        + {sk}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Added skills chips list */}
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">Technician Skill Profile:</p>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {formData.skills.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No skills added yet.</span>
                    ) : (
                      formData.skills.map((s) => (
                        <span
                          key={s.skill_name}
                          className="px-2.5 py-1 bg-white border border-slate-200 shadow-2xs rounded-lg text-slate-800 font-semibold flex items-center gap-1.5 text-[11px]"
                        >
                          <span>{s.skill_name}</span>
                          <span className="text-[9px] px-1 py-0.2 bg-sky-100 text-sky-800 rounded font-bold uppercase">
                            {s.proficiency_level}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(s.skill_name)}
                            className="text-slate-400 hover:text-red-500 ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 transition flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Profile...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Register Technician</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
