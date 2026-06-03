'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  UserCheck,
  Building,
  Layers,
  Lock,
  MapPin,
  Search,
  BookOpen,
  CreditCard,
  Handshake,
  Ban,
  FolderOpen,
  KeyRound
} from 'lucide-react';

export default function RealEstateLayout({ children }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Suite Overview', href: '/dashboard/real-estate', icon: Home },
    { name: 'Leads', href: '/dashboard/real-estate/leads', icon: Users },
    { name: 'Contacts', href: '/dashboard/real-estate/contacts', icon: UserCheck },
    { name: 'Properties', href: '/dashboard/real-estate/properties', icon: Building },
    { name: 'Projects', href: '/dashboard/real-estate/projects', icon: Layers },
    { name: 'Unit Inventory', href: '/dashboard/real-estate/units', icon: Lock },
    { name: 'Site Visits', href: '/dashboard/real-estate/visits', icon: MapPin },
    { name: 'Property Matching', href: '/dashboard/real-estate/matching', icon: Search },
    { name: 'Bookings', href: '/dashboard/real-estate/bookings', icon: BookOpen },
    { name: 'Payment Plans', href: '/dashboard/real-estate/payments', icon: CreditCard },
    { name: 'Channel Partners', href: '/dashboard/real-estate/partners', icon: Handshake },
    { name: 'Blocking', href: '/dashboard/real-estate/blocking', icon: Ban },
    { name: 'Documents Vault', href: '/dashboard/real-estate/documents', icon: FolderOpen },
    { name: 'Possessions', href: '/dashboard/real-estate/possessions', icon: KeyRound }
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
                    : 'bg-white border-transparent text-slate-650 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-500 stroke-[2.5]' : 'text-slate-400'}`} />
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
