'use client';

import { useEffect, useState } from 'react';
import { 
  Loader2, 
  Search, 
  Plus, 
  Clock, 
  Trash2, 
  X, 
  CheckCircle,
  PlusCircle,
  Info,
  Calendar,
  AlertTriangle,
  ChevronRight,
  LifeBuoy,
  MessageSquare,
  Users,
  Target,
  CheckCircle2,
  FileText,
  User,
  ShieldAlert,
  Send
} from 'lucide-react';

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState({ text: '', type: '' });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [repFilter, setRepFilter] = useState('');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentingLoading, setCommentingLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ticketType, setTicketType] = useState('Bug Report');
  const [priority, setPriority] = useState('Medium');
  const [contactId, setContactId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
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
    async function initSupportPage() {
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

        // Fetch contacts for linking tickets
        const contactsRes = await fetch('/api/contacts');
        if (contactsRes.ok) {
          const data = await contactsRes.json();
          setContacts(data.contacts || []);
        }

      } catch (err) {
        console.error('Support page init failed:', err);
      }
    }
    initSupportPage();
  }, []);

  // Fetch tickets with filters
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (priorityFilter) queryParams.append('priority', priorityFilter);
      if (typeFilter) queryParams.append('ticketType', typeFilter);
      if (repFilter) queryParams.append('assignedTo', repFilter);

      const res = await fetch(`/api/tickets?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Fetch tickets failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, priorityFilter, typeFilter, repFilter]);

  // Fetch detailed comments for a single ticket
  const handleOpenDetail = async (ticket) => {
    try {
      setViewingTicket(ticket);
      setComments([]);
      setNewCommentText('');
      setDetailModalOpen(true);

      const res = await fetch(`/api/tickets/${ticket._id || ticket.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingTicket(data.ticket);
        setComments(data.ticket.comments || []);
      }
    } catch (err) {
      console.error('Fetch ticket details failed:', err);
    }
  };

  // Add Comment submit
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || commentingLoading) return;

    setCommentingLoading(true);
    try {
      const res = await fetch(`/api/tickets/${viewingTicket._id || viewingTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentText: newCommentText.trim(),
          isInternal: false
        })
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, data.comment]);
        setNewCommentText('');
        showToast('Comment posted successfully!');
        
        // Refresh ticket list in background
        fetchTickets();
      } else {
        showToast('Failed to add comment.', 'error');
      }
    } catch (err) {
      showToast('Network error posting comment.', 'error');
    } finally {
      setCommentingLoading(false);
    }
  };

  // Create Ticket submit
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    const ticketData = {
      title: title.trim(),
      description: description.trim(),
      ticketType,
      priority,
      contactId: contactId || undefined,
      assignedTo: assignedTo || undefined,
      attachments: []
    };

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      });

      const data = await res.json();

      if (res.ok) {
        setAddModalOpen(false);
        resetForm();
        fetchTickets();
        showToast('🎉 Support ticket logged successfully!');
      } else {
        setFormError(data.error || 'Failed to log ticket.');
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve Ticket
  const handleUpdateStatus = async (ticketId, nextStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        const data = await res.json();
        setViewingTicket(data.ticket);
        showToast(`Ticket status updated to ${nextStatus}!`);
        fetchTickets();
      } else {
        showToast('Failed to update status.', 'error');
      }
    } catch (err) {
      showToast('Network error updating ticket.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Ticket
  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to permanently delete this support ticket?')) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
      
      if (res.ok) {
        setDetailModalOpen(false);
        setViewingTicket(null);
        fetchTickets();
        showToast('🗑️ Support Ticket deleted.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete ticket.');
      }
    } catch (err) {
      console.error('Delete ticket error:', err);
      alert('Network error deleting ticket.');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTicketType('Bug Report');
    setPriority('Medium');
    setContactId('');
    setAssignedTo('');
    setFormError('');
  };

  // Priority styling helper
  const getPriorityStyle = (prio) => {
    switch (prio) {
      case 'Critical':
        return 'bg-rose-100 text-rose-800 border border-rose-250 font-black animate-pulse';
      case 'High':
        return 'bg-rose-50 text-rose-700 border border-rose-100 font-extrabold';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border border-amber-100 font-bold';
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-100 font-medium';
    }
  };

  // Status styling helper
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Resolved':
      case 'Closed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-250 font-bold';
      case 'In Progress':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'Pending Client':
        return 'bg-amber-50 text-amber-600 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  // Ticket type icons helper
  const getTicketTypeEmoji = (type) => {
    switch (type) {
      case 'Bug Report': return '🐛';
      case 'Change Request': return '⚙️';
      case 'Feature Request': return '💡';
      case 'Login Issue': return '🔑';
      case 'Hosting Issue': return '🌐';
      default: return '🎫';
    }
  };

  // Overview counters
  const totalCount = tickets.length;
  const pendingCount = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  const unresolvedBugs = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed' && t.ticketType === 'Bug Report').length;
  const unresolvedHosting = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed' && t.ticketType === 'Hosting Issue').length;

  return (
    <div className="space-y-6 relative h-full">
      
      {/* --- FLOATING TOAST NOTIFICATION --- */}
      {toastMessage.text && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3.5 rounded-xl border shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top duration-300 ${
          toastMessage.type === 'error' 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-emerald-50 border-emerald-250 text-emerald-800'
        }`}>
          <Info className="h-4.5 w-4.5" />
          <span className="text-xs font-black tracking-wide">{toastMessage.text}</span>
        </div>
      )}

      {/* --- HEADER PANEL --- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <LifeBuoy className="h-7 w-7 text-emerald-500 animate-spin-slow" />
            Post-Delivery Support Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Track client requests, bugs, change requests, hosting issues, and login queries dynamically.
          </p>
        </div>
        <div className="shrink-0 flex items-center">
          <button
            onClick={() => { resetForm(); setAddModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-500/10 active:scale-[0.98] transition cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 stroke-[3]" />
            Log Support Ticket
          </button>
        </div>
      </div>

      {/* --- ANALYTICAL GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-350">
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Active Tickets</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">{pendingCount} <span className="text-xs text-slate-400 font-normal">/ {totalCount} total</span></span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Unresolved Bugs</span>
            <span className="text-2xl font-black text-rose-650 block mt-1">{unresolvedBugs}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Hosting Errors</span>
            <span className="text-2xl font-black text-indigo-650 block mt-1">{unresolvedHosting}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Tickets Closed</span>
            <span className="text-2xl font-black text-emerald-600 block mt-1">{totalCount - pendingCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* --- FILTER BLOCK --- */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by ID, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 placeholder-slate-400 transition"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
          >
            <option value="">All Statuses</option>
            <option value="New">🎟️ New</option>
            <option value="In Progress">⚡ In Progress</option>
            <option value="Pending Client">⏳ Pending Client</option>
            <option value="Resolved">✅ Resolved</option>
            <option value="Closed">🔒 Closed</option>
          </select>
        </div>

        <div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
          >
            <option value="">All Priorities</option>
            <option value="Critical">🚨 Critical</option>
            <option value="High">🔥 High</option>
            <option value="Medium">⭐ Medium</option>
            <option value="Low">❄️ Low</option>
          </select>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
          >
            <option value="">All Issue Types</option>
            <option value="Bug Report">🐛 Bug Report</option>
            <option value="Change Request">⚙️ Change Request</option>
            <option value="Feature Request">💡 Feature Request</option>
            <option value="Login Issue">🔑 Login Issue</option>
            <option value="Hosting Issue">🌐 Hosting Issue</option>
          </select>
        </div>

        {(currentUser?.role === 'owner' || currentUser?.role === 'sales_admin') ? (
          <div>
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
            >
              <option value="">All Assignees</option>
              {salesReps.map((rep) => (
                <option key={rep._id || rep.id} value={rep._id || rep.id}>{rep.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider">
            Attributed Session
          </div>
        )}
      </div>

      {/* --- TICKETS BOARD --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-xs text-slate-400 font-bold font-sans">Compiling support ticket directory...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-slate-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 mb-4 shadow-sm">
              <CheckCircle className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Clear board! No support tickets registered</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1 font-medium">
              Click "Log Support Ticket" to report new client issues, bugs, change requests, or server disruptions.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((ticket) => {
              const isResolved = ticket.status === 'Resolved' || ticket.status === 'Closed';

              return (
                <div 
                  key={ticket._id || ticket.id}
                  onClick={() => handleOpenDetail(ticket)}
                  className={`p-4 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 group cursor-pointer ${
                    isResolved ? 'bg-slate-50/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <span className="text-lg mt-0.5 shrink-0 select-none">
                      {getTicketTypeEmoji(ticket.ticketType)}
                    </span>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {ticket.ticketId}
                        </span>
                        <p className={`text-xs font-bold text-slate-850 truncate leading-snug ${
                          isResolved ? 'line-through text-slate-450 font-normal' : ''
                        }`}>
                          {ticket.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap text-[9px] font-bold text-slate-450">
                        {ticket.contactId && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Client: {ticket.contactId.firstName} {ticket.contactId.lastName || ''}
                          </span>
                        )}
                        <span className="truncate max-w-[250px] font-semibold italic text-slate-400">
                          {ticket.description}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-10 sm:pl-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase border ${getPriorityStyle(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      
                      <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase border ${getStatusStyle(ticket.status)}`}>
                        {ticket.status}
                      </span>

                      <div className="flex items-center gap-1 text-[10px] text-slate-450 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>
                          {new Date(ticket.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </span>
                      </div>

                      {ticket.assignedTo && (
                        <span className="text-[9px] font-black text-slate-500 bg-slate-100 border px-2 py-0.5 rounded" title={`Assigned to ${ticket.assignedTo.name}`}>
                          👤 {ticket.assignedTo.name.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-350 group-hover:text-slate-600 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- LOG NEW SUPPORT TICKET MODAL --- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <PlusCircle className="h-5 w-5 text-emerald-500" />
                Log Customer Support Ticket
              </h2>
              <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-850">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4.5 bg-white">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-600 font-bold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ticket Title *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. SSL Cert expired / Cannot load checkout page"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Problem Details / Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide precise details of the bug, login failure or hosting exception reported by the client."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Issue Classification</label>
                  <select
                    value={ticketType}
                    onChange={(e) => setTicketType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                  >
                    <option value="Bug Report">🐛 Bug Report</option>
                    <option value="Change Request">⚙️ Change Request</option>
                    <option value="Feature Request">💡 Feature Request</option>
                    <option value="Login Issue">🔑 Login Issue</option>
                    <option value="Hosting Issue">🌐 Hosting Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ticket Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                  >
                    <option value="Low">❄️ Low Priority</option>
                    <option value="Medium">⭐ Medium Priority</option>
                    <option value="High">🔥 High Priority</option>
                    <option value="Critical">🚨 Critical Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Associated Client / Contact</label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                >
                  <option value="">-- Choose Client (Optional) --</option>
                  {contacts.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.firstName} {c.lastName || ''} ({c.company || 'Private'})</option>
                  ))}
                </select>
              </div>

              {(currentUser?.role === 'owner' || currentUser?.role === 'sales_admin') && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign Support Agent / Developer</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                  >
                    <option value="">-- Leave Unassigned --</option>
                    {salesReps.map((rep) => (
                      <option key={rep._id || rep.id} value={rep._id || rep.id}>{rep.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-350 text-slate-700 hover:text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-450 disabled:bg-emerald-300 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-500/10 transition cursor-pointer flex items-center justify-center"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAIL & COMMENTS DISCUSS MODAL --- */}
      {detailModalOpen && viewingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl flex flex-col shadow-2xl h-[90vh] max-h-[750px] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                  {viewingTicket.ticketId}
                </span>
                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase border ${getPriorityStyle(viewingTicket.priority)}`}>
                  {viewingTicket.priority}
                </span>
                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase border ${getStatusStyle(viewingTicket.status)}`}>
                  {viewingTicket.status}
                </span>
              </div>
              <button 
                onClick={() => { setDetailModalOpen(false); setViewingTicket(null); }} 
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-850"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scroll Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col md:flex-row gap-6 min-h-0">
              {/* Left Column: Details */}
              <div className="md:w-1/2 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-850 leading-tight">{viewingTicket.title}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-bold text-slate-400">
                    <span>Type: {getTicketTypeEmoji(viewingTicket.ticketType)} {viewingTicket.ticketType}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Description / Notes</span>
                  <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">
                    {viewingTicket.description}
                  </p>
                </div>

                {viewingTicket.contactId && (
                  <div className="p-3 bg-slate-50 border rounded-xl space-y-1.5">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Associated Client</span>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[9px] font-black text-emerald-600 font-mono">
                        {viewingTicket.contactId.firstName?.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">{viewingTicket.contactId.firstName} {viewingTicket.contactId.lastName || ''}</span>
                        <span className="text-[10px] text-slate-450 block truncate leading-none mt-0.5">{viewingTicket.contactId.email}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Assignment Details</span>
                  <p className="text-xs font-semibold text-slate-700">
                    Assigned Agent: <strong className="text-slate-850">{viewingTicket.assignedTo?.name || 'Unassigned'}</strong>
                  </p>
                  <p className="text-[10px] text-slate-450 font-bold">
                    Logged on: {new Date(viewingTicket.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {viewingTicket.resolvedAt && (
                    <p className="text-[10px] text-emerald-650 font-bold">
                      Resolved on: {new Date(viewingTicket.resolvedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>

                {/* Quick actions panel */}
                <div className="pt-2 border-t space-y-2">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Status Controls</span>
                  <div className="flex gap-2 flex-wrap">
                    {viewingTicket.status !== 'In Progress' && viewingTicket.status !== 'Resolved' && viewingTicket.status !== 'Closed' && (
                      <button
                        onClick={() => handleUpdateStatus(viewingTicket._id || viewingTicket.id, 'In Progress')}
                        className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        ⚡ Start Working
                      </button>
                    )}
                    {viewingTicket.status !== 'Resolved' && viewingTicket.status !== 'Closed' && (
                      <button
                        onClick={() => handleUpdateStatus(viewingTicket._id || viewingTicket.id, 'Resolved')}
                        className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-250 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        ✓ Mark Resolved
                      </button>
                    )}
                    {viewingTicket.status === 'Resolved' && (
                      <button
                        onClick={() => handleUpdateStatus(viewingTicket._id || viewingTicket.id, 'Closed')}
                        className="px-2.5 py-1.5 bg-slate-800 text-white hover:bg-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        🔒 Lock Ticket / Close
                      </button>
                    )}
                    {viewingTicket.status === 'Resolved' && (
                      <button
                        onClick={() => handleUpdateStatus(viewingTicket._id || viewingTicket.id, 'In Progress')}
                        className="px-2.5 py-1.5 bg-amber-50 border border-amber-250 text-amber-700 hover:bg-amber-100 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        🔄 Reopen Ticket
                      </button>
                    )}
                  </div>

                  {(currentUser?.role === 'owner' || currentUser?.role === 'sales_admin') && (
                    <button
                      onClick={() => handleDeleteTicket(viewingTicket._id || viewingTicket.id)}
                      className="w-full mt-2 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Ticket Permanently
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Comments & Updates thread */}
              <div className="md:w-1/2 flex flex-col h-full min-h-[300px] border-t md:border-t-0 md:border-l border-slate-200 md:pl-6 pt-6 md:pt-0">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-2 shrink-0">Updates & Client Thread</span>
                
                {/* Comments box */}
                <div className="flex-1 overflow-y-auto bg-slate-50 border rounded-xl p-3.5 space-y-3 min-h-0">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6 text-slate-400 italic text-[10px]">
                      <MessageSquare className="h-5 w-5 text-slate-300 mb-1" />
                      No comments logged. Add a reply below to update the ticket history.
                    </div>
                  ) : (
                    comments.map((comment, index) => {
                      const isCurrentUser = comment.senderId === currentUser?.id || comment.sender === currentUser?.id;
                      return (
                        <div key={comment._id || index} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                          <span className="text-[8px] font-bold text-slate-400 mb-0.5">
                            {comment.senderName} ({new Date(comment.createdAt).toLocaleTimeString('en-IN', { timeStyle: 'short' })})
                          </span>
                          <div className={`p-2.5 rounded-lg text-xs leading-relaxed max-w-[90%] break-words ${
                            isCurrentUser 
                              ? 'bg-emerald-500 text-white rounded-br-none' 
                              : 'bg-white text-slate-800 border rounded-bl-none shadow-sm'
                          }`}>
                            {comment.commentText}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Send Comment Box */}
                {viewingTicket.status !== 'Closed' ? (
                  <form onSubmit={handleAddComment} className="flex gap-2 mt-3 shrink-0">
                    <input
                      type="text"
                      placeholder="Type ticket update or comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                    />
                    <button
                      type="submit"
                      disabled={commentingLoading || !newCommentText.trim()}
                      className="p-2 bg-emerald-500 hover:bg-emerald-450 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg shadow-sm transition flex items-center justify-center cursor-pointer"
                    >
                      {commentingLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                ) : (
                  <div className="mt-3 p-2 bg-slate-100 border text-center rounded-lg text-[10px] text-slate-450 font-bold select-none shrink-0">
                    🔒 Ticket is Closed. Reopen to post updates.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
