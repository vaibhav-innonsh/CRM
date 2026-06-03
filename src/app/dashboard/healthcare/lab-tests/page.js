'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Plus, 
  Search, 
  Loader2, 
  User, 
  UserCheck, 
  Clock, 
  FlaskConical, 
  Sparkles, 
  XCircle,
  CheckCircle,
  TrendingUp,
  FileSpreadsheet,
  Upload
} from 'lucide-react';

export default function LabTestsPage() {
  const [labTests, setLabTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');

  // New Request Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    patient_id: '', doctor_id: '', test_type: '', lab_technician: '', test_date: '', status: 'Scheduled'
  });

  // Result Upload Modal
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [selectedTestForResult, setSelectedTestForResult] = useState(null);
  const [resultText, setResultText] = useState('');
  const [resultLoading, setResultLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [labRes, patientsRes, doctorsRes] = await Promise.all([
        fetch(`/api/healthcare/lab-tests?status=${statusFilter}`),
        fetch('/api/healthcare/patients'),
        fetch('/api/healthcare/doctors')
      ]);
      if (labRes.ok) setLabTests((await labRes.json()).labTests || []);
      if (patientsRes.ok) setPatients((await patientsRes.json()).patients || []);
      if (doctorsRes.ok) setDoctors((await doctorsRes.json()).doctors || []);
    } catch (err) {
      console.error('Fetch lab tests failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/healthcare/lab-tests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsFormOpen(false);
        setFormData({ patient_id: '', doctor_id: '', test_type: '', lab_technician: '', test_date: '', status: 'Scheduled' });
        fetchData();
      } else {
        setFormError(data.error || 'Failed to save lab test.');
      }
    } catch (err) { setFormError('Failed to connect.'); }
    finally { setFormLoading(false); }
  };

  const handleUpdateStatus = async (testId, newStatus) => {
    setActionLoading(testId);
    try {
      await fetch('/api/healthcare/lab-tests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, status: newStatus })
      });
      fetchData();
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const openResultModal = (test) => {
    setSelectedTestForResult(test);
    setResultText(test.result || '');
    setIsResultOpen(true);
  };

  const handleResultSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTestForResult) return;
    setResultLoading(true);
    try {
      const res = await fetch('/api/healthcare/lab-tests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: selectedTestForResult.id, status: 'Completed', result: resultText })
      });
      if (res.ok) {
        setIsResultOpen(false);
        setSelectedTestForResult(null);
        fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setResultLoading(false); }
  };

  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'Scheduled': return 'bg-violet-50 border-violet-200 text-violet-700 font-bold';
      case 'Pending': return 'bg-amber-50 border-amber-250 text-amber-700 font-bold';
      case 'In Progress': return 'bg-blue-50 border-blue-200 text-blue-700 font-bold';
      case 'Completed': return 'bg-emerald-50 border-emerald-250 text-emerald-700 font-black';
      default: return 'bg-slate-50 border text-slate-700';
    }
  };

  return (
    <div className="space-y-6 text-left relative select-none">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="h-5.5 w-5.5 text-rose-500" /> Lab Diagnostics Centre
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Request medical laboratory tests, track diagnostic queues, and upload pathology test results reports.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-750 text-white text-xs font-black rounded-xl shadow-md shadow-rose-500/15 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Request Lab Test
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          >
            <option value="All">All Diagnostics Status</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="md:col-span-2 flex items-center justify-end px-2 text-slate-500 font-bold text-[11px]">
          📊 {labTests.length} Total Laboratory Tasks Active
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling lab diagnostics queue...</p>
        </div>
      ) : labTests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          🧪 No laboratory diagnostic requests logged matching filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
          {labTests.map((lab) => (
            <div
              key={lab.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 shrink-0">
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">{lab.test_number}</span>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] font-semibold text-slate-500 leading-none">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Test Date: {new Date(lab.test_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-wider ${getStatusBadgeStyles(lab.status)}`}>
                  {lab.status}
                </span>
              </div>

              {/* Body */}
              <div className="space-y-3 flex-1 font-semibold text-xs leading-none">
                <div className="p-3.5 bg-slate-50 border rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono block">TEST TYPE</span>
                      <strong className="text-slate-800 text-xs block mt-0.5 leading-tight">{lab.test_type}</strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-[10px] text-slate-500">
                  <p>Patient: <strong className="text-slate-800 font-extrabold">{lab.patient?.first_name} {lab.patient?.last_name}</strong> ({lab.patient?.patient_id_custom})</p>
                  <p>Prescribed by: <strong className="text-slate-850">Dr. {lab.doctor?.doctor_name}</strong></p>
                  {lab.lab_technician && <p className="border-t pt-2 mt-1.5">Technician: <strong>{lab.lab_technician}</strong></p>}
                </div>

                {/* Result box — shows if completed */}
                {lab.result && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] text-emerald-800 font-semibold">
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider block mb-1">📋 Lab Result</span>
                    {lab.result}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 space-y-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">Status:</span>
                  <select
                    disabled={actionLoading === lab.id}
                    value={lab.status}
                    onChange={(e) => handleUpdateStatus(lab.id, e.target.value)}
                    className="flex-1 text-[9px] font-black px-2 py-1 bg-slate-50 border rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                  {actionLoading === lab.id && <Loader2 className="h-4 w-4 animate-spin text-rose-500 shrink-0" />}
                </div>

                {/* Upload Result button */}
                {lab.status !== 'Scheduled' && (
                  <button
                    onClick={() => openResultModal(lab)}
                    className="w-full py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg text-center cursor-pointer transition flex items-center justify-center gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    {lab.result ? 'Edit Result' : 'Upload Result'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── REQUEST LAB TEST MODAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <FlaskConical className="h-4.5 w-4.5 text-rose-500" /> Request Laboratory Test
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">Assign diagnostic tests to registered patients and doctors.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">⚠️ {formError}</div>}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Select Patient *</label>
                <select required name="patient_id" value={formData.patient_id} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer">
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_id_custom})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Prescribing Doctor *</label>
                <select required name="doctor_id" value={formData.doctor_id} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer">
                  <option value="">-- Choose Consultant Doctor --</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.doctor_name} ({d.specialization})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Diagnostic Test Date *</label>
                  <input type="date" required name="test_date" value={formData.test_date} onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Initial Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer">
                    <option value="Scheduled">Scheduled</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Test Type / Pathology *</label>
                <input type="text" required name="test_type" value={formData.test_type} onChange={handleInputChange}
                  placeholder="e.g. CBC Blood Panel, Chest X-Ray, MRI Brain Contrast"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Assigned Lab Technician</label>
                <input type="text" name="lab_technician" value={formData.lab_technician} onChange={handleInputChange}
                  placeholder="e.g. Mr. Anil Kulkarni"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
              </div>

              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {formLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : <><CheckCircle className="h-3.5 w-3.5" /> Request Diagnostics Task</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UPLOAD LAB RESULT MODAL ── */}
      {isResultOpen && selectedTestForResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald-500/5 blur-[50px] pointer-events-none"></div>
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  📋 Upload Lab Report Result
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Enter diagnostic findings for <strong className="text-slate-800">{selectedTestForResult.test_type}</strong> — {selectedTestForResult.patient?.first_name}.
                </p>
              </div>
              <button onClick={() => setIsResultOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResultSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Report Result / Findings *</label>
                <textarea
                  required
                  rows="5"
                  value={resultText}
                  onChange={(e) => setResultText(e.target.value)}
                  placeholder="e.g. No Major Abnormality Detected. No acute intracranial process..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 transition resize-none text-slate-800"
                />
              </div>
              <p className="text-[9px] text-slate-400 font-bold">⚡ This will also mark the test status as Completed.</p>

              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsResultOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={resultLoading}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5">
                  {resultLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '✅ Save Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
