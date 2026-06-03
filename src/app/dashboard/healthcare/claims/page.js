'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Loader2, 
  User, 
  Clock, 
  Sparkles, 
  XCircle,
  CheckCircle,
  HelpCircle,
  FileCheck,
  Building,
  Calendar,
  AlertTriangle,
  BadgeCent
} from 'lucide-react';

export default function ClaimsPage() {
  // Data States
  const [claims, setClaims] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    patient_id: '',
    insurance_provider: '',
    policy_number: '',
    claim_amount: ''
  });

  // Action Adjustment Modal States (Approved status details)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [selectedClaimForAdjust, setSelectedClaimForAdjust] = useState(null);
  const [adjustData, setAdjustData] = useState({
    status: 'Approved',
    approved_amount: ''
  });

  // Fetch data
  const fetchData = async () => {
    try {
      const claimsRes = await fetch(`/api/healthcare/claims?status=${statusFilter}`);
      const patientsRes = await fetch('/api/healthcare/patients');

      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.claims || []);
      }
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error('Fetch claims failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Handle Form Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Claim Filing
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/healthcare/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok) {
        setIsFormOpen(false);
        setFormData({
          patient_id: '',
          insurance_provider: '',
          policy_number: '',
          claim_amount: ''
        });
        fetchData();
      } else {
        setFormError(data.error || 'Failed to file insurance claim.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to connect to server.');
    } finally {
      setFormLoading(false);
    }
  };

  // Open adjustment modal
  const openAdjustModal = (claim) => {
    setSelectedClaimForAdjust(claim);
    setAdjustData({
      status: claim.status === 'Approved' ? 'Approved' : 'Approved',
      approved_amount: claim.approved_amount || claim.claim_amount
    });
    setIsAdjustOpen(true);
  };

  // Submit Payout Adjustments
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClaimForAdjust) return;

    setAdjustLoading(true);
    try {
      const res = await fetch('/api/healthcare/claims', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: selectedClaimForAdjust.id,
          status: adjustData.status,
          approved_amount: adjustData.status === 'Approved' ? adjustData.approved_amount : 0
        })
      });

      if (res.ok) {
        setIsAdjustOpen(false);
        setSelectedClaimForAdjust(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdjustLoading(false);
    }
  };

  // Fast direct status transition (Under Review / Rejected)
  const handleDirectStatusChange = async (claimId, nextStatus) => {
    setActionLoading(claimId);
    try {
      const res = await fetch('/api/healthcare/claims', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId,
          status: nextStatus
        })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Update claim status error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Metrics calculators
  const totalClaimedValue = claims.reduce((acc, curr) => acc + Number(curr.claim_amount), 0);
  const totalApprovedValue = claims
    .filter(c => c.status === 'Approved')
    .reduce((acc, curr) => acc + Number(curr.approved_amount), 0);
  const totalPendingCount = claims.filter(c => c.status === 'Submitted' || c.status === 'Under Review').length;

  // Status Badge styling
  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold';
      case 'Submitted':
        return 'bg-blue-50 border-blue-200 text-blue-700 font-bold';
      case 'Under Review':
        return 'bg-amber-50 border-amber-250 text-amber-700 font-bold';
      case 'Rejected':
        return 'bg-rose-50 border-rose-200 text-rose-700 font-bold';
      default:
        return 'bg-slate-50 border text-slate-700';
    }
  };

  return (
    <div className="space-y-6 text-left relative select-none">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5.5 w-5.5 text-rose-500" /> Insurance Claims Manager
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            File corporate healthcare insurance coverage claims, track adjuster audits, and log approved carrier payout reimbursements.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-750 text-white text-xs font-black rounded-xl shadow-md shadow-rose-500/15 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          File Insurance Claim
        </button>
      </div>

      {/* Premium Claims Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-950 rounded-2xl p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Claims Logged Value</span>
            <h3 className="text-2xl font-black mt-1 font-mono">${totalClaimedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[9px] text-slate-400 font-bold mt-1">Sum value of all insurance coverage requested</p>
          </div>
          <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400">
            <Building className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reimbursed Payouts</span>
            <h3 className="text-2xl font-black mt-1 font-mono text-emerald-600">${totalApprovedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[9px] text-slate-500 font-bold mt-1">Realized insurance payout totals approved by adjusters</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-500">
            <FileCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Carrier Audit</span>
            <h3 className="text-2xl font-black mt-1 font-mono text-amber-600">{totalPendingCount} Claims</h3>
            <p className="text-[9px] text-slate-500 font-bold mt-1">Coverage filings currently in submitted or review states</p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-500">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Modern Filter Bars */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          >
            <option value="All">All Claims Status</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Dynamic Count Banner */}
        <div className="md:col-span-2 flex items-center justify-end px-2 text-slate-500 font-bold text-[11px]">
          📊 {claims.length} claims records matching filters
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Compiling claims database...</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          🛡️ No insurance claim records recorded.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
          {claims.map((claim) => (
            <div 
              key={claim.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden"
            >
              {/* Header: Claim Number & Status */}
              <div className="flex items-start justify-between gap-3 shrink-0">
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">
                    {claim.claim_number}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] font-semibold text-slate-500 leading-none">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Filed: {new Date(claim.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-wider ${getStatusBadgeStyles(claim.status)}`}>
                  {claim.status}
                </span>
              </div>

              {/* Body: Policy & Coverage Costings */}
              <div className="space-y-3.5 flex-1 font-semibold text-xs leading-none">
                
                {/* Insurance Provider Policy details box */}
                <div className="p-3 bg-slate-50 border rounded-xl grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono block">Carrier / Insurer</span>
                    <strong className="text-slate-800 text-xs block mt-1 leading-tight">{claim.insurance_provider}</strong>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono block">Policy ID</span>
                    <strong className="text-slate-800 text-xs block mt-1 leading-tight font-mono">{claim.policy_number}</strong>
                  </div>
                </div>

                {/* Patient details */}
                <div className="space-y-1.5 text-[10px] text-slate-500">
                  <p>Patient Name: <strong className="text-slate-800 font-extrabold">{claim.patient?.first_name} {claim.patient?.last_name}</strong></p>
                  <p>Patient ID: <span className="text-slate-700 font-mono">{claim.patient?.patient_id_custom}</span></p>
                </div>

                {/* Claims vs Payout Cost Box */}
                <div className="pt-2 border-t flex justify-between items-center text-[10px] text-slate-500">
                  <div>
                    <span>Claim Requested:</span>
                    <strong className="text-slate-800 text-xs block mt-0.5 font-mono">${Number(claim.claim_amount).toFixed(2)}</strong>
                  </div>
                  <div className="text-right">
                    <span>Approved Payout:</span>
                    <strong className="text-emerald-600 text-xs block mt-0.5 font-mono">${Number(claim.approved_amount).toFixed(2)}</strong>
                  </div>
                </div>

              </div>

              {/* Action Operations Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 shrink-0">
                {claim.status !== 'Approved' && claim.status !== 'Rejected' ? (
                  <>
                    <button
                      onClick={() => handleDirectStatusChange(claim.id, 'Under Review')}
                      disabled={actionLoading === claim.id}
                      className="flex-1 py-1.5 bg-slate-50 border hover:bg-slate-100 rounded-lg text-slate-700 text-[10px] font-bold text-center cursor-pointer transition"
                    >
                      ⏳ Audit
                    </button>
                    <button
                      onClick={() => handleDirectStatusChange(claim.id, 'Rejected')}
                      disabled={actionLoading === claim.id}
                      className="py-1.5 px-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold text-center cursor-pointer transition"
                    >
                      ❌ Reject
                    </button>
                    <button
                      onClick={() => openAdjustModal(claim)}
                      disabled={actionLoading === claim.id}
                      className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-lg text-center cursor-pointer transition shadow-sm shadow-emerald-500/10"
                    >
                      ✔️ Approve
                    </button>
                  </>
                ) : (
                  <span className="w-full text-center text-[10px] text-slate-400 italic">Claim case has been resolved</span>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── INSURANCE FILING FORM MODAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-rose-500" />
                  File Insurance Coverage Claim
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Submit treatment expense claims directly to corporate insurance partners for adjudication.
                </p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              
              {/* Select Patient */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Select Patient *</label>
                <select
                  required
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer"
                >
                  <option value="">-- Choose Patient Demographics --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_id_custom})
                    </option>
                  ))}
                </select>
              </div>

              {/* Insurer Detail inputs */}
              <div className="grid grid-cols-2 gap-4">
                {/* Provider */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Insurance Provider *</label>
                  <input
                    type="text"
                    required
                    name="insurance_provider"
                    value={formData.insurance_provider}
                    onChange={handleInputChange}
                    placeholder="e.g. BlueCross, Aetna"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Policy Number */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Policy Number *</label>
                  <input
                    type="text"
                    required
                    name="policy_number"
                    value={formData.policy_number}
                    onChange={handleInputChange}
                    placeholder="e.g. POL-99201"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono"
                  />
                </div>
              </div>

              {/* Claim value */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Total Claim Cost ($) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  name="claim_amount"
                  value={formData.claim_amount}
                  onChange={handleInputChange}
                  placeholder="Total Claim Amount"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Filing Claim...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      File Coverage Claim
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CARRIER APPROVAL & PAYOUT ADJUSTMENT MODAL ── */}
      {isAdjustOpen && selectedClaimForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald-500/5 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  ✔️ Adjust & Approve Claim
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Adjust insurer payouts for patient <strong className="text-slate-800">{selectedClaimForAdjust.patient?.first_name}</strong>.
                </p>
              </div>
              <button 
                onClick={() => setIsAdjustOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-slate-700 font-semibold text-xs leading-none">
              
              {/* Status (Default Approved) */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Claim Resolution Status *</label>
                <select
                  required
                  value={adjustData.status}
                  onChange={(e) => setAdjustData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer"
                >
                  <option value="Approved">Approved / Payout</option>
                  <option value="Rejected">Rejected / Zero Payout</option>
                </select>
              </div>

              {/* Approved Amount */}
              {adjustData.status === 'Approved' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Approved Payout Amount ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={adjustData.approved_amount}
                    onChange={(e) => setAdjustData(prev => ({ ...prev, approved_amount: e.target.value }))}
                    placeholder="Enter approved payout"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1.5 font-bold">
                    Requested Claim sum was: ${Number(selectedClaimForAdjust.claim_amount).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {adjustLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Confirm Approval'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
