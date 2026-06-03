'use client';

import { useState, useEffect } from 'react';
import { 
  Lock, 
  Plus, 
  Clock, 
  Building, 
  DollarSign, 
  User, 
  AlertTriangle,
  FileText,
  Loader2,
  X,
  CheckCircle2,
  MapPin,
  Maximize,
  ShoppingBag,
  Sparkles
} from 'lucide-react';

export default function UnitBlockingPage() {
  // Lists States
  const [blockedUnits, setBlockedUnits] = useState([]);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);

  // Gating & Loader States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [submittingHold, setSubmittingHold] = useState(false);
  const [blockError, setBlockError] = useState(null);

  // Release/Sold Loading items states
  const [processingId, setProcessingId] = useState(null);

  // Success Notification Toast state
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const initialFormState = {
    leadId: '',
    propertyId: '',
    tokenAmount: '',
    durationHours: '48',
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch blocked units listing
  const fetchBlockedUnits = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/real-estate/blocking');
      if (!res.ok) throw new Error('Could not retrieve locked units directory.');
      const data = await res.json();
      if (data.success) {
        setBlockedUnits(data.blockedUnits || []);
      } else {
        throw new Error(data.error || 'Server error.');
      }
    } catch (err) {
      console.error('Fetch blocked units failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch helper directories
  const fetchHelperLists = async () => {
    try {
      // Fetch Leads
      const leadsRes = await fetch('/api/leads');
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData.leads || []);
      }

      // Fetch Properties
      const propsRes = await fetch('/api/real-estate/properties');
      if (propsRes.ok) {
        const propsData = await propsRes.json();
        setProperties(propsData.properties || []);
      }
    } catch (err) {
      console.error('Fetch dropdown helper directories failed:', err);
    }
  };

  useEffect(() => {
    fetchBlockedUnits();
    fetchHelperLists();
  }, []);

  // Filter properties to only show those that are 'Available' for blocking
  const availableProperties = properties.filter(p => p.status === 'Available');

  // Set default keys in form dropdowns when lists are fetched
  useEffect(() => {
    if (leads.length > 0 && !formData.leadId) {
      setFormData(prev => ({ ...prev, leadId: leads[0].id || leads[0]._id }));
    }
    if (availableProperties.length > 0 && !formData.propertyId) {
      setFormData(prev => ({ ...prev, propertyId: availableProperties[0].id || availableProperties[0]._id }));
    }
  }, [leads, properties]);

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Create a new blocked unit hold
  const handleBlockUnit = async (e) => {
    e.preventDefault();
    setBlockError(null);

    if (!formData.leadId) return setBlockError('Please select a prospect lead.');
    if (!formData.propertyId) return setBlockError('Please select a property unit.');
    if (!formData.tokenAmount || Number(formData.tokenAmount) <= 0) return setBlockError('Hold deposit token amount must be a positive number.');

    try {
      setSubmittingHold(true);

      // Compute expiration date dynamically based on hours selected
      const expDate = new Date();
      expDate.setHours(expDate.getHours() + Number(formData.durationHours || 48));

      const payload = {
        leadId: formData.leadId,
        propertyId: formData.propertyId,
        tokenAmount: Number(formData.tokenAmount),
        expirationDate: expDate.toISOString(),
        notes: formData.notes.trim()
      };

      const res = await fetch('/api/real-estate/blocking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place unit block hold.');

      if (data.success) {
        // Clear & close
        setFormData({
          ...initialFormState,
          leadId: leads[0]?.id || leads[0]?._id || '',
          propertyId: availableProperties[0]?.id || availableProperties[0]?._id || ''
        });
        setShowBlockModal(false);
        triggerToast('Inventory unit successfully blocked! Warning task timeline logged.');
        
        // Refresh catalogs
        fetchBlockedUnits();
        // Fetch properties list again to update statuses
        fetchHelperLists();
      }
    } catch (err) {
      console.error('Block unit creation failed:', err);
      setBlockError(err.message);
    } finally {
      setSubmittingHold(false);
    }
  };

  // Action: Release Unit back to Available
  const handleReleaseHold = async (blockId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation and release this unit back to available inventory?')) return;
    try {
      setProcessingId(blockId);
      const res = await fetch(`/api/real-estate/blocking/${blockId}?action=release`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to release unit hold.');
      if (data.success) {
        triggerToast('Property successfully unlocked and returned to active inventory!');
        fetchBlockedUnits();
        fetchHelperLists();
      }
    } catch (err) {
      console.error('Release failed:', err);
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Action: Complete booking and mark as Sold (deal conversion)
  const handleCompleteBooking = async (blockId, propTitle, clientName) => {
    if (!window.confirm(`Complete Sale: Mark "${propTitle}" as permanently Sold to ${clientName}? This will automatically close the hold and register a Closed Won Deal in CRM pipelines.`)) return;
    try {
      setProcessingId(blockId);
      const res = await fetch(`/api/real-estate/blocking/${blockId}?action=sold`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete unit sale.');
      if (data.success) {
        triggerToast('Sale completed successfully! Dynamic Closed Won Deal recorded in CRM pipelines.');
        fetchBlockedUnits();
        fetchHelperLists();
      }
    } catch (err) {
      console.error('Sold completion failed:', err);
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Generate Receipt Mock Alert
  const generateReceiptPDF = (block) => {
    const clientName = block.leadId ? `${block.leadId.firstName} ${block.leadId.lastName || ''}`.trim() : 'Client';
    const propTitle = block.propertyId ? block.propertyId.title : 'Property';
    triggerToast(`Success! Hold deposit token receipt PDF generated and added to ${clientName}'s file attachments!`);
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Dynamic countdown helper
  const getRemainingHoursText = (isoStr) => {
    const exp = new Date(isoStr);
    const now = new Date();
    const diffMs = exp - now;
    if (diffMs <= 0) return 'Expired';
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs > 0) {
      return `${diffHrs} Hours Left`;
    }
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins} Minutes Left`;
  };

  const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return '₹0';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <Lock className="h-5 w-5 text-emerald-500" /> Unit Blocking & Tokens
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Temporarily block inventory units with token deposits to ensure fair delegation across teams.
          </p>
        </div>
        <button 
          onClick={() => {
            if (availableProperties.length === 0) {
              alert('No available properties in inventory to block. Please register new properties first!');
              return;
            }
            setShowBlockModal(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 duration-200"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Block New Unit
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
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>Error loading blocked units: {error}. Please refresh.</span>
        </div>
      )}

      {/* Blocked Units List Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {loading ? (
          /* Loading skeletons */
          <div className="p-5 space-y-4">
            {[1, 2].map(s => (
              <div key={s} className="h-16 bg-slate-50 rounded-xl animate-pulse w-full"></div>
            ))}
          </div>
        ) : blockedUnits.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold italic text-xs space-y-2 select-none">
            <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto border border-slate-100">
              <Lock className="h-5 w-5" />
            </div>
            <p>No units are currently locked. All property inventory is active.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {blockedUnits.map((block) => {
              const clientName = block.leadId ? `${block.leadId.firstName} ${block.leadId.lastName || ''}`.trim() : 'Real Estate Lead';
              const propertyTitle = block.propertyId ? block.propertyId.title : 'Deleted Unit';
              const propertyLocation = block.propertyId ? block.propertyId.location : '';
              const propertyType = block.propertyId ? block.propertyId.type : 'Unit';
              
              const remainingText = getRemainingHoursText(block.expirationDate);
              const isExpired = remainingText === 'Expired';

              return (
                <div key={block.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition duration-150">
                  
                  {/* Specs Description */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-550 shrink-0">
                      <Building className="h-5 w-5" />
                    </div>
                    
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-800 text-xs">{propertyTitle}</span>
                        <span className="text-[9px] text-slate-450 font-bold">— {propertyLocation}</span>
                        <span className="text-[8px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border">
                          {propertyType}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" /> Client: {clientName}
                        </span>
                        <span className="flex items-center gap-1 border-l border-slate-200 pl-4">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" /> Hold Token: {formatCurrency(block.tokenAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expiration deadline alert and actions */}
                  <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pl-14 md:pl-0">
                    
                    {/* Timer expiry badge */}
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-extrabold shadow-sm ${
                      isExpired 
                        ? 'bg-red-50 border-red-250 text-red-800' 
                        : 'bg-amber-50 border-amber-250 text-amber-800 animate-pulse'
                    }`}>
                      <Clock className={`h-4 w-4 shrink-0 ${isExpired ? 'text-red-650' : 'text-amber-600'}`} />
                      <span>{remainingText}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* PDF receipt button */}
                      <button 
                        onClick={() => generateReceiptPDF(block)}
                        className="p-2 rounded-lg border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition cursor-pointer" 
                        title="Generate Receipt PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </button>

                      {/* Sold convert button */}
                      <button 
                        onClick={() => handleCompleteBooking(block.id, propertyTitle, clientName)}
                        disabled={processingId !== null}
                        className="p-2 rounded-lg bg-emerald-50 border border-emerald-250 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition cursor-pointer"
                        title="Mark Completed Booking (Sold)"
                      >
                        {processingId === block.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShoppingBag className="h-4 w-4" />
                        )}
                      </button>

                      {/* Release hold button */}
                      <button 
                        onClick={() => handleReleaseHold(block.id)}
                        disabled={processingId !== null}
                        className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-sm disabled:opacity-50"
                      >
                        Release Unit
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic Glassmorphic "Block New Unit" Modal Form */}
      {showBlockModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Block Property Unit</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Temporarily hold a property unit with deposit tokens.</p>
                </div>
              </div>
              <button 
                onClick={() => { setBlockError(null); setShowBlockModal(false); }}
                className="h-7 w-7 rounded-lg hover:bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Alert */}
            {blockError && (
              <div className="px-5 py-2.5 bg-red-50 border-b border-red-150 text-red-800 text-[10px] font-black flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-650 shrink-0" />
                <span>{blockError}</span>
              </div>
            )}

            {/* Form Fields scrollable */}
            <form onSubmit={handleBlockUnit} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Select Lead */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Select Client / Prospect Lead <span className="text-red-500">*</span></label>
                {leads.length === 0 ? (
                  <p className="text-xs font-bold text-red-500 italic">No leads directory. Create a lead first.</p>
                ) : (
                  <select 
                    name="leadId"
                    value={formData.leadId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                  >
                    {leads.map(l => (
                      <option key={l.id || l._id} value={l.id || l._id}>
                        👤 {l.firstName} {l.lastName || ''} ({l.company || 'Individual'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Select Available Property */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Available Property Unit <span className="text-red-500">*</span></label>
                {availableProperties.length === 0 ? (
                  <p className="text-xs font-bold text-red-500 italic">No active properties available. All units are currently blocked or sold.</p>
                ) : (
                  <select 
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                  >
                    {availableProperties.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        🏢 {p.title} (Starting: ₹{Number(p.price).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Token Deposit amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Token Deposit Holds Amount (INR) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  name="tokenAmount"
                  required
                  min="0"
                  value={formData.tokenAmount}
                  onChange={handleInputChange}
                  placeholder="e.g. 100000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                />
              </div>

              {/* Blocking holding limit hours */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Holding Expiration Time Limit</label>
                <select 
                  name="durationHours"
                  value={formData.durationHours}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                >
                  <option value="24">⏰ 24 Hours Hold (1 Day)</option>
                  <option value="48">⏰ 48 Hours Hold (2 Days)</option>
                  <option value="72">⏰ 72 Hours Hold (3 Days)</option>
                  <option value="96">⏰ 96 Hours Hold (4 Days)</option>
                </select>
              </div>

              {/* Reservation Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Hold Reservation Notes</label>
                <textarea 
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="e.g. Paid token money via bank transfer, waiting for final registry document checks..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition resize-none leading-relaxed"
                />
              </div>

            </form>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 text-xs font-bold">
              <button 
                type="button"
                disabled={submittingHold}
                onClick={() => { setBlockError(null); setShowBlockModal(false); }}
                className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={submittingHold}
                onClick={handleBlockUnit}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {submittingHold ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Locking Unit...
                  </>
                ) : (
                  <>✓ Block Unit</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
