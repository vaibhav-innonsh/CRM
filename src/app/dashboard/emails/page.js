'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Users,
  UserCheck,
  Download,
  Eye,
  Reply,
  Sparkles,
  Flame,
  Activity,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Clock,
  ArrowRight,
  User
} from 'lucide-react';

export default function EmailHubPage() {
  // Page states
  const [emails, setEmails] = useState([]);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('leads'); // leads or contacts

  // Form states
  const [targetId, setTargetId] = useState('');
  const [subject, setSubject] = useState('');
  const [proposalFile, setProposalFile] = useState('Proposal.pdf');
  const [body, setBody] = useState(
    "Hi {{firstName}},\n\nI hope you are doing well!\n\nI have reviewed your requirements from {{company}} and prepared a detailed proposal for our corporate CRM implementation services.\n\nPlease find the attached estimate ({{proposalFile}}) and download it to review the pricing details.\n\nLooking forward to hearing your thoughts!\n\nBest regards,\nSales Team"
  );
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Simulator states
  const [selectedSimId, setSelectedSimId] = useState('');
  const [simulatingOpen, setSimulatingOpen] = useState(false);
  const [simulatingDownload, setSimulatingDownload] = useState(false);
  const [simulatingReply, setSimulatingReply] = useState(false);
  const [simulatorStatus, setSimulatorStatus] = useState('');

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch initial campaign, leads, and contacts data
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch sent emails
      const emailsRes = await fetch('/api/emails');
      let emailsData = { emails: [] };
      if (emailsRes.ok) {
        emailsData = await emailsRes.json();
      }

      // 2. Fetch Leads
      const leadsRes = await fetch('/api/leads');
      let leadsData = { leads: [] };
      if (leadsRes.ok) {
        leadsData = await leadsRes.json();
      }

      // 3. Fetch Contacts
      const contactsRes = await fetch('/api/contacts');
      let contactsData = { contacts: [] };
      if (contactsRes.ok) {
        contactsData = await contactsRes.json();
      }

      setEmails(emailsData.emails || []);
      setLeads(leadsData.leads || []);
      setContacts(contactsData.contacts || []);

      // Autofill first lead/contact as target in composition form
      if (activeTab === 'leads' && leadsData.leads?.length > 0) {
        setTargetId(leadsData.leads[0]._id);
      } else if (activeTab === 'contacts' && contactsData.contacts?.length > 0) {
        setTargetId(contactsData.contacts[0]._id);
      }

      // Autofill first email in simulator dropdown if empty and emails exist
      if (emailsData.emails?.length > 0 && !selectedSimId) {
        setSelectedSimId(emailsData.emails[0]._id);
      }
    } catch (err) {
      console.error('Error fetching email campaign data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync composition form targets when tab changes
  useEffect(() => {
    if (activeTab === 'leads' && leads.length > 0) {
      setTargetId(leads[0]._id);
    } else if (activeTab === 'contacts' && contacts.length > 0) {
      setTargetId(contacts[0]._id);
    } else {
      setTargetId('');
    }
  }, [activeTab, leads, contacts]);

  // Handle Dispatch Email Campaign
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!targetId) {
      setFormError('Please select a target recipient.');
      return;
    }
    if (!subject.trim()) {
      setFormError('Please enter a subject.');
      return;
    }
    if (!body.trim()) {
      setFormError('Please enter a body.');
      return;
    }

    try {
      setSending(true);
      setFormSuccess('');
      setFormError('');

      const emailPayload = {
        subject,
        body: body.replace(/\{\{proposalFile\}\}/g, proposalFile || 'Proposal.pdf'),
        leadId: activeTab === 'leads' ? targetId : null,
        contactId: activeTab === 'contacts' ? targetId : null,
        proposalFile: proposalFile || ''
      };

      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess('Email dispatched successfully! Tracking pixel and proposal attachment download links are embedded.');
        setSubject('');
        // Reload statistics and feed list
        await fetchData();
        // Automatically select the newly sent email for client action simulation
        if (data.email) {
          setSelectedSimId(data.email._id);
        }
      } else {
        setFormError(data.error || 'Failed to dispatch campaign.');
      }
    } catch (err) {
      console.error('Email compose error:', err);
      setFormError('An unexpected server error occurred.');
    } finally {
      setSending(false);
    }
  };

  // Automated Tracking Client Simulator Operations
  const triggerSimulateOpen = async () => {
    if (!selectedSimId) return;
    try {
      setSimulatingOpen(true);
      setSimulatorStatus('');

      const res = await fetch(`/api/emails/track/open?id=${selectedSimId}`);
      if (res.ok) {
        setSimulatorStatus('🎉 Simulation Success: Email open tracked! Tracking pixel loaded, status shifted, and rep alert issued.');
        await fetchData();
      } else {
        setSimulatorStatus('❌ Simulation Failed to process open action.');
      }
    } catch (err) {
      console.error(err);
      setSimulatorStatus('❌ Network failure during simulation.');
    } finally {
      setSimulatingOpen(false);
    }
  };

  const triggerSimulateDownload = async () => {
    if (!selectedSimId) return;
    try {
      setSimulatingDownload(true);
      setSimulatorStatus('');

      // Simulate by loading redirect URL dynamically to trigger DB action
      const res = await fetch(`/api/emails/track/download?id=${selectedSimId}`);
      if (res.ok) {
        setSimulatorStatus('🎉 Simulation Success: PDF download tracked! Lead Score +20, Lead status shifted to Qualified, and notification popped.');

        // Let's actually trigger a browser file download of the tracked PDF
        const link = document.createElement('a');
        link.href = `/api/emails/track/download?id=${selectedSimId}`;
        link.setAttribute('download', proposalFile || 'Proposal.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        await fetchData();
      } else {
        setSimulatorStatus('❌ Simulation Failed to process download action.');
      }
    } catch (err) {
      console.error(err);
      setSimulatorStatus('❌ Network failure during simulation.');
    } finally {
      setSimulatingDownload(false);
    }
  };

  const triggerSimulateReply = async () => {
    if (!selectedSimId) return;
    try {
      setSimulatingReply(true);
      setSimulatorStatus('');

      const res = await fetch(`/api/emails/track/reply?id=${selectedSimId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setSimulatorStatus('🎉 Simulation Success: Client response logged! Lead Score +30, high-priority follow-up Task automatically scheduled for tomorrow, and team alert triggered.');
        await fetchData();
      } else {
        setSimulatorStatus(`❌ Simulation Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      setSimulatorStatus('❌ Network failure during simulation.');
    } finally {
      setSimulatingReply(false);
    }
  };

  // Analytics aggregates calculation
  const totalSent = emails.length;
  const totalOpens = emails.reduce((sum, e) => sum + (e.opensCount || 0), 0);
  const totalDownloads = emails.reduce((sum, e) => sum + (e.downloadsCount || 0), 0);
  const totalReplies = emails.filter(e => e.replied).length;

  const openRate = totalSent > 0 ? Math.round((emails.filter(e => e.opensCount > 0).length / totalSent) * 100) : 0;
  const downloadRate = totalSent > 0 ? Math.round((emails.filter(e => e.downloadsCount > 0).length / totalSent) * 100) : 0;
  const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;

  // Filtered emails based on search query
  const filteredEmails = emails.filter(email => {
    const q = searchQuery.toLowerCase();
    const subMatch = email.subject?.toLowerCase().includes(q);
    const bodyMatch = email.body?.toLowerCase().includes(q);
    const fileMatch = email.proposalFile?.toLowerCase().includes(q);

    let leadMatch = false;
    let contactMatch = false;

    if (email.leadId) {
      const name = `${email.leadId.firstName || ''} ${email.leadId.lastName || ''} ${email.leadId.company || ''}`.toLowerCase();
      leadMatch = name.includes(q);
    }
    if (email.contactId) {
      const name = `${email.contactId.firstName || ''} ${email.contactId.lastName || ''} ${email.contactId.company || ''}`.toLowerCase();
      contactMatch = name.includes(q);
    }

    return subMatch || bodyMatch || fileMatch || leadMatch || contactMatch;
  });

  const getRecipientName = (email) => {
    if (email.leadId) {
      return `${email.leadId.firstName} ${email.leadId.lastName || ''} (${email.leadId.company})`;
    }
    if (email.contactId) {
      return `${email.contactId.firstName} ${email.contactId.lastName || ''} (${email.contactId.company})`;
    }
    return 'Unknown Recipient';
  };

  const getRecipientType = (email) => {
    if (email.leadId) return { label: 'Lead', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (email.contactId) return { label: 'Contact', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    return { label: 'General', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const activeEmailForSim = emails.find(e => e._id === selectedSimId);

  return (
    <div className="space-y-6">
      {/* Dynamic Glassmorphic Top Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent_60%)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider mb-3">
              <Sparkles className="h-3 w-3 animate-pulse" /> Real-time Email Campaign Tracking
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Email Campaigns & Proposal Engagement Hub</h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Dispatched proposals are automatically embedded with invisible 1x1 open-tracking pixels and secure PDF download monitoring routes.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all border border-indigo-500 active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Hub
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Dispatch */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Sent</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{totalSent}</span>
            <span className="text-[10px] text-slate-500 font-medium block mt-1.5">Tracked Campaigns Logged</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
            <Mail className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Opens Tracker */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Opens Summary</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800 block">{totalOpens}</span>
              <span className="text-xs font-bold text-emerald-600 font-mono">({openRate}%)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-1.5">Unique views registered</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0">
            <Eye className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Proposal Downloads */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">PDF Downloads</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800 block">{totalDownloads}</span>
              <span className="text-xs font-bold text-sky-600 font-mono">({downloadRate}%)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-1.5">Lead Score boosted (+20)</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-550 shrink-0">
            <Download className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Response Rate */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Client Responses</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800 block">{totalReplies}</span>
              <span className="text-xs font-bold text-violet-600 font-mono">({replyRate}%)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-1.5">Auto-followups assigned</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-500 shrink-0">
            <Reply className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Double Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Email Compose Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-500" /> Compose Tracked Sales Proposal
              </h2>
              <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('leads')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'leads' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  To Lead
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('contacts')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'contacts' ? 'bg-white text-teal-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  To Contact
                </button>
              </div>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4 text-left">
              {/* Recipient Dropdown Selection */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Target Recipient ({activeTab === 'leads' ? 'Leads Directory' : 'Contacts Directory'})
                </label>
                {activeTab === 'leads' ? (
                  leads.length === 0 ? (
                    <div className="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg border border-rose-100 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      No leads exist in the directory. Please create a lead first!
                    </div>
                  ) : (
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                    >
                      {leads.map(l => (
                        <option key={l._id} value={l._id}>
                          {l.firstName} {l.lastName} - {l.company} ({l.email || 'No email'})
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  contacts.length === 0 ? (
                    <div className="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg border border-rose-100 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      No contacts exist in the directory. Please create a contact first!
                    </div>
                  ) : (
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-500 transition"
                    >
                      {contacts.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.firstName} {c.lastName} - {c.company} ({c.email || 'No email'})
                        </option>
                      ))}
                    </select>
                  )
                )}
              </div>

              {/* Proposal File and Subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Embedded Attachment Filename
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={proposalFile}
                      onChange={(e) => setProposalFile(e.target.value)}
                      placeholder="e.g. Proposal.pdf"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Campaign Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Proposal Estimate for {{company}}"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Email Body & Templates Guide */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Email Body Content
                  </label>
                  <span className="text-[8px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Use placeholders: {"{{firstName}}"}, {"{{name}}"}, {"{{company}}"}
                  </span>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows="9"
                  placeholder="Draft your proposal email..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs font-medium text-slate-700 font-mono focus:outline-none focus:border-indigo-500 transition leading-relaxed"
                ></textarea>
              </div>

              {formSuccess && (
                <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-start gap-2.5 leading-relaxed">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {formError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-start gap-2.5 leading-relaxed">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sending || (activeTab === 'leads' && leads.length === 0) || (activeTab === 'contacts' && contacts.length === 0)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50 active:scale-[0.99] cursor-pointer"
              >
                {sending ? 'Dispatching Tracked Estimate...' : 'Dispatch Proposal & Start Tracking'}
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Dynamic Simulator Sandbox */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-5 text-left">
            <div className="pb-4 border-b border-slate-200">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-500 animate-bounce" /> Visual Engagement Simulator
              </h2>
              <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
                Test the automation pipelines (Lead Score increments, notification alerts, status shifts, auto-created tasks) immediately.
              </p>
            </div>

            {/* Select Sent Email dropdown */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Select Tracked Email to Simulate Client Actions
              </label>
              {emails.length === 0 ? (
                <div className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-center">
                  No sent campaign emails found. Create and dispatch a proposal to start simulating actions!
                </div>
              ) : (
                <select
                  value={selectedSimId}
                  onChange={(e) => {
                    setSelectedSimId(e.target.value);
                    setSimulatorStatus('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                >
                  {emails.map((e, idx) => (
                    <option key={e._id} value={e._id}>
                      #{emails.length - idx} - Recipient: {getRecipientName(e).slice(0, 35)}... - Subject: "{e.subject.slice(0, 20)}..."
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected Email Live Statistics HUD */}
            {activeEmailForSim && (
              <div className="bg-slate-900 text-white rounded-xl p-4.5 shadow-inner border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-indigo-500/10 to-transparent pointer-events-none rounded-bl-full"></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2 border-b border-slate-800 pb-1.5">
                  Selected Email Campaign Metrics
                </span>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">To Recipient:</span>
                    <span className="font-bold text-indigo-300 truncate max-w-[200px]" title={getRecipientName(activeEmailForSim)}>
                      {getRecipientName(activeEmailForSim)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Proposal Attachment:</span>
                    <span className="font-mono text-[10px] text-sky-300 font-bold">
                      📎 {activeEmailForSim.proposalFile || 'None'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800 text-center">
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Opens</span>
                      <span className="text-sm font-black text-emerald-400 block mt-0.5">{activeEmailForSim.opensCount || 0}</span>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Downloads</span>
                      <span className="text-sm font-black text-sky-400 block mt-0.5">{activeEmailForSim.downloadsCount || 0}</span>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Replied?</span>
                      <span className={`text-[10px] font-black block mt-1.5 uppercase ${activeEmailForSim.replied ? 'text-violet-400' : 'text-slate-400'}`}>
                        {activeEmailForSim.replied ? 'Yes 💬' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Control Buttons */}
            {activeEmailForSim && (
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Simulate Client Action Triggers:
                </span>

                {/* Open trigger */}
                <button
                  onClick={triggerSimulateOpen}
                  disabled={simulatingOpen}
                  className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-xl transition duration-200 active:scale-[0.99] font-bold text-xs disabled:opacity-50 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
                    1. Simulate Client Open Pixel Loading
                  </span>
                  <span className="text-[8px] uppercase tracking-wider bg-emerald-200 text-emerald-950 font-black px-2 py-0.5 rounded font-mono">
                    {simulatingOpen ? 'Tracking...' : 'FIRE PIXEL'}
                  </span>
                </button>

                {/* Download trigger */}
                <button
                  onClick={triggerSimulateDownload}
                  disabled={simulatingDownload || !activeEmailForSim.proposalFile}
                  className="w-full flex items-center justify-between px-4 py-3 bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 rounded-xl transition duration-200 active:scale-[0.99] font-bold text-xs disabled:opacity-50 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-sky-600 shrink-0" />
                    2. Simulate Client Downloading PDF Estimate
                  </span>
                  <span className="text-[8px] uppercase tracking-wider bg-sky-200 text-sky-950 font-black px-2 py-0.5 rounded font-mono">
                    {simulatingDownload ? 'Downloading...' : 'SCORE +20'}
                  </span>
                </button>

                {/* Reply trigger */}
                <button
                  onClick={triggerSimulateReply}
                  disabled={simulatingReply}
                  className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 border border-violet-200 text-violet-800 hover:bg-violet-100 rounded-xl transition duration-200 active:scale-[0.99] font-bold text-xs disabled:opacity-50 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Reply className="h-4 w-4 text-violet-600 shrink-0" />
                    3. Simulate Client Replying to Proposal
                  </span>
                  <span className="text-[8px] uppercase tracking-wider bg-violet-200 text-violet-950 font-black px-2 py-0.5 rounded font-mono">
                    {simulatingReply ? 'Simulating...' : 'SCORE +30 & TASK'}
                  </span>
                </button>
              </div>
            )}

            {/* Simulation Status Logger */}
            {simulatorStatus && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs leading-relaxed text-slate-700 flex items-start gap-2.5">
                <Activity className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                <span className="font-semibold">{simulatorStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Sent Campaigns Table & Feed */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-left">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200 mb-5">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-500" /> Outbox Campaigns Logs
            </h2>
            <p className="text-[10px] text-slate-400 mt-1 font-medium block">
              Complete catalog of dispatched emails and real-time proposal tracking statistics.
            </p>
          </div>

          <div className="w-full md:w-64 shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sent campaigns..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 italic text-xs flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin" />
            Synchronizing campaign metrics...
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="py-12 text-center text-slate-500 italic text-xs bg-slate-50 rounded-xl border border-dashed">
            No matched tracked email campaigns logged in the outbox.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-medium text-slate-600 min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="pb-3 text-left pl-2">Recipient</th>
                  <th className="pb-3 text-left">Subject Line</th>
                  <th className="pb-3 text-center">Open Statistics</th>
                  <th className="pb-3 text-center">Proposal PDF File</th>
                  <th className="pb-3 text-center">Status States</th>
                  <th className="pb-3 text-right pr-2">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmails.map((email) => {
                  const rType = getRecipientType(email);
                  return (
                    <tr key={email._id} className="hover:bg-slate-50/50 transition">
                      {/* Recipient info */}
                      <td className="py-3.5 pl-2 text-left">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded border ${rType.color}`}>
                            {rType.label}
                          </span>
                          <span className="font-extrabold text-slate-800 block">
                            {getRecipientName(email)}
                          </span>
                        </div>
                      </td>

                      {/* Subject and body snippet */}
                      <td className="py-3.5 text-left max-w-xs">
                        <span className="font-bold text-slate-800 block truncate" title={email.subject}>
                          {email.subject}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate mt-0.5 max-w-[200px]">
                          {email.body}
                        </span>
                      </td>

                      {/* Opens counter */}
                      <td className="py-3.5 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200 font-bold">
                          <Eye className={`h-3.5 w-3.5 ${email.opensCount > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <span className={email.opensCount > 0 ? 'text-emerald-700 font-extrabold' : 'text-slate-600'}>
                            {email.opensCount || 0} opens
                          </span>
                        </div>
                      </td>

                      {/* Attached proposal */}
                      <td className="py-3.5 text-center">
                        {email.proposalFile ? (
                          <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200">
                            <span className="font-mono text-[10px] text-slate-700 font-bold">
                              📎 {email.proposalFile}
                            </span>
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0"></span>
                            <span className="font-semibold text-slate-500 font-mono text-[9px]">
                              {email.downloadsCount || 0} downloads
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">None Attached</span>
                        )}
                      </td>

                      {/* Status Badges */}
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Open indicator */}
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${email.opensCount > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}>
                            {email.opensCount > 0 ? 'Opened 👁️' : 'Sent'}
                          </span>

                          {/* Reply indicator */}
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${email.replied
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                            {email.replied ? 'Replied 💬' : 'Unreplied'}
                          </span>
                        </div>
                      </td>

                      {/* Dispatched At date */}
                      <td className="py-3.5 text-right pr-2 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                        <span className="block font-bold">
                          {new Date(email.createdAt).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-0.5">
                          {new Date(email.createdAt).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
