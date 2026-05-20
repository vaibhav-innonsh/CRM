'use client';

import { useEffect, useState } from 'react';
import { 
  User as UserIcon, 
  Lock, 
  ShieldCheck, 
  Settings, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Loader2, 
  Info,
  Calendar
} from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Forms states
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [showPass, setShowPass] = useState(false);
  const [updatingName, setUpdatingName] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);
  const [toastText, setToastText] = useState('');
  
  // User custom CRM Preferences (stored in localStorage)
  const [glassmorphism, setGlassmorphism] = useState('High');
  const [alertSound, setAlertSound] = useState(true);

  const showToast = (text) => {
    setToastText(text);
    setTimeout(() => setToastText(''), 3000);
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setName(data.user.name);
      }
    } catch (err) {
      console.error('Fetch profile details failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    
    // Load local custom CRM preferences if present
    const savedGlass = localStorage.getItem('crm_glassmorphism') || 'High';
    const savedSound = localStorage.getItem('crm_alert_sound') !== 'false';
    setGlassmorphism(savedGlass);
    setAlertSound(savedSound);
  }, []);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Profile display name cannot be blank.');
    setUpdatingName(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        showToast('✔️ Display name successfully updated!');
      } else {
        alert(data.error || 'Failed to update name.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingName(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return alert('Please fill in all security credentials.');
    }
    if (newPassword !== confirmPassword) {
      return alert('New password and password confirmation do not match.');
    }
    if (newPassword.length < 6) {
      return alert('New password must be at least 6 characters long.');
    }

    setUpdatingPass(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('🔒 Password changed successfully!');
      } else {
        alert(data.error || 'Failed to update security credentials.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingPass(false);
    }
  };

  // Save localized CRM styles preferences
  const saveCrmPreference = (key, value) => {
    if (key === 'glass') {
      setGlassmorphism(value);
      localStorage.setItem('crm_glassmorphism', value);
      showToast(`✨ Glassmorphism density set to: ${value}`);
    } else if (key === 'sound') {
      setAlertSound(value);
      localStorage.setItem('crm_alert_sound', value ? 'true' : 'false');
      showToast(value ? '🔊 Bell notifications sound active' : '🔇 Bell notification rings muted');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner': return 'from-indigo-650 to-purple-600 shadow-indigo-200';
      case 'sales_admin': return 'from-emerald-500 to-teal-600 shadow-emerald-200';
      default: return 'from-blue-500 to-indigo-500 shadow-blue-200';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'owner': return 'Owner / Administrator';
      case 'sales_admin': return 'Sales Manager';
      case 'sales_rep': return 'Sales Representative';
      default: return role;
    }
  };

  const getPrivilegeMap = (role) => {
    switch (role) {
      case 'owner': return ['Read & Write All Modules', 'Promote Users & Edit Permissions', 'Invoice Operations & Payment Logs', 'Financial Analytics Access'];
      case 'sales_admin': return ['Read & Write Lead Directory', 'Assign leads to Sales Representatives', 'Approve Quotations & Log payments', 'General reports analytics review'];
      default: return ['Manage Assigned Leads', 'Create Proposal Estimates', 'Schedule Meetings & Logs calls', 'Review personal scorecard leaderboard'];
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-400 font-bold">Compiling profile workspace details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative h-full">

      {/* --- TOAST --- */}
      {toastText && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl text-white flex items-center gap-2 text-xs font-black">
          <Info className="h-4.5 w-4.5 text-emerald-400" />
          <span>{toastText}</span>
        </div>
      )}

      {/* --- HEADER --- */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <UserIcon className="h-7 w-7 text-emerald-500" />
          User Profile Center
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Customize CRM styling options, update profile metadata, and manage your account security credentials.
        </p>
      </div>

      {/* --- MAIN GRID PANELS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* --- LEFT CARD: DYNAMIC PROFILE IDENTITY --- */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col p-6 space-y-6 relative">
          
          {/* Avatar Area */}
          <div className="flex flex-col items-center text-center space-y-3 pt-2">
            <div className={`h-20 w-20 rounded-full bg-gradient-to-tr ${getRoleBadgeColor(user?.role)} text-white font-mono font-black text-2xl flex items-center justify-center shadow-lg uppercase`}>
              {user?.name?.slice(0, 2)}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 leading-tight">{user?.name}</h2>
              <span className="text-[10px] text-slate-400 font-mono font-semibold">{user?.email}</span>
            </div>
            
            <span className={`inline-block px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white rounded-full bg-gradient-to-r ${getRoleBadgeColor(user?.role)} shadow`}>
              {getRoleDisplayName(user?.role)}
            </span>
          </div>

          <hr className="border-slate-100" />

          {/* Account Details */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Role Privilege Limits
            </h3>
            
            <ul className="space-y-2.5">
              {getPrivilegeMap(user?.role).map((priv, idx) => (
                <li key={idx} className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>{priv}</span>
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-slate-100" />

          {/* Footer Metadata */}
          <div className="text-[9px] font-semibold text-slate-400 flex items-center gap-1.5 font-mono">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Operational session active since: {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
          </div>
        </div>

        {/* --- RIGHT PANEL: INTERACTIVE FORMS --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* A. GENERAL SETTINGS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Settings className="h-4.5 w-4.5 text-emerald-500" />
              General Preferences
            </h3>

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full max-w-md px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                />
              </div>

              <button
                type="submit"
                disabled={updatingName}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                {updatingName && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </button>
            </form>
          </div>

          {/* B. ACCOUNT SECURITY */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lock className="h-4.5 w-4.5 text-rose-500" />
              Security & Password Manager
            </h3>

            <form onSubmit={handleUpdatePassword} className="space-y-4.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-550 focus:border-rose-550 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="hidden sm:block"></div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">New Password</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-550 focus:border-rose-550 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block font-mono">Confirm New Password</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-550 focus:border-rose-550 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingPass}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                {updatingPass && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Update Security Credentials
              </button>
            </form>
          </div>

          {/* C. SYSTEM PREFERENCES */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              CRM Visual Styling & Sound Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              
              {/* Sound Alerts Preferences */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Notification Alerts Sounds</h4>
                  <p className="text-[10px] text-slate-450 leading-relaxed font-semibold mt-0.5">Ring alert sounds dynamically when new notification bubbles appear.</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => saveCrmPreference('sound', true)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded border cursor-pointer transition ${
                      alertSound 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Sounds Enabled
                  </button>
                  <button
                    onClick={() => saveCrmPreference('sound', false)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded border cursor-pointer transition ${
                      !alertSound 
                        ? 'bg-rose-50 text-rose-700 border-rose-250' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <VolumeX className="h-3.5 w-3.5" />
                    Mute Rings
                  </button>
                </div>
              </div>

              {/* Glassmorphism Styles Preferences */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Glassmorphic Blur Intensity</h4>
                  <p className="text-[10px] text-slate-450 leading-relaxed font-semibold mt-0.5">Controls glassmorphic blur levels on visual overlay modals and dialog backdrops.</p>
                </div>

                <div className="flex gap-2">
                  {['Standard', 'High'].map((level) => (
                    <button
                      key={level}
                      onClick={() => saveCrmPreference('glass', level)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded border cursor-pointer transition ${
                        glassmorphism === level 
                          ? 'bg-indigo-50 text-indigo-750 border-indigo-250' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {level} Blur Effect
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
