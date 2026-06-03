'use client';

import { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  Loader2, 
  User, 
  UserCheck, 
  Clock, 
  Sparkles, 
  XCircle,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function AdmissionsPage() {
  // Data States
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    room: '',
    bed: '',
    admission_date: ''
  });

  // Transfer Modal States
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedAdmForTransfer, setSelectedAdmForTransfer] = useState(null);
  const [transferData, setTransferData] = useState({
    room: '',
    bed: ''
  });

  // Fetch data
  const fetchData = async () => {
    try {
      const admRes = await fetch(`/api/healthcare/admissions?status=${statusFilter}`);
      const patientsRes = await fetch('/api/healthcare/patients');
      const doctorsRes = await fetch('/api/healthcare/doctors');

      if (admRes.ok) {
        const data = await admRes.json();
        setAdmissions(data.admissions || []);
      }
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(data.patients || []);
      }
      if (doctorsRes.ok) {
        const data = await doctorsRes.json();
        setDoctors(data.doctors || []);
      }
    } catch (err) {
      console.error('Fetch admissions failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Handle Form Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Admission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/healthcare/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok) {
        setIsFormOpen(false);
        setFormData({
          patient_id: '',
          doctor_id: '',
          room: '',
          bed: '',
          admission_date: ''
        });
        fetchData();
      } else {
        setFormError(data.error || 'Failed to save patient admission.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to connect to server.');
    } finally {
      setFormLoading(false);
    }
  };

  // Update status (Discharge or Transfer)
  const handleUpdateStatus = async (admissionId, newStatus) => {
    setActionLoading(admissionId);
    try {
      const res = await fetch('/api/healthcare/admissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionId, status: newStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Update status error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Room/Bed Transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdmForTransfer) return;

    setFormLoading(true);
    try {
      const res = await fetch('/api/healthcare/admissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admissionId: selectedAdmForTransfer.id,
          status: 'Transferred',
          room: transferData.room,
          bed: transferData.bed
        })
      });
      if (res.ok) {
        setIsTransferOpen(false);
        setSelectedAdmForTransfer(null);
        setTransferData({ room: '', bed: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  // Status Badge styling
  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'Admitted':
        return 'bg-blue-50 border-blue-200 text-blue-700 font-bold animate-pulse';
      case 'Discharged':
        return 'bg-emerald-50 border-emerald-250 text-emerald-700 font-black';
      case 'Transferred':
        return 'bg-amber-50 border-amber-250 text-amber-700 font-bold';
      default:
        return 'bg-slate-50 border text-slate-700';
    }
  };

  return (
    <div className="space-y-6 text-left relative select-none">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="h-5.5 w-5.5 text-rose-500" /> Hospital Wards Admissions
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Track active IPD hospitalization room allocations, adjust bed assignments, and manage patient discharge workflows.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-750 text-white text-xs font-black rounded-xl shadow-md shadow-rose-500/15 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Hospitalize Patient
        </button>
      </div>

      {/* Modern Filter Bars */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          >
            <option value="All">All Admissions Status</option>
            <option value="Admitted">Admitted</option>
            <option value="Discharged">Discharged</option>
            <option value="Transferred">Transferred</option>
          </select>
        </div>

        {/* Dynamic Count Banner */}
        <div className="md:col-span-2 flex items-center justify-end px-2 text-slate-500 font-bold text-[11px]">
          📊 {admissions.length} Hospitalization Bed allocations logged
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling admissions database...</p>
        </div>
      ) : admissions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          🏥 No ward admissions recorded matching filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
          {admissions.map((adm) => (
            <div 
              key={adm.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden"
            >
              {/* Header: admission number and status */}
              <div className="flex items-start justify-between gap-3 shrink-0">
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">
                    {adm.admission_number}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] font-semibold text-slate-500 leading-none">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Admitted: {new Date(adm.admission_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-wider ${getStatusBadgeStyles(adm.status)}`}>
                  {adm.status}
                </span>
              </div>

              {/* Body: Room/Bed allocations, patient details, ward doctor */}
              <div className="space-y-3.5 flex-1 font-semibold text-xs leading-none">
                
                {/* Wards room & bed assignments */}
                <div className="p-3 bg-slate-50 border rounded-xl grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono block">Room / Ward</span>
                    <strong className="text-slate-800 text-xs block mt-1 leading-tight">{adm.room}</strong>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono block">Bed Assigned</span>
                    <strong className="text-rose-600 text-xs block mt-1 leading-tight font-mono">{adm.bed}</strong>
                  </div>
                </div>

                {/* Patient details */}
                <div className="space-y-1.5 text-[10px] text-slate-500">
                  <p>Patient: <strong className="text-slate-800 font-extrabold">{adm.patient?.first_name} {adm.patient?.last_name}</strong> ({adm.patient?.patient_id_custom})</p>
                  <p>Admitting doctor: <strong className="text-slate-850">Dr. {adm.doctor?.doctor_name}</strong></p>
                  
                  {adm.discharge_date && (
                    <p className="border-t pt-2 mt-1.5 text-emerald-600 font-bold">
                      Discharged: {new Date(adm.discharge_date).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                    </p>
                  )}
                </div>

              </div>

              {/* Quick Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
                {adm.status !== 'Discharged' ? (
                  <>
                    <button
                      onClick={() => { setSelectedAdmForTransfer(adm); setTransferData({ room: adm.room, bed: adm.bed }); setIsTransferOpen(true); }}
                      className="flex-1 py-1.5 bg-slate-50 border hover:bg-slate-100 rounded-lg text-slate-700 text-[10px] font-bold text-center cursor-pointer transition"
                    >
                      🔄 Transfer Bed
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(adm.id, 'Discharged')}
                      className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-lg text-center cursor-pointer transition shadow-sm shadow-emerald-500/10"
                    >
                      ✔️ Discharge
                    </button>
                  </>
                ) : (
                  <span className="w-full text-center text-[10px] text-slate-400 italic">Patient is Discharged</span>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── HOSPITALIZE PATIENT MODAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Building className="h-4.5 w-4.5 text-rose-500" />
                  Hospitalize Patient (IPD Admission)
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Allocate hospital rooms, wards, bed placements, and assign primary duty physicians.
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
              
              {/* Select Patient */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Select Patient *</label>
                <select
                  required
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer"
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_id_custom})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Doctor */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Primary Doctor *</label>
                <select
                  required
                  name="doctor_id"
                  value={formData.doctor_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer"
                >
                  <option value="">-- Choose Physician --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.doctor_name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Admission Date-Time *</label>
                <input
                  type="datetime-local"
                  required
                  name="admission_date"
                  value={formData.admission_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              {/* Room & Bed allocations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Room */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Ward / Room *</label>
                  <input
                    type="text"
                    required
                    name="room"
                    value={formData.room}
                    onChange={handleInputChange}
                    placeholder="e.g. ICU-A, Room-302"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Bed */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Bed Assigned *</label>
                  <input
                    type="text"
                    required
                    name="bed"
                    value={formData.bed}
                    onChange={handleInputChange}
                    placeholder="e.g. Bed-3"
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
                      Hospitalizing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Confirm IPD Hospitalization
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TRANSFER ROOM & BED MODAL ── */}
      {isTransferOpen && selectedAdmForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  🔄 Ward Transfer Bed
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Transfer patient <span className="text-rose-600 font-extrabold">{selectedAdmForTransfer.patient?.first_name}</span> to another room/bed.
                </p>
              </div>
              <button 
                onClick={() => setIsTransferOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              
              {/* Room */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">New Ward / Room *</label>
                <input
                  type="text"
                  required
                  value={transferData.room}
                  onChange={(e) => setTransferData(prev => ({ ...prev, room: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              {/* Bed */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">New Bed Assigned *</label>
                <input
                  type="text"
                  required
                  value={transferData.bed}
                  onChange={(e) => setTransferData(prev => ({ ...prev, bed: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {formLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Confirm Transfer'
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
