'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Calendar,
  Lock, 
  Loader2, 
  X,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  ShieldCheck,
  Clock,
  UserCog,
  UserMinus
} from 'lucide-react';

export default function UsersDirectoryPage() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  
  // Registration Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('sales_rep');
  const [submitting, setSubmitting] = useState(false);
  const [toastText, setToastText] = useState('');

  // Edit Drawer States
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('sales_rep');
  const [editIsActive, setEditIsActive] = useState(true);

  const showToast = (text) => {
    setToastText(text);
    setTimeout(() => setToastText(''), 3000);
  };

  const fetchSessionAndUsers = async () => {
    try {
      // 1. Verify current session role
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
        
        // 2. Fetch entire employee database only if user has admin privileges
        if (meData.user.role !== 'sales_rep') {
          const usersRes = await fetch('/api/users?all=true');
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsers(usersData.users || []);
          }
        }
      }
    } catch (err) {
      console.error('Fetch session/users directory failed:', err);
    } finally {
      setAuthChecking(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndUsers();
  }, []);

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !role) {
      return alert('Please fill in all employee metadata fields.');
    }
    if (password.length < 6) {
      return alert('Security password must be at least 6 characters long.');
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (res.ok) {
        // Reset states
        setName('');
        setEmail('');
        setPassword('');
        setRole('sales_rep');
        setDrawerOpen(false);
        showToast(`🎉 Representative "${data.user.name}" registered successfully!`);
        
        // Reload list
        setLoading(true);
        const reloadRes = await fetch('/api/users?all=true');
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setUsers(reloadData.users || []);
        }
        setLoading(false);
      } else {
        alert(data.error || 'Failed to register new representative profile.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAction = async (userId, action) => {
    if (!confirm(`Are you sure you want to ${action} this employee account request?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(action === 'Approve' ? '🟢 Account approved successfully!' : '🔴 Registration request declined.');
        
        // Reload list
        const reloadRes = await fetch('/api/users?all=true');
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setUsers(reloadData.users || []);
        }
      } else {
        alert(data.error || 'Failed to process approval action.');
      }
    } catch (err) {
      console.error('Approval request API failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDrawer = (emp) => {
    setEditUserId(emp._id);
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditRole(emp.role);
    setEditIsActive(emp.isActive !== false);
    setEditDrawerOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim() || !editRole) {
      return alert('Please fill in all required fields.');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${editUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, role: editRole, isActive: editIsActive })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`🎉 Profile "${editName}" successfully updated!`);
        setEditDrawerOpen(false);
        
        // Reload list
        setLoading(true);
        const reloadRes = await fetch('/api/users?all=true');
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setUsers(reloadData.users || []);
        }
        setLoading(false);
      } else {
        alert(data.error || 'Failed to update employee profile.');
      }
    } catch (err) {
      console.error('Update employee error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`⚠️ WARNING: Are you sure you want to permanently revoke all access and delete the employee profile for "${userName}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`🔴 Account "${userName}" permanently deleted.`);
        
        // Reload list
        const reloadRes = await fetch('/api/users?all=true');
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setUsers(reloadData.users || []);
        }
      } else {
        alert(data.error || 'Failed to delete employee account.');
      }
    } catch (err) {
      console.error('Delete employee error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeStyle = (userRole) => {
    switch (userRole) {
      case 'owner': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'sales_admin': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getRoleDisplayName = (userRole) => {
    switch (userRole) {
      case 'owner': return 'Owner';
      case 'sales_admin': return 'Sales Manager';
      default: return 'Sales Rep';
    }
  };

  // Split users into pending approvals and already approved directory members
  const pendingUsers = users.filter((u) => u.approvalStatus === 'Pending');
  const approvedUsers = users.filter((u) => u.approvalStatus === 'Approved' || !u.approvalStatus);

  // --- airtight security block ---
  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-400 font-bold">Verifying security session gates...</p>
      </div>
    );
  }

  if (currentUser?.role === 'sales_rep') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-slate-800 p-6 select-none bg-slate-50">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center space-y-5">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm animate-bounce">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">Administrative Access Restricted</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2.5">
              Strict Security Policy: Sales Representatives are restricted from viewing the global organization user directory database logs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative h-full">

      {/* --- TOAST --- */}
      {toastText && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl text-white flex items-center gap-2 text-xs font-black">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
          <span>{toastText}</span>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-500" />
            Users & Employee Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage organization members, approve self-signup executives, and configure system access parameters.
          </p>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
        >
          <UserPlus className="h-4.5 w-4.5" />
          Register New Representative
        </button>
      </div>

      {/* --- PENDING REGISTRATIONS Hub (Opens dynamically if there are pending signups) --- */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-250 rounded-2xl p-6 space-y-4 animate-in fade-in duration-300">
          <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600 animate-pulse shrink-0" />
            📥 Access Requests Pending Approval ({pendingUsers.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingUsers.map((pending) => (
              <div 
                key={pending._id}
                className="p-4 bg-white border border-amber-200/80 rounded-xl flex items-start gap-3 shadow-sm hover:shadow-md transition relative"
              >
                {/* Initials pending symbol */}
                <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-800 font-mono font-black text-xs flex items-center justify-center shrink-0 uppercase">
                  {pending.name.slice(0, 2)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs md:text-sm truncate block leading-none">{pending.name}</h4>
                    <span className="text-[9px] text-slate-400 font-mono truncate block mt-1">{pending.email}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="inline-block px-1.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 text-[8px] font-black uppercase rounded font-mono">
                      PENDING {pending.role === 'sales_admin' ? 'MANAGER' : 'REP'}
                    </span>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleApproveAction(pending._id, 'Approve')}
                        title="Approve Representative"
                        className="p-1 px-2 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer flex items-center gap-1 text-[9px] font-bold transition"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveAction(pending._id, 'Reject')}
                        title="Decline Request"
                        className="p-1 px-2 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer flex items-center gap-1 text-[9px] font-bold transition"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- EMPLOYEE DIRECTORY INDEX CARD --- */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-150">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
          Active Directory Members ({approvedUsers.length})
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-xs text-slate-400 font-bold">Compiling directory database records...</p>
          </div>
        ) : approvedUsers.length === 0 ? (
          <div className="py-20 text-center text-slate-400 font-bold text-xs italic">
            No active employee directory records.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedUsers.map((emp) => (
              <div 
                key={emp._id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition duration-150 flex items-start gap-4 shadow-sm relative group"
              >
                {/* Admin Actions controls for System Owner */}
                {currentUser?.role === 'owner' && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <button
                      onClick={() => handleOpenEditDrawer(emp)}
                      title="Edit Account Details"
                      className="p-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-450 hover:text-indigo-650 shadow-sm transition cursor-pointer"
                    >
                      <UserCog className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(emp._id, emp.name)}
                      title="Revoke Member Access"
                      className="p-1 rounded bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-250 text-slate-450 hover:text-rose-650 shadow-sm transition cursor-pointer"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {/* Initials badge */}
                <div className={`h-11 w-11 rounded-full bg-gradient-to-tr ${
                  emp.role === 'owner' ? 'from-indigo-500 to-indigo-650' :
                  emp.role === 'sales_admin' ? 'from-emerald-500 to-teal-600' :
                  'from-blue-500 to-indigo-500'
                } text-white font-mono font-black text-sm flex items-center justify-center shadow-sm uppercase shrink-0`}>
                  {emp.name.slice(0, 2)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-800 text-xs md:text-sm truncate block leading-none">{emp.name}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Active Account"></span>
                    </div>
                    
                    <a 
                      href={`mailto:${emp.email}`}
                      className="text-[10px] text-slate-400 font-medium hover:underline flex items-center gap-1 mt-1 truncate"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      {emp.email}
                    </a>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/70">
                    <span className={`inline-block px-2 py-0.5 text-[8px] font-black uppercase rounded border ${getRoleBadgeStyle(emp.role)}`}>
                      {getRoleDisplayName(emp.role)}
                    </span>
                    
                    <span className="text-[8px] font-semibold text-slate-400 font-mono flex items-center gap-1 font-semibold">
                      <Calendar className="h-3 w-3" />
                      Joined {new Date(emp.createdAt).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- REGISTER NEW USER DRAWER MODAL --- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <UserPlus className="h-5 w-5 text-emerald-500" />
                Register New System Representative
              </h2>
              <button 
                onClick={() => setDrawerOpen(false)} 
                className="p-1 rounded hover:bg-slate-200 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Display Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g. Vikramaditya Sen"
                  className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@company.com"
                  className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Access Security Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Assigned System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
                >
                  <option value="sales_rep">Sales Representative (Restricted Access)</option>
                  <option value="sales_admin">Sales Manager (Manager Access)</option>
                  {currentUser?.role === 'owner' && (
                    <option value="owner">System Owner (Full System Control)</option>
                  )}
                </select>
              </div>

              {/* Secure Notice */}
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-[10px] font-semibold leading-relaxed text-amber-700 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  The employee will be active immediately. Role permissions can be configured directly inside the Permissions Gates Board after successful account creation.
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Registration
              </button>
            </form>
          </div>
        </div>
      )}
      {/* --- EDIT USER DRAWER MODAL --- */}
      {editDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                <UserCog className="h-5 w-5 text-indigo-650 animate-spin-once" />
                Configure Employee Access Profile
              </h2>
              <button 
                onClick={() => setEditDrawerOpen(false)} 
                className="p-1 rounded hover:bg-slate-200 text-slate-400 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Employee Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">System Authorization Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition text-slate-800 cursor-pointer"
                >
                  <option value="sales_rep">Sales Representative (Restricted Access)</option>
                  <option value="sales_admin">Sales Manager (Manager Access)</option>
                  <option value="owner">System Owner (Full System Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-150 animate-in slide-in-from-bottom duration-300">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide block">Account Status</span>
                  <span className="text-[9px] text-slate-400 font-semibold block leading-none">Toggle employee active state</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    editIsActive ? 'bg-indigo-650' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      editIsActive ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black tracking-wide shadow-md shadow-indigo-600/15 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Configuration Changes
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
