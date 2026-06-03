'use client';

import { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Search, Loader2, User, Clock, Sparkles, XCircle,
  CheckCircle, HelpCircle, TrendingUp, AlertCircle, BadgePercent, Trash2
} from 'lucide-react';

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Gap 6: Itemized line items instead of single amount
  const [formPatient, setFormPatient] = useState('');
  const [lineItems, setLineItems] = useState([{ description: 'Consultation Fee', amount: '' }]);
  const [tax, setTax] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');

  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const liveTotal = subtotal + (Number(tax) || 0) - (Number(discount) || 0);
  const liveDisplay = liveTotal >= 0 ? liveTotal : 0;

  const fetchData = async () => {
    try {
      const [billRes, patientsRes] = await Promise.all([
        fetch(`/api/healthcare/billing?status=${statusFilter}`),
        fetch('/api/healthcare/patients')
      ]);
      if (billRes.ok) setInvoices((await billRes.json()).invoices || []);
      if (patientsRes.ok) setPatients((await patientsRes.json()).patients || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const addLineItem = () => setLineItems(prev => [...prev, { description: '', amount: '' }]);
  const removeLineItem = (i) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLineItem = (i, field, value) => setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/healthcare/billing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: formPatient,
          amount: subtotal,
          tax: Number(tax) || 0,
          discount: Number(discount) || 0,
          payment_status: paymentStatus,
          line_items: lineItems.filter(i => i.description && i.amount)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIsFormOpen(false);
        setFormPatient(''); setLineItems([{ description: 'Consultation Fee', amount: '' }]);
        setTax(''); setDiscount(''); setPaymentStatus('Pending');
        fetchData();
      } else { setFormError(data.error || 'Failed to generate invoice.'); }
    } catch (err) { setFormError('Failed to connect.'); }
    finally { setFormLoading(false); }
  };

  const handleUpdateStatus = async (invoiceId, newStatus) => {
    setActionLoading(invoiceId);
    try {
      await fetch('/api/healthcare/billing', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, payment_status: newStatus })
      });
      fetchData();
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const totalInvoiced = invoices.reduce((acc, curr) => acc + Number(curr.final_amount), 0);
  const totalOutstanding = invoices.filter(i => i.payment_status === 'Pending').reduce((acc, curr) => acc + Number(curr.final_amount), 0);
  const totalPaid = invoices.filter(i => i.payment_status === 'Paid').reduce((acc, curr) => acc + Number(curr.final_amount), 0);
  const recoveryRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold';
      case 'Partially Paid': return 'bg-amber-50 border-amber-250 text-amber-700 font-bold';
      case 'Pending': return 'bg-rose-50 border-rose-200 text-rose-700 font-bold animate-pulse';
      default: return 'bg-slate-50 border text-slate-700';
    }
  };

  return (
    <div className="space-y-6 text-left relative select-none">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="h-5.5 w-5.5 text-rose-500" /> Patient Treatment Billing & Invoices
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Generate itemized outpatient treatment invoices, track co-pay balances, and monitor financial recovery status metrics.
          </p>
        </div>
        <button onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-750 text-white text-xs font-black rounded-xl shadow-md shadow-rose-500/15 cursor-pointer transition-all shrink-0">
          <Plus className="h-4 w-4 stroke-[2.5]" /> Create Invoice
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-950 rounded-2xl p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Billing</span>
            <h3 className="text-2xl font-black mt-1 font-mono">₹{totalInvoiced.toLocaleString('en-IN')}</h3>
            <p className="text-[9px] text-slate-400 font-bold mt-1">Aggregated value of all processed invoices</p>
          </div>
          <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400"><TrendingUp className="h-6 w-6" /></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Outstanding Receivables</span>
            <h3 className="text-2xl font-black mt-1 font-mono text-rose-600">₹{totalOutstanding.toLocaleString('en-IN')}</h3>
            <p className="text-[9px] text-slate-500 font-bold mt-1">Unpaid billing totals pending recovery</p>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-500"><AlertCircle className="h-6 w-6" /></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recovery Rate</span>
            <h3 className="text-2xl font-black mt-1 font-mono text-slate-900">{recoveryRate.toFixed(1)}%</h3>
            <p className="text-[9px] text-slate-500 font-bold mt-1">Ratio of paid over total billed</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-500"><BadgePercent className="h-6 w-6" /></div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition">
            <option value="All">All Invoices</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending / Unpaid</option>
          </select>
        </div>
        <div className="md:col-span-2 flex items-center justify-end px-2 text-slate-500 font-bold text-[11px]">
          📊 {invoices.length} billing entries compiled
        </div>
      </div>

      {/* Invoice Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Querying financial databases...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          🏥 No outpatient invoices logged matching filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden">
              <div className="flex items-start justify-between gap-3 shrink-0">
                <div>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">{inv.invoice_number}</span>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] font-semibold text-slate-500 leading-none">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Issued: {new Date(inv.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full border text-[8px] uppercase tracking-wider ${getStatusBadgeStyles(inv.payment_status)}`}>{inv.payment_status}</span>
              </div>

              <div className="space-y-3.5 flex-1 font-semibold text-xs leading-none">
                {/* Itemized line items */}
                <div className="p-3 bg-slate-50 border rounded-xl space-y-1.5 text-[10px] text-slate-500">
                  {Array.isArray(inv.line_items) && inv.line_items.length > 0 ? (
                    inv.line_items.map((item, i) => (
                      <div key={i} className="flex justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                        <span>{item.description}</span>
                        <strong className="text-slate-800">₹{Number(item.amount).toLocaleString('en-IN')}</strong>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between"><span>Treatment Cost:</span><strong className="text-slate-800">₹{Number(inv.amount).toFixed(2)}</strong></div>
                  )}
                  {Number(inv.tax) > 0 && <div className="flex justify-between"><span>Tax (+):</span><strong className="text-rose-600">+₹{Number(inv.tax).toFixed(2)}</strong></div>}
                  {Number(inv.discount) > 0 && <div className="flex justify-between"><span>Discount (-):</span><strong className="text-emerald-600">-₹{Number(inv.discount).toFixed(2)}</strong></div>}
                  <div className="border-t pt-2 flex justify-between text-xs font-black">
                    <span className="text-slate-700">Total Billed:</span>
                    <span className="text-slate-900 font-mono">₹{Number(inv.final_amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="space-y-1 text-[10px] text-slate-500">
                  <p>Patient: <strong className="text-slate-800 font-extrabold">{inv.patient?.first_name} {inv.patient?.last_name}</strong></p>
                  <p>Patient ID: <span className="text-slate-700 font-mono">{inv.patient?.patient_id_custom}</span></p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 shrink-0">
                <div className="flex items-center gap-1.5 justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Change Payment:</span>
                  <select value={inv.payment_status} disabled={actionLoading === inv.id}
                    onChange={(e) => handleUpdateStatus(inv.id, e.target.value)}
                    className="text-[10px] font-bold px-2 py-1 bg-slate-50 border rounded-lg focus:outline-none cursor-pointer focus:border-rose-400 transition">
                    <option value="Pending">Pending</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE INVOICE MODAL WITH LINE ITEMS ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><Receipt className="h-4.5 w-4.5 text-rose-500" /> Generate Invoice</h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">Add itemized charges: Consultation, Procedures, Medicines etc.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition"><XCircle className="h-5 w-5" /></button>
            </div>

            {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">⚠️ {formError}</div>}

            <form onSubmit={handleFormSubmit} className="space-y-5 text-slate-700 font-semibold text-xs leading-none">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Select Patient *</label>
                <select required value={formPatient} onChange={(e) => setFormPatient(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer">
                  <option value="">-- Select Billable Patient --</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_id_custom})</option>)}
                </select>
              </div>

              {/* LINE ITEMS (Gap 6) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Itemized Charges *</label>
                  <button type="button" onClick={addLineItem}
                    className="flex items-center gap-1 text-[10px] font-black text-rose-600 hover:text-rose-500 cursor-pointer">
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" required placeholder="e.g. Consultation Fee, Brain MRI, Medicines" value={item.description}
                        onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                        className="flex-1 px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 text-[11px] transition" />
                      <input type="number" required min="0" placeholder="₹ Amount" value={item.amount}
                        onChange={(e) => updateLineItem(i, 'amount', e.target.value)}
                        className="w-28 px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 text-[11px] font-mono transition" />
                      {lineItems.length > 1 && (
                        <button type="button" onClick={() => removeLineItem(i)} className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtotal preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600">
                Subtotal: <span className="font-mono text-slate-800 ml-1">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Tax (₹)</label>
                  <input type="number" min="0" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="e.g. 0"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Discount (₹)</label>
                  <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. 0"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Initial Payment Status *</label>
                <select required value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer">
                  <option value="Pending">Pending / Unpaid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              {/* Live Total preview */}
              <div className="p-4 bg-slate-900 border border-slate-950 rounded-2xl text-white space-y-1 font-bold text-xs tracking-wide">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Live Invoice Total</span>
                <div className="flex justify-between items-center pt-2">
                  <span>Calculated Net Billable Due:</span>
                  <span className="text-emerald-400 text-lg font-black font-mono">₹{liveDisplay.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {formLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</> : <><CheckCircle className="h-3.5 w-3.5" /> Generate Invoice</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
