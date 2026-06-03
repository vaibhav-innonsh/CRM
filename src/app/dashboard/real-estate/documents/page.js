'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  User, 
  Building, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Tag
} from 'lucide-react';

export default function DocumentsVaultPage() {
  const [documents, setDocuments] = useState([]);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  // Modal Control States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const initialFormState = {
    documentName: '',
    documentType: 'Agreement',
    leadId: '',
    propertyId: '',
    status: 'Verified'
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch data lists
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch documents list
      const docsRes = await fetch('/api/real-estate/documents');
      if (!docsRes.ok) throw new Error('Could not retrieve KYC documents directory.');
      const docsData = await docsRes.json();

      // 2. Fetch leads for dropdown mapping
      const leadsRes = await fetch('/api/leads');
      let leadsList = [];
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        leadsList = leadsData.leads || [];
      }

      // 3. Fetch properties catalog for dropdown mapping
      const propsRes = await fetch('/api/real-estate/properties');
      let propsList = [];
      if (propsRes.ok) {
        const propsData = await propsRes.json();
        propsList = propsData.properties || [];
      }

      setLeads(leadsList);
      setProperties(propsList);

      if (docsData.success) {
        setDocuments(docsData.documents || []);
      } else {
        throw new Error(docsData.error || 'Server error.');
      }
    } catch (err) {
      console.error('Fetch documents failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Preset dropdowns when helper lists load
  useEffect(() => {
    if (leads.length > 0 && !formData.leadId) {
      setFormData(prev => ({ ...prev, leadId: leads[0].id || leads[0]._id }));
    }
    if (properties.length > 0 && !formData.propertyId) {
      setFormData(prev => ({ ...prev, propertyId: properties[0].id || properties[0]._id }));
    }
  }, [leads, properties]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.documentName.trim()) return setModalError('Document Name is required.');
    if (!formData.leadId) return setModalError('Please select a customer lead.');

    try {
      setSubmittingDoc(true);

      const payload = {
        documentName: formData.documentName.trim(),
        documentType: formData.documentType,
        leadId: formData.leadId,
        propertyId: formData.propertyId || null,
        status: formData.status
      };

      const res = await fetch('/api/real-estate/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record customer document.');

      if (data.success) {
        setFormData({
          ...initialFormState,
          leadId: leads[0]?.id || leads[0]?._id || '',
          propertyId: properties[0]?.id || properties[0]?._id || ''
        });
        setShowAddModal(false);
        triggerToast('Customer Document recorded in secure vault successfully!');
        fetchData();
      }
    } catch (err) {
      console.error('Create document failed:', err);
      setModalError(err.message);
    } finally {
      setSubmittingDoc(false);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Math Statistics Aggregates
  const totalDocs = documents.length;
  const agreementCount = documents.filter(d => d.documentType === 'Agreement').length;
  const nocCount = documents.filter(d => d.documentType === 'NOC').length;
  const kycCount = documents.filter(d => d.documentType === 'KYC').length;

  // Filter Logic
  const filteredDocs = documents.filter(d => {
    const matchesSearch = 
      d.documentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.propertyTitle?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'All' || d.documentType === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <FolderOpen className="h-5 w-5 text-emerald-500" /> Documents KYC Vault
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Store property sale agreements, customer KYC files, NOC certifications, and record confirmation logs.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 duration-200"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Upload Document
        </button>
      </div>

      {/* Success Notification Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Database Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-650 shrink-0" />
          <span>Error loading documents vault: {error}. Please refresh.</span>
        </div>
      )}

      {/* Statistics widgets cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5">
            <FolderOpen className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Vault Files</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{totalDocs}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-555 shrink-0 mt-0.5">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Verified KYC</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{kycCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-555 shrink-0 mt-0.5">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Sale Deeds</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{agreementCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-550 shrink-0 mt-0.5">
            <Tag className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">NOC Certificates</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{nocCount}</span>
          </div>
        </div>
      </div>

      {/* Glassmorphic Search & Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Search bar */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[2]" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Document Name, Buyer Customer, Property..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 placeholder-slate-400 transition"
            />
          </div>

          {/* Type filter */}
          <div className="relative">
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 transition cursor-pointer appearance-none"
            >
              <option value="All">🚦 All Document Types</option>
              <option value="Agreement">Sale Agreement</option>
              <option value="KYC">KYC Verification</option>
              <option value="NOC">NOC Certificate</option>
              <option value="Tax Invoice">Tax Invoice</option>
            </select>
          </div>

        </div>
      </div>

      {/* Documents Vault List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="h-40 bg-white border rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-300 rounded-2xl bg-white space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-555 mx-auto">
            <FolderOpen className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">No Documents Found</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto font-semibold">
              Add Sale Deeds, customer KYC files or tax records to secure organization directories.
            </p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-250 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-black transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" /> Register First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => {
            const typeStyles = {
              'Agreement': 'bg-indigo-50 border-indigo-200 text-indigo-700',
              'KYC': 'bg-emerald-50 border-emerald-200 text-emerald-700',
              'NOC': 'bg-amber-50 border-amber-200 text-amber-700',
              'Tax Invoice': 'bg-rose-50 border-rose-200 text-rose-700'
            };
            const currentBadge = typeStyles[doc.documentType] || 'bg-slate-100 border-slate-200 text-slate-500';

            return (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-350 hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden text-xs">
                
                {/* Glow Line on the top */}
                <div className="absolute top-0 left-0 h-1.5 w-full bg-indigo-550"></div>

                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight line-clamp-1">{doc.documentName}</h4>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                        Uploaded: {new Date(doc.uploadDate || doc.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${currentBadge}`}>
                      {doc.documentType}
                    </span>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.leadName} ({doc.company || 'Individual'})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.propertyTitle}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold font-mono text-slate-450 uppercase">
                  <span className="text-emerald-600 flex items-center gap-0.5 font-bold">
                    ✓ Verified Security
                  </span>
                  <span className="text-indigo-600 flex items-center gap-0.5 hover:underline cursor-pointer">
                    Download File <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* DYNAMIC "UPLOAD DOCUMENT" MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-555 shrink-0">
                  <FolderOpen className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Upload KYC/Agreement Document</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Register digital file details safely into active accounts.</p>
                </div>
              </div>
              <button 
                onClick={() => { setModalError(null); setShowAddModal(false); }}
                className="h-7 w-7 rounded-lg hover:bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Error Alert */}
            {modalError && (
              <div className="px-5 py-2.5 bg-red-50 border-b border-red-150 text-red-800 text-[10px] font-black flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-650 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Scrollable fields */}
            <form onSubmit={handleAddDocument} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Document Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Document Label Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="documentName"
                  required
                  value={formData.documentName}
                  onChange={handleInputChange}
                  placeholder="e.g. Sale Deed Agreement - Wing A 405"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-755 transition"
                />
              </div>

              {/* Document Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Document Classification Category</label>
                <select 
                  name="documentType"
                  value={formData.documentType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="Agreement">Sale Agreement</option>
                  <option value="KYC">KYC Verification</option>
                  <option value="NOC">NOC Certificate</option>
                  <option value="Tax Invoice">Tax Invoice</option>
                </select>
              </div>

              {/* Lead Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Select Customer Lead <span className="text-red-500">*</span></label>
                {leads.length === 0 ? (
                  <p className="text-xs font-bold text-red-600 italic">No leads directory found.</p>
                ) : (
                  <select 
                    name="leadId"
                    value={formData.leadId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    {leads.map(l => (
                      <option key={l.id || l._id} value={l.id || l._id}>{l.firstName} {l.lastName || ''} ({l.company || 'Individual'})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Property Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Select Linked Property Catalog</label>
                {properties.length === 0 ? (
                  <p className="text-xs font-bold text-slate-450 italic">No property listings created yet.</p>
                ) : (
                  <select 
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="">-- Keep Standalone Document --</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.title} ({p.location})</option>
                    ))}
                  </select>
                )}
              </div>

            </form>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 text-xs font-bold">
              <button 
                type="button"
                disabled={submittingDoc}
                onClick={() => { setModalError(null); setShowAddModal(false); }}
                className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={submittingDoc}
                onClick={handleAddDocument}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition"
              >
                {submittingDoc ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Registering...
                  </>
                ) : (
                  <>✓ Record Document</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
