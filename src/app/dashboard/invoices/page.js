'use client';

import { useEffect, useState } from 'react';
import { 
  Loader2, 
  Search, 
  Printer, 
  X, 
  Info,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Target,
  PlusCircle,
  Wallet,
  ArrowRight,
  TrendingDown
} from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState({ text: '', type: '' });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [repFilter, setRepFilter] = useState('');

  // Modals state
  const [viewInvoiceOpen, setViewInvoiceOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

  // Form payment inputs
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [paymentError, setPaymentError] = useState('');

  // Toast Helper
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage({ text: '', type: '' });
    }, 4000);
  };

  // Fetch initial details
  useEffect(() => {
    async function initInvoices() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);

          if (userData.user.role === 'owner' || userData.user.role === 'sales_admin') {
            const repsRes = await fetch('/api/users');
            if (repsRes.ok) {
              const repsData = await repsRes.json();
              setSalesReps(repsData.users || []);
            }
          }
        }
      } catch (err) {
        console.error('Invoices auth fetch failed:', err);
      }
    }
    initInvoices();
  }, []);

  // Fetch invoices list
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (repFilter) queryParams.append('assignedTo', repFilter);

      const res = await fetch(`/api/invoices?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Fetch invoices failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, repFilter]);

  // Load detailed single invoice
  const handleOpenInvoice = async (invoiceId) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveInvoice(data.invoice);
        setViewInvoiceOpen(true);
        // Pre-fill remaining balance in payment input
        setPaymentAmount(data.invoice.balanceDue.toString());
      } else {
        alert('Failed to retrieve detailed invoice.');
      }
    } catch (err) {
      console.error('Load detailed invoice failed:', err);
    }
  };

  // Record Payment Submit
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPaymentError('');
    setActionLoading(true);

    const paymentReceipt = {
      amount: Number(paymentAmount) || 0,
      paymentMethod,
      transactionRef: transactionRef.trim(),
      notes: paymentNotes.trim()
    };

    try {
      const res = await fetch(`/api/invoices/${activeInvoice._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentReceipt })
      });

      const data = await res.json();

      if (res.ok) {
        setRecordPaymentOpen(false);
        resetPaymentForm();
        showToast('💳 Payment transaction recorded successfully!');
        // Refresh detailed view & main table lists
        handleOpenInvoice(activeInvoice._id);
        fetchInvoices();
      } else {
        setPaymentError(data.error || 'Failed to record payment receipt.');
      }
    } catch (err) {
      setPaymentError('Network link connection error.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Invoice log
  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Delete this invoice permanently from billing systems?')) return;

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInvoices();
        showToast('🗑️ Invoice deleted.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete invoice.');
      }
    } catch (err) {
      console.error('Delete invoice failed:', err);
    }
  };

  // Browser standard print command
  const handlePrintInvoice = () => {
    window.print();
  };

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentMethod('Bank Transfer');
    setTransactionRef('');
    setPaymentNotes('');
    setPaymentError('');
  };

  // Formatter Currency INR
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Dynamic Metrics summaries
  const totalInvoicedRevenue = invoices.reduce((acc, curr) => acc + curr.grandTotal, 0);
  const totalPaidRevenue = invoices.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const outstandingReceivables = invoices.reduce((acc, curr) => acc + curr.balanceDue, 0);
  
  const now = new Date();
  const overdueCount = invoices.filter(inv => {
    const isPastDue = new Date(inv.dueDate) < now;
    return isPastDue && inv.balanceDue > 0;
  }).length;

  return (
    <div className="space-y-6 relative h-full">

      {/* --- FLOATING TOAST NOTIFICATION --- */}
      {toastMessage.text && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3.5 rounded-xl border shadow-2xl flex items-center gap-2.5 bg-emerald-50 border-emerald-250 text-emerald-800 printable-hidden">
          <Info className="h-4.5 w-4.5" />
          <span className="text-xs font-black tracking-wide">{toastMessage.text}</span>
        </div>
      )}

      {/* --- HEADER PANELS --- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 printable-hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7 text-emerald-500" />
            Digital Tax Invoices & Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Track business payment receipts, Outstanding receivables, and dynamic cash allocations history.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-slate-250 text-xs font-bold text-slate-655 shadow-sm">
          <Calendar className="h-4 w-4 text-emerald-500" />
          <span>Billing Ledger Active</span>
        </div>
      </div>

      {/* --- INVOICES METRICS SUMMARY CARDS --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-350 printable-hidden">
        
        {/* Total Invoiced */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Total Invoiced</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">{formatCurrency(totalInvoicedRevenue)}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* Recovered Cash */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Recovered Paid</span>
            <span className="text-2xl font-black text-emerald-650 block mt-1">{formatCurrency(totalPaidRevenue)}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Net Receivables */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Outstanding Due</span>
            <span className="text-2xl font-black text-indigo-650 block mt-1">{formatCurrency(outstandingReceivables)}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Overdue Bills */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Overdue Accounts</span>
            <span className="text-2xl font-black text-rose-600 block mt-1">{overdueCount} Invoices</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* --- SEARCH AND FILTERS BAR --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm printable-hidden">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search Invoice code or invoice title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 placeholder-slate-400 transition"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
          >
            <option value="">All Invoice States</option>
            <option value="Unpaid">🔴 Unpaid Ledger</option>
            <option value="Partially Paid">🟡 Partially Paid Receipts</option>
            <option value="Paid">🟢 Fully Closed Paid</option>
            <option value="Overdue">🚨 Overdue Payments</option>
          </select>
        </div>

        {/* Rep Host Filter */}
        {(currentUser?.role === 'owner' || currentUser?.role === 'sales_admin') ? (
          <div>
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
            >
              <option value="">All representatives</option>
              {salesReps.map((rep) => (
                <option key={rep._id} value={rep._id}>{rep.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider">
            Commercial Billing
          </div>
        )}
      </div>

      {/* --- INVOICES DATA TABLE --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm printable-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-xs text-slate-400 font-bold">Compiling dynamic billing ledger register...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-slate-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 mb-4 shadow-sm">
              <Wallet className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No invoices issued yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1 font-medium">
              Quotes preview modal offers a 1-click option to issue dynamic tax invoices to active clients.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Invoice / Customer Title</th>
                  <th className="px-6 py-4">Client Recipient</th>
                  <th className="px-6 py-4">Grand Total</th>
                  <th className="px-6 py-4">Paid Amount</th>
                  <th className="px-6 py-4">Balance Due</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => {
                  // Real-time dynamic overdue calculation
                  const isOverdue = new Date(invoice.dueDate) < now && invoice.balanceDue > 0;
                  const displayStatus = isOverdue ? 'Overdue' : invoice.status;

                  return (
                    <tr 
                      key={invoice._id}
                      onClick={() => handleOpenInvoice(invoice._id)}
                      className="hover:bg-slate-50/50 transition cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono font-black text-slate-700 text-[10px]">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-slate-800 block">{invoice.title}</span>
                          <span className="text-[9px] text-slate-400">Issued by {invoice.assignedTo ? invoice.assignedTo.name : 'System'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {invoice.leadId && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                            <Users className="h-3 w-3" />
                            {invoice.leadId.company}
                          </span>
                        )}
                        {invoice.contactId && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                            <Target className="h-3 w-3" />
                            {invoice.contactId.company}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-850">
                        {formatCurrency(invoice.grandTotal)}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">
                        {formatCurrency(invoice.amountPaid)}
                      </td>
                      <td className="px-6 py-4 font-black text-indigo-700">
                        {formatCurrency(invoice.balanceDue)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">
                        {new Date(invoice.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 text-[8px] font-black rounded-full uppercase border ${
                          displayStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          displayStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-705 border-amber-100' :
                          displayStatus === 'Overdue' ? 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse' :
                          'bg-slate-50 text-slate-550 border-slate-100'
                        }`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenInvoice(invoice._id)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-455 hover:text-slate-800 border border-slate-200 transition cursor-pointer"
                            title="Print Invoice / Record Payment"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(invoice._id)}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 transition cursor-pointer"
                            title="Purge invoice"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- DETAILED INVOICE PREVIEW MODAL (WATERMARKED) --- */}
      {viewInvoiceOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200 printable-overlay">
          <div className="w-full max-w-3xl bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 printable-paper relative">
            
            {/* --- CORE DYNAMIC BACKGROUND WATERMARK --- */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none z-0">
              <span className={`text-[120px] font-black tracking-widest uppercase rotate-[-28deg] opacity-[0.045] ${
                activeInvoice.balanceDue <= 0 ? 'text-emerald-500' : 'text-slate-600'
              }`}>
                {activeInvoice.balanceDue <= 0 ? 'PAID' : 'UNPAID'}
              </span>
            </div>

            {/* Modal actions controls */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 printable-hidden z-10">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="h-5 w-5 text-emerald-500" />
                Billing Tax Invoice Preview ({activeInvoice.invoiceNumber})
              </h2>

              <div className="flex items-center gap-2">
                {activeInvoice.balanceDue > 0 && (
                  <button
                    onClick={() => { resetPaymentForm(); setPaymentAmount(activeInvoice.balanceDue.toString()); setRecordPaymentOpen(true); }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded cursor-pointer transition shadow"
                  >
                    💳 Record Payment
                  </button>
                )}

                <button
                  onClick={handlePrintInvoice}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded transition cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Save PDF
                </button>
                
                <button onClick={() => setViewInvoiceOpen(false)} className="p-1 rounded hover:bg-slate-200 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* --- DETAILED INVOICE PAPER CONTENT --- */}
            <div className="flex-1 overflow-y-auto max-h-[85vh] p-8 space-y-8 bg-white printable-content z-10" id="print-area">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">INNONSH CRM SOLUTIONS</h1>
                  <span className="text-[9px] text-slate-400 block font-mono mt-0.5">Corporate Industrial Partner</span>
                  <div className="text-[10px] text-slate-500 mt-3.5 space-y-0.5">
                    <p>Building 4A, Tech Industrial Hub, Pune - 411001</p>
                    <p>Email: billing@innonsh.com | Contact: +91 20 6755432</p>
                    <p className="font-bold font-mono text-[9px] text-slate-655">GSTIN: 27AABCI4567K1Z4 (Sample)</p>
                  </div>
                </div>

                <div className="text-right">
                  <h2 className="text-lg font-black text-slate-850 tracking-wider">TAX INVOICE</h2>
                  <div className="text-[10px] text-slate-555 mt-3 space-y-1">
                    <p className="font-mono"><strong className="text-slate-800">Invoice Number:</strong> {activeInvoice.invoiceNumber}</p>
                    <p><strong>Invoice Date:</strong> {new Date(activeInvoice.invoiceDate).toLocaleDateString('en-IN')}</p>
                    <p className="text-rose-600 font-bold"><strong>Due Date:</strong> {new Date(activeInvoice.dueDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {/* Bill To Recipient */}
              <div className="grid grid-cols-2 gap-8">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-2">Billed To Recipient:</span>
                  
                  {activeInvoice.leadId && (
                    <div className="text-xs space-y-1 text-slate-700">
                      <p className="font-bold text-slate-900 text-sm">{activeInvoice.leadId.firstName} {activeInvoice.leadId.lastName || ''}</p>
                      <p className="font-bold text-slate-500">{activeInvoice.leadId.company}</p>
                      <p>{activeInvoice.leadId.email || 'No Email'}</p>
                      <p>{activeInvoice.leadId.phone || 'No Phone'}</p>
                      {activeInvoice.leadId.city && <p>{activeInvoice.leadId.city}, {activeInvoice.leadId.state || 'India'}</p>}
                    </div>
                  )}

                  {activeInvoice.contactId && (
                    <div className="text-xs space-y-1 text-slate-700">
                      <p className="font-bold text-slate-900 text-sm">{activeInvoice.contactId.firstName} {activeInvoice.contactId.lastName || ''}</p>
                      <p className="font-bold text-slate-500">{activeInvoice.contactId.company}</p>
                      <p>{activeInvoice.contactId.email || 'No Email'}</p>
                      <p>{activeInvoice.contactId.phone || 'No Phone'}</p>
                      {activeInvoice.contactId.city && <p>{activeInvoice.contactId.city}, {activeInvoice.contactId.state || 'India'}</p>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-end text-right text-xs space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Assigned Corporate Manager</p>
                  <p className="font-bold text-slate-800">{activeInvoice.assignedTo ? activeInvoice.assignedTo.name : 'System Manager'}</p>
                  <p className="text-slate-550">{activeInvoice.assignedTo ? activeInvoice.assignedTo.email : 'Unknown'}</p>
                  <p className="capitalize">Role: {activeInvoice.assignedTo ? activeInvoice.assignedTo.role : 'Billing'}</p>
                </div>
              </div>

              {/* Line Items Table List */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[9px]">
                      <th className="px-4 py-3 w-10">#</th>
                      <th className="px-4 py-3">Product Description / SKU</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-center w-14">Qty</th>
                      <th className="px-4 py-3 text-center w-14">Discount</th>
                      <th className="px-4 py-3 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeInvoice.lineItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono text-slate-400 text-[10px]">{index + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-655">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-650">{item.discount}%</td>
                        <td className="px-4 py-3 font-black text-slate-850 text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Transactions Ledger Payments History & Financial Summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                
                {/* Left: Payments Transaction Log history */}
                <div className="space-y-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">Payment Transactions ledger</span>
                  
                  {activeInvoice.payments.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 text-slate-400 italic text-[10px] rounded-lg">
                      No payment transactions logged for this invoice sheet. Remaining balance must be recovered before due deadline.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeInvoice.payments.map((pmt, idx) => (
                        <div key={idx} className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center justify-between text-[10px]">
                          <div>
                            <span className="font-bold text-emerald-805 block">Recovered Amount: {formatCurrency(pmt.amount)}</span>
                            <span className="text-slate-455 block mt-0.5">Method: {pmt.paymentMethod} {pmt.transactionRef && `| Ref: ${pmt.transactionRef}`}</span>
                          </div>
                          <span className="text-slate-400 font-medium">
                            {new Date(pmt.paymentDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Detailed balances breakdown */}
                <div className="space-y-3.5 bg-slate-50 border border-slate-250 p-5 rounded-2xl h-fit">
                  <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                    <span>Products Subtotal</span>
                    <span className="font-bold text-slate-800">{formatCurrency(activeInvoice.subtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                    <span>CGST/SGST Taxes ({activeInvoice.taxRate}%)</span>
                    <span className="font-bold text-slate-800">{formatCurrency(activeInvoice.taxAmount)}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-xs text-emerald-650 font-bold">
                    <span>Total Amount Recovered</span>
                    <span className="font-black text-sm">{formatCurrency(activeInvoice.amountPaid)}</span>
                  </div>

                  <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center text-sm font-black text-slate-900">
                    <span className="text-indigo-700 font-bold uppercase tracking-wider text-[11px]">Net Outstanding Due (INR)</span>
                    <span className="text-indigo-700 font-extrabold text-base">{formatCurrency(activeInvoice.balanceDue)}</span>
                  </div>
                </div>

              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-12">
                <div className="space-y-10">
                  <div className="h-1 bg-slate-200 w-48"></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Client Authorized Signature</span>
                </div>
                <div className="space-y-10 flex flex-col items-end text-right">
                  <div className="h-1 bg-slate-200 w-48"></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">INNONSH Authorized Signatory</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- ADD PAYMENT DRAWER OVERLAY --- */}
      {recordPaymentOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200 printable-hidden">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-805 flex items-center gap-1.5">
                <Wallet className="h-5 w-5 text-emerald-500" />
                Record Transaction Receipt ({activeInvoice.invoiceNumber})
              </h2>
              <button onClick={() => setRecordPaymentOpen(false)} className="p-1 rounded hover:bg-slate-200 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 bg-white">
              {paymentError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-650 font-bold animate-pulse">
                  {paymentError}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Received Payment Amount (INR) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="E.g. 50000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                />
                <span className="block text-[9px] text-indigo-650 font-bold mt-1.5 italic">Remaining balance due: {formatCurrency(activeInvoice.balanceDue)}</span>
              </div>

              {/* Method */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Gateway / Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                >
                  <option value="Bank Transfer">🏦 Direct Bank Transfer (IMPS/NEFT)</option>
                  <option value="UPI">📱 UPI Payment Gateway (GPay/PhonePe)</option>
                  <option value="Cheque">📄 Corporate Cheque</option>
                  <option value="Cash">💵 Hard Cash Receipt</option>
                  <option value="Credit Card">💳 Credit/Debit Card</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gateway Transaction Reference ID</label>
                <input
                  type="text"
                  placeholder="E.g. TXN-100234559"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment notes</label>
                <textarea
                  rows="2"
                  placeholder="E.g. Advance paid by client accountant..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                ></textarea>
              </div>

              {/* Submit triggers */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRecordPaymentOpen(false)}
                  className="px-4 py-2 text-xs font-bold hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-850 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-450 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Log Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
