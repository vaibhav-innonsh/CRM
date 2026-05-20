'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  CheckCircle, 
  ArrowRight, 
  Clock,
  Sparkles,
  PlusCircle,
  Loader2,
  Building,
  Target,
  Trophy,
  Award,
  Zap,
  Crown
} from 'lucide-react';

export default function DashboardSummaryPage() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLeads: 0,
    totalDeals: 0,
    pipelineValuation: 0,
    wonValuation: 0,
    conversionRate: 0
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [recentDeals, setRecentDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [meRes, leadsRes, dealsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/leads'),
          fetch('/api/deals')
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
        }

        if (leadsRes.ok && dealsRes.ok) {
          const leadsData = await leadsRes.json();
          const dealsData = await dealsRes.json();

          const allLeads = leadsData.leads || [];
          const allDeals = dealsData.deals || [];

          const totalL = allLeads.length;
          const activeL = allLeads.filter(l => l.status !== 'Lost' && l.status !== 'Qualified').length;
          const qualifiedL = allLeads.filter(l => l.status === 'Qualified').length;

          const totalD = allDeals.length;
          const activePipelineVal = allDeals
            .filter(d => d.stage !== 'Won' && d.stage !== 'Lost')
            .reduce((sum, d) => sum + d.value, 0);

          const wonVal = allDeals
            .filter(d => d.stage === 'Won')
            .reduce((sum, d) => sum + d.value, 0);

          const convRate = totalL > 0 ? Math.round((qualifiedL / totalL) * 100) : 0;

          setStats({
            totalLeads: totalL,
            activeLeads: activeL,
            totalDeals: totalD,
            pipelineValuation: activePipelineVal,
            wonValuation: wonVal,
            conversionRate: convRate
          });

          setRecentLeads(allLeads.slice(0, 4));
          setRecentDeals(allDeals.slice(0, 4));
        }
      } catch (err) {
        console.error('Fetch dashboard stats failed:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-500 font-semibold">Compiling executive summary...</p>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  const isRep = currentUser?.role === 'sales_rep';
  const monthlyTarget = 250000;
  const targetPercent = Math.min(100, Math.round((stats.wonValuation / monthlyTarget) * 100));
  const strokeRadius = 40;
  const strokeCircumference = 2 * Math.PI * strokeRadius;
  const strokeDashoffset = strokeCircumference - (targetPercent / 100) * strokeCircumference;

  if (isRep) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        
        {/* --- CUSTOM WELCOMING COMMAND HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Zap className="h-6 w-6 text-indigo-650 animate-bounce" />
              Hello, {currentUser?.name || 'Representative'}! 👋
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Welcome back to your Sales Command Center. Track your metrics, follow up with hot leads, and crush your targets!
            </p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Link
              href="/dashboard/leads"
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-350 text-xs font-bold text-slate-700 shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-indigo-650" />
              New Lead
            </Link>
            <Link
              href="/dashboard/deals"
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-650/10 transition cursor-pointer"
            >
              Go to Sales Pipeline
              <ArrowRight className="h-3.5 w-3.5 text-white" />
            </Link>
          </div>
        </div>

        {/* --- DYNAMIC METRICS CARDS FOR REPS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Leads */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">My Active Leads</span>
              <span className="text-2xl font-black text-slate-800 block">{stats.activeLeads}</span>
              <span className="text-[9px] text-slate-400 block font-semibold">Total Assigned: {stats.totalLeads}</span>
            </div>
            <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
              <Users className="h-5 w-5" />
            </div>
          </div>

          {/* Active Pipeline Valuation */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">My Deals Pipeline</span>
              <span className="text-2xl font-black text-amber-600 block">{formatCurrency(stats.pipelineValuation)}</span>
              <span className="text-[9px] text-slate-400 block font-semibold">Deals in Pipeline: {stats.totalDeals}</span>
            </div>
            <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          {/* Closed Won Revenue */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Closed Won Revenue</span>
              <span className="text-2xl font-black text-emerald-600 block">{formatCurrency(stats.wonValuation)}</span>
              <span className="text-[9px] text-slate-400 block font-semibold">Your Secured Deals Billing</span>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">My Conversion Rate</span>
              <span className="text-2xl font-black text-indigo-650 block">{stats.conversionRate}%</span>
              <span className="text-[9px] text-slate-400 block font-semibold">Lead to Qualified Deal Ratio</span>
            </div>
            <div className="p-3.5 bg-indigo-50 rounded-xl text-indigo-650 border border-indigo-100">
              <Target className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* --- MAIN TWO-COLUMN WORKSPACE GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Main Column: Revenue & Directory Lists */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Revenue Progress */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Revenue Distribution Analysis</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Secured Billings vs. Open Pipeline Valuation.</p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                  Total Managed Pipeline: {formatCurrency(stats.pipelineValuation + stats.wonValuation)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                  {stats.pipelineValuation + stats.wonValuation === 0 ? (
                    <div className="w-full bg-slate-200 rounded-full"></div>
                  ) : (
                    <>
                      <div 
                        className="bg-emerald-500 shadow-sm shadow-emerald-500/10 transition-all duration-500" 
                        style={{ width: `${(stats.wonValuation / (stats.pipelineValuation + stats.wonValuation)) * 100}%` }}
                      ></div>
                      <div 
                        className="bg-amber-500 shadow-sm shadow-amber-500/10 transition-all duration-500" 
                        style={{ width: `${(stats.pipelineValuation / (stats.pipelineValuation + stats.wonValuation)) * 100}%` }}
                      ></div>
                    </>
                  )}
                </div>
                <div className="flex justify-start gap-5 pt-1 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2.5 w-2.5 rounded bg-emerald-500"></span>
                    <span>Closed Won ({stats.pipelineValuation + stats.wonValuation > 0 ? Math.round((stats.wonValuation / (stats.pipelineValuation + stats.wonValuation)) * 100) : 0}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2.5 w-2.5 rounded bg-amber-500"></span>
                    <span>Active Pipeline ({stats.pipelineValuation + stats.wonValuation > 0 ? Math.round((stats.pipelineValuation / (stats.pipelineValuation + stats.wonValuation)) * 100) : 0}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-Side Recent items lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Recent Leads */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-400" />
                    My Recent Leads
                  </h3>
                  <Link href="/dashboard/leads" className="text-[10px] text-indigo-600 hover:text-indigo-500 font-black flex items-center gap-0.5 group">
                    View All
                    <ArrowRight className="h-3.5 w-3.5 text-indigo-650 group-hover:translate-x-0.5 transition" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100 space-y-3 pt-1">
                  {recentLeads.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No assigned leads. Ask your manager to assign leads.</p>
                  ) : (
                    recentLeads.map((lead) => (
                      <div key={lead._id} className="flex items-center justify-between pt-3 first:pt-0">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-650 text-xs font-bold flex items-center justify-center border border-slate-200">
                            {lead.firstName[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{lead.firstName} {lead.lastName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{lead.company}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                          lead.status === 'New' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          lead.status === 'Contacted' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          lead.status === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          'bg-rose-55 text-rose-700 border border-rose-100'
                        }`}>
                          {lead.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Deals */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-400" />
                    My Active Deals
                  </h3>
                  <Link href="/dashboard/deals" className="text-[10px] text-indigo-600 hover:text-indigo-500 font-black flex items-center gap-0.5 group">
                    View Pipeline
                    <ArrowRight className="h-3.5 w-3.5 text-indigo-650 group-hover:translate-x-0.5 transition" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100 space-y-3 pt-1">
                  {recentDeals.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No deals active in pipeline.</p>
                  ) : (
                    recentDeals.map((deal) => (
                      <div key={deal._id} className="flex items-center justify-between pt-3 first:pt-0">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-650 text-xs font-bold flex items-center justify-center border border-slate-200">
                            {deal.title[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{deal.title}</p>
                            <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5 font-semibold">
                              <Building className="h-3 w-3 shrink-0 text-slate-350" />
                              <span>{deal.company}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-800">{formatCurrency(deal.value)}</p>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wider">{deal.stage}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Target Ring, Teammate leaderboard & Actions checklist */}
          <div className="space-y-6">
            
            {/* --- Radial Goal Ring Card --- */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="w-full flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Monthly Target Goal</h3>
                <span className="text-[9px] font-black text-indigo-650 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded uppercase font-mono">Target Active</span>
              </div>

              {/* Glowing SVG Progress Circle */}
              <div className="relative h-28 w-28 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r={strokeRadius}
                    className="stroke-slate-100 fill-transparent"
                    strokeWidth="8"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={strokeRadius}
                    className="stroke-indigo-600 fill-transparent transition-all duration-500"
                    strokeWidth="8"
                    strokeDasharray={strokeCircumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-800 leading-none">{targetPercent}%</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono mt-1">Crushed</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black text-slate-800">{formatCurrency(stats.wonValuation)} Won</p>
                <p className="text-[10px] text-slate-400 font-semibold">of {formatCurrency(monthlyTarget)} Target Goal</p>
              </div>

              {targetPercent >= 85 ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-150 text-[10px] font-semibold text-emerald-750 flex items-center gap-1.5 w-full justify-center">
                  <Trophy className="h-4.5 w-4.5 text-emerald-600" />
                  <span>🔥 Awesome! Crushing target goal!</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 text-[10px] font-semibold text-slate-600 flex items-center gap-1.5 w-full justify-center">
                  <Award className="h-4.5 w-4.5 text-indigo-600" />
                  <span>⚡ Keep selling, you're doing great!</span>
                </div>
              )}
            </div>

            {/* --- Teammates rankings leaderboard --- */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="h-4.5 w-4.5 text-amber-500" />
                Team Rankings
              </h3>

              <div className="space-y-2.5">
                {/* Team #1 */}
                <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-[11px] font-extrabold text-slate-800 block">Vikramaditya Patel</span>
                      <span className="text-[8px] text-slate-400 font-bold font-mono">Rank 1 • Leader</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-700">₹3,80,000</span>
                </div>

                {/* Team #2 - You */}
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-indigo-650 shrink-0" />
                    <div>
                      <span className="text-[11px] font-black text-indigo-800 block">{currentUser?.name} (You)</span>
                      <span className="text-[8px] text-indigo-500 font-extrabold font-mono">Rank 2 • Contender</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-indigo-700">₹{stats.wonValuation.toLocaleString('en-IN')}</span>
                </div>

                {/* Team #3 */}
                <div className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-150 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-[10px] font-black text-slate-400 text-center shrink-0">3</span>
                    <div>
                      <span className="text-[11px] font-extrabold text-slate-800 block">Amit Sharma</span>
                      <span className="text-[8px] text-slate-400 font-bold font-mono">Rank 3 • Representative</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-700">₹1,50,000</span>
                </div>
              </div>
            </div>

            {/* --- Priority checklist widget --- */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                Daily Focus Checklist
              </h3>

              <div className="space-y-2.5 pt-1 text-[11px] font-semibold text-slate-650">
                <div className="flex items-start gap-2">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded text-indigo-650 cursor-pointer" />
                  <span>Update cold leads (&gt;5 days inactive)</span>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-0.5 rounded text-indigo-650 cursor-pointer" />
                  <span>Move won deals to Closing Stage</span>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-0.5 rounded text-indigo-650 cursor-pointer" />
                  <span>Schedule follow-up meetings with new leads</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* --- WELCOME HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-500" />
            Executive Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Real-time business performance analytics, active sales pipelines, and key conversion summaries.
          </p>
        </div>
        
        {/* Quick Actions Shortcuts */}
        <div className="flex gap-2 shrink-0">
          <Link
            href="/dashboard/leads"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-350 text-xs font-bold text-slate-700 shadow-sm transition"
          >
            <PlusCircle className="h-4 w-4 text-emerald-500" />
            New Lead
          </Link>
          <Link
            href="/dashboard/deals"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-500/10 transition"
          >
            Go to Sales Pipeline
            <ArrowRight className="h-3.5 w-3.5 text-white" />
          </Link>
        </div>
      </div>

      {/* --- ANALYTICS STATS METRIC GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Leads */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Leads</span>
            <span className="text-2xl font-black text-slate-800 block">{stats.activeLeads}</span>
            <span className="text-[9px] text-slate-400 block font-semibold">Total registered: {stats.totalLeads}</span>
          </div>
          <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Active Pipeline Valuation */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Pipeline</span>
            <span className="text-2xl font-black text-amber-600 block">{formatCurrency(stats.pipelineValuation)}</span>
            <span className="text-[9px] text-slate-400 block font-semibold">Active deals in stage: {stats.totalDeals}</span>
          </div>
          <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Revenue Closed Won */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Closed Won Revenue</span>
            <span className="text-2xl font-black text-emerald-600 block">{formatCurrency(stats.wonValuation)}</span>
            <span className="text-[9px] text-slate-400 block font-semibold">100% Secured and paid</span>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conversion Performance</span>
            <span className="text-2xl font-black text-indigo-650 block">{stats.conversionRate}%</span>
            <span className="text-[9px] text-slate-400 block font-semibold">Lead-to-Deal Conversion</span>
          </div>
          <div className="p-3.5 bg-indigo-50 rounded-xl text-indigo-650 border border-indigo-100">
            <Target className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* --- DYNAMIC CUSTOM REVENUE VISUALIZATION BAR --- */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Revenue Distribution Analysis</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Ratio of active deals pipeline valuation vs. already secured billing revenue.</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
            Total Valuation: {formatCurrency(stats.pipelineValuation + stats.wonValuation)}
          </span>
        </div>

        {/* Custom Progress visualization bar */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
            {stats.pipelineValuation + stats.wonValuation === 0 ? (
              <div className="w-full bg-slate-200 rounded-full"></div>
            ) : (
              <>
                <div 
                  className="bg-emerald-500 shadow-sm shadow-emerald-500/10 transition-all duration-500" 
                  style={{ width: `${(stats.wonValuation / (stats.pipelineValuation + stats.wonValuation)) * 100}%` }}
                ></div>
                <div 
                  className="bg-amber-500 shadow-sm shadow-amber-500/10 transition-all duration-500" 
                  style={{ width: `${(stats.pipelineValuation / (stats.pipelineValuation + stats.wonValuation)) * 100}%` }}
                ></div>
              </>
            )}
          </div>
          <div className="flex justify-start gap-5 pt-1 text-[10px] font-bold">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2.5 w-2.5 rounded bg-emerald-500"></span>
              <span>Closed Won ({stats.pipelineValuation + stats.wonValuation > 0 ? Math.round((stats.wonValuation / (stats.pipelineValuation + stats.wonValuation)) * 100) : 0}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2.5 w-2.5 rounded bg-amber-500"></span>
              <span>Active Pipeline ({stats.pipelineValuation + stats.wonValuation > 0 ? Math.round((stats.pipelineValuation / (stats.pipelineValuation + stats.wonValuation)) * 100) : 0}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- GRID SUMMARY: RECENT LEADS & RECENT DEALS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Active Leads */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              Latest Leads Added
            </h3>
            <Link href="/dashboard/leads" className="text-xs text-emerald-600 hover:text-emerald-500 font-bold flex items-center gap-0.5 group">
              View All Leads
              <ArrowRight className="h-3.5 w-3.5 text-emerald-600 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 space-y-3 pt-1">
            {recentLeads.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No leads registered yet. Click shortcut buttons to log one.</p>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead._id} className="flex items-center justify-between pt-3 first:pt-0">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center border border-slate-200">
                      {lead.firstName[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{lead.firstName} {lead.lastName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{lead.company}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                    lead.status === 'New' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    lead.status === 'Contacted' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    lead.status === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    'bg-rose-55 text-rose-700 border border-rose-100'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Pipeline Deals */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              Latest Active Deals
            </h3>
            <Link href="/dashboard/deals" className="text-xs text-amber-600 hover:text-amber-500 font-bold flex items-center gap-0.5 group">
              View Pipeline
              <ArrowRight className="h-3.5 w-3.5 text-amber-600 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 space-y-3 pt-1">
            {recentDeals.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No converted deal pipeline cards currently registered.</p>
            ) : (
              recentDeals.map((deal) => (
                <div key={deal._id} className="flex items-center justify-between pt-3 first:pt-0">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-650 text-xs font-bold flex items-center justify-center border border-slate-200">
                      {deal.title[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{deal.title}</p>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5 font-semibold">
                        <Building className="h-3 w-3 shrink-0 text-slate-350" />
                        <span>{deal.company}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-800">{formatCurrency(deal.value)}</p>
                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wider">{deal.stage}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
