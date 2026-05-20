'use client';

import { useEffect, useState } from 'react';
import { 
  Loader2, 
  Search, 
  Plus, 
  X, 
  Info,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  Award,
  Trash2,
  ChevronRight,
  Printer,
  Users,
  Target,
  PlusCircle,
  Percent,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [products, setProducts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewInvoiceOpen, setViewInvoiceOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Form states (Quotation Builder Workspace)
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [associatedType, setAssociatedType] = useState('None'); // 'None', 'Lead', 'Contact'
  const [associatedLeadId, setAssociatedLeadId] = useState('');
  const [associatedContactId, setAssociatedContactId] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  
  // Interactive Line Items
  const [lineItems, setLineItems] = useState([]);
  const [taxRate, setTaxRate] = useState(18); // Default 18% GST
  const [notes, setNotes] = useState('Terms & Conditions:\n1. 50% Advance along with formal purchase order.\n2. Balance 50% payable upon delivery of licenses.\n3. Implementation and customization timeline: 2-3 weeks.');
  const [status, setStatus] = useState('Draft');

  const [formError, setFormError] = useState('');

  // Toast Helper
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage({ text: '', type: '' });
    }, 4000);
  };

  // Fetch initial details
  useEffect(() => {
    async function initQuotations() {
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

        // Fetch products, leads & contacts
        const [prodRes, leadsRes, contactsRes] = await Promise.all([
          fetch('/api/products?status=Active'),
          fetch('/api/leads'),
          fetch('/api/contacts')
        ]);

        if (prodRes.ok) {
          const data = await prodRes.json();
          setProducts(data.products || []);
        }
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeads(data.leads || []);
        }
        if (contactsRes.ok) {
          const data = await contactsRes.json();
          setContacts(data.contacts || []);
        }
      } catch (err) {
        console.error('Quotations initial fetch failed:', err);
      }
    }
    initQuotations();
  }, []);

  // Fetch quotations list
  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (repFilter) queryParams.append('assignedTo', repFilter);

      const res = await fetch(`/api/quotations?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuotations(data.quotations || []);
      }
    } catch (err) {
      console.error('Fetch quotations list failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [search, statusFilter, repFilter]);

  // Fetch single detailed quotation for invoice previewing
  const handleOpenInvoice = async (quoteId) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveInvoice(data.quotation);
        setViewInvoiceOpen(true);
      } else {
        alert('Failed to retrieve full quotation invoice.');
      }
    } catch (err) {
      console.error('Fetch invoice failed:', err);
    }
  };

  // Add Item to interactive Line-Items array
  const handleAddLineItem = (productId) => {
    if (!productId) return;
    const targetProduct = products.find(p => p._id === productId);
    if (!targetProduct) return;

    // Check if product already exists in item list
    const existingIndex = lineItems.findIndex(item => item.productId === productId);
    if (existingIndex > -1) {
      const updated = [...lineItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = Number(((updated[existingIndex].price * updated[existingIndex].quantity) * (1 - updated[existingIndex].discount / 100)).toFixed(2));
      setLineItems(updated);
    } else {
      setLineItems([
        ...lineItems,
        {
          productId: targetProduct._id,
          name: targetProduct.name,
          price: targetProduct.price,
          quantity: 1,
          discount: 0,
          total: targetProduct.price
        }
      ]);
    }
    setSelectedProductToAdd('');
  };

  // Edit line item property (quantity or discount percentage)
  const handleEditLineItem = (index, field, value) => {
    const updated = [...lineItems];
    if (field === 'quantity') {
      const qty = Math.max(1, Number(value) || 1);
      updated[index].quantity = qty;
    } else if (field === 'discount') {
      const disc = Math.min(100, Math.max(0, Number(value) || 0));
      updated[index].discount = disc;
    } else if (field === 'price') {
      updated[index].price = Math.max(0, Number(value) || 0);
    }
    
    // Compile single item total live
    const baseTotal = updated[index].price * updated[index].quantity;
    updated[index].total = Number((baseTotal * (1 - updated[index].discount / 100)).toFixed(2));
    setLineItems(updated);
  };

  // Remove item from quote compilation list
  const handleRemoveLineItem = (index) => {
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  // Financial live computations (subtotal, tax amount and grand total)
  const computeLiveTotals = () => {
    const subtotal = lineItems.reduce((acc, curr) => acc + curr.total, 0);
    const taxAmount = subtotal * (Number(taxRate) / 100);
    const grandTotal = subtotal + taxAmount;
    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
    };
  };

  const liveTotals = computeLiveTotals();

  // Create Quotation Submit
  const handleCompileQuotation = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    if (lineItems.length === 0) {
      setFormError('Please add at least one inventory product line-item.');
      setActionLoading(false);
      return;
    }

    const quotationData = {
      title: title.trim(),
      contactId: associatedType === 'Contact' ? associatedContactId : undefined,
      leadId: associatedType === 'Lead' ? associatedLeadId : undefined,
      validUntil,
      lineItems,
      taxRate: Number(taxRate),
      notes: notes.trim(),
      status
    };

    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationData)
      });

      const data = await res.json();

      if (res.ok) {
        setAddModalOpen(false);
        resetForm();
        fetchQuotations();
        showToast('📝 Commercial pricing proposal successfully compiled!');
      } else {
        setFormError(data.error || 'Failed to compile proposal.');
      }
    } catch (err) {
      setFormError('Network connection link error.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle status inside detailed preview
  const handleToggleInvoiceStatus = async (quote, nextStatus) => {
    try {
      const res = await fetch(`/api/quotations/${quote._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        showToast(`Quotation status marked as "${nextStatus}"`);
        handleOpenInvoice(quote._id);
        fetchQuotations();
      }
    } catch (err) {
      console.error('Update status failed:', err);
    }
  };

  // Convert Quotation to Tax Invoice (1-Click Pipeline)
  const handleConvertQuoteToInvoice = async (quoteId) => {
    if (!window.confirm('Convert this quotation to an active unpaid tax invoice?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${quoteId}/convert`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('🔄 Proposal successfully converted to Tax Invoice!');
        setViewInvoiceOpen(false);
        fetchQuotations();
      } else {
        alert(data.error || 'Failed to convert proposal to invoice.');
      }
    } catch (err) {
      console.error('Convert quote error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Quotation
  const handleDeleteQuotation = async (quoteId) => {
    if (!window.confirm('Are you sure you want to delete this proposal record?')) return;

    try {
      const res = await fetch(`/api/quotations/${quoteId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchQuotations();
        showToast('🗑️ Quotation record purged.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete quotation.');
      }
    } catch (err) {
      console.error('Delete quotation failed:', err);
    }
  };

  // Clean trigger printable screen
  const handlePrintInvoice = () => {
    window.print();
  };

  const resetForm = () => {
    setTitle('');
    setValidUntil('');
    setAssociatedType('None');
    setAssociatedLeadId('');
    setAssociatedContactId('');
    setSelectedProductToAdd('');
    setLineItems([]);
    setTaxRate(18);
    setNotes('Terms & Conditions:\n1. 50% Advance along with formal purchase order.\n2. Balance 50% payable upon delivery of licenses.\n3. Implementation and customization timeline: 2-3 weeks.');
    setStatus('Draft');
    setFormError('');
  };

  // Formatting currency helper (INR)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Analytics Metrics Counters
  const totalQuoteCount = quotations.length;
  const sentQuoteCount = quotations.filter(q => q.status === 'Sent').length;
  const acceptedQuoteCount = quotations.filter(q => q.status === 'Accepted').length;
  const closedRevenue = quotations
    .filter(q => q.status === 'Accepted')
    .reduce((acc, curr) => acc + curr.grandTotal, 0);

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
            <FileSpreadsheet className="h-7 w-7 text-emerald-500" />
            Digital Quotations & Proposals
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Generate industrial estimation quotation invoices, compute GSTs, and print corporate PDF sheets.
          </p>
        </div>
        <div className="shrink-0 flex items-center">
          <button
            onClick={() => { resetForm(); setAddModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-455 text-white text-xs font-bold shadow-md active:scale-95 transition cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 stroke-[3]" />
            Compile Proposal / Quote
          </button>
        </div>
      </div>

      {/* --- REVENUE & PROPOSALS ANALYTICS GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-350 printable-hidden">
        {/* Closed Revenue */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Revenue Closed</span>
            <span className="text-2xl font-black text-emerald-650 block mt-1">{formatCurrency(closedRevenue)}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Accepted Quotes */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Proposals Accepted</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">{acceptedQuoteCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <Award className="h-5 w-5" />
          </div>
        </div>

        {/* Sent Quotes */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Sent Proposals</span>
            <span className="text-2xl font-black text-indigo-650 block mt-1">{sentQuoteCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* Total Quotes */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Total Estimates</span>
            <span className="text-2xl font-black text-amber-600 block mt-1">{totalQuoteCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* --- LIVE SEARCH & FILTERS BAR --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm printable-hidden">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search Quote ID or proposal title..."
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
            <option value="">All Proposal Statuses</option>
            <option value="Draft">📓 Draft Estimates</option>
            <option value="Sent">🔵 Sent to Clients</option>
            <option value="Accepted">🟢 Accepted Deals</option>
            <option value="Rejected">🔴 Rejected Offers</option>
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
            Commercial Account
          </div>
        )}
      </div>

      {/* --- QUOTATIONS DATA TABLE --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm printable-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-xs text-slate-400 font-bold">Compiling corporate quotations register...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-slate-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 mb-4 shadow-sm">
              <FileSpreadsheet className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No quotation proposals compiled yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1 font-medium">
              Start compiling custom product price lists and GST summaries for your target prospects.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Quote ID</th>
                  <th className="px-6 py-4">Proposal / Target Title</th>
                  <th className="px-6 py-4">Linked Customer</th>
                  <th className="px-6 py-4">Grand Total (GST Inc)</th>
                  <th className="px-6 py-4">Valid Until</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((quote) => (
                  <tr 
                    key={quote._id}
                    onClick={() => handleOpenInvoice(quote._id)}
                    className="hover:bg-slate-50/50 transition cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-black text-slate-700 text-[10px]">
                      {quote.quoteNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-slate-800 block">{quote.title}</span>
                        <span className="text-[9px] text-slate-400">Created by {quote.assignedTo ? quote.assignedTo.name : 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {quote.leadId && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                          <Users className="h-3 w-3" />
                          {quote.leadId.firstName} ({quote.leadId.company})
                        </span>
                      )}
                      {quote.contactId && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                          <Target className="h-3 w-3" />
                          {quote.contactId.firstName} ({quote.contactId.company})
                        </span>
                      )}
                      {!quote.leadId && !quote.contactId && <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 font-black text-slate-800">
                      {formatCurrency(quote.grandTotal)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500">
                      {new Date(quote.validUntil).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 text-[8px] font-black rounded-full uppercase border ${
                        quote.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        quote.status === 'Sent' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        quote.status === 'Draft' ? 'bg-slate-50 text-slate-500 border-slate-100' :
                        'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenInvoice(quote._id)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-455 hover:text-slate-800 border border-slate-200 transition cursor-pointer"
                          title="Print / View Invoice"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuotation(quote._id)}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 transition cursor-pointer"
                          title="Purge proposal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- WORKSPACE MODAL: COMPILE NEW QUOTATION --- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200 printable-hidden">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <PlusCircle className="h-5 w-5 text-emerald-500" />
                Interactive Pricing Proposal Builder Workspace
              </h2>
              <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-450 hover:text-slate-850">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Work area */}
            <form onSubmit={handleCompileQuotation} className="flex-1 overflow-y-auto max-h-[80vh] p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white">
              {formError && (
                <div className="col-span-3 p-3 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-600 font-bold">
                  {formError}
                </div>
              )}

              {/* LEFT COLUMN: Metadata & Client Connections */}
              <div className="lg:col-span-1 space-y-4">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">1. Client & Timings</span>

                {/* Title */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Quotation Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Innonsh Enterprise licenses purchase PO"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-800 transition"
                  />
                </div>

                {/* Validity deadline */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Validity Deadline *</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-xs text-slate-655 transition"
                  />
                </div>

                {/* Connected Client accounts */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-250 space-y-3">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Linked Accounts</span>
                  
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => { setAssociatedType('None'); setAssociatedLeadId(''); setAssociatedContactId(''); }}
                      className={`px-1.5 py-1 rounded text-[9px] font-bold border transition ${
                        associatedType === 'None' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAssociatedType('Lead'); setAssociatedContactId(''); }}
                      className={`px-1.5 py-1 rounded text-[9px] font-bold border transition ${
                        associatedType === 'Lead' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-655 border-slate-200'
                      }`}
                    >
                      Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAssociatedType('Contact'); setAssociatedLeadId(''); }}
                      className={`px-1.5 py-1 rounded text-[9px] font-bold border transition ${
                        associatedType === 'Contact' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-655 border-slate-200'
                      }`}
                    >
                      Contact
                    </button>
                  </div>

                  {associatedType === 'Lead' && (
                    <div className="animate-in fade-in duration-200">
                      <select
                        value={associatedLeadId}
                        required={associatedType === 'Lead'}
                        onChange={(e) => setAssociatedLeadId(e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-white border border-slate-200 text-xs text-slate-700"
                      >
                        <option value="">-- Choose Lead --</option>
                        {leads.map((l) => (
                          <option key={l._id} value={l._id}>{l.firstName} ({l.company})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {associatedType === 'Contact' && (
                    <div className="animate-in fade-in duration-200">
                      <select
                        value={associatedContactId}
                        required={associatedType === 'Contact'}
                        onChange={(e) => setAssociatedContactId(e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-white border border-slate-200 text-xs text-slate-700"
                      >
                        <option value="">-- Choose Contact --</option>
                        {contacts.map((c) => (
                          <option key={c._id} value={c._id}>{c.firstName} ({c.company})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Notes terms */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Proposal terms & notes</label>
                  <textarea
                    rows="4"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none text-[10px] text-slate-805 transition"
                  ></textarea>
                </div>
              </div>

              {/* RIGHT COLUMN: Interactive line items editor */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">2. Quotation Line Items compiler</span>
                  
                  {/* Select product to load */}
                  <div className="relative w-48">
                    <select
                      value={selectedProductToAdd}
                      onChange={(e) => handleAddLineItem(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold focus:outline-none cursor-pointer transition border border-emerald-200"
                    >
                      <option value="">+ Add Product SKU</option>
                      {products.map(p => (
                        <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected items compilation table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {lineItems.length === 0 ? (
                    <div className="py-12 bg-slate-50 text-center text-slate-400 text-xs font-bold">
                      📦 Catalogue items compilation empty. Add products from the dropdown above!
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                          <th className="px-4 py-3">Product Name</th>
                          <th className="px-4 py-3">Price</th>
                          <th className="px-4 py-3 w-16">Qty</th>
                          <th className="px-4 py-3 w-16">Disc %</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lineItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2.5 font-bold text-slate-800 text-[11px]">{item.name}</td>
                            <td className="px-4 py-2.5">
                              <input 
                                type="number" 
                                value={item.price}
                                onChange={(e) => handleEditLineItem(index, 'price', e.target.value)}
                                className="w-16 px-1.5 py-0.5 rounded border border-slate-200 focus:outline-none text-[11px]"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <input 
                                type="number" 
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleEditLineItem(index, 'quantity', e.target.value)}
                                className="w-12 px-1.5 py-0.5 rounded border border-slate-200 focus:outline-none text-[11px]"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <input 
                                type="number" 
                                min="0" 
                                max="100"
                                value={item.discount}
                                onChange={(e) => handleEditLineItem(index, 'discount', e.target.value)}
                                className="w-12 px-1.5 py-0.5 rounded border border-slate-200 focus:outline-none text-[11px]"
                              />
                            </td>
                            <td className="px-4 py-2.5 font-black text-slate-700 text-right">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button 
                                type="button" 
                                onClick={() => handleRemoveLineItem(index)}
                                className="p-0.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Subtotal summaries */}
                <div className="bg-slate-50 border border-slate-250 p-4 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-medium text-slate-600">
                    <span>Subtotal Products Cost</span>
                    <span className="font-bold text-slate-800">{formatCurrency(liveTotals.subtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-medium text-slate-600">
                    <span className="flex items-center gap-1">
                      GST Taxes (Rate %): 
                      <input 
                        type="number" 
                        value={taxRate} 
                        onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value) || 0))}
                        className="w-10 px-1 py-0.5 rounded border border-slate-200 text-center text-[10px] font-bold"
                      />
                    </span>
                    <span className="font-bold text-slate-800">{formatCurrency(liveTotals.taxAmount)}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-sm font-black text-slate-800">
                    <span className="text-emerald-700 uppercase tracking-wide">Net Grand Total (INR)</span>
                    <span className="text-emerald-700 font-extrabold text-base">{formatCurrency(liveTotals.grandTotal)}</span>
                  </div>
                </div>

                {/* Submit workspace options */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  {/* Status drafting */}
                  <div className="mr-auto">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-250 bg-white text-xs text-slate-655"
                    >
                      <option value="Draft">Draft Estimate</option>
                      <option value="Sent">Send directly (Sent)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-850 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-450 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Compile Corporate Proposal'}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- INVOICE VIEW PREVIEW & PRINT WINDOW --- */}
      {viewInvoiceOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6 overflow-y-auto animate-in fade-in duration-200 printable-overlay">
          <div className="w-full max-w-3xl bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 printable-paper">
            
            {/* Modal Actions controls */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 printable-hidden">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="h-5 w-5 text-emerald-500" />
                Quotation Invoice Preview ({activeInvoice.quoteNumber})
              </h2>

              <div className="flex items-center gap-2">
                {activeInvoice.status === 'Draft' && (
                  <button
                    onClick={() => handleToggleInvoiceStatus(activeInvoice, 'Sent')}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded"
                  >
                    Mark Sent
                  </button>
                )}
                {activeInvoice.status === 'Sent' && (
                  <>
                    <button
                      onClick={() => handleToggleInvoiceStatus(activeInvoice, 'Accepted')}
                      className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-bold rounded cursor-pointer"
                    >
                      Accept Proposal
                    </button>
                    <button
                      onClick={() => handleToggleInvoiceStatus(activeInvoice, 'Rejected')}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded cursor-pointer"
                    >
                      Reject
                    </button>
                  </>
                )}

                {activeInvoice.status !== 'Accepted' && (
                  <button
                    onClick={() => handleConvertQuoteToInvoice(activeInvoice._id)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition shadow hover:shadow-md"
                  >
                    🔄 Convert to Invoice
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

            {/* --- CORE PRINTABLE CORPORATE INVOICE LAYOUT --- */}
            <div className="flex-1 overflow-y-auto max-h-[85vh] p-8 space-y-8 bg-white printable-content" id="print-area">
              
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
                  <h2 className="text-lg font-black text-slate-800 tracking-wider">PRICING PROPOSAL</h2>
                  <div className="text-[10px] text-slate-500 mt-3 space-y-1">
                    <p className="font-mono"><strong className="text-slate-800">Proposal ID:</strong> {activeInvoice.quoteNumber}</p>
                    <p><strong>Quote Date:</strong> {new Date(activeInvoice.quoteDate).toLocaleDateString('en-IN')}</p>
                    <p className="text-rose-600 font-bold"><strong>Valid Until:</strong> {new Date(activeInvoice.validUntil).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {/* Bill To Recipient */}
              <div className="grid grid-cols-2 gap-8">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-2">Proposal Prepared For:</span>
                  
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

                  {!activeInvoice.leadId && !activeInvoice.contactId && (
                    <span className="text-xs text-slate-400 italic">No Client account linked</span>
                  )}
                </div>

                <div className="flex flex-col justify-end text-right text-xs space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Assigned Corporate Host</p>
                  <p className="font-bold text-slate-800">{activeInvoice.assignedTo ? activeInvoice.assignedTo.name : 'Author'}</p>
                  <p className="text-slate-550">{activeInvoice.assignedTo ? activeInvoice.assignedTo.email : 'Unknown'}</p>
                  <p className="capitalize">Role: {activeInvoice.assignedTo ? activeInvoice.assignedTo.role : 'Representative'}</p>
                </div>
              </div>

              {/* Line Items Table list */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[9px]">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Product SKU / Description</th>
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
                        <td className="px-4 py-3 font-black text-slate-800 text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quotation Notes terms & Calculations details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                
                {/* Notes */}
                <div className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed font-sans border-r border-slate-200 pr-6">
                  {activeInvoice.notes}
                </div>

                {/* Final compilation sums */}
                <div className="space-y-2 bg-slate-50 border border-slate-250 p-4 rounded-xl h-fit">
                  <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                    <span>Products Subtotal Cost</span>
                    <span className="font-bold text-slate-800">{formatCurrency(activeInvoice.subtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                    <span>CGST/SGST Taxes ({activeInvoice.taxRate}%)</span>
                    <span className="font-bold text-slate-800">{formatCurrency(activeInvoice.taxAmount)}</span>
                  </div>

                  <div className="border-t border-slate-250 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                    <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px]">Grand Total (INR)</span>
                    <span className="text-emerald-700 font-extrabold text-base">{formatCurrency(activeInvoice.grandTotal)}</span>
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

    </div>
  );
}
