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
  CheckCircle,
  PlusCircle,
  Info,
  Calendar,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Tag,
  Users,
  Target,
  CheckCircle2,
  FileText,
  Edit2
} from 'lucide-react';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [leads, setLeads] = useState([]);
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
  const [repFilter, setRepFilter] = useState('');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form states
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
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
    async function initTasksPage() {
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
        console.error('Tasks page init failed:', err);
      }
    }
    initTasksPage();
  }, []);

  // Fetch tasks with filters
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (priorityFilter) queryParams.append('priority', priorityFilter);
      if (repFilter) queryParams.append('assignedTo', repFilter);

      const res = await fetch(`/api/tasks?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Fetch tasks failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, statusFilter, priorityFilter, repFilter]);

  // Handle Toggle Completion (Checkbox Click)
  const handleToggleComplete = async (task) => {
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    
    // Optimistic local state update for super responsive click feedback
    const updatedTasks = tasks.map(t => {
      if (t._id === task._id) return { ...t, status: nextStatus };
      return t;
    });
    setTasks(updatedTasks);

    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        showToast(nextStatus === 'Completed' ? '🎉 Task marked as Completed!' : '🔄 Task moved back to Pending.');
        fetchTasks();
      } else {
        showToast('Failed to update task status.', 'error');
        fetchTasks(); // Rollback
      }
    } catch (err) {
      showToast('Network error updating task.', 'error');
      fetchTasks();
    }
  };

  // Handle Create Task submit
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    const taskData = {
      subject: subject.trim(),
      dueDate,
      priority,
      status: 'Pending',
      notes: notes.trim(),
      assignedTo: assignedTo || undefined,
      leadId: associatedType === 'Lead' ? associatedLeadId : undefined,
      contactId: associatedType === 'Contact' ? associatedContactId : undefined
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      const data = await res.json();

      if (res.ok) {
        setAddModalOpen(false);
        resetForm();
        fetchTasks();
        showToast('🎉 New task scheduled successfully!');
      } else {
        setFormError(data.error || 'Failed to create task.');
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Click
  const handleEditClick = (task) => {
    setEditingTask(task);
    setSubject(task.subject || '');
    
    // Format date for datetime-local (YYYY-MM-DDTHH:MM)
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      const pad = (num) => String(num).padStart(2, '0');
      const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setDueDate(localStr);
    } else {
      setDueDate('');
    }

    setPriority(task.priority || 'Medium');
    setNotes(task.notes || '');
    setAssignedTo(task.assignedTo ? (task.assignedTo._id || task.assignedTo) : '');

    if (task.leadId) {
      setAssociatedType('Lead');
      setAssociatedLeadId(task.leadId._id || task.leadId);
      setAssociatedContactId('');
    } else if (task.contactId) {
      setAssociatedType('Contact');
      setAssociatedContactId(task.contactId._id || task.contactId);
      setAssociatedLeadId('');
    } else {
      setAssociatedType('None');
      setAssociatedLeadId('');
      setAssociatedContactId('');
    }

    setFormError('');
    setEditModalOpen(true);
  };

  // Handle Update Task submit
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    const taskData = {
      subject: subject.trim(),
      dueDate,
      priority,
      notes: notes.trim(),
      assignedTo: assignedTo || undefined,
      leadId: associatedType === 'Lead' ? associatedLeadId : undefined,
      contactId: associatedType === 'Contact' ? associatedContactId : undefined
    };

    try {
      const res = await fetch(`/api/tasks/${editingTask._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      let data = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = { error: `Server error (${res.status})` };
      }

      if (res.ok) {
        setEditModalOpen(false);
        setEditingTask(null);
        resetForm();
        fetchTasks();
        showToast('🎉 Task updated successfully!');
      } else {
        setFormError(data.error || 'Failed to update task.');
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Task record
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      let data = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = { error: `Server error (${res.status})` };
      }

      if (res.ok) {
        fetchTasks();
        showToast('🗑️ Task removed.');
      } else {
        alert(data.error || 'Failed to delete task.');
      }
    } catch (err) {
      console.error('Delete task error:', err);
      alert('Network error deleting task.');
    }
  };

  const resetForm = () => {
    setSubject('');
    setDueDate('');
    setPriority('Medium');
    setNotes('');
    setAssignedTo('');
    setAssociatedType('None');
    setAssociatedLeadId('');
    setAssociatedContactId('');
    setFormError('');
  };

  // CSS Priorities badges
  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'High':
        return 'bg-rose-50 text-rose-700 border border-rose-100 shadow-sm font-extrabold';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border border-amber-100 font-bold';
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-100 font-medium';
    }
  };

  // CSS Deadline calculation alerts
  const getDeadlineBadge = (task) => {
    if (task.status === 'Completed') return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
      return { label: '🚨 Overdue!', style: 'bg-rose-100 text-rose-800 border-rose-250 animate-pulse' };
    } else if (due.getTime() === today.getTime()) {
      return { label: '📅 Today!', style: 'bg-emerald-100 text-emerald-800 border-emerald-250 font-bold' };
    }
    return null;
  };

  // Stats Counters
  const pendingCount = tasks.filter(t => t.status !== 'Completed').length;
  const highPriorityCount = tasks.filter(t => t.status !== 'Completed' && t.priority === 'High').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  
  const isOverdue = (task) => {
    if (task.status === 'Completed') return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(task.dueDate) < today;
  };
  const overdueCount = tasks.filter(t => isOverdue(t)).length;

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

      {/* --- HEADER PANELS --- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="h-7 w-7 text-emerald-500" />
            {currentUser?.role === 'sales_rep' ? 'My Tasks & Reminders' : 'Corporate Tasks Directory'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Dynamic action items. Connect follow-ups directly to active Leads or Converted Customer profiles.
          </p>
        </div>
        <div className="shrink-0 flex items-center">
          <button
            onClick={() => { resetForm(); setAddModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-500/10 active:scale-[0.98] transition cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 stroke-[3]" />
            Create Task
          </button>
        </div>
      </div>

      {/* --- ANALYTICAL SUMMARY BOX GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-350">
        {/* Pending Tasks */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Pending Reminders</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">{pendingCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* High Priority Tasks */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">High Alert Tasks</span>
            <span className="text-2xl font-black text-rose-650 block mt-1">{highPriorityCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
            <AlertTriangle className="h-5 w-5 animate-bounce" />
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Completed Activities</span>
            <span className="text-2xl font-black text-emerald-600 block mt-1">{completedCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Overdue Deadlines */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Overdue Alerts</span>
            <span className="text-2xl font-black text-rose-600 block mt-1">{overdueCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-150 border border-rose-200 flex items-center justify-center text-rose-600">
            <Info className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* --- FILTER & SEARCH BLOCK --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 placeholder-slate-400 transition"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
          >
            <option value="">All Statuses</option>
            <option value="Pending">🕒 Pending</option>
            <option value="In Progress">⚡ In Progress</option>
            <option value="Completed">✓ Completed</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
          >
            <option value="">All Priorities</option>
            <option value="High">🔥 High Priority</option>
            <option value="Medium">⭐ Medium Priority</option>
            <option value="Low">❄️ Low Priority</option>
          </select>
        </div>

        {/* Assigned Rep Filter */}
        {(currentUser?.role === 'owner' || currentUser?.role === 'sales_admin') ? (
          <div>
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
            >
              <option value="">All Account assignees</option>
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

      {/* --- INTERACTIVE TASK LIST / TO-DO BOARD --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-xs text-slate-400 font-bold font-sans">Compiling action sheets...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-slate-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 mb-4 shadow-sm">
              <CheckCircle className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Clear board! No tasks scheduled</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1 font-medium">
              Create a task manually or schedule follow-up dates in Leads profile to auto-generate actions.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const deadlineInfo = getDeadlineBadge(task);
              const isComp = task.status === 'Completed';

              return (
                <div 
                  key={task._id}
                  className={`p-4 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 group ${
                    isComp ? 'bg-slate-50/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Tick Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(task)}
                      className={`h-5 w-5 rounded-md border flex items-center justify-center transition shrink-0 mt-0.5 focus:outline-none cursor-pointer ${
                        isComp 
                          ? 'bg-emerald-500 border-emerald-600 text-white' 
                          : 'border-slate-300 hover:border-emerald-500 bg-white'
                      }`}
                      title={isComp ? "Click to set Pending" : "Click to mark Completed"}
                    >
                      {isComp && <CheckCircle2 className="h-4 w-4 stroke-[3]" />}
                    </button>

                    <div className="space-y-1 flex-1 min-w-0">
                      <p className={`text-xs font-bold text-slate-800 leading-snug break-words ${
                        isComp ? 'line-through text-slate-450 font-normal' : ''
                      }`}>
                        {task.subject}
                      </p>

                      {/* Association badges */}
                      <div className="flex items-center gap-2 flex-wrap text-[9px] font-bold">
                        {task.leadId && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Lead: {task.leadId.firstName} ({task.leadId.company})
                          </span>
                        )}
                        {task.contactId && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Contact: {task.contactId.firstName} ({task.contactId.company})
                          </span>
                        )}
                        {task.notes && (
                          <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[200px]" title={task.notes}>
                            — {task.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task details side elements */}
                  <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pl-8.5 sm:pl-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Priority Tag */}
                      <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${getPriorityBadge(task.priority)}`}>
                        {task.priority} Priority
                      </span>

                      {/* Overdue alert */}
                      {deadlineInfo && (
                        <span className={`px-1.5 py-0.5 text-[8px] font-extrabold rounded border ${deadlineInfo.style}`}>
                          {deadlineInfo.label}
                        </span>
                      )}

                      {/* Due Date Indicator */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-450 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>
                          {new Date(task.dueDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>

                      {/* Assignee label (Admin only) */}
                      {(currentUser?.role === 'owner' || currentUser?.role === 'sales_admin') && task.assignedTo && (
                        <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                          {task.assignedTo.name.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    {/* Edit action */}
                    <button
                      onClick={() => handleEditClick(task)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-emerald-600 border border-transparent hover:border-slate-200 transition cursor-pointer"
                      title="Edit Task"
                    >
                      <Edit2 className="h-4.5 w-4.5" />
                    </button>

                    {/* Delete action */}
                    <button
                      onClick={() => handleDeleteTask(task._id)}
                      className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 transition cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- ADD / SCHEDULE NEW TASK MODAL --- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <PlusCircle className="h-5 w-5 text-emerald-500" />
                Schedule New Action Task
              </h2>
              <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-850">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTask} className="p-6 space-y-4.5 bg-white">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-600 font-bold">
                  {formError}
                </div>
              )}

              {/* Task Subject */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task Description / Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Send Quotation PDF / Call to discuss budget"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                />
              </div>

              {/* Due Date picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Due Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                />
              </div>

              {/* Priority Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                >
                  <option value="High">🔥 High Priority (Critical Alert)</option>
                  <option value="Medium">⭐ Medium Priority</option>
                  <option value="Low">❄️ Low Priority</option>
                </select>
              </div>

              {/* --- ADVANCED REMINDER ASSOCIATION TYPE --- */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Customer Relations Linking</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAssociatedType('None'); setAssociatedLeadId(''); setAssociatedContactId(''); }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      associatedType === 'None' 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    No Connection
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssociatedType('Lead'); setAssociatedContactId(''); }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      associatedType === 'Lead' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-slate-655 border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    Link to Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssociatedType('Contact'); setAssociatedLeadId(''); }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      associatedType === 'Contact' 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-white text-slate-655 border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    Link to Contact
                  </button>
                </div>

                {/* Conditional Lead List Dropdown */}
                {associatedType === 'Lead' && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Select Lead *</label>
                    <select
                      value={associatedLeadId}
                      required={associatedType === 'Lead'}
                      onChange={(e) => setAssociatedLeadId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 focus:outline-none text-xs text-slate-700"
                    >
                      <option value="">-- Choose Prospect Lead --</option>
                      {leads.map((l) => (
                        <option key={l._id} value={l._id}>{l.firstName} ({l.company})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Conditional Contact List Dropdown */}
                {associatedType === 'Contact' && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Select Converted Contact *</label>
                    <select
                      value={associatedContactId}
                      required={associatedType === 'Contact'}
                      onChange={(e) => setAssociatedContactId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 focus:outline-none text-xs text-slate-700"
                    >
                      <option value="">-- Choose Permanent Customer --</option>
                      {contacts.map((c) => (
                        <option key={c._id} value={c._id}>{c.firstName} ({c.company})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Action Notes / Brief description</label>
                <input
                  type="text"
                  placeholder="E.g. Spoke about custom designs, needs proposals soon"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                />
              </div>

              {/* Assigned To (Owner only) */}
              {(currentUser?.role === 'owner' || currentUser?.role === 'sales_admin') && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign Task To</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                  >
                    <option value="">Assign to myself (Owner)</option>
                    {salesReps.map((rep) => (
                      <option key={rep._id} value={rep._id}>{rep.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Submit buttons */}
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
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Schedule Action Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT TASK MODAL --- */}
      {editModalOpen && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Edit2 className="h-5 w-5 text-emerald-500" />
                Edit Action Task
              </h2>
              <button 
                onClick={() => { setEditModalOpen(false); setEditingTask(null); }} 
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-850"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateTask} className="p-6 space-y-4.5 bg-white">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-600 font-bold">
                  {formError}
                </div>
              )}

              {/* Task Subject */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task Description / Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Send Quotation PDF / Call to discuss budget"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                />
              </div>

              {/* Due Date picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Due Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                />
              </div>

              {/* Priority Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                >
                  <option value="High">🔥 High Priority (Critical Alert)</option>
                  <option value="Medium">⭐ Medium Priority</option>
                  <option value="Low">❄️ Low Priority</option>
                </select>
              </div>

              {/* --- ADVANCED REMINDER ASSOCIATION TYPE --- */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Customer Relations Linking</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAssociatedType('None'); setAssociatedLeadId(''); setAssociatedContactId(''); }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      associatedType === 'None' 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    No Connection
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssociatedType('Lead'); setAssociatedContactId(''); }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      associatedType === 'Lead' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-slate-655 border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    Link to Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssociatedType('Contact'); setAssociatedLeadId(''); }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                      associatedType === 'Contact' 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-white text-slate-655 border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    Link to Contact
                  </button>
                </div>

                {/* Conditional Lead List Dropdown */}
                {associatedType === 'Lead' && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Select Lead *</label>
                    <select
                      value={associatedLeadId}
                      required={associatedType === 'Lead'}
                      onChange={(e) => setAssociatedLeadId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 focus:outline-none text-xs text-slate-700"
                    >
                      <option value="">-- Choose Prospect Lead --</option>
                      {leads.map((l) => (
                        <option key={l._id} value={l._id}>{l.firstName} ({l.company})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Conditional Contact List Dropdown */}
                {associatedType === 'Contact' && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Select Converted Contact *</label>
                    <select
                      value={associatedContactId}
                      required={associatedType === 'Contact'}
                      onChange={(e) => setAssociatedContactId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 focus:outline-none text-xs text-slate-700"
                    >
                      <option value="">-- Choose Permanent Customer --</option>
                      {contacts.map((c) => (
                        <option key={c._id} value={c._id}>{c.firstName} ({c.company})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Action Notes / Brief description</label>
                <input
                  type="text"
                  placeholder="E.g. Spoke about custom designs, needs proposals soon"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                />
              </div>

              {/* Assigned To (Owner only) */}
              {(currentUser?.role === 'owner' || currentUser?.role === 'sales_admin') && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign Task To</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                  >
                    <option value="">Assign to myself (Owner)</option>
                    {salesReps.map((rep) => (
                      <option key={rep._id} value={rep._id}>{rep.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Submit buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setEditModalOpen(false); setEditingTask(null); }}
                  className="px-4 py-2 text-xs font-bold hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-850 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-450 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Update Action Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
