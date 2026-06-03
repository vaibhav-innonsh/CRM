'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home,
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
  Sparkles
} from 'lucide-react';

export default function HealthcareLayout({ children }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Suite Overview', href: '/dashboard/healthcare', icon: Home },
    { name: 'Patient Prospects', href: '/dashboard/healthcare/leads', icon: Sparkles },
    { name: 'Patients', href: '/dashboard/healthcare/patients', icon: Users },
    { name: 'Appointments', href: '/dashboard/healthcare/appointments', icon: Calendar },
    { name: 'Doctors', href: '/dashboard/healthcare/doctors', icon: UserCheck },
    { name: 'Medical Records', href: '/dashboard/healthcare/records', icon: FileText },
    { name: 'Prescriptions', href: '/dashboard/healthcare/prescriptions', icon: Heart },
    { name: 'Lab Tests', href: '/dashboard/healthcare/lab-tests', icon: Activity },
    { name: 'Admissions', href: '/dashboard/healthcare/admissions', icon: Building },
    { name: 'Billing', href: '/dashboard/healthcare/billing', icon: Receipt },
    { name: 'Insurance Claims', href: '/dashboard/healthcare/claims', icon: ShieldCheck },
    { name: 'Pharmacy', href: '/dashboard/healthcare/pharmacy', icon: Package },
  ];

  return (
    <div className="space-y-6 select-none font-sans text-left">
      
      {/* Dynamic Glassmorphic Sub-Navigation Header */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border shrink-0 ${
                  isActive 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                    : 'bg-white border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-rose-450 stroke-[2.5]' : 'text-slate-400'}`} />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Inner Content Body */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {children}
      </div>

    </div>
  );
}
