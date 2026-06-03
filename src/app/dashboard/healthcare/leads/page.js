'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Plus, UserPlus, Loader2, FileText, XCircle, Phone, Mail, Clock, 
  Sparkles, ChevronRight, Edit, Trash2, CheckCircle, HelpCircle, Filter
} from 'lucide-react';

export default function HealthcareLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selectedLead, setSelectedLead] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    email: '',
    source: 'Website',
    interested_service: '',
    symptoms: '',
    assigned_to: ''
  });

  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    email: '',
    source: 'Website',
    interested_service: '',
    symptoms: '',
    status: 'New'
  });

  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/healthcare/leads?search=${searchQuery}&status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Fetch healthcare leads failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchQuery, statusFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/healthcare/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsFormOpen(false);
        setFormData({
          first_name: '',
          last_name: '',
          mobile: '',
          email: '',
          source: 'Website',
          interested_service: '',
          symptoms: '',
          assigned_to: ''
        });
        fetchLeads();
      } else {
        setFormError(data.error || 'Failed to create patient prospect.');
      }
    } catch (err) {
      setFormError('Failed to connect to the server.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenEditForm = (lead) => {
    setEditFormData({
      first_name: lead.first_name,
      last_name: lead.last_name || '',
      mobile: lead.mobile,
      email: lead.email || '',
      source: lead.source || 'Website',
      interested_service: lead.interested_service || '',
      symptoms: lead.symptoms || '',
      status: lead.status || 'New'
    });
    setIsEditFormOpen(true);
  };

  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch(`/api/healthcare/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditFormOpen(false);
        setSelectedLead(data.lead);
        fetchLeads();
      } else {
        setFormError(data.error || 'Failed to update patient prospect.');
      }
    } catch (err) {
      setFormError('Failed to connect to the server.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await fetch(`/api/healthcare/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data.lead);
        fetchLeads();
      }
    } catch (err) {
      console.error('Update status failed:', err);
    }
  };

  const handleConvertToPatient = async () => {
    if (!window.confirm(`Convert "${selectedLead.first_name} ${selectedLead.last_name || ''}" to a Clinical Patient record?`)) return;
    setConvertLoading(true);
    try {
      const res = await fetch(`/api/healthcare/leads/${selectedLead.id}/convert`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        alert('🏥 Patient successfully registered in clinical catalog!');
        // Refresh detail view
        const refreshedLead = { ...selectedLead, status: 'Converted' };
        setSelectedLead(refreshedLead);
        fetchLeads();
      } else {
        alert(data.error || 'Failed to convert prospect.');
      }
    } catch (err) {
      console.error('Conversion failed:', err);
      alert('Failed to connect to server.');
    } finally {
      setConvertLoading(false);
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient prospect inquiry?')) return;
    try {
      const res = await fetch(`/api/healthcare/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedLead(null);
        fetchLeads();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete record.');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'Contacted':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'Qualified':
        return 'bg-amber-50 border-amber-250 text-amber-800';
      case 'Converted':
        return 'bg-teal-50 border-teal-200 text-teal-700';
      case 'Lost':
        return 'bg-rose-50 border-rose-200 text-rose-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-rose-500" />
            Patient Prospects (Inquiries)
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage incoming hospital inquiries, follow up calls, and register prospects as clinical patients.
          </p>
        </div>

        <button onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-rose-500/20 active:scale-[0.98] transition-all cursor-pointer">
          <Plus className="h-4 w-4" />
          Add Patient Prospect
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input type="text" placeholder="Search by name, mobile, email, symptoms..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 text-xs text-slate-800 transition" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 text-xs text-slate-800 transition">
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Converted">Converted (Registered)</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Leads Catalog Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling incoming prospects...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          🏥 No patient prospect inquiries found matching filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {leads.map((lead) => (
            <div key={lead.id} onClick={() => setSelectedLead(lead)}
              className="bg-white border border-slate-200 hover:border-rose-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group cursor-pointer relative text-left">
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">{lead.lead_id_custom}</span>
                  <h3 className="text-xs font-black text-slate-800 tracking-tight leading-tight group-hover:text-rose-650 transition">
                    {lead.first_name} {lead.last_name || ''}
                  </h3>
                </div>

                <div className="space-y-1.5 text-[10px] font-semibold text-slate-500 leading-none">
                  <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400 shrink-0" /><span>{lead.mobile}</span></div>
                  {lead.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400 shrink-0" /><span className="truncate">{lead.email}</span></div>}
                  {lead.interested_service && <div className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-slate-400 shrink-0" /><span className="truncate text-rose-600 font-extrabold">{lead.interested_service}</span></div>}
                </div>

                {lead.symptoms && (
                  <p className="text-[10px] text-slate-400 font-medium italic truncate bg-slate-50 p-2 rounded-lg">"{lead.symptoms}"</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-black">
                <span className={`px-2.5 py-0.5 rounded-full border text-[8px] uppercase tracking-wider font-extrabold ${getStatusBadge(lead.status)}`}>
                  {lead.status === 'Converted' ? '✅ Converted' : lead.status}
                </span>
                <span className="text-slate-700 group-hover:text-rose-600 transition flex items-center gap-0.5">Details <ChevronRight className="h-3 w-3" /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD PROSPECT MODAL --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><UserPlus className="h-4.5 w-4.5 text-rose-500" /> Add Patient Prospect</h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">Log a new incoming clinical lead or web inquiry.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition border-0 bg-transparent"><XCircle className="h-5.5 w-5.5" /></button>
            </div>
            {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">⚠️ {formError}</div>}
            <form onSubmit={handleFormSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">First Name *</label>
                  <input type="text" required name="first_name" value={formData.first_name} onChange={handleInputChange} placeholder="e.g. Neha"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} placeholder="e.g. Patil"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Mobile Number *</label>
                  <input type="tel" required name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="e.g. neha@gmail.com"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Interested Service / Specialization</label>
                  <input type="text" name="interested_service" value={formData.interested_service} onChange={handleInputChange} placeholder="e.g. Neurology Consultation"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Lead Source</label>
                  <select name="source" value={formData.source} onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition">
                    <option value="Website">Website Form</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Walk-In">Walk-In Inquiry</option>
                    <option value="Referral">Doctor Referral</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Symptoms & Inquirer Notes</label>
                <textarea name="symptoms" rows="3" value={formData.symptoms} onChange={handleInputChange} placeholder="Patient's primary complaints, symptoms, duration..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition resize-none font-sans" />
              </div>
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {formLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Save Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT PROSPECT MODAL --- */}
      {isEditFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><Edit className="h-4.5 w-4.5 text-rose-500" /> Edit Details</h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">Modify patient prospect registration details.</p>
              </div>
              <button onClick={() => setIsEditFormOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition border-0 bg-transparent"><XCircle className="h-5.5 w-5.5" /></button>
            </div>
            {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">⚠️ {formError}</div>}
            <form onSubmit={handleEditFormSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">First Name *</label>
                  <input type="text" required name="first_name" value={editFormData.first_name} onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                  <input type="text" name="last_name" value={editFormData.last_name} onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Mobile Number *</label>
                  <input type="tel" required name="mobile" value={editFormData.mobile} onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input type="email" name="email" value={editFormData.email} onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Interested Service / Specialization</label>
                  <input type="text" name="interested_service" value={editFormData.interested_service} onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Lead Source</label>
                  <select name="source" value={editFormData.source} onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition">
                    <option value="Website">Website Form</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Walk-In">Walk-In Inquiry</option>
                    <option value="Referral">Doctor Referral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Status</label>
                  <select name="status" value={editFormData.status} onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition">
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Symptoms & Inquirer Notes</label>
                <textarea name="symptoms" rows="3" value={editFormData.symptoms} onChange={handleEditInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition resize-none font-sans" />
              </div>
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditFormOpen(false)} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {formLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Edit className="h-3.5 w-3.5" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAIL SLIDE-OVER DRAWER --- */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200 select-none">
          <div className="flex-1" onClick={() => setSelectedLead(null)}></div>
          <div className="w-full max-w-xl bg-white border-l border-slate-250 shadow-2xl h-full flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-250 text-left">
            
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-start shrink-0 relative overflow-hidden">
              <div className="space-y-2">
                <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black font-mono shadow-sm">
                  🏥 PROSPECT: {selectedLead.lead_id_custom}
                </span>
                <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">
                  {selectedLead.first_name} {selectedLead.last_name || ''}
                </h2>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full border text-[8px] uppercase tracking-wider font-extrabold ${getStatusBadge(selectedLead.status)}`}>
                  {selectedLead.status}
                </span>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200 rounded-lg cursor-pointer transition border-0 bg-transparent">
                <XCircle className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 font-sans text-xs font-semibold leading-relaxed text-slate-700">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono border-b pb-2">Demographic & Lead Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Mobile</span>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{selectedLead.mobile}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Email Address</span>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedLead.email || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Source</span>
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{selectedLead.source || 'Website'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Interested Service</span>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-rose-600 font-extrabold">{selectedLead.interested_service || 'General OPD'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Symptoms / Complaints notes */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono border-b pb-2">Reported Symptoms & Notes</h3>
                <p className="bg-white border border-slate-150 p-3 rounded-xl min-h-[80px] text-slate-600 italic">
                  {selectedLead.symptoms || 'No symptoms or special complaints logged for this prospect inquiry.'}
                </p>
              </div>

              {/* Status Update Controls */}
              {selectedLead.status !== 'Converted' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono border-b pb-2">Update Stage</h3>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['New', 'Contacted', 'Qualified', 'Lost'].map(s => (
                      <button key={s} onClick={() => handleStatusChange(s)}
                        className={`px-3 py-1.5 rounded-xl border text-[9px] font-bold transition-all cursor-pointer ${selectedLead.status === s ? getStatusBadge(s) + ' border-slate-400 scale-[1.03]' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button onClick={() => handleDeleteLead(selectedLead.id)}
                className="p-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 text-rose-500 hover:text-rose-600 transition cursor-pointer flex items-center justify-center"
                title="Delete Prospect Record">
                <Trash2 className="h-4.5 w-4.5" />
              </button>

              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenEditForm(selectedLead)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border border-transparent">
                  <Edit className="h-3.5 w-3.5" />
                  Edit details
                </button>

                {selectedLead.status !== 'Converted' ? (
                  <button onClick={handleConvertToPatient} disabled={convertLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-rose-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50">
                    {convertLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Convert to Patient
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-50 border border-teal-200 rounded-xl text-xs font-black text-teal-700 uppercase">
                    <CheckCircle className="h-4 w-4 text-teal-650" />
                    Converted to Patient
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
