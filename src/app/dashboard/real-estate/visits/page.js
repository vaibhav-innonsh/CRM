'use client';

import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  Sparkles,
  AlertTriangle,
  Loader2,
  X,
  Check,
  Building,
  CheckSquare
} from 'lucide-react';

export default function SiteVisitsPage() {
  // Lists States
  const [visits, setVisits] = useState([]);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [reps, setReps] = useState([]);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Book Modal States
  const [showBookModal, setShowBookModal] = useState(false);
  const [submittingVisit, setSubmittingVisit] = useState(false);
  const [bookError, setBookError] = useState(null);
  
  // Complete Modal States
  const [completingVisitId, setCompletingVisitId] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Success Notification state
  const [toastMessage, setToastMessage] = useState(null);

  // New Visit Form State
  const initialFormState = {
    leadId: '',
    propertyId: '',
    visitDate: '',
    visitTime: '10:00',
    assignedTo: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch all site visits for this tenant
  const fetchVisits = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/real-estate/visits');
      if (!res.ok) throw new Error('Could not retrieve site visits schedule.');
      const data = await res.json();
      if (data.success) {
        setVisits(data.visits || []);
      } else {
        throw new Error(data.error || 'Server returned an error.');
      }
    } catch (err) {
      console.error('Fetch visits failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch helper lists for dropdowns (Leads, Properties, Users)
  const fetchHelperLists = async () => {
    try {
      // 1. Fetch leads
      const leadsRes = await fetch('/api/leads');
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData.leads || []);
      }

      // 2. Fetch properties
      const propsRes = await fetch('/api/real-estate/properties');
      if (propsRes.ok) {
        const propsData = await propsRes.json();
        setProperties(propsData.properties || []);
      }

      // 3. Fetch sales reps / users
      const usersRes = await fetch('/api/users?all=true');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setReps(usersData.users || []);
      }
    } catch (err) {
      console.error('Fetch helper lists failed:', err);
    }
  };

  // Load database entities
  useEffect(() => {
    fetchVisits();
    fetchHelperLists();
  }, []);

  // Set default dropdown keys when helper lists load
  useEffect(() => {
    if (leads.length > 0 && !formData.leadId) {
      setFormData(prev => ({ ...prev, leadId: leads[0].id || leads[0]._id }));
    }
    if (properties.length > 0 && !formData.propertyId) {
      setFormData(prev => ({ ...prev, propertyId: properties[0].id || properties[0]._id }));
    }
    if (reps.length > 0 && !formData.assignedTo) {
      setFormData(prev => ({ ...prev, assignedTo: reps[0].id || reps[0]._id }));
    }
  }, [leads, properties, reps]);

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Book site visit handler
  const handleBookVisit = async (e) => {
    e.preventDefault();
    setBookError(null);

    if (!formData.leadId) return setBookError('Please select a prospect lead.');
    if (!formData.propertyId) return setBookError('Please select a property listing.');
    if (!formData.visitDate) return setBookError('Please select a visitation date.');

    try {
      setSubmittingVisit(true);

      // Merge date and time into TIMESTAMPTZ ISO String
      const visitDateTime = new Date(`${formData.visitDate}T${formData.visitTime || '10:00'}:00`);

      const payload = {
        leadId: formData.leadId,
        propertyId: formData.propertyId,
        visitDate: visitDateTime.toISOString(),
        assignedTo: formData.assignedTo || null
      };

      const res = await fetch('/api/real-estate/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book site visit.');

      if (data.success) {
        // Clear & close modal
        setFormData({
          ...initialFormState,
          leadId: leads[0]?.id || leads[0]?._id || '',
          propertyId: properties[0]?.id || properties[0]?._id || '',
          assignedTo: reps[0]?.id || reps[0]?._id || ''
        });
        setShowBookModal(false);
        triggerToast('Site visit scheduled successfully! Mapped task alert created.');
        fetchVisits();
      }
    } catch (err) {
      console.error('Book visit failed:', err);
      setBookError(err.message);
    } finally {
      setSubmittingVisit(false);
    }
  };

  // Mark visit as completed with feedback
  const handleCompleteVisit = async (e) => {
    e.preventDefault();
    if (!completingVisitId) return;

    try {
      setSubmittingFeedback(true);

      const res = await fetch(`/api/real-estate/visits/${completingVisitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Completed',
          feedback: feedbackText.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete visit.');

      if (data.success) {
        setCompletingVisitId(null);
        setFeedbackText('');
        triggerToast('Site visit completed! Customer feedback safely saved.');
        fetchVisits();
      }
    } catch (err) {
      console.error('Complete visit failed:', err);
      alert(err.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // WhatsApp Alert Mock Trigger
  const triggerWhatsAppLocationAlert = (visit) => {
    const leadName = visit.leadId ? `${visit.leadId.firstName} ${visit.leadId.lastName || ''}`.trim() : 'Client';
    const propertyTitle = visit.propertyId ? visit.propertyId.title : 'Property';
    const propLocation = visit.propertyId ? visit.propertyId.location : '';
    const phone = visit.leadId ? visit.leadId.phone : '';

    if (!phone) {
      alert(`Client ${leadName} does not have a telephone number recorded.`);
      return;
    }

    triggerToast(`WhatsApp notification sent to ${leadName} (${phone}) with site coordinates for "${propertyTitle}" at ${propLocation}!`);
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const formatVisitDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatVisitTime = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <MapPin className="h-5 w-5 text-emerald-500" /> Site Visits & Scheduler
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Track client property visits, record feedback, and trigger automated WhatsApp location alerts.
          </p>
        </div>
        <button 
          onClick={() => setShowBookModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 duration-200"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Book Site Visit
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
          <span>Error loading schedules: {error}. Please try again.</span>
        </div>
      )}

      {/* Dynamic Skeletons or Empty Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((s) => (
            <div key={s} className="bg-white border border-slate-200 rounded-2xl p-5 h-80 space-y-4">
              <div className="h-4 bg-slate-100 rounded w-1/3 border-b pb-2"></div>
              <div className="h-20 bg-slate-50 rounded-xl"></div>
              <div className="h-20 bg-slate-50 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : (
        /* Dynamic Visits List Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN: Scheduled / Pending Visits */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                📅 Active Scheduled Visits
              </h3>
              
              <div className="space-y-4">
                {visits.filter(v => v.status === 'Scheduled').length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400 italic text-center py-8 select-none">No active site visits scheduled. Add one above!</p>
                ) : (
                  visits.filter(v => v.status === 'Scheduled').map((v) => {
                    const clientName = v.leadId ? `${v.leadId.firstName} ${v.leadId.lastName || ''}`.trim() : 'Client';
                    const leadPhone = v.leadId?.phone || 'N/A';
                    const leadCompany = v.leadId?.company ? `(${v.leadId.company})` : '';
                    const propertyName = v.propertyId ? v.propertyId.title : 'Property Deleted';
                    const propertyLoc = v.propertyId ? `, ${v.propertyId.location}` : '';
                    const hostName = v.assignedTo ? v.assignedTo.name : 'Unassigned';

                    return (
                      <div key={v.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:shadow-sm transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-800 text-xs block">{clientName} <span className="text-[10px] text-slate-450 font-normal">{leadCompany}</span></span>
                            <span className="text-[10px] text-slate-450 font-bold block">{leadPhone}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-indigo-50 text-indigo-700 border-indigo-200">
                            Scheduled
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[10px] font-bold text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-800">{propertyName}{propertyLoc}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{formatVisitDate(v.visitDate)} at {formatVisitTime(v.visitDate)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>Host Rep: {hostName}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-150 flex items-center justify-end gap-2 text-[9px] font-bold">
                          <button 
                            onClick={() => triggerWhatsAppLocationAlert(v)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition cursor-pointer active:scale-95"
                          >
                            💬 WhatsApp Location
                          </button>
                          <button 
                            onClick={() => setCompletingVisitId(v.id)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 transition cursor-pointer active:scale-95"
                          >
                            ✓ Complete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Completed Visits & Feedback Logs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                📝 Completed Visits & Feedback Logs
              </h3>
              
              <div className="space-y-4">
                {visits.filter(v => v.status === 'Completed').length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400 italic text-center py-8 select-none">No visits marked completed yet. Feedbacks will appear here!</p>
                ) : (
                  visits.filter(v => v.status === 'Completed').map((v) => {
                    const clientName = v.leadId ? `${v.leadId.firstName} ${v.leadId.lastName || ''}`.trim() : 'Client';
                    const propertyName = v.propertyId ? v.propertyId.title : 'Property';
                    const hostName = v.assignedTo ? v.assignedTo.name : 'System Agent';

                    return (
                      <div key={v.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-800 text-xs block">{clientName}</span>
                            <span className="text-[10px] text-slate-450 font-bold block">{propertyName}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-250 font-extrabold">
                            Completed
                          </span>
                        </div>

                        {v.feedback && (
                          <div className="p-3 bg-emerald-50/10 border border-emerald-100 rounded-lg text-[10px] leading-relaxed text-slate-650 font-semibold italic text-left">
                            " {v.feedback} "
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 pt-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>Feedback recorded by {hostName} on {formatVisitDate(v.visitDate)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Dynamic Glassmorphic "Book Site Visit" Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Schedule Site Visit</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Book a client visitation appointment.</p>
                </div>
              </div>
              <button 
                onClick={() => { setBookError(null); setShowBookModal(false); }}
                className="h-7 w-7 rounded-lg hover:bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Alert */}
            {bookError && (
              <div className="px-5 py-2.5 bg-red-50 border-b border-red-150 text-red-800 text-[10px] font-black flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span>{bookError}</span>
              </div>
            )}

            {/* Form scroll container */}
            <form onSubmit={handleBookVisit} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Lead Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Client / Prospect Lead <span className="text-red-500">*</span></label>
                {leads.length === 0 ? (
                  <p className="text-xs font-bold text-red-600 italic">No leads available. Create a lead first.</p>
                ) : (
                  <select 
                    name="leadId"
                    value={formData.leadId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                  >
                    {leads.map(l => (
                      <option key={l.id || l._id} value={l.id || l._id}>
                        {l.firstName} {l.lastName || ''} ({l.company || 'Individual'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Property Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Property Listing <span className="text-red-500">*</span></label>
                {properties.length === 0 ? (
                  <p className="text-xs font-bold text-red-600 italic">No properties available. Add property to inventory first.</p>
                ) : (
                  <select 
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                  >
                    {properties.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.title} ({p.location})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Visit Date & Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Visitation Date <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    name="visitDate"
                    required
                    value={formData.visitDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Scheduled Time</label>
                  <input 
                    type="time" 
                    name="visitTime"
                    value={formData.visitTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                  />
                </div>
              </div>

              {/* Host User / Rep Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Assigned Host Exec <span className="text-red-500">*</span></label>
                {reps.length === 0 ? (
                  <p className="text-xs font-bold text-slate-450 italic">Loading agents directory...</p>
                ) : (
                  <select 
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                  >
                    {reps.map(r => (
                      <option key={r.id || r._id} value={r.id || r._id}>
                        👤 {r.name} ({r.role})
                      </option>
                    ))}
                  </select>
                )}
              </div>

            </form>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 text-xs font-bold">
              <button 
                type="button"
                disabled={submittingVisit}
                onClick={() => { setBookError(null); setShowBookModal(false); }}
                className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 hover:text-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={submittingVisit}
                onClick={handleBookVisit}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {submittingVisit ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scheduling...
                  </>
                ) : (
                  <>✓ Book Visit</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Glassmorphic "Complete site visit" Modal Dialog */}
      {completingVisitId !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Complete Site Visit</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Record post-visit customer feedback.</p>
                </div>
              </div>
              <button 
                onClick={() => { setCompletingVisitId(null); setFeedbackText(''); }}
                className="h-7 w-7 rounded-lg hover:bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCompleteVisit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Client Response / Feedback Notes <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  rows="3"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g. Loved the balcony view, requested price quotation, will discuss with family tomorrow..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition resize-none leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 text-xs font-bold pt-2 border-t border-slate-100">
                <button 
                  type="button"
                  disabled={submittingFeedback}
                  onClick={() => { setCompletingVisitId(null); setFeedbackText(''); }}
                  className="px-3.5 py-2 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingFeedback}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingFeedback ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Complete Visit
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
