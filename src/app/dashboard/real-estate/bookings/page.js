'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  MapPin, 
  Building, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  Search,
  DollarSign,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';

export default function BookingsSuitePage() {
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [units, setUnits] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal Control States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const initialFormState = {
    leadId: '',
    unitId: '',
    bookingAmount: '',
    bookingDate: new Date().toISOString().split('T')[0],
    status: 'Confirmed',
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Bookings and helper lists
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch bookings
      const bookingsRes = await fetch('/api/real-estate/bookings');
      if (!bookingsRes.ok) throw new Error('Could not retrieve bookings list.');
      const bookingsData = await bookingsRes.json();

      // 2. Fetch leads for modal dropdown
      const leadsRes = await fetch('/api/leads');
      let leadsList = [];
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        leadsList = leadsData.leads || [];
      }

      // 3. Fetch unit inventories for modal dropdown (only Available units)
      const unitsRes = await fetch('/api/real-estate/units');
      let unitsList = [];
      if (unitsRes.ok) {
        const unitsData = await unitsRes.json();
        if (unitsData.success) {
          unitsList = unitsData.units || [];
        }
      }

      setLeads(leadsList);
      setUnits(unitsList);

      if (bookingsData.success) {
        setBookings(bookingsData.bookings || []);
      } else {
        throw new Error(bookingsData.error || 'Server error.');
      }
    } catch (err) {
      console.error('Fetch bookings failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Preset dropdowns when helper lists load
  useEffect(() => {
    if (leads.length > 0 && !formData.leadId) {
      setFormData(prev => ({ ...prev, leadId: leads[0].id || leads[0]._id }));
    }
    const availableUnits = units.filter(u => u.status === 'Available');
    if (availableUnits.length > 0 && !formData.unitId) {
      setFormData(prev => ({ ...prev, unitId: availableUnits[0].id || availableUnits[0]._id }));
    }
  }, [leads, units]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddBooking = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.leadId) return setModalError('Please select a customer lead.');
    if (!formData.unitId) return setModalError('Please select a property unit.');
    if (!formData.bookingAmount || Number(formData.bookingAmount) <= 0) {
      return setModalError('Booking amount must be greater than zero.');
    }

    try {
      setSubmittingBooking(true);

      const payload = {
        leadId: formData.leadId,
        unitId: formData.unitId,
        bookingAmount: Number(formData.bookingAmount),
        bookingDate: formData.bookingDate,
        status: formData.status,
        notes: formData.notes.trim()
      };

      const res = await fetch('/api/real-estate/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record customer booking.');

      if (data.success) {
        setFormData({
          ...initialFormState,
          leadId: leads[0]?.id || leads[0]?._id || '',
          unitId: units.filter(u => u.status === 'Available')[0]?.id || ''
        });
        setShowAddModal(false);
        triggerToast('Customer Unit Booking recorded successfully! CRM Follow-up task scheduled.');
        fetchData();
      }
    } catch (err) {
      console.error('Create booking failed:', err);
      setModalError(err.message);
    } finally {
      setSubmittingBooking(false);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Math Statistics Aggregates
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status === 'Confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'Pending').length;
  const totalBookingValue = bookings
    .filter(b => b.status === 'Confirmed')
    .reduce((sum, b) => sum + (Number(b.bookingAmount) || 0), 0);

  // Available units list for dropdown
  const availableUnitsForBooking = units.filter(u => u.status === 'Available');

  // Filter Logic
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.unitNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tower?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <FileText className="h-5 w-5 text-emerald-500" /> Bookings Directory
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Track customer token payments, record confirmations, and automatically map task worksheets.
          </p>
        </div>
        <button 
          onClick={() => {
            // Re-preset dropdown unit selection
            if (availableUnitsForBooking.length > 0) {
              setFormData(prev => ({ ...prev, unitId: availableUnitsForBooking[0].id || availableUnitsForBooking[0]._id }));
            }
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 duration-200"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Book Unit
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
          <span>Error loading bookings: {error}. Please refresh.</span>
        </div>
      )}

      {/* Statistics widgets cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Bookings</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{totalBookings}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-550 shrink-0 mt-0.5">
            <DollarSign className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Confirmed Value</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">₹{totalBookingValue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-550 shrink-0 mt-0.5">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Confirmed Units</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{activeBookings}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-550 shrink-0 mt-0.5">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Pending Actions</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{pendingBookings}</span>
          </div>
        </div>
      </div>

      {/* Glassmorphic Search & Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Search bar */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[2]" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Buyer Name, Unit Number, Tower, Company..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 placeholder-slate-400 transition"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 transition cursor-pointer appearance-none"
            >
              <option value="All">🚦 All Booking Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

        </div>
      </div>

      {/* Bookings List Layout */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="h-16 bg-white border rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-300 rounded-2xl bg-white space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-555 mx-auto">
            <FileText className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">No Booking Files Recorded</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto font-semibold">
              Select an available project unit, attach customer tokens, and record confirmation files.
            </p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-250 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-black transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" /> Book First Unit
          </button>
        </div>
      ) : (
        /* Premium Table List Grid */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden select-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="px-6 py-4">Buyer Customer Details</th>
                  <th className="px-6 py-4">Reserved Unit Specs</th>
                  <th className="px-6 py-4">Booking Amount</th>
                  <th className="px-6 py-4">Booking Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredBookings.map((b) => {
                  const statusStyles = {
                    'Confirmed': 'bg-emerald-50 border-emerald-200 text-emerald-700',
                    'Pending': 'bg-amber-50 border-amber-200 text-amber-700',
                    'Cancelled': 'bg-rose-50 border-rose-200 text-rose-700'
                  };
                  const currentBadge = statusStyles[b.status] || 'bg-slate-100 text-slate-500';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition">
                      
                      {/* Buyer Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-black shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">{b.leadName}</span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                              {b.company ? `${b.company} (${b.phone})` : b.phone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Reserved Unit Specs */}
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-extrabold text-slate-900 block leading-tight">Unit {b.unitNumber}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                            {b.tower ? `${b.tower}, Floor: ${b.floor || 'TBA'}` : `Floor: ${b.floor || 'TBA'}`}
                          </span>
                        </div>
                      </td>

                      {/* Booking Amount */}
                      <td className="px-6 py-4">
                        <span className="text-slate-900 font-black">₹{b.bookingAmount?.toLocaleString('en-IN')}</span>
                      </td>

                      {/* Booking Date */}
                      <td className="px-6 py-4 text-slate-500 font-bold">
                        {formatDate(b.bookingDate)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${currentBadge}`}>
                          {b.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button className="text-[10px] text-emerald-600 hover:underline inline-flex items-center gap-0.5">
                          View File <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DYNAMIC "BOOK UNIT" MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-550 shrink-0">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Record Unit Booking</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Reserves an inventory unit and locks token payouts.</p>
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
            <form onSubmit={handleAddBooking} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Lead Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Select Customer Lead <span className="text-red-500">*</span></label>
                {leads.length === 0 ? (
                  <p className="text-xs font-bold text-red-600 italic">No prospect leads available.</p>
                ) : (
                  <select 
                    name="leadId"
                    value={formData.leadId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    {leads.map(l => (
                      <option key={l.id || l._id} value={l.id || l._id}>{l.firstName} {l.lastName || ''} ({l.company || 'Individual'})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Unit Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Select Inventory Unit <span className="text-red-500">*</span></label>
                {availableUnitsForBooking.length === 0 ? (
                  <p className="text-xs font-bold text-amber-600 italic">No available inventory units. Create available units first!</p>
                ) : (
                  <select 
                    name="unitId"
                    value={formData.unitId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    {availableUnitsForBooking.map(u => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unitNumber} ({u.tower ? `${u.tower}, ` : ''}Floor: {u.floor || 'TBA'} - ₹{u.price?.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Booking Amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Booking token Amount (INR ₹) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  name="bookingAmount"
                  required
                  min="1"
                  value={formData.bookingAmount}
                  onChange={handleInputChange}
                  placeholder="e.g. 500000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Booking Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Booking Date</label>
                  <input 
                    type="date" 
                    name="bookingDate"
                    value={formData.bookingDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700 transition"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Booking Status</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Booking Remarks / Notes</label>
                <textarea 
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="e.g. Token received via Bank Transfer, sale agreement draft sent to customer..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition resize-none leading-relaxed"
                />
              </div>

            </form>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 text-xs font-bold">
              <button 
                type="button"
                disabled={submittingBooking}
                onClick={() => { setModalError(null); setShowAddModal(false); }}
                className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={submittingBooking || availableUnitsForBooking.length === 0}
                onClick={handleAddBooking}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition"
              >
                {submittingBooking ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recording...
                  </>
                ) : (
                  <>✓ Record Booking</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
