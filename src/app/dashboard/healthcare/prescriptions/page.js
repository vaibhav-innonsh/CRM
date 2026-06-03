'use client';

import { useState, useEffect } from 'react';
import { 
  Heart, 
  Plus, 
  Trash2, 
  Loader2, 
  User, 
  UserCheck, 
  Clock, 
  ClipboardList, 
  Pill,
  Award,
  Sparkles,
  XCircle,
  FileSpreadsheet,
  CheckCircle,
  ChevronRight
} from 'lucide-react';

export default function PrescriptionsPage() {
  // Data States
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Dynamic Medicines Array
  const [medicineLines, setMedicineLines] = useState([
    { name: '', dosage: '', frequency: '', duration: '' }
  ]);

  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    record_id: '',
    instructions: '',
    prescription_date: ''
  });

  // Fetch all related databases
  const fetchData = async () => {
    try {
      const presRes = await fetch('/api/healthcare/prescriptions');
      const patientsRes = await fetch('/api/healthcare/patients');
      const doctorsRes = await fetch('/api/healthcare/doctors');
      const recordsRes = await fetch('/api/healthcare/records');

      if (presRes.ok) {
        const data = await presRes.json();
        setPrescriptions(data.prescriptions || []);
      }
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(data.patients || []);
      }
      if (doctorsRes.ok) {
        const data = await doctorsRes.json();
        setDoctors(data.doctors || []);
      }
      if (recordsRes.ok) {
        const data = await recordsRes.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error('Fetch prescriptions data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Medicine line dynamic fields handler
  const handleMedicineChange = (index, field, value) => {
    setMedicineLines(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Add another medicine line
  const handleAddMedicineLine = () => {
    setMedicineLines(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  // Remove a medicine line
  const handleRemoveMedicineLine = (index) => {
    if (medicineLines.length === 1) return; // Keep at least one line
    setMedicineLines(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Prescription
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    // Filter empty lines
    const activeMedicines = medicineLines.filter(m => m.name.trim() !== '');

    if (activeMedicines.length === 0) {
      setFormError('Please add at least one medicine detail.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/healthcare/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          medicine_details: activeMedicines
        })
      });
      const data = await res.json();

      if (res.ok) {
        setIsFormOpen(false);
        setFormData({
          patient_id: '',
          doctor_id: '',
          record_id: '',
          instructions: '',
          prescription_date: ''
        });
        setMedicineLines([{ name: '', dosage: '', frequency: '', duration: '' }]);
        fetchData();
      } else {
        setFormError(data.error || 'Failed to save e-prescription.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to connect to the server.');
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
            <Heart className="h-5.5 w-5.5 text-rose-500" /> Digital E-Prescriptions Pad
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Generate and print electronic prescriptions, manage patient medicine intake courses and follow-up directions.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-750 text-white text-xs font-black rounded-xl shadow-md shadow-rose-500/15 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Create Prescription
        </button>
      </div>

      {/* Main Prescriptions Listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling digital medicine pads...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          💊 No prescriptions generated yet. Click "Create Prescription" to prescribe medicines.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {prescriptions.map((prx) => (
            <div 
              key={prx.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between gap-4 text-left relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-3.5 border-b border-slate-100 shrink-0">
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">
                    {prx.prescription_number}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold text-slate-500 leading-none">
                    <Clock className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                    <span>Issued: {new Date(prx.prescription_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono block">PATIENT EMR</span>
                  <strong className="text-slate-800 text-xs font-black block mt-0.5">
                    {prx.patient?.first_name} {prx.patient?.last_name}
                  </strong>
                  <span className="text-[8px] font-mono text-slate-400 block mt-0.5">{prx.patient?.patient_id_custom}</span>
                </div>
              </div>

              {/* Medicine Table list */}
              <div className="flex-1 space-y-3.5">
                <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block font-mono">Prescribed Medicine Details</span>
                
                <div className="overflow-x-auto rounded-xl border border-slate-150">
                  <table className="min-w-full divide-y divide-slate-100 text-[11px] font-semibold text-slate-650 leading-none">
                    <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider text-left">
                      <tr>
                        <th className="px-3.5 py-2">Medicine</th>
                        <th className="px-3.5 py-2">Dosage</th>
                        <th className="px-3.5 py-2">Frequency</th>
                        <th className="px-3.5 py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {(prx.medicine_details || []).map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3.5 py-2.5 flex items-center gap-1.5 font-extrabold text-slate-900">
                            <Pill className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            {med.name}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono">{med.dosage}</td>
                          <td className="px-3.5 py-2.5">{med.frequency}</td>
                          <td className="px-3.5 py-2.5 font-bold text-rose-700">{med.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Diagnosis reference link */}
                {prx.record && (
                  <div className="text-[10px] text-slate-500 font-bold bg-slate-50 p-2.5 rounded-lg border flex items-center justify-between">
                    <span>Reference EMR: <strong className="text-slate-800">{prx.record.record_number}</strong> ({prx.record.diagnosis})</span>
                  </div>
                )}

                {/* Instructions */}
                {prx.instructions && (
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">Special Intake Instructions</span>
                    <p className="text-[10px] text-slate-550 mt-1 leading-relaxed whitespace-pre-wrap">{prx.instructions}</p>
                  </div>
                )}
              </div>

              {/* Doctor signature */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 shrink-0">
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                  Prescribed By: <strong>Dr. {prx.doctor?.doctor_name}</strong>
                </span>

                <span className="text-[8px] uppercase tracking-wider text-slate-400">
                  {prx.doctor?.specialization} • {prx.doctor?.department}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── CREATE PRESCRIPTION MODAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Heart className="h-4.5 w-4.5 text-rose-500" />
                  Generate E-Prescription
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Generate digital medicine charts, intake frequencies, dosage details and duration guides.
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
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Prescribing Doctor *</label>
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
                        Dr. {d.doctor_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Diagnostic Record */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Link EMR Diagnosis</label>
                  <select
                    name="record_id"
                    value={formData.record_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer"
                  >
                    <option value="">-- Optional --</option>
                    {records.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.record_number} ({r.diagnosis})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prescription Date */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Prescription Issue Date *</label>
                <input
                  type="date"
                  required
                  name="prescription_date"
                  value={formData.prescription_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                />
              </div>

              {/* DYNAMIC MEDICINE LINES FORM SECTION */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block font-mono">Medicine details list *</span>
                  <button
                    type="button"
                    onClick={handleAddMedicineLine}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] rounded-lg cursor-pointer flex items-center gap-1 transition"
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                    Add Medicine Row
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {medicineLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 bg-slate-50 border rounded-xl relative">
                      {/* Name */}
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Medicine Name</label>
                        <input
                          type="text"
                          required
                          value={line.name}
                          onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                          placeholder="e.g. Paracetamol"
                          className="w-full text-[11px] px-2 py-1.5 border rounded-lg bg-white focus:outline-none focus:border-rose-400 transition"
                        />
                      </div>

                      {/* Dosage */}
                      <div className="sm:col-span-2">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Dosage</label>
                        <input
                          type="text"
                          required
                          value={line.dosage}
                          onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                          placeholder="500mg"
                          className="w-full text-[11px] px-2 py-1.5 border rounded-lg bg-white focus:outline-none focus:border-rose-400 transition"
                        />
                      </div>

                      {/* Frequency */}
                      <div className="sm:col-span-3">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Frequency</label>
                        <input
                          type="text"
                          required
                          value={line.frequency}
                          onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                          placeholder="2 Times Daily"
                          className="w-full text-[11px] px-2 py-1.5 border rounded-lg bg-white focus:outline-none focus:border-rose-400 transition"
                        />
                      </div>

                      {/* Duration */}
                      <div className="sm:col-span-2">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Duration</label>
                        <input
                          type="text"
                          required
                          value={line.duration}
                          onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                          placeholder="5 Days"
                          className="w-full text-[11px] px-2 py-1.5 border rounded-lg bg-white focus:outline-none focus:border-rose-400 transition"
                        />
                      </div>

                      {/* Remove button */}
                      <div className="sm:col-span-1 flex justify-end pb-0.5">
                        <button
                          type="button"
                          disabled={medicineLines.length === 1}
                          onClick={() => handleRemoveMedicineLine(index)}
                          className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-lg cursor-pointer transition disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Special Intake Instructions</label>
                <textarea
                  name="instructions"
                  rows="2"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  placeholder="e.g. Take medicine after food. Drink plenty of water..."
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
                      Generating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Confirm &amp; Generate Prescription
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
