'use client';

import { useEffect, useState } from 'react';
import { 
  Network, 
  Plus, 
  Crown, 
  Users, 
  Target, 
  Loader2, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  UserCheck, 
  Compass,
  Edit2
} from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastText, setToastText] = useState('');

  // Drawer modal states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTeamId, setEditTeamId] = useState('');

  // Form states
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamLeader, setTeamLeader] = useState('');
  const [teamRegion, setTeamRegion] = useState('General');
  const [teamTarget, setTeamTarget] = useState(100000);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const showToast = (text) => {
    setToastText(text);
    setTimeout(() => setToastText(''), 3000);
  };

  const fetchSessionAndTeams = async () => {
    try {
      // 1. Fetch current user session
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);

        // 2. Fetch list of teams (filtered dynamically by role on backend)
        const teamsRes = await fetch('/api/teams');
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeams(teamsData.teams || []);
        }

        // 3. Fetch directory users to populate leader and member dropdowns
        const usersRes = await fetch('/api/users?all=true');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setDirectoryUsers(usersData.users || []);
        }
      }
    } catch (err) {
      console.error('Fetch teams dashboard data failed:', err);
    } finally {
      setAuthChecking(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndTeams();
  }, []);

  // Filter users by system roles for drawer dropdowns
  const availableManagers = directoryUsers.filter(u => u.role === 'sales_admin' && (u.approvalStatus === 'Approved' || !u.approvalStatus));
  const availableReps = directoryUsers.filter(u => u.role === 'sales_rep' && (u.approvalStatus === 'Approved' || !u.approvalStatus));

  const handleOpenCreateDrawer = () => {
    setEditMode(false);
    setEditTeamId('');
    setTeamName('');
    setTeamDescription('');
    setTeamLeader(currentUser?.role === 'sales_admin' ? currentUser.id : '');
    setTeamRegion('General');
    setTeamTarget(250000);
    setSelectedMembers([]);
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (team) => {
    setEditMode(true);
    setEditTeamId(team._id);
    setTeamName(team.name);
    setTeamDescription(team.description || '');
    setTeamLeader(team.leader?._id || '');
    setTeamRegion(team.region || 'General');
    setTeamTarget(team.targetAmount || 0);
    setSelectedMembers(team.members ? team.members.map(m => m._id) : []);
    setDrawerOpen(true);
  };

  const handleMemberToggle = (repId) => {
    setSelectedMembers(prev => 
      prev.includes(repId) ? prev.filter(id => id !== repId) : [...prev, repId]
    );
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return alert('Please enter a team name.');

    setSubmitting(true);
    try {
      const url = editMode ? `/api/teams/${editTeamId}` : '/api/teams';
      const method = editMode ? 'PUT' : 'POST';

      const payload = {
        name: teamName.trim(),
        description: teamDescription.trim(),
        leader: currentUser?.role === 'sales_admin' ? currentUser.id : teamLeader,
        region: teamRegion.trim(),
        targetAmount: Number(teamTarget) || 0,
        members: selectedMembers
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast(editMode ? `🎉 Team "${teamName}" successfully updated!` : `🎉 Sales team "${teamName}" created!`);
        setDrawerOpen(false);
        
        // Reload list
        setLoading(true);
        const reloadRes = await fetch('/api/teams');
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setTeams(reloadData.teams || []);
        }
        setLoading(false);
      } else {
        alert(data.error || 'Failed to configure sales team.');
      }
    } catch (err) {
      console.error('Submit team failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId, name) => {
    if (!confirm(`⚠️ WARNING: Are you sure you want to permanently disband and delete the sales team "${name}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`🔴 Team "${name}" permanently deleted.`);
        
        // Reload list
        const reloadRes = await fetch('/api/teams');
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setTeams(reloadData.teams || []);
        }
      } else {
        alert(data.error || 'Failed to delete team.');
      }
    } catch (err) {
      console.error('Delete team error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-400 font-bold">Verifying security session gates...</p>
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
            <Network className="h-7 w-7 text-indigo-650" />
            CRM Sales Teams
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Organize sales representatives into structural regions, assign managers, and track collective team revenue targets.
          </p>
        </div>

        <button
          onClick={handleOpenCreateDrawer}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          Create New Team
        </button>
      </div>

      {/* --- SALES MANAGER INLINE NOTIFICATION CONTEXT --- */}
      {currentUser?.role === 'sales_admin' && (
        <div className="rounded-xl bg-indigo-50/50 border border-indigo-150 p-4 text-xs font-semibold leading-relaxed text-indigo-750 flex gap-2.5">
          <Crown className="h-5 w-5 shrink-0 mt-0.5 text-indigo-600 animate-pulse" />
          <div>
            <span className="font-extrabold uppercase font-mono block text-[9px] text-indigo-500 tracking-wider">Manager Mode Active</span>
            <span className="block mt-0.5">
              👋 Welcome back! You are logged in as a **Sales Manager**. You have full authority to create, edit, and configure targets for the sales team you lead. System Owners maintain global master visibility.
            </span>
          </div>
        </div>
      )}

      {/* --- TEAMS INDEX LIST GRID --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-400 font-black">Syncing organizational team records...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-slate-200 rounded-2xl bg-white space-y-3">
          <Users className="h-10 w-10 text-slate-350 mx-auto" />
          <p className="text-xs text-slate-400 font-black italic">No sales team configurations active in directory.</p>
          <button
            onClick={handleOpenCreateDrawer}
            className="text-[10px] font-black text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            Create the first team now ➡️
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => {
            // Calculate a beautiful simulated target completion to give a rich, state-of-the-art visual aesthetic!
            const simulatedCurrentProgress = Math.min(100, Math.floor((team.name.length * 7) % 65) + 30); // Dynamic values between 30% and 95%
            const isOwner = currentUser?.role === 'owner';
            const isLeader = currentUser?.role === 'sales_admin' && team.leader?._id === currentUser.id;

            return (
              <div 
                key={team._id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition duration-200 relative group flex flex-col justify-between gap-4"
              >
                {/* Dynamic Configuration Controls for Owner or team Leader */}
                {(isOwner || isLeader) && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <button
                      onClick={() => handleOpenEditDrawer(team)}
                      title="Configure Team Settings"
                      className="p-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-450 hover:text-indigo-650 shadow-sm transition cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team._id, team.name)}
                      title="Disband Team Permanently"
                      className="p-1 rounded bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-250 text-slate-450 hover:text-rose-650 shadow-sm transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Team Identification Badge Header */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-550 to-violet-650 text-white font-mono font-black text-sm flex items-center justify-center shadow-md uppercase shrink-0">
                      {team.name.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-800 text-sm truncate leading-none">{team.name}</h4>
                      <span className="text-[9px] text-slate-400 font-semibold uppercase font-mono block mt-1 tracking-wider">{team.region || 'General'} Region</span>
                    </div>
                  </div>

                  {/* Team Description */}
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed min-h-[30px] line-clamp-2">
                    {team.description || 'No strategic focus description configured for this sales team.'}
                  </p>

                  {/* Team Leader Banner */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                      <Crown className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest block font-mono">Team Leader</span>
                      <span className="text-xs font-extrabold text-slate-800 truncate block leading-none mt-0.5">{team.leader?.name || 'Unassigned Leader'}</span>
                    </div>
                  </div>

                  {/* Overlapping Members Stack */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">Team Members ({team.members?.length || 0})</span>
                    {team.members && team.members.length > 0 ? (
                      <div className="flex items-center gap-2">
                        {/* Overlap queue bubbles */}
                        <div className="flex -space-x-2.5 overflow-hidden">
                          {team.members.slice(0, 5).map((member) => (
                            <div 
                              key={member._id}
                              title={member.name}
                              className="inline-block h-7 w-7 rounded-full bg-slate-200 border-2 border-white text-[9px] font-black font-mono text-slate-700 uppercase flex items-center justify-center shrink-0 shadow-sm"
                            >
                              {member.name.slice(0, 2)}
                            </div>
                          ))}
                          {team.members.length > 5 && (
                            <div className="inline-block h-7 w-7 rounded-full bg-slate-800 border-2 border-white text-[8px] font-black text-white flex items-center justify-center shrink-0 shadow-sm">
                              +{team.members.length - 5}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-450 font-bold leading-none">
                          {team.members.slice(0, 2).map(m => m.name.split(' ')[0]).join(', ')} {team.members.length > 2 && 'and more'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 italic">No representatives assigned to team.</span>
                    )}
                  </div>
                </div>

                {/* Simulated Revenue Targets progress visuals */}
                <div className="pt-3.5 border-t border-slate-150 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-[9px] font-mono font-black uppercase">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Target className="h-3.5 w-3.5 text-indigo-500" />
                      Target Goal
                    </span>
                    <span className="text-indigo-650">₹{team.targetAmount.toLocaleString('en-IN')}</span>
                  </div>
                  
                  {/* Glowing Premium Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-150 flex items-center">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-indigo-650 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${simulatedCurrentProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-450 uppercase font-mono">
                      <span>Simulated Performance</span>
                      <span className="text-emerald-600 font-extrabold">{simulatedCurrentProgress}% Accomplished</span>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* --- UNIFIED TEAM CONFIG DRAWER (MODAL OVERLAY) --- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                <Network className="h-5 w-5 text-indigo-650 shrink-0" />
                {editMode ? 'Configure Team Parameters' : 'Register New Sales Team'}
              </h2>
              <button 
                onClick={() => setDrawerOpen(false)} 
                className="p-1 rounded hover:bg-slate-200 text-slate-400 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleTeamSubmit} className="p-6 space-y-4">
              
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Western Zone Pioneers"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-800"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Focus Strategy / Description</label>
                <textarea
                  rows={2}
                  placeholder="Write a brief overview of team targets or strategic sales goals..."
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-800"
                />
              </div>

              {/* Region and Target Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Sales Region</label>
                  <input
                    type="text"
                    required
                    value={teamRegion}
                    onChange={(e) => setTeamRegion(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Monthly Target (₹)</label>
                  <input
                    type="number"
                    required
                    value={teamTarget}
                    onChange={(e) => setTeamTarget(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-800"
                  />
                </div>
              </div>

              {/* Team Leader - OWNER SELECTABLE / MANAGER LOCKED */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Designated Team Leader</label>
                {currentUser?.role === 'sales_admin' ? (
                  <div className="w-full px-3.5 py-2 bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg flex items-center justify-between select-none">
                    <span>{currentUser.name} (You)</span>
                    <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                  </div>
                ) : (
                  <select
                    value={teamLeader}
                    required
                    onChange={(e) => setTeamLeader(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Choose Sales Manager --</option>
                    {availableManagers.map(m => (
                      <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Team Members Selection (Multi-select checklist) */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono leading-none">
                  Select Team Members ({selectedMembers.length})
                </label>
                
                <div className="border border-slate-200 rounded-xl max-h-[140px] overflow-y-auto divide-y divide-slate-150 p-2 bg-slate-50/50">
                  {availableReps.length === 0 ? (
                    <span className="text-[10px] text-slate-400 font-bold p-3 block text-center italic">No active Sales Representatives available.</span>
                  ) : (
                    availableReps.map(rep => {
                      const isSelected = selectedMembers.includes(rep._id);
                      return (
                        <div 
                          key={rep._id}
                          onClick={() => handleMemberToggle(rep._id)}
                          className="flex items-center justify-between py-2 px-2 hover:bg-slate-100 rounded-lg cursor-pointer transition"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-700 block truncate leading-none">{rep.name}</span>
                            <span className="text-[8px] font-semibold text-slate-450 font-mono block mt-1">{rep.email}</span>
                          </div>
                          
                          <button
                            type="button"
                            className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition ${
                              isSelected ? 'bg-indigo-650 border-indigo-650 text-white' : 'bg-white border-slate-300 text-transparent'
                            }`}
                          >
                            <UserCheck className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black tracking-wide shadow-md shadow-indigo-600/15 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editMode ? 'Save Team Configuration' : 'Establish New Sales Team'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
