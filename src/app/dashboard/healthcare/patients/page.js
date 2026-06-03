'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, Plus, UserPlus, Loader2, Heart, FileText, Calendar, Clipboard,
  Activity, ShieldAlert, Receipt, User, Phone, Mail, Clock, Sparkles, XCircle,
  FileSpreadsheet, ChevronRight, FlaskConical, Pill, CheckCircle
} from 'lucide-react';

export default function PatientsDirectoryPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  // EHR tab data states
  const [ehrData, setEhrData] = useState({
    appointments: [], records: [], prescriptions: [], labTests: [], invoices: []
  });
  const [ehrLoading, setEhrLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', mobile: '', email: '', gender: 'Male',
    dob: '', blood_group: 'A+', address: '', emergency_contact: '',
    insurance_provider: '', insurance_number: ''
  });

  const fetchPatients = async () => {
    try {
      const res = await fetch(`/api/healthcare/patients?search=${searchQuery}&gender=${genderFilter}&status=${statusFilter}`);
      if (res.ok) setPatients((await res.json()).patients || []);
    } catch (err) { console.error('Fetch patients failed:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPatients(); }, [searchQuery, genderFilter, statusFilter]);

  // Fetch all related EHR data for a patient
  const fetchEhrData = useCallback(async (patientId) => {
    setEhrLoading(true);
    try {
      const [apptRes, recRes, rxRes, labRes, billRes] = await Promise.all([
        fetch(`/api/healthcare/appointments?patient_id=${patientId}`),
        fetch(`/api/healthcare/records?patientId=${patientId}`),
        fetch(`/api/healthcare/prescriptions?patientId=${patientId}`),
        fetch(`/api/healthcare/lab-tests?patient_id=${patientId}`),
        fetch(`/api/healthcare/billing?patient_id=${patientId}`)
      ]);
      const apptData = apptRes.ok ? await apptRes.json() : {};
      const recData = recRes.ok ? await recRes.json() : {};
      const rxData = rxRes.ok ? await rxRes.json() : {};
      const labData = labRes.ok ? await labRes.json() : {};
      const billData = billRes.ok ? await billRes.json() : {};

      setEhrData({
        appointments: apptData.appointments || [],
        records: recData.records || [],
        prescriptions: rxData.prescriptions || [],
        labTests: labData.labTests || [],
        invoices: billData.invoices || []
      });
    } catch (err) {
      console.error('Fetch EHR data failed:', err);
    } finally {
      setEhrLoading(false);
    }
  }, []);

  const handleOpenPatient = (pat) => {
    setSelectedPatient(pat);
    setActiveDetailTab('overview');
    setEhrData({ appointments: [], records: [], prescriptions: [], labTests: [], invoices: [] });
    fetchEhrData(pat.id);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/healthcare/patients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsFormOpen(false);
        setFormData({ first_name: '', last_name: '', mobile: '', email: '', gender: 'Male', dob: '', blood_group: 'A+', address: '', emergency_contact: '', insurance_provider: '', insurance_number: '' });
        fetchPatients();
      } else { setFormError(data.error || 'Failed to register patient.'); }
    } catch (err) { setFormError('Failed to connect to the server.'); }
    finally { setFormLoading(false); }
  };

  // ─── EHR TAB CONTENT RENDERERS ───────────────────────────────────────────

  const renderEhrEmpty = (icon, label) => (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3 bg-slate-50 border border-dashed rounded-2xl border-slate-200">
      <span className="text-3xl">{icon}</span>
      <span className="text-[11px] text-slate-500 font-bold">{label}</span>
    </div>
  );

  const renderAppointmentsTab = () => {
    if (ehrLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>;
    if (!ehrData.appointments.length) return renderEhrEmpty('📅', 'No appointments scheduled for this patient.');
    return (
      <div className="space-y-3">
        {ehrData.appointments.map(appt => (
          <div key={appt.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-sm">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-rose-600 font-mono">{appt.appointment_number}</span>
              <p className="text-xs font-black text-slate-800">Dr. {appt.doctor?.doctor_name}</p>
              <p className="text-[10px] text-slate-500 font-semibold">{appt.department} • {new Date(appt.appointment_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })} {appt.appointment_time && `• ${appt.appointment_time}`}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase font-bold ${appt.status === 'Completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : appt.status === 'Confirmed' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              {appt.status}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderRecordsTab = () => {
    if (ehrLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>;
    if (!ehrData.records.length) return renderEhrEmpty('📋', 'No medical records found for this patient.');
    return (
      <div className="space-y-3">
        {ehrData.records.map(rec => (
          <div key={rec.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-rose-600 font-mono">{rec.record_id_custom || rec.id?.slice(0,8)}</span>
              <span className="text-[9px] font-bold text-slate-400">{new Date(rec.visit_date || rec.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
            </div>
            <p className="text-xs font-black text-slate-800">Diagnosis: {rec.diagnosis || '—'}</p>
            {rec.symptoms && <p className="text-[10px] text-slate-600 font-semibold">Symptoms: {rec.symptoms}</p>}
            {rec.notes && <p className="text-[10px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">{rec.notes}</p>}
            {rec.doctor && <p className="text-[10px] text-slate-500 font-semibold border-t pt-2">By Dr. {rec.doctor?.doctor_name}</p>}
          </div>
        ))}
      </div>
    );
  };

  const renderPrescriptionsTab = () => {
    if (ehrLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>;
    if (!ehrData.prescriptions.length) return renderEhrEmpty('💊', 'No prescriptions issued for this patient.');
    return (
      <div className="space-y-3">
        {ehrData.prescriptions.map(rx => (
          <div key={rx.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-rose-600 font-mono">{rx.prescription_number}</span>
              <span className="text-[9px] font-bold text-slate-400">{new Date(rx.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
            </div>
            {rx.doctor && <p className="text-[10px] text-slate-500 font-semibold">By Dr. {rx.doctor?.doctor_name}</p>}
            {Array.isArray(rx.medicines || rx.medicine_details) && (rx.medicines || rx.medicine_details || []).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Medicines</span>
                {(rx.medicines || rx.medicine_details || []).map((med, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-slate-700 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                    <Pill className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block">{med.name}</strong>
                      <span className="text-slate-500">{med.dosage} • {med.frequency} • {med.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderLabTab = () => {
    if (ehrLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>;
    if (!ehrData.labTests.length) return renderEhrEmpty('🧪', 'No lab tests requested for this patient.');
    return (
      <div className="space-y-3">
        {ehrData.labTests.map(lab => (
          <div key={lab.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-rose-600 font-mono">{lab.test_number}</span>
              <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase font-bold ${lab.status === 'Completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : lab.status === 'Scheduled' ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                {lab.status}
              </span>
            </div>
            <p className="text-xs font-black text-slate-800 flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5 text-rose-500" /> {lab.test_type}</p>
            <p className="text-[10px] text-slate-500 font-semibold">Date: {new Date(lab.test_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
            {lab.result && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-800 font-semibold">
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider block mb-1">📋 Result</span>
                {lab.result}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderInvoicesTab = () => {
    if (ehrLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>;
    if (!ehrData.invoices.length) return renderEhrEmpty('🧾', 'No billing invoices found for this patient.');
    return (
      <div className="space-y-3">
        {ehrData.invoices.map(inv => (
          <div key={inv.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-rose-600 font-mono">{inv.invoice_number}</span>
              <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase font-bold ${inv.payment_status === 'Paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : inv.payment_status === 'Partially Paid' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                {inv.payment_status}
              </span>
            </div>
            {/* Line items if available */}
            {Array.isArray(inv.line_items) && inv.line_items.length > 0 && (
              <div className="space-y-1">
                {inv.line_items.map((item, i) => (
                  <div key={i} className="flex justify-between text-[10px] text-slate-600 font-semibold border-b border-slate-100 pb-1">
                    <span>{item.description || item.name}</span>
                    <span className="font-mono">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between text-xs font-black text-slate-800 border-t pt-2">
              <span>Total Billed:</span>
              <span className="font-mono text-rose-600">₹{Number(inv.final_amount).toLocaleString('en-IN')}</span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold">Issued: {new Date(inv.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 text-left relative select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-5.5 w-5.5 text-rose-500" /> Patients Health Directory
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Access secure Electronic Health Records (EHR/EMR), view appointments, prescriptions, lab tests and billing history.
          </p>
        </div>
        <button onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-750 text-white text-xs font-black rounded-xl shadow-md shadow-rose-500/15 cursor-pointer transition-all shrink-0">
          <UserPlus className="h-4 w-4" /> Register Patient
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input type="text" placeholder="Search patients by name, mobile, email..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
        </div>
        <div>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition">
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Patient Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling electronic medical database...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          🏥 No registered patient profiles found matching filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {patients.map((pat) => (
            <div key={pat.id} onClick={() => handleOpenPatient(pat)}
              className="bg-white border border-slate-200 hover:border-rose-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group cursor-pointer relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 px-2.5 py-1 bg-rose-500 text-white text-[9px] font-black uppercase rounded-bl-xl font-mono shadow-sm">
                🩸 {pat.blood_group}
              </div>
              <div className="space-y-3.5">
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">{pat.patient_id_custom}</span>
                  <h3 className="text-xs font-black text-slate-800 tracking-tight leading-tight group-hover:text-rose-650 transition">{pat.first_name} {pat.last_name}</h3>
                </div>
                <div className="space-y-1.5 text-[10px] font-semibold text-slate-500 leading-none">
                  <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400 shrink-0" /><span>{pat.mobile}</span></div>
                  {pat.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400 shrink-0" /><span className="truncate">{pat.email}</span></div>}
                  <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-slate-400 shrink-0" /><span>DOB: {new Date(pat.dob).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span></div>
                </div>
                {pat.insurance_provider ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-150 rounded text-[8px] font-bold text-blue-700 font-mono uppercase">🛡️ {pat.insurance_provider}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border rounded text-[8px] font-bold text-slate-500 font-mono uppercase">Self-paying Patient</span>
                )}
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-black">
                <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-wider ${pat.status === 'Active' ? 'bg-emerald-50 border-emerald-250 text-emerald-700 font-extrabold' : 'bg-rose-50 border-rose-250 text-rose-700 font-bold'}`}>{pat.status}</span>
                <span className="text-slate-700 group-hover:text-rose-600 transition flex items-center gap-0.5">View EHR <ChevronRight className="h-3 w-3" /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── REGISTER PATIENT MODAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><UserPlus className="h-4.5 w-4.5 text-rose-500" /> Register New Patient EHR</h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">Enter complete demographic, clinical and insurance details to register patient.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition"><XCircle className="h-5 w-5" /></button>
            </div>
            {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">⚠️ {formError}</div>}
            <form onSubmit={handleFormSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[['first_name','First Name','text',true,'e.g. Neha'],['last_name','Last Name','text',true,'e.g. Patil'],['mobile','Mobile Number','tel',true,'e.g. +91 98765 43210'],['email','Email Address','email',false,'e.g. neha@gmail.com'],['dob','Date of Birth','date',true,''],['emergency_contact','Emergency Contact','text',false,'e.g. Father (+91...)'],['insurance_provider','Insurance Provider','text',false,'e.g. Star Health'],['insurance_number','Insurance Policy No.','text',false,'e.g. POL-9876543']].map(([name, label, type, required, placeholder]) => (
                  <div key={name}>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">{label}{required ? ' *' : ''}</label>
                    <input type={type} required={required} name={name} value={formData[name]} onChange={handleInputChange} placeholder={placeholder}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Gender *</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition">
                    <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Blood Group *</label>
                  <select name="blood_group" value={formData.blood_group} onChange={handleInputChange} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition">
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Address</label>
                <textarea name="address" rows="2" value={formData.address} onChange={handleInputChange} placeholder="Complete residential address..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition resize-none font-sans" />
              </div>
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {formLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Registering...</> : <><UserPlus className="h-3.5 w-3.5" /> Save Patient Profile</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PATIENT EHR DRAWER ── */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200 select-none">
          <div className="flex-1" onClick={() => setSelectedPatient(null)}></div>
          <div className="w-full max-w-2xl bg-white border-l border-slate-250 shadow-2xl h-full flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-250 text-left">
            
            {/* Drawer Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-start shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-rose-500/5 to-transparent pointer-events-none rounded-bl-full"></div>
              <div className="space-y-2">
                <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black font-mono shadow-sm">
                  🏥 EHR: {selectedPatient.patient_id_custom}
                </span>
                <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold block mt-1">
                  DOB: {new Date(selectedPatient.dob).toLocaleDateString('en-IN', { dateStyle: 'medium' })} • Blood: <strong className="text-rose-600">{selectedPatient.blood_group}</strong> • {selectedPatient.gender}
                </p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200 rounded-lg cursor-pointer transition border-0 bg-transparent">
                <XCircle className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* EHR Tab Navigation */}
            <div className="px-6 py-2.5 bg-white border-b border-slate-100 overflow-x-auto scrollbar-none flex gap-1.5 shrink-0 select-none">
              {[
                { key: 'overview', name: 'Overview', icon: Clipboard },
                { key: 'appointments', name: 'Appointments', icon: Calendar },
                { key: 'records', name: 'Medical Records', icon: FileText },
                { key: 'prescriptions', name: 'Prescriptions', icon: Heart },
                { key: 'labtests', name: 'Lab Tests', icon: Activity },
                { key: 'invoices', name: 'Invoices', icon: Receipt },
              ].map((tab) => {
                const Icon = tab.icon;
                const count = tab.key === 'appointments' ? ehrData.appointments.length : tab.key === 'records' ? ehrData.records.length : tab.key === 'prescriptions' ? ehrData.prescriptions.length : tab.key === 'labtests' ? ehrData.labTests.length : tab.key === 'invoices' ? ehrData.invoices.length : null;
                const isTabActive = activeDetailTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setActiveDetailTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer border shrink-0 ${isTabActive ? 'bg-rose-500 border-rose-500 text-white shadow-sm' : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-800'}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {tab.name}
                    {tab.key !== 'overview' && count > 0 && (
                      <span className={`ml-0.5 px-1 rounded text-[8px] font-black ${isTabActive ? 'bg-white/30 text-white' : 'bg-rose-100 text-rose-600'}`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 font-sans">

              {/* OVERVIEW TAB */}
              {activeDetailTab === 'overview' && (
                <div className="space-y-5 text-xs text-slate-750 font-semibold leading-relaxed">
                  <div className="bg-slate-50 border border-slate-250 rounded-2xl p-5 space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono border-b pb-2">Demographic & Contact Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-[9px] text-slate-450 block font-bold uppercase tracking-wider leading-none">Gender</span><strong className="text-slate-800 text-[11px] block mt-1">{selectedPatient.gender}</strong></div>
                      <div><span className="text-[9px] text-slate-450 block font-bold uppercase tracking-wider leading-none">Mobile</span><strong className="text-slate-800 text-[11px] block mt-1">{selectedPatient.mobile}</strong></div>
                      <div><span className="text-[9px] text-slate-450 block font-bold uppercase tracking-wider leading-none">Email</span><strong className="text-slate-800 text-[11px] block mt-1">{selectedPatient.email || 'Not Provided'}</strong></div>
                      <div><span className="text-[9px] text-slate-450 block font-bold uppercase tracking-wider leading-none">Emergency Contact</span><strong className="text-slate-800 text-[11px] block mt-1">{selectedPatient.emergency_contact || 'None'}</strong></div>
                    </div>
                    {selectedPatient.address && (
                      <div className="pt-2"><span className="text-[9px] text-slate-455 block font-bold uppercase tracking-wider leading-none">Address</span><strong className="text-slate-800 text-[11px] block mt-1 font-sans">{selectedPatient.address}</strong></div>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Appointments', val: ehrData.appointments.length, icon: '📅', color: 'blue' },
                      { label: 'Records', val: ehrData.records.length, icon: '📋', color: 'emerald' },
                      { label: 'Lab Tests', val: ehrData.labTests.length, icon: '🧪', color: 'violet' },
                      { label: 'Invoices', val: ehrData.invoices.length, icon: '🧾', color: 'amber' },
                    ].map(s => (
                      <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                        <span className="text-xl block">{s.icon}</span>
                        {ehrLoading ? <Loader2 className="h-4 w-4 animate-spin text-rose-400 mx-auto mt-1" /> : <strong className="text-slate-800 text-sm block mt-1">{s.val}</strong>}
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{s.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50/40 border border-blue-200 rounded-2xl p-5 space-y-3">
                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-mono border-b border-blue-200 pb-2">🛡️ Insurance Claims Config</h3>
                    {selectedPatient.insurance_provider ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-[9px] text-blue-450 block font-bold uppercase tracking-wider">Provider</span><strong className="text-slate-800 block mt-0.5">{selectedPatient.insurance_provider}</strong></div>
                        <div><span className="text-[9px] text-blue-450 block font-bold uppercase tracking-wider">Policy/Group Number</span><strong className="text-slate-800 block mt-0.5 font-mono">{selectedPatient.insurance_number}</strong></div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">No active insurance policy linked. Patient registered as self-paying status.</p>
                    )}
                  </div>
                </div>
              )}

              {activeDetailTab === 'appointments' && renderAppointmentsTab()}
              {activeDetailTab === 'records' && renderRecordsTab()}
              {activeDetailTab === 'prescriptions' && renderPrescriptionsTab()}
              {activeDetailTab === 'labtests' && renderLabTab()}
              {activeDetailTab === 'invoices' && renderInvoicesTab()}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button onClick={() => setSelectedPatient(null)} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition cursor-pointer">
                Close EHR Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
