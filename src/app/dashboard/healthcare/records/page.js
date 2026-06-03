'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Loader2, 
  User, 
  UserCheck, 
  Activity, 
  Clipboard, 
  Award, 
  Clock, 
  Sparkles, 
  XCircle,
  FileSpreadsheet,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function MedicalRecordsPage() {
  // Data States
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    diagnosis: '',
    symptoms: '',
    treatment_plan: '',
    notes: '',
    visit_date: ''
  });

  // Fetch data
  const fetchData = async () => {
    try {
      const recordsRes = await fetch(`/api/healthcare/records?search=${searchQuery}`);
      const patientsRes = await fetch('/api/healthcare/patients');
      const doctorsRes = await fetch('/api/healthcare/doctors');

      if (recordsRes.ok) {
        const data = await recordsRes.json();
        setRecords(data.records || []);
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
      console.error('Fetch records failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery]);

  // Handle Form Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit New Record
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/healthcare/records', {
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
          diagnosis: '',
          symptoms: '',
          treatment_plan: '',
          notes: '',
          visit_date: ''
        });
        fetchData();
      } else {
        setFormError(data.error || 'Failed to save diagnostic record.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to connect to server.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left relative select-none">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-5.5 w-5.5 text-rose-500" /> Patient Medical Records (EMR)
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Browse persistent clinical history logs, consult diagnosis details, symptoms checklist and medical treatment plans.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-750 text-white text-xs font-black rounded-xl shadow-md shadow-rose-500/15 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Log Consultation Record
        </button>
      </div>

      {/* Modern Filter Bars */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-2 relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search records by diagnosis, symptoms, or treatment plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          />
        </div>

        {/* Dynamic Count Banner */}
        <div className="flex items-center justify-end px-2 text-slate-500 font-bold text-[11px]">
          📊 {records.length} Persistent EMR Logs Saved
        </div>
      </div>

      {/* Records Listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling medical health charts...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          📂 No medical history logs recorded. Click "Log Consultation Record" to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {records.map((rec) => (
            <div 
              key={rec.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 text-left relative overflow-hidden"
            >
              {/* Record identifier */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">
                    {rec.record_number}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold text-slate-500 leading-none">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Visit Date: {new Date(rec.visit_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono block">Patient Name</span>
                  <strong className="text-slate-800 text-xs font-black truncate block mt-0.5">
                    {rec.patient?.first_name} {rec.patient?.last_name}
                  </strong>
                </div>
              </div>

              {/* Consultation Details */}
              <div className="space-y-4 flex-1">
                {/* Diagnosis */}
                <div>
                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block font-mono">DIAGNOSIS FINDINGS</span>
                  <p className="text-xs font-black text-slate-900 mt-1 leading-tight">{rec.diagnosis}</p>
                </div>

                {/* Symptoms */}
                {rec.symptoms && (
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">SYMPTOMS RECORDED</span>
                    <p className="text-[11px] font-semibold text-slate-600 mt-1 leading-relaxed">{rec.symptoms}</p>
                  </div>
                )}

                {/* Treatment Plan */}
                {rec.treatment_plan && (
                  <div className="p-3 bg-slate-50 border rounded-xl">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">RECOMMENDED TREATMENT PLAN</span>
                    <p className="text-[11px] font-bold text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">{rec.treatment_plan}</p>
                  </div>
                )}

                {/* Notes */}
                {rec.notes && (
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">CLINICAL REMARKS & NOTES</span>
                    <p className="text-[10px] font-medium text-slate-550 mt-1 leading-relaxed whitespace-pre-wrap">{rec.notes}</p>
                  </div>
                )}
              </div>

              {/* Consultant Signature Footnote */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 shrink-0">
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                  Consultant: <strong>Dr. {rec.doctor?.doctor_name}</strong>
                </span>

                <span className="text-[8px] uppercase tracking-wider text-slate-400">
                  {rec.doctor?.qualification || 'MBBS'} • {rec.doctor?.department}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── LOG MEDICAL RECORD FORM MODAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="h-4.5 w-4.5 text-rose-500" />
                  Log Consultation Diagnosis
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Record detailed symptoms checklists, diagnostic findings, and clinical treatment notes.
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
              
              {/* Patient */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Select Patient *</label>
                <select
                  required
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer"
                >
                  <option value="">-- Choose Patient EHR --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_id_custom})
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Consultant Practitioner *</label>
                <select
                  required
                  name="doctor_id"
                  value={formData.doctor_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.doctor_name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              {/* Visit Date */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Visit Date *</label>
                <input
                  type="date"
                  required
                  name="visit_date"
                  value={formData.visit_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              {/* Diagnosis */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Diagnosis *</label>
                <input
                  type="text"
                  required
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleInputChange}
                  placeholder="e.g. Acute Bronchitis"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Symptoms Recorded</label>
                <input
                  type="text"
                  name="symptoms"
                  value={formData.symptoms}
                  onChange={handleInputChange}
                  placeholder="e.g. Coughing, wheezing, mild fever, sore throat"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              {/* Treatment Plan */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Treatment Plan</label>
                <textarea
                  name="treatment_plan"
                  rows="2"
                  value={formData.treatment_plan}
                  onChange={handleInputChange}
                  placeholder="Details of treatment, medications, diagnostic tests..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition resize-none font-sans"
                ></textarea>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Clinical Remarks &amp; Notes</label>
                <textarea
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="e.g. Drink warm fluids, avoid cold foods, return in 5 days if fever persists..."
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Save EMR Record
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
