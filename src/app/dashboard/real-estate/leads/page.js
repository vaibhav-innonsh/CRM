'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Loader2, Phone, Mail, Clock, Sparkles, ChevronRight,
  Edit, Trash2, CheckCircle, HelpCircle, Filter, X, PlusCircle, Paperclip,
  Trash, Download, Award, Building, User, Calendar
} from 'lucide-react';

export default function RELeadsPage() {
  const [leads, setLeads] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ text: '', type: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [repFilter, setRepFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Detail panel & Form Modals
  const [selectedLead, setSelectedLead] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Note and Attachment inputs
  const [newNoteText, setNewNoteText] = useState('');
  const fileInputRef = useRef(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    designation: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    city: '',
    state: '',
    country: 'India',
    industry: '',
    priority: 'Warm',
    status: 'New',
    lostReason: '',
    source: 'Website',
    requirements: '',
    interestedProduct: '',
    followUpType: 'None',
    nextFollowUpDate: '',
    assignedTo: ''
  });

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 4000);
  };

  const fetchLeads = async () => {
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (statusFilter !== 'All') q.append('status', statusFilter);
      if (priorityFilter !== 'All') q.append('priority', priorityFilter);
      if (sourceFilter !== 'All') q.append('source', sourceFilter);
      if (repFilter !== 'All') q.append('assignedTo', repFilter);
      q.append('sortBy', sortBy);

      const res = await fetch(`/api/real-estate/leads?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Fetch RE leads failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReps = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setSalesReps(data.users || []);
      }
    } catch (err) {
      console.error('Fetch sales reps failed:', err);
    }
  };

  useEffect(() => {
    fetchReps();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter, priorityFilter, sourceFilter, repFilter, sortBy]);

  const handleSelectLead = async (id) => {
    try {
      const res = await fetch(`/api/real-estate/leads/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data.lead);
      }
    } catch (err) {
      console.error('Fetch lead detail failed:', err);
    }
  };

  const handleFormInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/real-estate/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        resetForm();
        fetchLeads();
        showToast('🎉 Real estate lead registered successfully!');
      } else {
        setFormError(data.error || 'Failed to create lead.');
      }
    } catch (err) {
      setFormError('Failed to connect to the server.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (lead) => {
    setFormData({
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      company: lead.company || '',
      designation: lead.designation || '',
      email: lead.email || '',
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || '',
      website: lead.website || '',
      city: lead.city || '',
      state: lead.state || '',
      country: lead.country || 'India',
      industry: lead.industry || '',
      priority: lead.priority || 'Warm',
      status: lead.status || 'New',
      lostReason: lead.lostReason || '',
      source: lead.source || 'Website',
      requirements: lead.requirements || '',
      interestedProduct: lead.interestedProduct || '',
      followUpType: lead.followUpType || 'None',
      nextFollowUpDate: lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString().slice(0, 16) : '',
      assignedTo: lead.assignedTo?.id || lead.assignedTo || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError('');
    try {
      const res = await fetch(`/api/real-estate/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        setSelectedLead(data.lead);
        fetchLeads();
        showToast('📝 Lead details updated successfully!');
      } else {
        setFormError(data.error || 'Failed to update lead.');
      }
    } catch (err) {
      setFormError('Failed to connect to the server.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this lead inquiry?')) return;
    try {
      const res = await fetch(`/api/real-estate/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedLead(null);
        fetchLeads();
        showToast('🗑️ Lead deleted successfully.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete lead.');
      }
    } catch (err) {
      console.error('Delete lead error:', err);
    }
  };

  const handleConvert = async () => {
    if (!window.confirm(`Convert "${selectedLead.firstName} ${selectedLead.lastName || ''}" to a permanent customer Contact record?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/real-estate/leads/${selectedLead.id}/convert`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('🏢 Lead successfully converted to Contact!');
        handleSelectLead(selectedLead.id);
        fetchLeads();
      } else {
        alert(data.error || 'Failed to convert lead.');
      }
    } catch (err) {
      console.error('Convert lead error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/real-estate/leads/${selectedLead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNoteText })
      });
      if (res.ok) {
        setNewNoteText('');
        handleSelectLead(selectedLead.id);
        fetchLeads();
      }
    } catch (err) {
      console.error('Add note failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedLead) return;

    setActionLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      try {
        const res = await fetch(`/api/real-estate/leads/${selectedLead.id}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64Data,
            fileType: file.type,
            fileSize: file.size
          })
        });
        if (res.ok) {
          handleSelectLead(selectedLead.id);
          fetchLeads();
          showToast('📁 Attachment uploaded successfully!');
        } else {
          const data = await res.json();
          showToast(data.error || 'Failed to upload attachment.', 'error');
        }
      } catch (err) {
        showToast('Network error uploading attachment.', 'error');
      } finally {
        setActionLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAttachment = async (attachmentId) => {
    if (!window.confirm('Remove this attachment?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/real-estate/leads/${selectedLead.id}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        handleSelectLead(selectedLead.id);
        fetchLeads();
        showToast('🗑️ Attachment removed.');
      }
    } catch (err) {
      console.error('Remove attachment error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      company: '',
      designation: '',
      email: '',
      phone: '',
      whatsapp: '',
      website: '',
      city: '',
      state: '',
      country: 'India',
      industry: '',
      priority: 'Warm',
      status: 'New',
      lostReason: '',
      source: 'Website',
      requirements: '',
      interestedProduct: '',
      followUpType: 'None',
      nextFollowUpDate: '',
      assignedTo: ''
    });
    setFormError('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'Contacted': return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'Qualified': return 'bg-amber-50 border-amber-250 text-amber-800';
      case 'Converted': return 'bg-teal-50 border-teal-200 text-teal-700';
      case 'Lost': return 'bg-rose-50 border-rose-200 text-rose-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'Hot': return 'bg-rose-50 text-rose-750 border border-rose-200';
      case 'Warm': return 'bg-amber-50 text-amber-750 border border-amber-200';
      default: return 'bg-blue-50 text-blue-750 border border-blue-200';
    }
  };

  return (
    <div className="space-y-6 text-left font-sans select-none relative">
      {/* Toast Alert */}
      {toast.text && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-black border animate-in slide-in-from-top-4 duration-250 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-250 text-rose-700' : 'bg-emerald-50 border-emerald-250 text-emerald-700'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-amber-500" />
            Real Estate Leads
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Manage real estate buyers, matching inquiries, track properties & convert leads to customer profile records.
          </p>
        </div>

        <button onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] transition cursor-pointer">
          <Plus className="h-4 w-4" /> Add Property Lead
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input type="text" placeholder="Search by name, company, city, requirements..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-xs text-slate-850 transition" />
        </div>
        
        <div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-xs text-slate-800 transition">
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Converted">Converted</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

        <div>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-xs text-slate-800 transition">
            <option value="All">All Priorities</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
        </div>

        <div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-xs text-slate-800 transition">
            <option value="newest">Newest First</option>
            <option value="latest_communication">Latest Activity</option>
          </select>
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling property inquiries...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          🏢 No real estate leads registered yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {leads.map((lead) => (
            <div key={lead.id} onClick={() => handleSelectLead(lead.id)}
              className="bg-white border border-slate-200 hover:border-amber-250 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group cursor-pointer relative text-left">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${getPriorityBadge(lead.priority)}`}>
                    {lead.priority}
                  </span>
                  {lead.interestedProduct && (
                    <span className="text-[9px] font-bold text-amber-600 truncate max-w-[120px]">{lead.interestedProduct}</span>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-black text-slate-800 tracking-tight leading-tight group-hover:text-amber-650 transition">
                    {lead.firstName} {lead.lastName || ''}
                  </h3>
                  {lead.company && <span className="text-[10px] font-bold text-slate-450 block mt-0.5">{lead.company}</span>}
                </div>

                <div className="space-y-1.5 text-[10px] font-semibold text-slate-500 leading-none">
                  {lead.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400 shrink-0" /><span>{lead.phone}</span></div>}
                  {lead.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400 shrink-0" /><span className="truncate">{lead.email}</span></div>}
                  {lead.city && <div className="flex items-center gap-1.5"><Building className="h-3 w-3 text-slate-400 shrink-0" /><span>{lead.city}</span></div>}
                </div>

                {lead.requirements && (
                  <p className="text-[10px] text-slate-400 font-medium italic truncate bg-slate-50 p-2 rounded-lg">"{lead.requirements}"</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-black">
                <span className={`px-2.5 py-0.5 rounded-full border text-[8px] uppercase tracking-wider font-extrabold ${getStatusBadge(lead.status)}`}>
                  {lead.status === 'Converted' ? '✅ Converted' : lead.status}
                </span>
                <span className="text-slate-700 group-hover:text-amber-600 transition flex items-center gap-0.5">Timeline <ChevronRight className="h-3 w-3" /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD LEAD MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><PlusCircle className="h-4.5 w-4.5 text-amber-500" /> Register Real Estate Lead</h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">Add a new property inquiry or prospective buyer.</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition border-0 bg-transparent"><X className="h-5.5 w-5.5" /></button>
            </div>
            {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">⚠️ {formError}</div>}
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">First Name *</label>
                  <input type="text" required name="firstName" value={formData.firstName} onChange={handleFormInputChange} placeholder="e.g. Rahul"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleFormInputChange} placeholder="e.g. Kumar"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Mobile Number *</label>
                  <input type="tel" required name="phone" value={formData.phone} onChange={handleFormInputChange} placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleFormInputChange} placeholder="e.g. rahul@example.com"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Company / Brokerage</label>
                  <input type="text" name="company" value={formData.company} onChange={handleFormInputChange} placeholder="e.g. Self or Agency name"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Interested Property Type</label>
                  <input type="text" name="interestedProduct" value={formData.interestedProduct} onChange={handleFormInputChange} placeholder="e.g. 3 BHK Apartment"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleFormInputChange} placeholder="e.g. Pune"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Lead Source</label>
                  <select name="source" value={formData.source} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition">
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition">
                    <option value="Hot">Hot (Ready Buyer)</option>
                    <option value="Warm">Warm (Interested)</option>
                    <option value="Cold">Cold (Just checking)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Follow-up Schedule</label>
                  <input type="datetime-local" name="nextFollowUpDate" value={formData.nextFollowUpDate} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition font-sans" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Requirements & Budget Details</label>
                <textarea name="requirements" rows="3" value={formData.requirements} onChange={handleFormInputChange} placeholder="Specific area preferences, budget size, parking demands..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition resize-none font-sans" />
              </div>
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT LEAD MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><Edit className="h-4.5 w-4.5 text-amber-500" /> Edit Lead Details</h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">Modify registered real estate lead details.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition border-0 bg-transparent"><X className="h-5.5 w-5.5" /></button>
            </div>
            {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">⚠️ {formError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">First Name *</label>
                  <input type="text" required name="firstName" value={formData.firstName} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Phone</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Company</label>
                  <input type="text" name="company" value={formData.company} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Status</label>
                  <select name="status" value={formData.status} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition">
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition">
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Follow-up Schedule</label>
                  <input type="datetime-local" name="nextFollowUpDate" value={formData.nextFollowUpDate} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition font-sans" />
                </div>
              </div>
              {formData.status === 'Lost' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Lost Reason *</label>
                  <input type="text" required name="lostReason" value={formData.lostReason} onChange={handleFormInputChange} placeholder="e.g. Out of Budget, Changed Location"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition" />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Requirements</label>
                <textarea name="requirements" rows="3" value={formData.requirements} onChange={handleFormInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition resize-none font-sans" />
              </div>
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Edit className="h-3.5 w-3.5" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAIL SLIDE-OVER DRAWER --- */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="flex-1" onClick={() => setSelectedLead(null)}></div>
          <div className="w-full max-w-xl bg-white border-l border-slate-250 shadow-2xl h-full flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-250 text-left">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-start shrink-0">
              <div className="space-y-2">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black font-mono shadow-sm">
                  🏠 PROPERTY PROSPECT
                </span>
                <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">
                  {selectedLead.firstName} {selectedLead.lastName || ''}
                </h2>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full border text-[8px] uppercase tracking-wider font-extrabold ${getStatusBadge(selectedLead.status)}`}>
                  {selectedLead.status}
                </span>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200 rounded-lg cursor-pointer transition border-0 bg-transparent">
                <X className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans text-xs font-semibold leading-relaxed text-slate-700">
              {/* Demographics Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono border-b pb-2">Profile Register</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Phone Number</span>
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{selectedLead.phone || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Email Address</span>
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedLead.email || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Lead Source</span>
                    <span>{selectedLead.source}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Budget Preference</span>
                    <span className="text-amber-600 font-extrabold">{selectedLead.interestedProduct || 'General Property'}</span>
                  </div>
                </div>
              </div>

              {/* Requirements & Budget Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono border-b pb-2">Requirements</h3>
                <p className="bg-white border border-slate-150 p-3 rounded-xl min-h-[60px] text-slate-600 italic">
                  {selectedLead.requirements || 'No specific budget or location preferences logged.'}
                </p>
              </div>

              {/* Follow-up Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono border-b pb-2">Follow-up Schedule</h3>
                <div className="flex items-center gap-2 text-slate-850">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{selectedLead.nextFollowUpDate ? new Date(selectedLead.nextFollowUpDate).toLocaleString() : 'No call reminder set.'}</span>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">KYC & Document Vault</h3>
                  <button onClick={() => fileInputRef.current.click()}
                    className="flex items-center gap-1 text-[9px] font-black text-amber-600 hover:text-amber-700">
                    <Paperclip className="h-3 w-3" /> Upload File
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleUploadAttachment} className="hidden" />
                </div>
                
                {selectedLead.attachments && selectedLead.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedLead.attachments.map(a => (
                      <div key={a.id} className="flex justify-between items-center p-2.5 bg-white border border-slate-200 rounded-xl text-[10px]">
                        <span className="font-extrabold truncate max-w-[180px] text-slate-700">{a.fileName}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a href={a.fileData} download={a.fileName} className="p-1 text-slate-400 hover:text-slate-600">
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          <button onClick={() => handleRemoveAttachment(a.id)} className="p-1 text-rose-400 hover:text-rose-600 border-0 bg-transparent cursor-pointer">
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">
                    No documents uploaded yet.
                  </div>
                )}
              </div>

              {/* Timeline Notes */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono border-b pb-2">Interaction Timeline</h3>
                
                {/* Notes list */}
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {selectedLead.notes && selectedLead.notes.length > 0 ? (
                    selectedLead.notes.map(n => (
                      <div key={n.id} className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                        <p className="text-[10px] text-slate-600 font-semibold">{n.text}</p>
                        <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold">
                          <span>By {n.createdByName}</span>
                          <span>{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-slate-400 italic text-center py-4 bg-white rounded-xl">
                      No interaction logs recorded.
                    </div>
                  )}
                </div>

                {/* Add note form */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input type="text" placeholder="Add follow-up notes..." value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-[10px] text-slate-800 transition" />
                  <button type="submit" disabled={actionLoading}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black rounded-xl transition cursor-pointer">
                    Log Activity
                  </button>
                </form>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button onClick={() => handleDelete(selectedLead.id)}
                className="p-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 text-rose-500 hover:text-rose-600 transition cursor-pointer"
                title="Delete Lead Inquiry">
                <Trash2 className="h-4.5 w-4.5" />
              </button>

              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenEdit(selectedLead)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                  <Edit className="h-3.5 w-3.5" /> Edit Details
                </button>

                {selectedLead.status !== 'Converted' ? (
                  <button onClick={handleConvert} disabled={actionLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] transition cursor-pointer">
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />} Convert to Contact
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-50 border border-teal-200 rounded-xl text-xs font-black text-teal-700 uppercase">
                    <CheckCircle className="h-4 w-4 text-teal-650" /> Converted Contact
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
