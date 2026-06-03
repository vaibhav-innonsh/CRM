'use client';

import Link from 'next/link';
import { 
  Users,
  Calendar,
  UserCheck,
  FileText,
  Heart,
  Activity,
  Building,
  Receipt,
  ShieldCheck,
  Package,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Stethoscope
} from 'lucide-react';

export default function HealthcareOverviewPage() {
  
  const modules = [
    {
      name: 'Patients Directory',
      desc: 'Centralized Electronic Health Records (EHR/EMR) containing allergies, diagnoses, and insurance plans.',
      icon: Users,
      href: '/dashboard/healthcare/patients',
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50/50 border-blue-100',
      status: 'Ready (Mock Pending)'
    },
    {
      name: 'OPD Appointments',
      desc: 'Schedule consultations, check-in schedules, queue lists, and automatic WhatsApp reminders.',
      icon: Calendar,
      href: '/dashboard/healthcare/appointments',
      color: 'from-emerald-400 to-teal-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50/50 border-emerald-100',
      status: 'Planned'
    },
    {
      name: 'Doctors Directory',
      desc: 'Register doctors, department timings, availability tables, and consultation fee configs.',
      icon: UserCheck,
      href: '/dashboard/healthcare/doctors',
      color: 'from-indigo-400 to-violet-500',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50/50 border-indigo-100',
      status: 'Planned'
    },
    {
      name: 'Medical Records',
      desc: 'Patient history logs containing detailed diagnostic findings, symptoms checklists, and treatment plans.',
      icon: FileText,
      href: '/dashboard/healthcare/records',
      color: 'from-purple-400 to-pink-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50/50 border-purple-100',
      status: 'Planned'
    },
    {
      name: 'E-Prescriptions',
      desc: 'Digital prescription pad with itemized dosages, intake frequencies, durations, and clinical notes.',
      icon: Heart,
      href: '/dashboard/healthcare/prescriptions',
      color: 'from-rose-450 to-pink-600',
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-50/50 border-rose-100',
      status: 'Planned'
    },
    {
      name: 'Lab Diagnostics',
      desc: 'Request medical lab tests, diagnostics status tracking, and technician report file attachments.',
      icon: Activity,
      href: '/dashboard/healthcare/lab-tests',
      color: 'from-sky-400 to-blue-550',
      textColor: 'text-sky-600',
      bgColor: 'bg-sky-50/50 border-sky-100',
      status: 'Planned'
    },
    {
      name: 'Ward Admissions',
      desc: 'Hospitalization and bed assignment board. Dynamic room booking management and transfers.',
      icon: Building,
      href: '/dashboard/healthcare/admissions',
      color: 'from-teal-400 to-emerald-500',
      textColor: 'text-teal-600',
      bgColor: 'bg-teal-50/50 border-teal-100',
      status: 'Planned'
    },
    {
      name: 'Billing & Invoices',
      desc: 'Treatment bills, lab charges, pharmacy billing, discounts, taxes, and payment status checks.',
      icon: Receipt,
      href: '/dashboard/healthcare/billing',
      color: 'from-amber-400 to-orange-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50/50 border-amber-100',
      status: 'Planned'
    },
    {
      name: 'Insurance Claims',
      desc: 'File claims to insurance companies, log policy numbers, and track carrier approved amounts.',
      icon: ShieldCheck,
      href: '/dashboard/healthcare/claims',
      color: 'from-blue-400 to-sky-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50/50 border-blue-100',
      status: 'Planned'
    },
    {
      name: 'Pharmacy Inventory',
      desc: 'Real-time medicine inventory tracking batch numbers, stock levels, unit prices, and expiry warnings.',
      icon: Package,
      href: '/dashboard/healthcare/pharmacy',
      color: 'from-slate-500 to-slate-700',
      textColor: 'text-slate-700',
      bgColor: 'bg-slate-50/50 border-slate-100',
      status: 'Planned'
    }
  ];

  const workflowSteps = [
    { num: '1', title: 'Lead Triaged', desc: 'Patient inquiry registered' },
    { num: '2', title: 'Patient Profile', desc: 'EHR card generated' },
    { num: '3', title: 'OPD Appointment', desc: 'Doctor slot confirmed' },
    { num: '4', title: 'Consultation', desc: 'Record symptoms & notes' },
    { num: '5', title: 'Prescription', desc: 'Medicines & dosage log' },
    { num: '6', title: 'Diagnostics', desc: 'Lab tests completed' },
    { num: '7', title: 'Invoicing', desc: 'Hospital treatment billing' },
    { num: '8', title: 'Claim Filed', desc: 'Insurance claims closed' },
  ];

  return (
    <div className="space-y-6 text-left">
      
      {/* Premium Glassmorphic Top Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-950 p-6 md:p-8 text-white shadow-xl overflow-hidden animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(244,63,94,0.1),transparent_60%)]"></div>
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-rose-500/5 blur-[60px] pointer-events-none"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-450 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="h-3 w-3 animate-pulse" /> Healthcare module suite
          </div>
          
          <div className="max-w-2xl space-y-2">
            <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-rose-450 shrink-0" /> Premium Healthcare ERP Suite
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
              Transform your CRM into a modern Hospital and Clinic Management dashboard. Track digital Patient EHR cards, organize doctor appointments, log consultation diagnosis histories, write itemized prescriptions, allocate rooms/beds, and run seamless billing pipelines.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of 10 Healthcare Sub-Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div 
              key={mod.name} 
              className={`bg-white border rounded-2xl p-5 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden`}
            >
              <div className="space-y-4">
                {/* Header Icon */}
                <div className={`h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-750 transition duration-300 group-hover:scale-105 shrink-0 shadow-sm`}>
                  <Icon className="h-5 w-5 text-rose-600" />
                </div>
                
                {/* Content */}
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 tracking-tight group-hover:text-rose-650 transition duration-150">{mod.name}</h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{mod.desc}</p>
                </div>
              </div>

              {/* Action Button & Status */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-wider ${
                  mod.status.includes('Ready') 
                    ? 'bg-emerald-50 border-emerald-250 text-emerald-700 font-extrabold' 
                    : 'bg-amber-50 border-amber-250 text-amber-700 font-bold'
                }`}>
                  {mod.status}
                </span>
                
                <Link 
                  href={mod.href} 
                  className="flex items-center gap-0.5 text-slate-700 hover:text-rose-600 transition group-hover:translate-x-0.5 duration-200 cursor-pointer"
                >
                  Open <ChevronRight className="h-3 w-3 stroke-[2.5]" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real Healthcare Journey Progress Tracker */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-rose-500/5 to-transparent pointer-events-none rounded-bl-full"></div>
        
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200 mb-5">
          <TrendingUp className="h-4.5 w-4.5 text-rose-500" />
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">Standard Patient Lifespan Journey Flow</h3>
            <span className="text-[9px] text-slate-400 font-bold mt-1 block">A linear pipeline connecting raw patient leads to treatment and billing claims</span>
          </div>
        </div>

        {/* Step Progression Timeline */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {workflowSteps.map((step, idx) => (
            <div key={step.title} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl relative flex flex-col justify-between gap-2 shadow-sm text-center">
              <div className="h-6 w-6 rounded-full bg-rose-500 text-white font-mono font-black text-xs flex items-center justify-center mx-auto border-4 border-white shadow-sm shrink-0">
                {step.num}
              </div>
              <div className="space-y-0.5">
                <span className="font-extrabold text-slate-800 text-[11px] block">{step.title}</span>
                <span className="text-[9px] text-slate-400 font-semibold block leading-tight">{step.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
