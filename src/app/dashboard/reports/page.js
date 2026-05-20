'use client';

import { useEffect, useState } from 'react';
import { 
  Loader2, 
  TrendingUp, 
  Award, 
  DollarSign, 
  FileText,
  Percent,
  Users,
  Target,
  BarChart3,
  Calendar,
  Phone,
  CheckCircle,
  Briefcase,
  Trophy,
  ArrowUpRight,
  TrendingDown,
  ChevronRight,
  PieChart
} from 'lucide-react';

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReportData(data.data);
      }
    } catch (err) {
      console.error('Fetch reports failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function initReports() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);
        }
      } catch (err) {
        console.error('Fetch current user details error:', err);
      }
    }
    initReports();
    fetchReports();
  }, []);

  // Formatter currency (INR)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="text-sm font-semibold text-slate-500">Compiling executive BI analytical reports databases...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold bg-white border rounded-xl">
        Failed to retrieve corporate analytics charts. Please contact system administrator.
      </div>
    );
  }

  const { funnel, leadSources, leadPriorities, pipeline, financials, leaderboard } = reportData;

  // Leaderboard medals helper
  const getRankBadge = (index) => {
    switch (index) {
      case 0: return { icon: '🥇', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 1: return { icon: '🥈', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 2: return { icon: '🥉', bg: 'bg-amber-100 text-amber-900 border-amber-200' };
      default: return { icon: `#${index + 1}`, bg: 'bg-slate-50 text-slate-550 border-slate-150' };
    }
  };

  return (
    <div className="space-y-6 relative h-full">

      {/* --- HEADER PANELS --- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-emerald-500" />
            Executive BI Analytics Suite
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Corporate overview panel of monthly sales funnel metrics, locking pipeline values, and representative scorecards.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-slate-250 text-xs font-bold text-slate-655 shadow-sm">
          <Calendar className="h-4 w-4 text-emerald-500" />
          <span>Real-Time Live Compilations</span>
        </div>
      </div>

      {/* --- BUSINESS INTELLIGENCE METRICS WIDGETS --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-350">
        
        {/* Total Pipeline value */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-slate-350 transition duration-150">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Total Deals Pipeline</span>
            <span className="text-2xl font-black text-indigo-700 block mt-1">{formatCurrency(pipeline.totalPipelineValue)}</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Briefcase className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Sales conversion percentage */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-slate-350 transition duration-150">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Client Conversion Rate</span>
            <span className="text-2xl font-black text-emerald-650 block mt-1">{funnel.conversionRate}%</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Percent className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Closed Corporate Revenue */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-slate-350 transition duration-150">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Net Revenue Closed</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">{formatCurrency(financials.totalRevenueClosed)}</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
            <DollarSign className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Pending proposal values */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-slate-350 transition duration-150">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Active Proposals Value</span>
            <span className="text-2xl font-black text-amber-600 block mt-1">{formatCurrency(financials.pendingProposalsValue)}</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <FileText className="h-5.5 w-5.5" />
          </div>
        </div>

      </div>

      {/* --- PROGRESS FUNNELS AND STAGE LOCKS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN: Leads Conversion Funnel progress bars & Sources */}
        <div className="space-y-6">
          
          {/* Conversion Funnel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5.5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Target className="h-4.5 w-4.5 text-emerald-500" />
              Leads Qualification conversion funnel
            </h2>
            
            <div className="space-y-3.5">
              {/* Total Inbound Leads */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-655 mb-1.5">
                  <span>Total Inbound Prospects</span>
                  <span>{funnel.totalLeadsCount} Leads</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-slate-700 h-full rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
                </div>
              </div>

              {/* Raw leads (New) */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-655 mb-1.5">
                  <span>Unassigned New Leads (New)</span>
                  <span className="text-slate-500">{funnel.rawLeadsCount} Leads ({funnel.totalLeadsCount > 0 ? Math.round((funnel.rawLeadsCount / funnel.totalLeadsCount) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${funnel.totalLeadsCount > 0 ? (funnel.rawLeadsCount / funnel.totalLeadsCount) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Engaged contacted leads */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-655 mb-1.5">
                  <span>Active Outreach Engagement (Contacted)</span>
                  <span className="text-slate-500">{funnel.contactedLeadsCount} Leads ({funnel.totalLeadsCount > 0 ? Math.round((funnel.contactedLeadsCount / funnel.totalLeadsCount) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${funnel.totalLeadsCount > 0 ? (funnel.contactedLeadsCount / funnel.totalLeadsCount) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Converted Leads (Qualified) */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-655 mb-1.5">
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1">Qualified Contacts (Success Conversion)</span>
                  <span className="text-emerald-700 font-black">{funnel.convertedLeadsCount} Leads ({funnel.conversionRate}%)</span>
                </div>
                <div className="w-full bg-emerald-50 h-3 rounded-full overflow-hidden border border-emerald-100">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${funnel.conversionRate}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Channels Sources */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5.5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <PieChart className="h-4.5 w-4.5 text-indigo-500" />
              Corporate Lead Source channels Distribution
            </h2>
            
            {leadSources.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No sources aggregated.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {leadSources.map((source, index) => {
                  const percent = funnel.totalLeadsCount > 0 
                    ? Math.round((source.value / funnel.totalLeadsCount) * 100) 
                    : 0;

                  return (
                    <div 
                      key={source.name}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between"
                    >
                      <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">{source.name}</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-xl font-black text-slate-850">{source.value}</span>
                        <span className="text-xs font-bold text-indigo-650">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Pipeline stage monetary value progress bars */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5.5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Briefcase className="h-4.5 w-4.5 text-indigo-500" />
              Pipeline Stage financial Distribution locked (INR)
            </h2>
            
            <div className="space-y-4.5 mt-3">
              {Object.entries(pipeline.stageBreakdown).map(([stage, metrics]) => {
                const percent = pipeline.totalPipelineValue > 0 
                  ? Math.round((metrics.value / pipeline.totalPipelineValue) * 100) 
                  : 0;

                // Color selectors for progress stages
                const getBarColor = (stg) => {
                  switch (stg) {
                    case 'Won': return 'bg-emerald-500';
                    case 'Lost': return 'bg-rose-500';
                    case 'Negotiation': return 'bg-indigo-500';
                    case 'Proposal Sent': return 'bg-amber-500';
                    default: return 'bg-slate-400';
                  }
                };

                return (
                  <div key={stage} className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-[11px]">{stage}</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-extrabold">{metrics.count} Deals</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-black text-slate-700">
                        <span>{formatCurrency(metrics.value)}</span>
                        {percent > 0 && <span className="text-[10px] text-slate-400 font-bold">({percent}%)</span>}
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getBarColor(stage)}`} 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lead priority indicators */}
          <div className="border-t border-slate-150 pt-5 mt-6 space-y-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Lead Priorities Index</span>
            <div className="flex gap-4 flex-wrap">
              {leadPriorities.map((prio) => {
                const getPrioColor = (p) => {
                  if (p === 'Hot') return 'bg-rose-50 text-rose-700 border-rose-100';
                  if (p === 'Cold') return 'bg-blue-50 text-blue-700 border-blue-100';
                  return 'bg-amber-50 text-amber-705 border-amber-100';
                };

                return (
                  <span 
                    key={prio.name} 
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${getPrioColor(prio.name)}`}
                  >
                    {prio.name}: <strong className="font-black font-mono ml-0.5">{prio.value}</strong>
                  </span>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* --- BOTTOM SECTION: SALES EXECUTIVE GAMIFIED LEADERBOARD SCORECARD --- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5.5 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3.5">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="h-5 w-5 text-amber-500" />
            Corporate Sales Representatives performance leaderboard
          </h2>
          <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded">
            Rankings weighted dynamically by completed activities & revenue values
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">No representatives registered.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 w-16 text-center">Rank</th>
                  <th className="px-6 py-4">Corporate Representative</th>
                  <th className="px-6 py-4 text-center">Calls Logged</th>
                  <th className="px-6 py-4 text-center">Meetings Hosted</th>
                  <th className="px-6 py-4 text-center">Tasks Completed</th>
                  <th className="px-6 py-4">Closed Revenue</th>
                  <th className="px-6 py-4 text-right">Gamified Activity Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard.map((rep, index) => {
                  const rank = getRankBadge(index);
                  
                  return (
                    <tr key={rep.userId} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black border ${rank.bg}`}>
                          {rank.icon}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">{rep.name}</span>
                          <span className="text-[9px] text-slate-400 capitalize">{rep.role.replace('_', ' ')} | {rep.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-655">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px]">
                          <Phone className="h-3 w-3 text-indigo-400" />
                          {rep.callsLogged}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-655">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-705 text-[10px]">
                          <Calendar className="h-3 w-3 text-amber-400" />
                          {rep.meetingsHosted}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-655">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px]">
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                          {rep.tasksCompleted}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-800">
                        {formatCurrency(rep.revenueClosed)}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-sm text-slate-850">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-900 text-white font-mono font-black text-xs shadow-sm">
                          {rep.activityScore} pts
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
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
