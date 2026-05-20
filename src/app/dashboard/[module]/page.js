'use client';

import { useParams, useRouter } from 'next/navigation';
import { 
  Wrench, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  Zap
} from 'lucide-react';

export default function DynamicModuleFallbackPage() {
  const params = useParams();
  const router = useRouter();
  const moduleSlug = params.module || '';

  const getModuleDisplayName = (slug) => {
    switch (slug) {
      case 'contacts': return 'Contacts Directory';
      case 'tasks': return 'Tasks Manager & Reminders';
      case 'calls': return 'Call Logs & Record Suite';
      case 'meetings': return 'Meetings & Calendar Scheduler';
      case 'products': return 'Products Catalogue';
      case 'quotations': return 'Quotations Builder';
      case 'invoices': return 'Invoices & Billing Hub';
      case 'reports': return 'Sales Reports Builder';
      case 'analytics': return 'BI Analytics & Forecasting';
      case 'users': return 'Users & Employee Directory';
      case 'roles': return 'Roles & Permission Gates';
      case 'teams': return 'Teams & Department Manager';
      case 'notifications': return 'System Alerts & Notifications';
      case 'settings': return 'CRM System Preferences';
      case 'profile': return 'User Profile Center';
      default: return slug.charAt(0).toUpperCase() + slug.slice(1);
    }
  };

  const getModulePhase = (slug) => {
    const activities = ['tasks', 'calls', 'meetings', 'contacts'];
    const billing = ['products', 'quotations', 'invoices'];
    const analytics = ['reports', 'analytics'];
    const admin = ['users', 'roles', 'teams'];

    if (activities.includes(slug)) return { phase: 'Phase 5', name: 'Unified Activities Logs', status: 'Scheduled for Next Step' };
    if (billing.includes(slug)) return { phase: 'Phase 6', name: 'Inventory & Billing Suite', status: 'Under Scaffolding' };
    if (analytics.includes(slug)) return { phase: 'Phase 6', name: 'Interactive Reports & Analytics', status: 'Scheduled for Design' };
    if (admin.includes(slug)) return { phase: 'Phase 7', name: 'Advanced Team Administration', status: 'Under Security Scaffolding' };
    return { phase: 'Phase 5', name: 'CRM Portal Addon', status: 'Planned' };
  };

  const moduleName = getModuleDisplayName(moduleSlug);
  const phaseInfo = getModulePhase(moduleSlug);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-slate-800 font-sans relative overflow-hidden select-none bg-slate-50">
      {/* Background glowing particles */}
      <div className="absolute top-1/3 left-1/3 h-72 w-72 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/3 h-72 w-72 rounded-full bg-amber-500/5 blur-[100px] pointer-events-none"></div>

      {/* Main card */}
      <div className="w-full max-w-2xl bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl shadow-slate-200/50 relative z-10 space-y-8">
        
        {/* Module Title & Status Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
              <Wrench className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Innonsh CRM Suite</span>
              <h2 className="text-base font-black text-slate-800 leading-tight mt-0.5">{moduleName}</h2>
            </div>
          </div>
          
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-[10px] font-extrabold text-amber-700 uppercase tracking-wider flex items-center gap-1.5 shrink-0 self-start sm:self-center">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
            {phaseInfo.status}
          </span>
        </div>

        {/* Milestone Description */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-emerald-500" />
            Milestone Specification
          </h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Yeh enterprise module hamari roadmap ke **{phaseInfo.phase} ({phaseInfo.name})** ka part hai. Is module ko high-end parameters aur customized templates ke sath active kiya ja raha hai taaki aap apni company ke services, products, aur employees ko fully manage kar sakein.
          </p>
        </div>

        {/* Development Progress Visual Timeline */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-emerald-500" />
            CRM Implementation Blueprint
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Phase 1-4 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-850 leading-none">Phases 1 - 4</h4>
                <p className="text-[9px] text-slate-400 mt-1 font-semibold">Core Database, Auth System, Leads, and Sales Deals Pipeline.</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-extrabold uppercase rounded border border-emerald-100 font-mono">Completed</span>
              </div>
            </div>

            {/* Current Target */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-emerald-500/30 flex items-start gap-3 relative overflow-hidden shadow-sm shadow-emerald-500/5">
              <HelpCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold text-slate-850 leading-none">{phaseInfo.phase}</h4>
                <p className="text-[9px] text-slate-400 mt-1 font-semibold">{phaseInfo.name} integration setup.</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-extrabold uppercase rounded border border-amber-100 font-mono">In Progress</span>
              </div>
            </div>

            {/* Future Addons */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 opacity-60">
              <Sparkles className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-400 leading-none font-mono">Maturity Addons</h4>
                <p className="text-[9px] text-slate-400 mt-1">Security penetration tests, visual polishes, and custom tools.</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-extrabold uppercase rounded border border-slate-200 font-mono font-semibold">Planned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back navigation actions */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous Page
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-350 text-xs font-bold text-slate-700 rounded-lg shadow-sm transition cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
