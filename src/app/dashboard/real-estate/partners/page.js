'use client';

import { useState, useEffect } from 'react';
import { 
  Network, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  User, 
  TrendingUp, 
  DollarSign,
  AlertTriangle,
  Loader2,
  X,
  CheckCircle2
} from 'lucide-react';

export default function ChannelPartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search filter
  const [search, setSearch] = useState('');

  // Modal Control States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingPartner, setSubmittingPartner] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Release payout loader tracking
  const [releasingPartnerId, setReleasingPartnerId] = useState(null);

  // Form State
  const initialFormState = {
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    commissionPercentage: '',
    status: 'Active'
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch live partners list
  const fetchPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/real-estate/partners');
      if (!res.ok) throw new Error('Could not retrieve channel partners directory.');
      
      const data = await res.json();
      if (data.success) {
        setPartners(data.partners || []);
      } else {
        throw new Error(data.error || 'Server error.');
      }
    } catch (err) {
      console.error('Fetch partners failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPartner = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.name.trim()) return setModalError('Partner Brokerage Name is required.');
    if (!formData.contactPerson.trim()) return setModalError('Contact Person Name is required.');

    try {
      setSubmittingPartner(true);

      const payload = {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        commissionPercentage: formData.commissionPercentage ? Number(formData.commissionPercentage) : 0,
        status: formData.status
      };

      const res = await fetch('/api/real-estate/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register channel partner.');

      if (data.success) {
        setFormData(initialFormState);
        setShowAddModal(false);
        triggerToast('New Channel Partner registered successfully!');
        fetchPartners();
      }
    } catch (err) {
      console.error('Create partner failed:', err);
      setModalError(err.message);
    } finally {
      setSubmittingPartner(false);
    }
  };

  const handleReleasePayout = async (partnerId) => {
    try {
      setReleasingPartnerId(partnerId);
      
      const res = await fetch(`/api/real-estate/partners/${partnerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to release commission payouts.');

      if (data.success) {
        triggerToast('Commission Payout released successfully! Resetting ledger balance.');
        fetchPartners();
      }
    } catch (err) {
      console.error('Release payout failed:', err);
      alert(err.message);
    } finally {
      setReleasingPartnerId(null);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Filter Logic
  const filteredPartners = partners.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) || 
    p.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <Network className="h-5 w-5 text-emerald-500" /> Channel Partners (CP Network)
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Coordinate with external brokers, affiliate agents, track referred sales volumes, and manage commission payout ledgers.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 duration-200"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Register Partner
        </button>
      </div>

      {/* Success Notification Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Database Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-650 shrink-0" />
          <span>Error loading partners: {error}. Please refresh.</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm max-w-md">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
            <Search className="h-4 w-4 stroke-[2]" />
          </span>
          <input
            type="text"
            placeholder="Search channel partners by name, contact, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 placeholder-slate-400 transition"
          />
        </div>
      </div>

      {/* Skeletons and Grid Layout */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((s) => (
            <div key={s} className="h-48 bg-white border rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-300 rounded-2xl bg-white space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-555 mx-auto">
            <Network className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">No Affiliate Partners Registered</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto font-semibold">
              Register brokerage firms, define commission structures, and track affiliate payouts.
            </p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-250 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-black transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" /> Register First Partner
          </button>
        </div>
      ) : (
        /* Partners List Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPartners.map((p) => {
            const isReleasing = releasingPartnerId === p.id;
            const payoutZero = p.rawPayoutsDue === 0;

            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden text-xs">
                
                {/* Status Indicator Line */}
                <div className="absolute top-0 left-0 h-1.5 w-full bg-emerald-500"></div>

                <div className="space-y-4">
                  {/* Partner Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        <Network className="h-4.5 w-4.5 text-emerald-500" />
                      </div>
                      
                      <div className="space-y-0.5 text-left">
                        <h3 className="font-extrabold text-slate-900 text-sm leading-tight group-hover:text-emerald-600 transition">
                          {p.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          Contact: {p.contactPerson}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">
                      {p.status}
                    </span>
                  </div>

                  {/* Direct Details */}
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                        <span className="truncate">{p.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                        <span className="truncate">{p.email || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-l border-slate-200 pl-3.5">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                        <span>Referred Leads: {p.referredLeads}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                        <span>Sales: {p.totalSales}</span>
                      </div>
                    </div>
                  </div>

                  {/* Commission Statement */}
                  <div className="text-[10px] text-slate-500 font-bold bg-emerald-50/20 border border-emerald-100 p-2.5 rounded-lg text-left italic">
                    Slab Setup: {p.commission}
                  </div>
                </div>

                {/* Payout & Actions */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Payouts Ledger</span>
                    <span className={`text-xs font-black mt-1 block leading-none ${payoutZero ? 'text-slate-500' : 'text-rose-600'}`}>
                      {p.payoutsDue}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleReleasePayout(p.id)}
                      disabled={isReleasing || payoutZero}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-[9px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-sm flex items-center gap-1"
                    >
                      {isReleasing ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> Releasing...
                        </>
                      ) : (
                        <>💳 Release Payout</>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* DYNAMIC "REGISTER PARTNER" MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-555 shrink-0">
                  <Network className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Register Channel Partner</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Add external broker companies to CP referral systems.</p>
                </div>
              </div>
              <button 
                onClick={() => { setModalError(null); setShowAddModal(false); }}
                className="h-7 w-7 rounded-lg hover:bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Error Alert */}
            {modalError && (
              <div className="px-5 py-2.5 bg-red-50 border-b border-red-150 text-red-800 text-[10px] font-black flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-650 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Scrollable fields */}
            <form onSubmit={handleAddPartner} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Partner Brokerage Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Brokerage / Company Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Square Yards, Standard Realtors"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-755 transition"
                />
              </div>

              {/* Contact Person */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Contact Person Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="contactPerson"
                  required
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="e.g. Amit Gangajaliwale"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-755 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Mobile Phone</label>
                  <input 
                    type="text" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 95555 12345"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-755 transition"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g. amit@squareyards.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-755 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Commission Slab Percentage */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Commission Slab (%)</label>
                  <input 
                    type="number" 
                    name="commissionPercentage"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.commissionPercentage}
                    onChange={handleInputChange}
                    placeholder="e.g. 2.5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-755 transition"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Partner Status</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

            </form>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 text-xs font-bold">
              <button 
                type="button"
                disabled={submittingPartner}
                onClick={() => { setModalError(null); setShowAddModal(false); }}
                className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={submittingPartner}
                onClick={handleAddPartner}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition"
              >
                {submittingPartner ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Registering...
                  </>
                ) : (
                  <>✓ Register Partner</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
