'use client';

import { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  DollarSign, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Clock,
  Sparkles,
  TrendingUp,
  User,
  Building,
  AlertTriangle,
  Trash2,
  Loader2,
  X,
  ChevronRight,
  Percent,
  ShieldAlert
} from 'lucide-react';

export default function MilestonePaymentsPage() {
  // Directories & Lists states
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);

  // Loader & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected Plan state
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Modal controls
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Inline action loading tracking
  const [actioningMilestoneIndex, setActioningMilestoneIndex] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State for creating payment plans
  const [formLeadId, setFormLeadId] = useState('');
  const [formPropertyId, setFormPropertyId] = useState('');
  const [formPlanTitle, setFormPlanTitle] = useState('Construction Linked Plan (CLP)');
  const [formMilestones, setFormMilestones] = useState([
    { name: 'Token Booking Amount', percentage: '10' },
    { name: 'Excavation & Foundation Slab', percentage: '20' },
    { name: 'Plastering & Internal Masonry', percentage: '30' },
    { name: 'Possession & Handover Block', percentage: '40' }
  ]);

  // Fetch active payment plans
  const fetchPaymentPlans = async (selectNewId = null) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/real-estate/payments');
      if (!res.ok) throw new Error('Could not fetch active payment plans.');
      
      const data = await res.json();
      if (data.success) {
        const plans = data.paymentPlans || [];
        setPaymentPlans(plans);
        if (plans.length > 0) {
          if (selectNewId) {
            setSelectedPlanId(selectNewId);
          } else if (!selectedPlanId || !plans.find(p => p.id === selectedPlanId)) {
            setSelectedPlanId(plans[0].id || plans[0]._id);
          }
        } else {
          setSelectedPlanId('');
        }
      } else {
        throw new Error(data.error || 'Server returned an error.');
      }
    } catch (err) {
      console.error('Fetch payment plans failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch helper lists (leads and properties)
  const fetchHelperLists = async () => {
    try {
      // Fetch Leads
      const leadsRes = await fetch('/api/leads');
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData.leads || []);
      }

      // Fetch Properties
      const propsRes = await fetch('/api/real-estate/properties');
      if (propsRes.ok) {
        const propsData = await propsRes.json();
        setProperties(propsData.properties || []);
      }
    } catch (err) {
      console.error('Fetch dropdown helpers failed:', err);
    }
  };

  useEffect(() => {
    fetchPaymentPlans();
    fetchHelperLists();
  }, []);

  // Pre-fill default form selections
  useEffect(() => {
    if (leads.length > 0 && !formLeadId) {
      setFormLeadId(leads[0].id || leads[0]._id);
    }
    if (properties.length > 0 && !formPropertyId) {
      setFormPropertyId(properties[0].id || properties[0]._id);
    }
  }, [leads, properties]);

  // Real-time Sum check for Milestones Builder
  const milestoneTotalPercentage = formMilestones.reduce(
    (sum, m) => sum + (Number(m.percentage) || 0),
    0
  );
  const isPercentageSumValid = Math.abs(milestoneTotalPercentage - 100) < 0.01;

  // Add Milestone Row
  const handleAddMilestoneRow = () => {
    setFormMilestones(prev => [...prev, { name: '', percentage: '' }]);
  };

  // Delete Milestone Row
  const handleDeleteMilestoneRow = (index) => {
    if (formMilestones.length <= 1) return;
    setFormMilestones(prev => prev.filter((_, idx) => idx !== index));
  };

  // Milestone input changes
  const handleMilestoneInputChange = (index, field, value) => {
    setFormMilestones(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Create payment plan submission
  const handleCreatePaymentPlan = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!formLeadId) return setModalError('Please select a client prospect.');
    if (!formPropertyId) return setModalError('Please select a property unit.');
    if (!formPlanTitle.trim()) return setModalError('Please enter a payment plan title.');
    if (!isPercentageSumValid) return setModalError(`Milestone percentages must sum to exactly 100%. Current total is ${milestoneTotalPercentage}%.`);

    // Verify all milestones have valid names and percentages
    for (let i = 0; i < formMilestones.length; i++) {
      if (!formMilestones[i].name.trim()) return setModalError(`Milestone #${i + 1} must have a title name.`);
      const pct = Number(formMilestones[i].percentage);
      if (isNaN(pct) || pct <= 0) return setModalError(`Milestone #${i + 1} percentage must be a valid positive number.`);
    }

    try {
      setSubmittingPlan(true);

      const payload = {
        leadId: formLeadId,
        propertyId: formPropertyId,
        planTitle: formPlanTitle.trim(),
        milestones: formMilestones.map(m => ({
          name: m.name.trim(),
          percentage: Number(m.percentage)
        }))
      };

      const res = await fetch('/api/real-estate/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate payment plan.');

      if (data.success) {
        triggerToast('Installment payment plan created successfully!');
        setShowCreateModal(false);
        // Reset form milestone percentages
        setFormPlanTitle('Construction Linked Plan (CLP)');
        setFormMilestones([
          { name: 'Token Booking Amount', percentage: '10' },
          { name: 'Excavation & Foundation Slab', percentage: '20' },
          { name: 'Plastering & Internal Masonry', percentage: '30' },
          { name: 'Possession & Handover Block', percentage: '40' }
        ]);
        // Refresh and select newly created plan
        fetchPaymentPlans(data.paymentPlan.id || data.paymentPlan._id);
      }
    } catch (err) {
      console.error('Create plan failed:', err);
      setModalError(err.message);
    } finally {
      setSubmittingPlan(false);
    }
  };

  // Milestone Actions: Dispatch Demand Note (alert) / Clear payment (clear)
  const handleMilestoneAction = async (planId, milestoneIndex, action) => {
    setActioningMilestoneIndex(milestoneIndex);
    try {
      const res = await fetch(`/api/real-estate/payments/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          milestoneIndex,
          action
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update milestone status.');

      if (data.success) {
        triggerToast(
          action === 'clear' 
            ? 'Milestone payment cleared and logged successfully!' 
            : 'Payment demand note triggered! High-priority CRM task generated.'
        );
        // Refresh plans
        fetchPaymentPlans(planId);
      }
    } catch (err) {
      console.error('Milestone action failed:', err);
      alert(err.message);
    } finally {
      setActioningMilestoneIndex(null);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Find active payment plan details
  const activePlan = paymentPlans.find(p => p.id === selectedPlanId || p._id === selectedPlanId);

  // Math aggregates for selected plan
  const valuation = activePlan?.totalValuation || 0;
  const milestonesList = activePlan?.milestones || [];
  
  const totalCleared = milestonesList
    .filter(m => m.status === 'Cleared')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const totalOutstanding = milestonesList
    .filter(m => m.status !== 'Cleared')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const percentCleared = valuation > 0 ? Math.round((totalCleared / valuation) * 100) : 0;

  const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return '₹0';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <Layers className="h-5 w-5 text-emerald-500" /> Construction-Linked Payments
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Configure installment milestones, dispatch billing demand notes, and track clearing history.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Master Selector for plans */}
          {paymentPlans.length > 0 && (
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
            >
              {paymentPlans.map(p => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  📄 {p.planTitle} ({p.propertyId?.title || 'Unit'})
                </option>
              ))}
            </select>
          )}

          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 duration-200"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Create Plan
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top duration-350 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Compiler / Database Fetch Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-650 shrink-0" />
          <span>Error retrieving payment schedules: {error}. Please refresh.</span>
        </div>
      )}

      {/* Payment details presentation */}
      {loading ? (
        <div className="p-8 space-y-4 bg-white border border-slate-200 rounded-2xl">
          <div className="h-6 bg-slate-100 rounded animate-pulse w-1/4"></div>
          <div className="h-16 bg-slate-50 rounded-xl animate-pulse w-full"></div>
          <div className="h-32 bg-slate-50 rounded-xl animate-pulse w-full"></div>
        </div>
      ) : paymentPlans.length === 0 ? (
        // Premium Empty State
        <div className="py-20 text-center border border-dashed border-slate-300 rounded-2xl bg-white space-y-4 max-w-2xl mx-auto shadow-sm">
          <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 mx-auto">
            <Layers className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">No Payment Plans Generated</h3>
            <p className="text-[11px] text-slate-550 max-w-sm mx-auto font-medium leading-relaxed">
              Generate customizable installment plans for sold/blocked properties to invoice construction stages in percentages.
            </p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-250 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-black transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" /> Generate First Plan
          </button>
        </div>
      ) : activePlan ? (
        <div className="space-y-6">
          
          {/* Metadata Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            
            {/* Lead Client Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3 text-xs">
              <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-550 shrink-0 mt-0.5">
                <User className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Linked Client</span>
                <span className="font-extrabold text-slate-800 text-[13px] block leading-tight">
                  {activePlan.leadId ? `${activePlan.leadId.firstName} ${activePlan.leadId.lastName || ''}`.trim() : 'Lead Profile'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold font-mono">
                  {activePlan.leadId?.phone || activePlan.leadId?.company || 'Verified Client'}
                </span>
              </div>
            </div>

            {/* Property Unit Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3 text-xs">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-550 shrink-0 mt-0.5">
                <Building className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Linked Unit</span>
                <span className="font-extrabold text-slate-800 text-[13px] block leading-tight">
                  {activePlan.propertyId ? activePlan.propertyId.title : 'Deleted property'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  📍 {activePlan.propertyId?.location || 'General Site'}
                </span>
              </div>
            </div>

            {/* Total Valuation Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3 text-xs">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-550 shrink-0 mt-0.5">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Agreement Valuation</span>
                <span className="font-extrabold text-emerald-700 text-[14px] block font-mono">
                  {formatCurrency(valuation)}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100 uppercase tracking-wider text-[8px] font-black inline-block">
                  Plan active
                </span>
              </div>
            </div>

            {/* Financial Ratios progress Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3 text-xs">
              <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-550 shrink-0 mt-0.5">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Clearing Ratio</span>
                  <span className="font-black text-slate-700 text-[11px] font-mono">{percentCleared}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${percentCleared}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-450 uppercase">
                  <span>Cleared: {formatCurrency(totalCleared)}</span>
                  <span>Due: {formatCurrency(totalOutstanding)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Timeline and Installments detail */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" /> Installment Milestones Workflow
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Check progress sequence, release demands to buyer, and record clear status logs.
                </p>
              </div>

              <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono font-bold bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                <span>Created Date: {formatDate(activePlan.createdAt)}</span>
              </div>
            </div>

            {/* Milestones dynamic list details */}
            <div className="space-y-4">
              {milestonesList.map((m, index) => {
                const isCleared = m.status === 'Cleared';
                const isPendingAlert = m.status === 'Pending Alert';
                
                return (
                  <div 
                    key={index} 
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-200 ${
                      isCleared 
                        ? 'bg-emerald-50/20 border-emerald-150' 
                        : (isPendingAlert ? 'bg-amber-50/15 border-amber-250' : 'bg-slate-50/60 border-slate-200')
                    }`}
                  >
                    {/* Index & Title Info */}
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-6.5 w-6.5 rounded-full flex items-center justify-center text-xs shrink-0 font-extrabold ${
                        isCleared 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                          : (isPendingAlert ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse' : 'bg-slate-200 text-slate-500 border')
                      }`}>
                        {index + 1}
                      </div>

                      <div className="space-y-0.5 text-left">
                        <span className="font-extrabold text-slate-800 text-xs block">{m.name}</span>
                        <div className="flex items-center gap-2 flex-wrap text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          <span>Installment Share: {m.percentage}%</span>
                          <span>•</span>
                          <span className="text-slate-650 font-mono font-extrabold">{formatCurrency(m.amount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline controls */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pl-9 md:pl-0">
                      
                      {/* Status Badges */}
                      <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shadow-sm ${
                        isCleared 
                          ? 'bg-emerald-100 border-emerald-250 text-emerald-800' 
                          : (isPendingAlert ? 'bg-amber-100 border-amber-250 text-amber-800 animate-pulse' : 'bg-slate-100 border-slate-200 text-slate-450')
                      }`}>
                        {m.status === 'Pending Alert' ? '⚠️ DEMAND ACTIVE' : m.status.toUpperCase()}
                      </span>

                      {/* Due/Clear Date Logs */}
                      {isCleared ? (
                        <div className="flex items-center gap-1.5 text-[9px] text-emerald-700 font-mono font-bold bg-emerald-50/50 px-2 py-1 border border-emerald-150 rounded-lg">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Cleared: {formatDate(m.cleared_date)}</span>
                        </div>
                      ) : m.due_date ? (
                        <div className="flex items-center gap-1.5 text-[9px] text-amber-700 font-mono font-bold bg-amber-50/50 px-2 py-1 border border-amber-150 rounded-lg">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Due: {formatDate(m.due_date)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono font-bold bg-white px-2 py-1 border border-slate-200 rounded-lg">
                          <Calendar className="h-3.5 w-3.5 text-slate-350" />
                          <span>Not Triggered</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      {!isCleared && (
                        <div className="flex items-center gap-1.5">
                          {/* Alert Demand note Button */}
                          {!isPendingAlert && (
                            <button
                              onClick={() => handleMilestoneAction(activePlan.id || activePlan._id, index, 'alert')}
                              disabled={actioningMilestoneIndex !== null}
                              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-sm disabled:opacity-50"
                              title="Trigger Demand Note task"
                            >
                              {actioningMilestoneIndex === index ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <FileText className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              <span>Demand</span>
                            </button>
                          )}

                          {/* Clear installment status button */}
                          <button
                            onClick={() => handleMilestoneAction(activePlan.id || activePlan._id, index, 'clear')}
                            disabled={actioningMilestoneIndex !== null}
                            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-sm disabled:opacity-50"
                          >
                            {actioningMilestoneIndex === index ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-450" />
                            )}
                            <span>Clear</span>
                          </button>
                        </div>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      ) : null}

      {/* CREATE PAYMENT PLAN MODAL (SLIDE-OVER STYLE GLASSMORPHIC DIALOG) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Generate Payment Plan</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Construct dynamic, percentage-based installment schedules.</p>
                </div>
              </div>
              <button 
                onClick={() => { setModalError(null); setShowCreateModal(false); }}
                className="h-7 w-7 rounded-lg hover:bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error alerts */}
            {modalError && (
              <div className="px-5 py-2.5 bg-red-50 border-b border-red-150 text-red-800 text-[10px] font-black flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-650 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form list builder */}
            <form onSubmit={handleCreatePaymentPlan} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Plan Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Payment Plan Title <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  required
                  value={formPlanTitle}
                  onChange={(e) => setFormPlanTitle(e.target.value)}
                  placeholder="e.g. Construction Linked Plan (CLP)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700 transition"
                />
              </div>

              {/* Client Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Linked Client / Prospect Lead <span className="text-red-500">*</span></label>
                {leads.length === 0 ? (
                  <p className="text-xs font-bold text-red-500 italic">No prospects loaded. Create a lead first.</p>
                ) : (
                  <select 
                    value={formLeadId}
                    onChange={(e) => setFormLeadId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    {leads.map(l => (
                      <option key={l.id || l._id} value={l.id || l._id}>
                        👤 {l.firstName} {l.lastName || ''} ({l.company || 'Individual'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Unit Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Properties Inventory Unit <span className="text-red-500">*</span></label>
                {properties.length === 0 ? (
                  <p className="text-xs font-bold text-red-500 italic">No property units registered in the system.</p>
                ) : (
                  <select 
                    value={formPropertyId}
                    onChange={(e) => setFormPropertyId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    {properties.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        🏢 {p.title} — {p.location} ({formatCurrency(p.price)} / {p.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Milestones Builder Block */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-emerald-500" /> Milestone Installment Checklist
                  </span>
                  
                  <button
                    type="button"
                    onClick={handleAddMilestoneRow}
                    className="flex items-center gap-1 text-[9px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3 stroke-[3]" /> Add Milestone
                  </button>
                </div>

                {/* Milestone Checklist items */}
                <div className="space-y-2">
                  {formMilestones.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 text-[10px] text-slate-500 font-extrabold flex items-center justify-center border shrink-0">
                        {idx + 1}
                      </div>

                      <input 
                        type="text"
                        required
                        value={m.name}
                        onChange={(e) => handleMilestoneInputChange(idx, 'name', e.target.value)}
                        placeholder="e.g. Plinth Slab Casting"
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                      />

                      <div className="relative w-20 shrink-0">
                        <input 
                          type="number"
                          required
                          min="1"
                          max="100"
                          value={m.percentage}
                          onChange={(e) => handleMilestoneInputChange(idx, 'percentage', e.target.value)}
                          placeholder="25"
                          className="w-full pl-2.5 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">%</span>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        disabled={formMilestones.length <= 1}
                        onClick={() => handleDeleteMilestoneRow(idx)}
                        className="h-7 w-7 rounded-lg border border-slate-200 hover:border-red-150 hover:bg-red-50 text-slate-400 hover:text-red-600 transition flex items-center justify-center shrink-0 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Percentage Sum Validation Badge */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-bold italic">
                    All milestone percentages must sum exactly to 100%
                  </span>

                  <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-wide flex items-center gap-1 shadow-sm ${
                    isPercentageSumValid 
                      ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                      : 'bg-rose-50 border-rose-250 text-rose-800'
                  }`}>
                    {isPercentageSumValid ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Total: {milestoneTotalPercentage}% (Valid)</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                        <span>Total: {milestoneTotalPercentage}% / 100%</span>
                      </>
                    )}
                  </div>
                </div>

              </div>

            </form>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 text-xs font-bold">
              <button 
                type="button"
                disabled={submittingPlan}
                onClick={() => { setModalError(null); setShowCreateModal(false); }}
                className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={submittingPlan || !isPercentageSumValid}
                onClick={handleCreatePaymentPlan}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed transition duration-200"
              >
                {submittingPlan ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating Plan...
                  </>
                ) : (
                  <>✓ Generate Plan</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
