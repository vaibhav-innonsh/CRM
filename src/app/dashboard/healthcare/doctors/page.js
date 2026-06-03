'use client';

import { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Search, 
  Plus, 
  UserPlus, 
  Loader2, 
  Phone, 
  Mail, 
  Briefcase, 
  Award, 
  CircleDollarSign,
  Clock,
  Sparkles,
  XCircle,
  Stethoscope,
  HeartHandshake
} from 'lucide-react';

export default function DoctorsDirectoryPage() {
  // Data States
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    doctor_name: '',
    specialization: '',
    department: 'General Medicine',
    email: '',
    mobile: '',
    qualification: '',
    experience: '',
    consultation_fee: 500,
    availability: 'Monday - Friday (9 AM - 5 PM)'
  });

  // Fetch Doctors from API
  const fetchDoctors = async () => {
    try {
      const res = await fetch(`/api/healthcare/doctors?search=${searchQuery}&department=${deptFilter}&status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.doctors || []);
      }
    } catch (err) {
      console.error('Fetch doctors failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [searchQuery, deptFilter, statusFilter]);

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit new Doctor
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/healthcare/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok) {
        setIsFormOpen(false);
        setFormData({
          doctor_name: '',
          specialization: '',
          department: 'General Medicine',
          email: '',
          mobile: '',
          qualification: '',
          experience: '',
          consultation_fee: 500,
          availability: 'Monday - Friday (9 AM - 5 PM)'
        });
        fetchDoctors();
      } else {
        setFormError(data.error || 'Failed to add doctor profile.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to connect to the server.');
    } finally {
      setFormLoading(false);
    }
  };

  const departmentsList = [
    'General Medicine',
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Gynecology',
    'Dermatology',
    'Neurology',
    'Ophthalmology',
    'ENT'
  ];

  return (
    <div className="space-y-6 text-left relative select-none">
      
      {/* Directory Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="h-5.5 w-5.5 text-rose-500" /> Doctors &amp; Consultants Directory
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage hospital medical practitioners, adjust OPD departments, qualification catalogs, and set consultant fee structures.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-750 text-white text-xs font-black rounded-xl shadow-md shadow-rose-500/15 cursor-pointer transition-all shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Add Consultant Doctor
        </button>
      </div>

      {/* Modern Filter Bars */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2 relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search doctors by name or medical specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          />
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          >
            <option value="All">All Departments</option>
            {departmentsList.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Directory Grid of Doctors */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling medical registry...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          🩺 No registered doctor records found matching filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
          {doctors.map((doc) => (
            <div 
              key={doc.id}
              className="bg-white border border-slate-200 hover:border-rose-250 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden"
            >
              {/* Specialization Tag */}
              <div className="absolute top-0 right-0 px-2.5 py-1 bg-rose-500 text-white text-[9px] font-black uppercase rounded-bl-xl font-mono shadow-sm">
                🥼 {doc.specialization}
              </div>

              <div className="space-y-4">
                {/* ID & Name */}
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">
                    {doc.doctor_id_custom}
                  </span>
                  <h3 className="text-xs font-black text-slate-800 tracking-tight leading-tight group-hover:text-rose-650 transition">
                    Dr. {doc.doctor_name}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-rose-50 border border-rose-100 rounded text-[8px] font-bold text-rose-700 font-mono uppercase">
                    🏢 {doc.department}
                  </span>
                </div>

                {/* Qualification details */}
                <div className="space-y-2 text-[10px] font-semibold text-slate-500 leading-snug">
                  <div className="flex items-start gap-1.5">
                    <Award className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-slate-700">{doc.qualification || 'MBBS'}</p>
                      <span className="text-[9px] text-slate-400 font-semibold">{doc.experience || '3'} Years Experience</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 border-t pt-2 mt-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-600 truncate">{doc.availability || 'Monday - Friday'}</span>
                  </div>
                </div>

                {/* Consultation Fee */}
                <div className="bg-slate-50 border rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <CircleDollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">OPD FEE</span>
                  </div>
                  <strong className="text-xs font-black text-emerald-700">
                    ₹{Number(doc.consultation_fee).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Status and Contact Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-wider ${
                  doc.status === 'Active' 
                    ? 'bg-emerald-50 border-emerald-250 text-emerald-700 font-extrabold' 
                    : 'bg-rose-50 border-rose-250 text-rose-700 font-bold'
                }`}>
                  {doc.status}
                </span>

                <div className="flex items-center gap-2">
                  {doc.mobile && (
                    <a href={`tel:${doc.mobile}`} title="Call doctor" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition">
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {doc.email && (
                    <a href={`mailto:${doc.email}`} title="Email doctor" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition">
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── REGISTER DOCTOR FORM MODAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="h-4.5 w-4.5 text-rose-500" />
                  Add Consultant Doctor
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Enter credentials, specialized medical field, and fees to configure practitioner.
                </p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Doctor Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    name="doctor_name"
                    value={formData.doctor_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Amit Kumar (Do not add Dr.)"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Specialization *</label>
                  <input
                    type="text"
                    required
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    placeholder="e.g. Cardiologist"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">OPD Department *</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  >
                    {departmentsList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 99999 88888"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g. dramit@hospital.com"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Qualification */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Qualification</label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    placeholder="e.g. MBBS, MD (Cardio)"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Years of Experience</label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    placeholder="e.g. 10"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Consultation Fee */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Consultation Fee (₹) *</label>
                  <input
                    type="number"
                    required
                    name="consultation_fee"
                    value={formData.consultation_fee}
                    onChange={handleInputChange}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Availability */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Availability Timing</label>
                  <input
                    type="text"
                    name="availability"
                    value={formData.availability}
                    onChange={handleInputChange}
                    placeholder="e.g. Mon-Fri (10 AM - 4 PM)"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      Save Doctor Profile
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
}
