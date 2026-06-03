'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  Loader2, 
  User, 
  UserCheck, 
  Clock, 
  Stethoscope, 
  CircleDollarSign,
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PlayCircle,
  FileSpreadsheet,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export default function AppointmentsSchedulerPage() {
  // Data States
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    department: 'General Medicine',
    appointment_date: '',
    appointment_time: '',
    reason_for_visit: '',
    notes: ''
  });

  // Fetch all initial data
  const fetchData = async () => {
    try {
      const appointmentsRes = await fetch(`/api/healthcare/appointments?date=${dateFilter}&status=${statusFilter}`);
      const patientsRes = await fetch('/api/healthcare/patients');
      const doctorsRes = await fetch('/api/healthcare/doctors');

      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json();
        setAppointments(data.appointments || []);
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
      console.error('Fetch data failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter, statusFilter]);

  // Form change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-update department if doctor is chosen
    if (name === 'doctor_id') {
      const selectedDoc = doctors.find(d => d.id === value);
      if (selectedDoc) {
        setFormData(prev => ({ ...prev, department: selectedDoc.department }));
      }
    }
  };

  // Submit new booking
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/healthcare/appointments', {
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
          department: 'General Medicine',
          appointment_date: '',
          appointment_time: '',
          reason_for_visit: '',
          notes: ''
        });
        fetchData();
      } else {
        setFormError(data.error || 'Failed to book appointment.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to connect to server.');
    } finally {
      setFormLoading(false);
    }
  };

  // Update Status directly in real-time
  const handleUpdateStatus = async (appointmentId, newStatus) => {
    setActionLoading(appointmentId);
    try {
      const res = await fetch('/api/healthcare/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, status: newStatus })
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

  // Status Styling Mappers
  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-50 border-blue-200 text-blue-700 font-bold';
      case 'Confirmed':
        return 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold';
      case 'Completed':
        return 'bg-emerald-50 border-emerald-250 text-emerald-700 font-black';
      case 'Cancelled':
        return 'bg-rose-50 border-rose-250 text-rose-700 font-bold';
      case 'No Show':
        return 'bg-amber-50 border-amber-250 text-amber-700 font-bold';
      default:
        return 'bg-slate-50 border text-slate-700';
    }
  };

  return (
    <div className="space-y-6 text-left relative select-none">
      
      {/* Directory Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="h-5.5 w-5.5 text-rose-500" /> OPD Appointments &amp; Consult Scheduler
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Book doctor consultation slots, manage patient triage check-ins, and toggle real-time patient queue statuses.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-750 text-white text-xs font-black rounded-xl shadow-md shadow-rose-500/15 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Book Appointment
        </button>
      </div>

      {/* Modern Filter Bars */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Date Filter */}
        <div className="relative flex items-center">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          />
          {dateFilter && (
            <button 
              onClick={() => setDateFilter('')}
              className="absolute right-3.5 text-slate-400 hover:text-slate-700 text-xs font-bold font-mono"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No Show">No Show</option>
          </select>
        </div>

        {/* Quick count banner */}
        <div className="flex items-center justify-end px-2 text-slate-500 font-bold text-[11px]">
          📊 {appointments.length} Total Appointments Scheduled
        </div>
      </div>

      {/* Directory Grid of Bookings */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling OPD queue logs...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          📅 No consultations booked matching filters. Click "Book Appointment" to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 text-left">
          {appointments.map((apt) => (
            <div 
              key={apt.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden"
            >
              {/* Header: custom code and status badge */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">
                    {apt.appointment_number}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-3.5 w-3.5 text-slate-450" />
                    <span className="text-[10px] font-black text-slate-700">
                      {new Date(apt.appointment_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })} @ {apt.appointment_time}
                    </span>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full border text-[8px] uppercase tracking-wider ${getStatusBadgeStyles(apt.status)}`}>
                  {apt.status}
                </span>
              </div>

              {/* Body: Patient and Doctor Details */}
              <div className="space-y-3 font-semibold text-xs leading-none">
                
                {/* Patient Details */}
                <div className="p-3 bg-slate-50 border rounded-xl space-y-1.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono block">Patient EHR</span>
                  <div className="flex items-center justify-between text-slate-800">
                    <p className="font-extrabold text-xs">
                      {apt.patient?.first_name} {apt.patient?.last_name}
                    </p>
                    <span className="text-[9px] font-mono text-slate-500 font-black">{apt.patient?.patient_id_custom}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-none">Phone: {apt.patient?.mobile}</p>
                </div>

                {/* Doctor Details */}
                <div className="p-3 bg-rose-50/20 border border-rose-100/40 rounded-xl space-y-1.5">
                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest font-mono block">Consultant Practitioner</span>
                  <div className="flex items-center justify-between text-slate-800">
                    <p className="font-extrabold text-xs">
                      Dr. {apt.doctor?.doctor_name}
                    </p>
                    <span className="text-[9px] text-emerald-700 font-mono font-black">Fee: ₹{Number(apt.doctor?.consultation_fee).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-none">Dept: {apt.department} • {apt.doctor?.specialization}</p>
                </div>

                {/* Reason For Visit */}
                {apt.reason_for_visit && (
                  <div className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    <strong>Reason:</strong> {apt.reason_for_visit}
                  </div>
                )}
              </div>

              {/* Real-time Status Changer Controls */}
              <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 select-none">
                
                {/* Action select */}
                <div className="flex-1 flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">Change status:</span>
                  <select
                    disabled={actionLoading === apt.id}
                    value={apt.status}
                    onChange={(e) => handleUpdateStatus(apt.id, e.target.value)}
                    className="flex-1 text-[9px] font-black px-2 py-1 bg-slate-50 border rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="No Show">No Show</option>
                  </select>
                </div>

                {actionLoading === apt.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-rose-500 shrink-0" />
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── BOOK APPOINTMENT FORM MODAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-rose-500" />
                  Book OPD Consultation
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Assign registered patients to medical doctors and allocate consultation timings.
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
                {patients.length === 0 && (
                  <span className="text-[9px] text-rose-600 font-bold block mt-1.5">
                    ⚠️ No patients registered. Please register a patient first in Patients Directory.
                  </span>
                )}
              </div>

              {/* Select Doctor */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Select Practitioner Doctor *</label>
                <select
                  required
                  name="doctor_id"
                  value={formData.doctor_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer"
                >
                  <option value="">-- Choose Medical Consultant --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.doctor_name} ({d.specialization} - {d.department})
                    </option>
                  ))}
                </select>
                {doctors.length === 0 && (
                  <span className="text-[9px] text-rose-600 font-bold block mt-1.5">
                    ⚠️ No doctors registered. Please add a doctor in Doctors Directory.
                  </span>
                )}
              </div>

              {/* Date & Time slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">OPD Consultation Date *</label>
                  <input
                    type="date"
                    required
                    name="appointment_date"
                    value={formData.appointment_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Consultation Time slot *</label>
                  <input
                    type="text"
                    required
                    name="appointment_time"
                    value={formData.appointment_time}
                    onChange={handleInputChange}
                    placeholder="e.g. 10:30 AM"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>
              </div>

              {/* Reason for Visit */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Reason For Visit</label>
                <input
                  type="text"
                  name="reason_for_visit"
                  value={formData.reason_for_visit}
                  onChange={handleInputChange}
                  placeholder="e.g. Chronic fever & severe throat pain"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              {/* Additional Clinical Notes */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Administrative Notes</label>
                <textarea
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Any allergy alerts or special instructions..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition resize-none font-sans"
                ></textarea>
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
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Confirm Consultation Booking
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
