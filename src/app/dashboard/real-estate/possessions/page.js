'use client';

import { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  User,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  ClipboardList,
  CalendarClock,
  ShieldCheck,
  Home,
  ArrowRight,
  Clock,
  CheckCheck,
  ReceiptText
} from 'lucide-react';

const CHECKLIST_ITEMS = [
  'Unit Keys Handed Over',
  'Parking Keys / Token Given',
  'Society Welcome Letter',
  'Completion Certificate Copy',
  'Occupancy Certificate Copy',
  'Electricity Connection Memo',
  'Water Connection Memo',
  'NOC from Builder',
];

export default function PossessionsPage() {
  const [possessions, setPossessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [units, setUnits] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Add Possession Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Complete Handover Modal
  const [handoverTarget, setHandoverTarget] = useState(null);
  const [checklistState, setChecklistState] = useState({});
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [handoverError, setHandoverError] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const initialForm = {
    bookingId: '',
    unitId: '',
    scheduledDate: '',
    remarks: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // ─── Data Fetch ───────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [posRes, bookRes, unitRes] = await Promise.all([
        fetch('/api/real-estate/possessions'),
        fetch('/api/real-estate/bookings'),
        fetch('/api/real-estate/units'),
      ]);

      const posData = await posRes.json();
      let bookList = [], unitList = [];

      if (bookRes.ok) {
        const bd = await bookRes.json();
        bookList = bd.bookings || [];
      }
      if (unitRes.ok) {
        const ud = await unitRes.json();
        unitList = ud.units || [];
      }

      setBookings(bookList);
      setUnits(unitList);

      if (posData.success) {
        setPossessions(posData.possessions || []);
      } else {
        throw new Error(posData.error || 'Failed to load possessions register.');
      }
    } catch (err) {
      console.error('Fetch possessions error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Pre-select first booking/unit in modal
  useEffect(() => {
    if (bookings.length > 0 && !formData.bookingId) {
      setFormData(prev => ({ ...prev, bookingId: bookings[0].id || bookings[0]._id }));
    }
    if (units.length > 0 && !formData.unitId) {
      setFormData(prev => ({ ...prev, unitId: units[0].id || units[0]._id }));
    }
  }, [bookings, units]);

  // ─── Helpers ──────────────────────────────────────────────
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ─── Schedule Possession ──────────────────────────────────
  const handleSchedulePossession = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.bookingId) return setModalError('Please select a booking.');
    if (!formData.scheduledDate) return setModalError('Scheduled handover date is required.');

    try {
      setSubmitting(true);
      const payload = {
        bookingId: formData.bookingId,
        unitId: formData.unitId || null,
        scheduledDate: formData.scheduledDate,
        remarks: formData.remarks.trim(),
      };

      const res = await fetch('/api/real-estate/possessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule possession.');

      if (data.success) {
        setFormData({ ...initialForm, bookingId: bookings[0]?.id || '', unitId: units[0]?.id || '' });
        setShowAddModal(false);
        triggerToast('Possession handover scheduled successfully!');
        fetchData();
      }
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Open Handover Completion Modal ───────────────────────
  const openHandoverModal = (possession) => {
    setHandoverTarget(possession);
    const initial = {};
    CHECKLIST_ITEMS.forEach(item => { initial[item] = false; });
    setChecklistState(initial);
    setHandoverError(null);
  };

  const toggleChecklist = (item) => {
    setChecklistState(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const allChecked = Object.values(checklistState).every(Boolean);

  // ─── Complete Handover ────────────────────────────────────
  const handleCompleteHandover = async () => {
    if (!allChecked) {
      setHandoverError('Please complete all checklist items before marking handover.');
      return;
    }
    setHandoverError(null);
    try {
      setHandoverSubmitting(true);
      const id = handoverTarget.id || handoverTarget._id;
      const res = await fetch(`/api/real-estate/possessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Handed Over',
          handoverDate: new Date().toISOString(),
          keysChecklist: CHECKLIST_ITEMS
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete handover.');
      if (data.success) {
        setHandoverTarget(null);
        triggerToast('🎉 Unit handover completed! Unit status updated to Sold.');
        fetchData();
      }
    } catch (err) {
      setHandoverError(err.message);
    } finally {
      setHandoverSubmitting(false);
    }
  };

  // ─── Statistics ───────────────────────────────────────────
  const totalCount = possessions.length;
  const pendingCount = possessions.filter(p => p.status === 'Scheduled').length;
  const handedOverCount = possessions.filter(p => p.status === 'Handed Over').length;
  const delayedCount = possessions.filter(p => {
    if (p.status === 'Handed Over') return false;
    return p.scheduledDate && new Date(p.scheduledDate) < new Date();
  }).length;

  // ─── Filter Logic ─────────────────────────────────────────
  const filtered = possessions.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.leadName?.toLowerCase().includes(q) ||
      p.unitNumber?.toLowerCase().includes(q) ||
      p.projectName?.toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ─── Status Badge Config ──────────────────────────────────
  const statusBadge = {
    'Scheduled': 'bg-sky-50 border-sky-200 text-sky-700',
    'Handed Over': 'bg-emerald-50 border-emerald-200 text-emerald-700',
    'Delayed': 'bg-rose-50 border-rose-200 text-rose-700'
  };

  return (
    <div className="space-y-6 text-left select-none font-sans">

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <KeyRound className="h-5 w-5 text-amber-500" /> Possession Handover Register
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Schedule unit handovers, manage keys checklist completion, and track every buyer possession.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 duration-200"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Schedule Handover
        </button>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>Error loading possessions register: {error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Scheduled', value: totalCount, icon: ClipboardList, color: 'indigo' },
          { label: 'Pending Handover', value: pendingCount, icon: CalendarClock, color: 'sky' },
          { label: 'Handed Over', value: handedOverCount, icon: ShieldCheck, color: 'emerald' },
          { label: 'Delayed', value: delayedCount, icon: Clock, color: 'rose' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className={`h-9 w-9 rounded-xl bg-${color}-50 border border-${color}-100 flex items-center justify-center text-${color}-500 shrink-0 mt-0.5`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{label}</span>
              <span className="font-extrabold text-slate-800 text-lg block leading-tight">{value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[2]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by buyer, unit number, project name..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-400 text-slate-750 placeholder-slate-400 transition"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-400 transition cursor-pointer appearance-none"
            >
              <option value="All">🚦 All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Handed Over">Handed Over</option>
              <option value="Delayed">Delayed</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(s => (
            <div key={s} className="h-52 bg-white border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-300 rounded-2xl bg-white space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mx-auto">
            <KeyRound className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">No Possession Records Found</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto font-semibold">
              Schedule a unit handover to track key delivery, dates, and completion status.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-250 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-black transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" /> Schedule First Handover
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((pos) => {
            const badge = statusBadge[pos.status] || 'bg-slate-100 border-slate-200 text-slate-600';
            const isHandedOver = pos.status === 'Handed Over';
            const scheduledDate = pos.scheduledDate ? new Date(pos.scheduledDate).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric'
            }) : '—';
            const handoverDate = pos.handoverDate ? new Date(pos.handoverDate).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric'
            }) : null;

            return (
              <div key={pos.id || pos._id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-350 hover:shadow-md transition duration-200 flex flex-col gap-3 relative overflow-hidden text-xs">
                {/* Top glow bar */}
                <div className={`absolute top-0 left-0 h-1.5 w-full ${isHandedOver ? 'bg-emerald-400' : 'bg-amber-400'}`} />

                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{pos.unitNumber || 'Unit'}</h4>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{pos.projectName || '—'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${badge}`}>
                    {pos.status}
                  </span>
                </div>

                {/* Meta */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 font-bold text-slate-600 text-[10px]">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{pos.leadName || 'Unknown Buyer'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Scheduled: {scheduledDate}</span>
                  </div>
                  {handoverDate && (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>Handed Over: {handoverDate}</span>
                    </div>
                  )}
                  {pos.keysChecklist?.length > 0 && (
                    <div className="flex items-center gap-2 text-indigo-600">
                      <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                      <span>{pos.keysChecklist.length} checklist items completed</span>
                    </div>
                  )}
                  {pos.remarks && (
                    <div className="flex items-start gap-2 text-slate-500">
                      <ReceiptText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{pos.remarks}</span>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                  {!isHandedOver ? (
                    <button
                      onClick={() => openHandoverModal(pos)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-black text-[10px] cursor-pointer transition active:scale-95"
                    >
                      <KeyRound className="h-3 w-3" /> Complete Handover
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Possession Complete
                    </span>
                  )}
                  <span className="text-slate-400 font-mono text-[9px]">
                    #{(pos.id || pos._id || '').toString().slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SCHEDULE POSSESSION MODAL ─────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Schedule Possession Handover</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Register a new unit key delivery appointment.</p>
                </div>
              </div>
              <button
                onClick={() => { setModalError(null); setShowAddModal(false); }}
                className="h-7 w-7 rounded-lg hover:bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="px-5 py-2.5 bg-red-50 border-b border-red-150 text-red-800 text-[10px] font-black flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSchedulePossession} className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Booking Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Select Booking <span className="text-red-500">*</span></label>
                {bookings.length === 0 ? (
                  <p className="text-xs font-bold text-red-600 italic">No confirmed bookings found.</p>
                ) : (
                  <select
                    name="bookingId"
                    value={formData.bookingId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-amber-400 transition cursor-pointer"
                  >
                    {bookings.map(b => (
                      <option key={b.id || b._id} value={b.id || b._id}>
                        {b.leadName || 'Buyer'} — {b.unitTitle || b.id?.slice(-6) || ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Unit Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Unit to Handover</label>
                {units.length === 0 ? (
                  <p className="text-xs font-bold text-slate-450 italic">No unit inventory found.</p>
                ) : (
                  <select
                    name="unitId"
                    value={formData.unitId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-amber-400 transition cursor-pointer"
                  >
                    <option value="">-- Select Unit --</option>
                    {units.map(u => (
                      <option key={u.id || u._id} value={u.id || u._id}>
                        {u.unitNumber} — {u.projectTitle || ''} ({u.status || 'Available'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Scheduled Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Scheduled Handover Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="scheduledDate"
                  required
                  value={formData.scheduledDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-400 text-slate-700 transition"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Internal Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Additional notes for the handover coordinator..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-400 text-slate-700 transition resize-none"
                />
              </div>

            </form>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                disabled={submitting}
                onClick={() => { setModalError(null); setShowAddModal(false); }}
                className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSchedulePossession}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
              >
                {submitting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scheduling...</>
                ) : (
                  <><CalendarClock className="h-3.5 w-3.5" /> Schedule Handover</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── COMPLETE HANDOVER CHECKLIST MODAL ────────────────── */}
      {handoverTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Complete Unit Handover</h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Unit: {handoverTarget.unitNumber} · Buyer: {handoverTarget.leadName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHandoverTarget(null)}
                className="h-7 w-7 rounded-lg hover:bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {handoverError && (
              <div className="px-5 py-2.5 bg-red-50 border-b border-red-150 text-red-800 text-[10px] font-black flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span>{handoverError}</span>
              </div>
            )}

            {/* Checklist */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-[10px] text-slate-500 font-bold bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                Verify all items below before confirming the possession handover to the buyer.
              </p>

              <div className="space-y-2">
                {CHECKLIST_ITEMS.map((item) => (
                  <label
                    key={item}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                      checklistState[item]
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`h-4.5 w-4.5 rounded flex items-center justify-center shrink-0 border transition ${
                        checklistState[item]
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                      onClick={() => toggleChecklist(item)}
                    >
                      {checklistState[item] && <CheckCheck className="h-3 w-3" />}
                    </div>
                    <span className={`text-[11px] font-bold ${checklistState[item] ? 'text-emerald-700 line-through decoration-emerald-400' : 'text-slate-700'}`}>
                      {item}
                    </span>
                  </label>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Completion Progress</span>
                  <span>{Object.values(checklistState).filter(Boolean).length}/{CHECKLIST_ITEMS.length}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${(Object.values(checklistState).filter(Boolean).length / CHECKLIST_ITEMS.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 text-xs font-bold">
              <span className={`text-[10px] font-bold ${allChecked ? 'text-emerald-600' : 'text-slate-400'}`}>
                {allChecked ? '✓ All items verified — ready to handover!' : `${CHECKLIST_ITEMS.length - Object.values(checklistState).filter(Boolean).length} items remaining`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={handoverSubmitting}
                  onClick={() => setHandoverTarget(null)}
                  className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!allChecked || handoverSubmitting}
                  onClick={handleCompleteHandover}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition"
                >
                  {handoverSubmitting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...</>
                  ) : (
                    <><Home className="h-3.5 w-3.5" /> Confirm Handover</>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
