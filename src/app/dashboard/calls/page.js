'use client';

import { useEffect, useState } from 'react';
import { 
  Loader2, 
  Search, 
  Plus, 
  User, 
  Clock, 
  Trash2, 
  X, 
  Info,
  Calendar,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  CheckCircle,
  MessageCircle,
  FileText,
  Users,
  Target
} from 'lucide-react';

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState({ text: '', type: '' });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [repFilter, setRepFilter] = useState('');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form states
  const [subject, setSubject] = useState('');
  const [callType, setCallType] = useState('Outbound');
  const [callDuration, setCallDuration] = useState(''); // in seconds
  const [callResult, setCallResult] = useState('Answered');
  const [callInterest, setCallInterest] = useState('Interested'); // Gap 7: Follow-up interest result
  const [callTime, setCallTime] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [associatedType, setAssociatedType] = useState('None'); // 'None', 'Lead', 'Contact'
  const [associatedLeadId, setAssociatedLeadId] = useState('');
  const [associatedContactId, setAssociatedContactId] = useState('');

  const [formError, setFormError] = useState('');

  // Toast Helper
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage({ text: '', type: '' });
    }, 4000);
  };

  // Fetch current user and session details
  useEffect(() => {
    async function initCallsPage() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);

          if (userData.user.role === 'owner' || userData.user.role === 'sales_admin') {
            const repsRes = await fetch('/api/users');
            if (repsRes.ok) {
              const repsData = await repsRes.json();
              setSalesReps(repsData.users || []);
            }
          }
        }

        // Fetch leads and contacts for association dropdowns
        const [leadsRes, contactsRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/contacts')
        ]);

        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeads(data.leads || []);
        }
        if (contactsRes.ok) {
          const data = await contactsRes.json();
          setContacts(data.contacts || []);
        }

      } catch (err) {
        console.error('Calls page init failed:', err);
      }
    }
    initCallsPage();
  }, []);

  // Fetch calls with filters
  const fetchCalls = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (typeFilter) queryParams.append('callType', typeFilter);
      if (resultFilter) queryParams.append('callResult', resultFilter);
      if (repFilter) queryParams.append('assignedTo', repFilter);

      const res = await fetch(`/api/calls?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls || []);
      }
    } catch (err) {
      console.error('Fetch calls failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [search, typeFilter, resultFilter, repFilter]);

  // Handle Log Call submit
  const handleLogCall = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    const callData = {
      subject: subject.trim(),
      callType,
      callDuration: Number(callDuration) || 0,
      callResult,
      callInterest,
      callTime: callTime || undefined,
      notes: notes.trim(),
      assignedTo: assignedTo || undefined,
      leadId: associatedType === 'Lead' ? associatedLeadId : undefined,
      contactId: associatedType === 'Contact' ? associatedContactId : undefined
    };

    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callData),
      });

      const data = await res.json();

      if (res.ok) {
        setAddModalOpen(false);
        resetForm();
        fetchCalls();
        showToast('📞 Call logged successfully!');
      } else {
        setFormError(data.error || 'Failed to log call.');
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Call log
  const handleDeleteCall = async (callId) => {
    if (!window.confirm('Delete this call log record permanently?')) return;

    try {
      const res = await fetch(`/api/calls/${callId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCalls();
        showToast('🗑️ Call log record deleted.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete call log.');
      }
    } catch (err) {
      console.error('Delete call error:', err);
    }
  };

  const resetForm = () => {
    setSubject('');
    setCallType('Outbound');
    setCallDuration('');
    setCallResult('Answered');
    setCallInterest('Interested');
    setCallTime('');
    setNotes('');
    setAssignedTo('');
    setAssociatedType('None');
    setAssociatedLeadId('');
    setAssociatedContactId('');
    setFormError('');
  };

  // Helper formatting duration
  const formatDuration = (sec) => {
    if (!sec) return '0s';
    if (sec >= 60) {
      return `${Math.floor(sec / 60)}m ${sec % 60}s`;
    }
    return `${sec}s`;
  };

  // Analytics Metrics Counters
  const totalCalls = calls.length;
  const inboundCount = calls.filter(c => c.callType === 'Inbound').length;
  const outboundCount = calls.filter(c => c.callType === 'Outbound').length;
  const answeredCount = calls.filter(c => c.callResult === 'Answered').length;

  return (
    <div className="space-y-6 relative h-full">
      
      {/* --- FLOATING TOAST NOTIFICATION --- */}
      {toastMessage.text && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3.5 rounded-xl border shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top duration-300 bg-emerald-50 border-emerald-250 text-emerald-800">
          <Info className="h-4.5 w-4.5" />
          <span className="text-xs font-black tracking-wide">{toastMessage.text}</span>
        </div>
      )}

      {/* --- HEADER PANELS --- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <PhoneCall className="h-7 w-7 text-emerald-500" />
            {currentUser?.role === 'sales_rep' ? 'My Call Activity Logs' : 'Corporate Call Logs Suite'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Review inbound and outbound talk times, outcomes, and log immediate customer responses.
          </p>
        </div>
        <div className="shrink-0 flex items-center">
          <button
            onClick={() => { resetForm(); setAddModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-450 text-white text-xs font-bold shadow-md shadow-emerald-500/10 active:scale-[0.98] transition cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 stroke-[3]" />
            Log Call Activity
          </button>
        </div>
      </div>

      {/* --- ANALYTICAL SUMMARY CARD GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-350">
        {/* Total Calls */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Total Calls Logged</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">{totalCalls}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <Phone className="h-5 w-5" />
          </div>
        </div>

        {/* Outbound Calls */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Outbound Pitching</span>
            <span className="text-2xl font-black text-indigo-650 block mt-1">{outboundCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
            <PhoneForwarded className="h-5 w-5" />
          </div>
        </div>

        {/* Inbound Calls */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Inbound Inquiries</span>
            <span className="text-2xl font-black text-emerald-600 block mt-1">{inboundCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
            <PhoneIncoming className="h-5 w-5" />
          </div>
        </div>

        {/* Answered outcomes */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Answered Connections</span>
            <span className="text-2xl font-black text-amber-600 block mt-1">{answeredCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* --- LIVE FILTERS AND SEARCH BLOCK --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search call logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 placeholder-slate-400 transition"
          />
        </div>

        {/* Call Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
          >
            <option value="">All Call Types</option>
            <option value="Outbound">📤 Outbound Calls</option>
            <option value="Inbound">📥 Inbound Calls</option>
          </select>
        </div>

        {/* Call Result Filter */}
        <div>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
          >
            <option value="">All Call Results</option>
            <option value="Answered">🟢 Answered</option>
            <option value="No Answer">⚪ No Answer</option>
            <option value="Busy">🔴 Busy Line</option>
            <option value="Voicemail">🔵 Voicemail</option>
          </select>
        </div>

        {/* Admin Assignee Filter */}
        {(currentUser?.role === 'owner' || currentUser?.role === 'sales_admin') ? (
          <div>
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
            >
              <option value="">All sales representatives</option>
              {salesReps.map((rep) => (
                <option key={rep._id} value={rep._id}>{rep.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider">
            Attributed Session
          </div>
        )}
      </div>

      {/* --- CALLS TIMELINE LIST / TABLE --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-xs text-slate-400 font-bold font-sans">Compiling call records...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-slate-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 mb-4 shadow-sm">
              <Phone className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No calls logged yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1 font-medium">
              Start logging your calls to track duration, outbound pitches, and save lead timelines.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Call Subject / Action</th>
                  <th className="px-6 py-4">Call Channels</th>
                  <th className="px-6 py-4">Talk Time</th>
                  <th className="px-6 py-4">Call Outcome</th>
                  <th className="px-6 py-4">Linked Customer</th>
                  <th className="px-6 py-4">Logged By</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calls.map((call) => (
                  <tr key={call._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-slate-800 block">{call.subject}</span>
                        {call.notes && <span className="block text-[10px] text-slate-400 mt-1 italic">— {call.notes}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase border ${
                        call.callType === 'Outbound' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {call.callType === 'Outbound' ? <PhoneForwarded className="h-2.5 w-2.5" /> : <PhoneIncoming className="h-2.5 w-2.5" />}
                        {call.callType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 flex items-center gap-1 mt-1.5 border-transparent">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {formatDuration(call.callDuration)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 text-[8px] font-black rounded-full uppercase border ${
                        call.callResult === 'Answered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        call.callResult === 'Busy' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        call.callResult === 'No Answer' ? 'bg-slate-50 text-slate-500 border-slate-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {call.callResult}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {call.leadId && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                          <Users className="h-3 w-3" />
                          Lead: {call.leadId.firstName} ({call.leadId.company})
                        </span>
                      )}
                      {call.contactId && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                          <Target className="h-3 w-3" />
                          Contact: {call.contactId.firstName} ({call.contactId.company})
                        </span>
                      )}
                      {!call.leadId && !call.contactId && <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {call.assignedTo ? call.assignedTo.name : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCall(call._id)}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 transition cursor-pointer"
                        title="Delete Call Log"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD / LOG NEW CALL MODAL --- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <PhoneCall className="h-5 w-5 text-emerald-500" />
                Log Call Activity Record
              </h2>
              <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-850">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleLogCall} className="p-6 space-y-4.5 bg-white">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-600 font-bold">
                  {formError}
                </div>
              )}

              {/* Call Subject */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Call Subject / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Cold Call / Budget negotiation"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                />
              </div>

              {/* Call Type & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Call Type</label>
                  <select
                    value={callType}
                    onChange={(e) => setCallType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                  >
                    <option value="Outbound">📤 Outbound Call</option>
                    <option value="Inbound">📥 Inbound Call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Talk Duration (Seconds)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="E.g. 150 (2m 30s)"
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                  />
                </div>
              </div>

              {/* Outcome & Interest */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Call Outcome</label>
                  <select value={callResult} onChange={(e) => setCallResult(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition">
                    <option value="Answered">🟢 Answered</option>
                    <option value="No Answer">⚪ No Answer</option>
                    <option value="Busy">🔴 Busy Line</option>
                    <option value="Voicemail">🔵 Left Voicemail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Interest Result 🎯</label>
                  <select value={callInterest} onChange={(e) => setCallInterest(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition">
                    <option value="Interested">✅ Interested</option>
                    <option value="Not Interested">❌ Not Interested</option>
                    <option value="Callback Requested">📞 Callback Requested</option>
                    <option value="Escalated to Doctor">🏥 Escalated to Doctor</option>
                    <option value="Follow-up Later">🕐 Follow-up Later</option>
                  </select>
                </div>
              </div>

              {/* CRM Mappings */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Linked Accounts</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAssociatedType('None'); setAssociatedLeadId(''); setAssociatedContactId(''); }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      associatedType === 'None' 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssociatedType('Lead'); setAssociatedContactId(''); }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      associatedType === 'Lead' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-slate-655 border-slate-200'
                    }`}
                  >
                    Link Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssociatedType('Contact'); setAssociatedLeadId(''); }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      associatedType === 'Contact' 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-white text-slate-655 border-slate-200'
                    }`}
                  >
                    Link Contact
                  </button>
                </div>

                {/* Conditional Dropdowns */}
                {associatedType === 'Lead' && (
                  <div className="animate-in fade-in duration-200">
                    <select
                      value={associatedLeadId}
                      required={associatedType === 'Lead'}
                      onChange={(e) => setAssociatedLeadId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 focus:outline-none text-xs text-slate-700"
                    >
                      <option value="">-- Choose Lead --</option>
                      {leads.map((l) => (
                        <option key={l._id} value={l._id}>{l.firstName} ({l.company})</option>
                      ))}
                    </select>
                  </div>
                )}

                {associatedType === 'Contact' && (
                  <div className="animate-in fade-in duration-200">
                    <select
                      value={associatedContactId}
                      required={associatedType === 'Contact'}
                      onChange={(e) => setAssociatedContactId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 focus:outline-none text-xs text-slate-700"
                    >
                      <option value="">-- Choose Converted Contact --</option>
                      {contacts.map((c) => (
                        <option key={c._id} value={c._id}>{c.firstName} ({c.company})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Call Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Action Notes / Talk details</label>
                <input
                  type="text"
                  placeholder="E.g. Wants custom pricing, call back Friday"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                />
              </div>

              {/* Submit triggers */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-850 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-450 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Log Talk Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
