'use client';

import { useState, useEffect } from 'react';
import {
  Search, Plus, Loader2, Phone, Mail, Sparkles, ChevronRight,
  Edit, Trash2, CheckCircle, Filter, X, PlusCircle, Building, User, Info
} from 'lucide-react';

export default function REContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ text: '', type: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [repFilter, setRepFilter] = useState('All');

  // Detail panel & Form Modals
  const [selectedContact, setSelectedContact] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    designation: '',
    email: '',
    phone: '',
    whatsapp: '',
    city: '',
    state: '',
    country: 'India',
    assignedTo: '',
    status: 'Active'
  });

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 4000);
  };

  const fetchContacts = async () => {
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (statusFilter !== 'All') q.append('status', statusFilter);
      if (repFilter !== 'All') q.append('assignedTo', repFilter);

      const res = await fetch(`/api/real-estate/contacts?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('Fetch RE contacts failed:', err);
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
    fetchContacts();
  }, [search, statusFilter, repFilter]);

  const handleSelectContact = async (id) => {
    try {
      const res = await fetch(`/api/real-estate/contacts/${id}`);
      // Wait, there is no GET endpoint for individual contact detail if we didn't define it,
      // but in our API routes we defined PUT and DELETE. So we can just set selectedContact from local contacts array!
      // This is simpler and avoids unnecessary API calls.
      const found = contacts.find(c => c.id === id);
      if (found) {
        setSelectedContact(found);
      }
    } catch (err) {
      console.error('Select contact failed:', err);
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
      const res = await fetch('/api/real-estate/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        resetForm();
        fetchContacts();
        showToast('🎉 Customer contact registered successfully!');
      } else {
        setFormError(data.error || 'Failed to create contact.');
      }
    } catch (err) {
      setFormError('Failed to connect to the server.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (contact) => {
    setFormData({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      company: contact.company || '',
      designation: contact.designation || '',
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      city: contact.city || '',
      state: contact.state || '',
      country: contact.country || 'India',
      assignedTo: contact.assignedTo?.id || contact.assignedTo || '',
      status: contact.status || 'Active'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError('');
    try {
      const res = await fetch(`/api/real-estate/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        setSelectedContact(data.contact);
        fetchContacts();
        showToast('📝 Contact details updated successfully!');
      } else {
        setFormError(data.error || 'Failed to update contact.');
      }
    } catch (err) {
      setFormError('Failed to connect to the server.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this customer contact record?')) return;
    try {
      const res = await fetch(`/api/real-estate/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedContact(null);
        fetchContacts();
        showToast('🗑️ Contact deleted successfully.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete contact.');
      }
    } catch (err) {
      console.error('Delete contact error:', err);
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
      city: '',
      state: '',
      country: 'India',
      assignedTo: '',
      status: 'Active'
    });
    setFormError('');
  };

  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
      : 'bg-slate-50 border-slate-200 text-slate-700';
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
            <Sparkles className="h-7 w-7 text-indigo-500" />
            Real Estate Contacts
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Manage permanent property buyers, record client details, and assign managers.
          </p>
        </div>

        <button onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition cursor-pointer">
          <Plus className="h-4 w-4" /> Add Property Contact
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input type="text" placeholder="Search by name, company, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 text-xs text-slate-850 transition" />
        </div>
        
        <div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 text-xs text-slate-800 transition">
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div>
          <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 text-xs text-slate-800 transition">
            <option value="All">All Managers</option>
            {salesReps.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling customer contacts...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          🏢 No real estate customer contacts cataloged yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contacts.map((contact) => (
            <div key={contact.id} onClick={() => handleSelectContact(contact.id)}
              className="bg-white border border-slate-200 hover:border-indigo-250 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group cursor-pointer relative text-left">
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-black text-slate-800 tracking-tight leading-tight group-hover:text-indigo-650 transition">
                    {contact.firstName} {contact.lastName || ''}
                  </h3>
                  {contact.company && <span className="text-[10px] font-bold text-slate-450 block mt-0.5">{contact.company}</span>}
                </div>

                <div className="space-y-1.5 text-[10px] font-semibold text-slate-500 leading-none">
                  {contact.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400 shrink-0" /><span>{contact.phone}</span></div>}
                  {contact.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400 shrink-0" /><span className="truncate">{contact.email}</span></div>}
                  {contact.city && <div className="flex items-center gap-1.5"><Building className="h-3 w-3 text-slate-400 shrink-0" /><span>{contact.city}</span></div>}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-black">
                <span className={`px-2.5 py-0.5 rounded-full border text-[8px] uppercase tracking-wider font-extrabold ${getStatusBadge(contact.status)}`}>
                  {contact.status}
                </span>
                <span className="text-slate-700 group-hover:text-indigo-600 transition flex items-center gap-0.5">Profile <ChevronRight className="h-3 w-3" /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD CONTACT MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><PlusCircle className="h-4.5 w-4.5 text-indigo-500" /> Create Customer Contact</h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">Register a permanent property buyer profile.</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition border-0 bg-transparent"><X className="h-5.5 w-5.5" /></button>
            </div>
            {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">⚠️ {formError}</div>}
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">First Name *</label>
                  <input type="text" required name="firstName" value={formData.firstName} onChange={handleFormInputChange} placeholder="e.g. Amit"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleFormInputChange} placeholder="e.g. Sharma"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleFormInputChange} placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleFormInputChange} placeholder="e.g. amit@example.com"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Company</label>
                  <input type="text" name="company" value={formData.company} onChange={handleFormInputChange} placeholder="e.g. Corporation"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleFormInputChange} placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Assigned Manager</label>
                  <select name="assignedTo" value={formData.assignedTo} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition">
                    <option value="">Select Manager</option>
                    {salesReps.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT CONTACT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><Edit className="h-4.5 w-4.5 text-indigo-500" /> Edit Contact Details</h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">Modify customer contact card details.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition border-0 bg-transparent"><X className="h-5.5 w-5.5" /></button>
            </div>
            {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">⚠️ {formError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">First Name *</label>
                  <input type="text" required name="firstName" value={formData.firstName} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Phone</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Company</label>
                  <input type="text" name="company" value={formData.company} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Status</label>
                  <select name="status" value={formData.status} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Assigned Manager</label>
                  <select name="assignedTo" value={formData.assignedTo} onChange={handleFormInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition">
                    <option value="">Select Manager</option>
                    {salesReps.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Edit className="h-3.5 w-3.5" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAIL SLIDE-OVER DRAWER --- */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="flex-1" onClick={() => setSelectedContact(null)}></div>
          <div className="w-full max-w-xl bg-white border-l border-slate-250 shadow-2xl h-full flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-250 text-left">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-start shrink-0">
              <div className="space-y-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500 text-white text-[9px] font-black font-mono shadow-sm">
                  🏢 PROPERTY CLIENT PROFILE
                </span>
                <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">
                  {selectedContact.firstName} {selectedContact.lastName || ''}
                </h2>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full border text-[8px] uppercase tracking-wider font-extrabold ${getStatusBadge(selectedContact.status)}`}>
                  {selectedContact.status}
                </span>
              </div>
              <button onClick={() => setSelectedContact(null)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200 rounded-lg cursor-pointer transition border-0 bg-transparent">
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
                      <span>{selectedContact.phone || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Email Address</span>
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedContact.email || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Company / Group</span>
                    <span>{selectedContact.company || 'Individual'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Designation</span>
                    <span>{selectedContact.designation || 'Client'}</span>
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono border-b pb-2">Location Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">City</span>
                    <span>{selectedContact.city || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Country</span>
                    <span>{selectedContact.country || 'India'}</span>
                  </div>
                </div>
              </div>

              {/* Attribution */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono border-b pb-2">CRM Assignment</h3>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Assigned Manager</span>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{selectedContact.assignedTo ? selectedContact.assignedTo.name : 'Unassigned'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button onClick={() => handleDelete(selectedContact.id)}
                className="p-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 text-rose-500 hover:text-rose-600 transition cursor-pointer"
                title="Delete Contact Record">
                <Trash2 className="h-4.5 w-4.5" />
              </button>

              <button onClick={() => handleOpenEdit(selectedContact)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                <Edit className="h-3.5 w-3.5" /> Edit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
