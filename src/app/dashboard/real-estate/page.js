'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building,
  Folder,
  Lock,
  MapPin,
  Search,
  FileText,
  Layers,
  Network,
  Ban,
  FolderOpen,
  KeyRound,
  ChevronRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Users,
  UserCheck,
  Loader2,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Calendar,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export default function RealEstateOverviewPage() {
  const [data, setData] = useState({
    leads: [],
    contacts: [],
    properties: [],
    projects: [],
    units: [],
    visits: [],
    bookings: [],
    partners: [],
    blocking: [],
    possessions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const [
          leadsRes,
          contactsRes,
          propsRes,
          projRes,
          unitRes,
          visitRes,
          bookRes,
          partnerRes,
          blockRes,
          possRes
        ] = await Promise.all([
          fetch('/api/real-estate/leads'),
          fetch('/api/real-estate/contacts'),
          fetch('/api/real-estate/properties'),
          fetch('/api/real-estate/projects'),
          fetch('/api/real-estate/units'),
          fetch('/api/real-estate/visits'),
          fetch('/api/real-estate/bookings'),
          fetch('/api/real-estate/partners'),
          fetch('/api/real-estate/blocking'),
          fetch('/api/real-estate/possessions')
        ]);

        const [leadsData, contactsData, props, proj, unit, visit, book, partner, block, poss] = await Promise.all([
          leadsRes.ok ? leadsRes.json() : { leads: [] },
          contactsRes.ok ? contactsRes.json() : { contacts: [] },
          propsRes.ok ? propsRes.json() : { properties: [] },
          projRes.ok ? projRes.json() : { projects: [] },
          unitRes.ok ? unitRes.json() : { units: [] },
          visitRes.ok ? visitRes.json() : { visits: [] },
          bookRes.ok ? bookRes.json() : { bookings: [] },
          partnerRes.ok ? partnerRes.json() : { partners: [] },
          blockRes.ok ? blockRes.json() : { blockings: [] },
          possRes.ok ? possRes.json() : { possessions: [] }
        ]);

        setData({
          leads: leadsData.leads || [],
          contacts: contactsData.contacts || [],
          properties: props.properties || [],
          projects: proj.projects || [],
          units: unit.units || [],
          visits: visit.visits || [],
          bookings: book.bookings || [],
          partners: partner.partners || [],
          blocking: block.blockings || [],
          possessions: poss.possessions || []
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to fetch real-time overview analytics.');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  // Aggregated Analytics Metrics
  const totalBookingsCount = data.bookings.length;
  
  // Calculate total booked/revenue value from bookings
  const totalRevenue = data.bookings.reduce((sum, b) => {
    const amt = parseFloat(b.bookingAmount || b.amount || 0);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  // Unit Status Breakdown
  const totalUnits = data.units.length;
  const availableUnits = data.units.filter(u => u.status === 'Available').length;
  const blockedUnits = data.units.filter(u => u.status === 'Blocked' || u.status === 'Reserved').length;
  const soldUnits = data.units.filter(u => u.status === 'Sold').length;

  const availablePercent = totalUnits > 0 ? Math.round((availableUnits / totalUnits) * 100) : 0;
  const blockedPercent = totalUnits > 0 ? Math.round((blockedUnits / totalUnits) * 100) : 0;
  const soldPercent = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0;

  // Handovers Completed
  const completedHandovers = data.possessions.filter(p => p.status === 'Handed Over').length;
  const pendingHandovers = data.possessions.filter(p => p.status === 'Scheduled').length;

  // Recent 4 Bookings
  const recentBookings = [...data.bookings]
    .sort((a, b) => new Date(b.createdAt || b.bookingDate) - new Date(a.createdAt || a.bookingDate))
    .slice(0, 4);

  // Recent 4 Site Visits
  const upcomingVisits = [...data.visits]
    .filter(v => v.status === 'Scheduled' || v.status === 'Planned')
    .sort((a, b) => new Date(a.scheduledDate || a.visitDate) - new Date(b.scheduledDate || b.visitDate))
    .slice(0, 4);

  const submodules = [
    { name: 'Leads', href: '/dashboard/real-estate/leads', icon: Users, count: data.leads.length },
    { name: 'Contacts', href: '/dashboard/real-estate/contacts', icon: UserCheck, count: data.contacts.length },
    { name: 'Properties', href: '/dashboard/real-estate/properties', icon: Building, count: data.properties.length },
    { name: 'Projects', href: '/dashboard/real-estate/projects', icon: Folder, count: data.projects.length },
    { name: 'Unit Inventory', href: '/dashboard/real-estate/units', icon: Lock, count: data.units.length },
    { name: 'Site Visits', href: '/dashboard/real-estate/visits', icon: MapPin, count: data.visits.length },
    { name: 'Bookings', href: '/dashboard/real-estate/bookings', icon: FileText, count: data.bookings.length },
    { name: 'Blocking', href: '/dashboard/real-estate/blocking', icon: Ban, count: data.blocking.length },
    { name: 'Documents', href: '/dashboard/real-estate/documents', icon: FolderOpen, count: null },
    { name: 'Possessions', href: '/dashboard/real-estate/possessions', icon: KeyRound, count: data.possessions.length }
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="text-sm font-semibold tracking-wide text-slate-500">Compiling real estate analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <TrendingUp className="h-5 w-5 text-amber-500" /> Real Estate Executive Dashboard
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Real-time sales values, inventory status indicators, and operational registers.
          </p>
        </div>
      </div>

      {/* Main KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue Collection */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Bookings Value</span>
            <span className="font-black text-slate-800 text-xl block leading-tight mt-0.5">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] text-emerald-600 font-bold block mt-1">
              ✓ Across {totalBookingsCount} deals
            </span>
          </div>
        </div>

        {/* Metric 2: Active Site Visits */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Scheduled Site Visits</span>
            <span className="font-black text-slate-800 text-xl block leading-tight mt-0.5">
              {data.visits.filter(v => v.status === 'Scheduled').length}
            </span>
            <span className="text-[9px] text-slate-500 font-bold block mt-1">
              Out of {data.visits.length} total visit requests
            </span>
          </div>
        </div>

        {/* Metric 3: Active Bookings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Acquisition Bookings</span>
            <span className="font-black text-slate-800 text-xl block leading-tight mt-0.5">
              {totalBookingsCount}
            </span>
            <span className="text-[9px] text-blue-600 font-bold block mt-1">
              Active sales agreements
            </span>
          </div>
        </div>

        {/* Metric 4: Handover Completion */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500 shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Handovers Executed</span>
            <span className="font-black text-slate-800 text-xl block leading-tight mt-0.5">
              {completedHandovers}
            </span>
            <span className="text-[9px] text-slate-500 font-bold block mt-1">
              {pendingHandovers} schedules pending
            </span>
          </div>
        </div>
      </div>

      {/* Center Layout Grid (Inventory Breakdown & Submodules list) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Unit Inventory Status Visualizer */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-slate-400" /> Unit Inventory Status
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Current breakdown of flats, plots, and offices.
            </p>

            <div className="space-y-4 mt-6">
              {/* Progress Visualizer */}
              <div className="h-4.5 bg-slate-100 rounded-full flex overflow-hidden">
                <div style={{ width: `${soldPercent}%` }} className="bg-emerald-500 h-full" title={`Sold: ${soldUnits}`} />
                <div style={{ width: `${blockedPercent}%` }} className="bg-amber-400 h-full" title={`Blocked: ${blockedUnits}`} />
                <div style={{ width: `${availablePercent}%` }} className="bg-sky-400 h-full" title={`Available: ${availableUnits}`} />
              </div>

              {/* Status breakdown list */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded bg-emerald-500 block shrink-0" />
                    <span>Sold Units</span>
                  </div>
                  <span>{soldUnits} ({soldPercent}%)</span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded bg-amber-400 block shrink-0" />
                    <span>Blocked / Token Paid</span>
                  </div>
                  <span>{blockedUnits} ({blockedPercent}%)</span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded bg-sky-400 block shrink-0" />
                    <span>Available Inventory</span>
                  </div>
                  <span>{availableUnits} ({availablePercent}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <Link 
              href="/dashboard/real-estate/units"
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center gap-1.5 transition"
            >
              Manage Inventory Registry <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Columns: Quick Access Modules Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" /> Quick Launch Suite
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            Access specific Property ERP dashboard screens directly.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {submodules.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.name}
                  href={m.href}
                  className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-2xl p-4 flex flex-col justify-between h-28 transition cursor-pointer text-left relative overflow-hidden group"
                >
                  <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                    <Icon className="h-4.5 w-4.5 text-slate-600" />
                  </div>

                  <div>
                    <span className="font-extrabold text-slate-800 text-xs block leading-tight mt-3">
                      {m.name}
                    </span>
                    {m.count !== null && (
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">
                        {m.count} active records
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom Layout Grid (Recent Bookings & Site Visits lists) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Bookings panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Recent Bookings
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Latest deal acquisitions recorded in the database.
              </p>
            </div>
            <Link href="/dashboard/real-estate/bookings" className="text-[10px] font-bold text-amber-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentBookings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-[11px] font-semibold">
                No active bookings recorded yet.
              </div>
            ) : (
              recentBookings.map((b) => (
                <div key={b.id || b._id} className="py-3 flex items-center justify-between text-xs font-bold text-slate-700">
                  <div className="space-y-0.5">
                    <span className="text-slate-850 block">{b.leadName || 'Buyer Client'}</span>
                    <span className="text-[10px] text-slate-450 block font-semibold">
                      Unit: {b.unitTitle || 'Unassigned'} · {new Date(b.createdAt || b.bookingDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-800 block">₹{parseFloat(b.bookingAmount || 0).toLocaleString('en-IN')}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded font-black uppercase tracking-wider block mt-1 w-max ml-auto">
                      Confirmed
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Site Visits panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-500" /> Upcoming Site Visits
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Scheduled client viewings for active properties.
              </p>
            </div>
            <Link href="/dashboard/real-estate/visits" className="text-[10px] font-bold text-amber-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingVisits.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-[11px] font-semibold">
                No upcoming site visits scheduled.
              </div>
            ) : (
              upcomingVisits.map((v) => (
                <div key={v.id || v._id} className="py-3 flex items-center justify-between text-xs font-bold text-slate-700">
                  <div className="space-y-0.5">
                    <span className="text-slate-850 block">{v.leadName || 'Prospect Buyer'}</span>
                    <span className="text-[10px] text-slate-450 block font-semibold">
                      Property: {v.propertyTitle || 'General Listing'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-indigo-600 block">
                      {new Date(v.scheduledDate || v.visitDate).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short'
                      })}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded font-black uppercase tracking-wider block mt-1 w-max ml-auto">
                      {v.status}
                    </span>
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
