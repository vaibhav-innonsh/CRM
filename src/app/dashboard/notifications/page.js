'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  Bell, 
  Trash2, 
  CheckCheck, 
  Calendar,
  AlertTriangle,
  ArrowRight,
  Info,
  CheckCircle,
  Users,
  FileText
} from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastText, setToastText] = useState('');

  const showToast = (text) => {
    setToastText(text);
    setTimeout(() => setToastText(''), 3000);
  };

  const fetchAllNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Fetch notices failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllNotifications();
  }, []);

  // Mark all read
  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/notifications', { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        showToast('✔️ All notifications marked as read.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark single read
  const handleMarkSingleRead = async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        showToast('Alert read.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== id));
        showToast('🗑️ Alert purged.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case 'Invoice': return { icon: '🧾', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-350' };
      case 'Task': return { icon: '🚨', bg: 'bg-rose-50 text-rose-800 border-rose-200 hover:border-rose-350' };
      case 'Lead': return { icon: '🤝', bg: 'bg-blue-50 text-blue-800 border-blue-200 hover:border-blue-350' };
      default: return { icon: '🔔', bg: 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-350' };
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Bell className="h-7 w-7 text-emerald-500" />
            System Notifications Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Review history logs, qualified alerts, and pending action items within Innonsh CRM operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-lg border border-emerald-200 transition cursor-pointer"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
          <div className="shrink-0 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs font-extrabold text-slate-550 shadow-sm">
            <span>{unreadCount} Unread Alerts</span>
          </div>
        </div>
      </div>

      {/* --- MAIN HUB CONTENT --- */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-xs text-slate-400 font-bold">Compiling your live systems alerts feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 mb-4 shadow-sm animate-pulse">
              <Bell className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Clear Skies! No alerts found</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1 font-medium">
              You are completely up to date with your leads, billing items, and corporate meetings timeline schedules.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {notifications.map((notice) => {
              const style = getAlertStyle(notice.type);
              
              return (
                <div
                  key={notice._id}
                  onClick={() => { handleMarkSingleRead(notice._id); if (notice.link) router.push(notice.link); }}
                  className={`p-4 rounded-xl border flex items-start gap-4 transition cursor-pointer shadow-sm ${style.bg} ${
                    !notice.isRead ? 'ring-1 ring-indigo-500/20' : 'opacity-75'
                  }`}
                >
                  {/* Category icon */}
                  <div className="h-8.5 w-8.5 rounded-full bg-white border border-slate-250 flex items-center justify-center text-sm shadow-sm shrink-0">
                    {style.icon}
                  </div>

                  {/* Body description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-extrabold text-slate-900 text-xs md:text-sm">{notice.title}</span>
                      <span className="text-[9px] text-slate-400 font-mono tracking-tighter">
                        {new Date(notice.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-655 mt-1 leading-relaxed whitespace-pre-wrap">
                      {notice.message}
                    </p>

                    {notice.link && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-700 uppercase tracking-widest mt-2.5 hover:underline">
                        👉 Resolve Alert & View Workspace
                        <ArrowRight className="h-3 w-3 stroke-[2.5]" />
                      </span>
                    )}
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-2 self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!notice.isRead && (
                      <button
                        onClick={() => handleMarkSingleRead(notice._id)}
                        className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-600 transition"
                        title="Mark read"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteNotification(e, notice._id)}
                      className="p-1 rounded hover:bg-white text-slate-400 hover:text-rose-600 transition"
                      title="Purge notice log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
