'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Loader2, 
  Clock, 
  Sparkles, 
  XCircle,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Layers,
  Calendar,
  DollarSign,
  TrendingDown
} from 'lucide-react';

export default function PharmacyPage() {
  // Data States
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    medicine_name: '',
    category: '',
    batch_number: '',
    expiry_date: '',
    stock_quantity: '',
    unit_price: '',
    supplier: ''
  });

  // Adjust Stock Modal States
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustPrice, setAdjustPrice] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/healthcare/pharmacy?search=${search}&category=${categoryFilter}`);
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventory || []);
      }
    } catch (err) {
      console.error('Fetch pharmacy failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, categoryFilter]);

  // Handle Form Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Medicine Batch
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/healthcare/pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok) {
        setIsFormOpen(false);
        setFormData({
          medicine_name: '',
          category: '',
          batch_number: '',
          expiry_date: '',
          stock_quantity: '',
          unit_price: '',
          supplier: ''
        });
        fetchData();
      } else {
        setFormError(data.error || 'Failed to register medicine batch.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to connect to server.');
    } finally {
      setFormLoading(false);
    }
  };

  // Open adjustment modal
  const openAdjustModal = (batch) => {
    setSelectedBatchForAdjust(batch);
    setAdjustQty(batch.stock_quantity.toString());
    setAdjustPrice(batch.unit_price.toString());
    setIsAdjustOpen(true);
  };

  // Submit Stock / Pricing Adjustment
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatchForAdjust) return;

    setAdjustLoading(true);
    try {
      const res = await fetch('/api/healthcare/pharmacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatchForAdjust.id,
          stock_quantity: adjustQty,
          unit_price: adjustPrice
        })
      });
      if (res.ok) {
        setIsAdjustOpen(false);
        setSelectedBatchForAdjust(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdjustLoading(false);
    }
  };

  // Quick Inline Incrementor for restocks (+10 units)
  const handleQuickRestock = async (batchId, currentQty) => {
    setActionLoading(batchId);
    try {
      const res = await fetch('/api/healthcare/pharmacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          stock_quantity: currentQty + 10
        })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Quick restock failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Metrics
  const totalStockItems = inventory.reduce((acc, curr) => acc + curr.stock_quantity, 0);
  const totalActiveBatches = inventory.length;
  const totalLowStockAlerts = inventory.filter(b => b.stock_quantity < 50).length;

  // Stock indicator styles
  const getStockPillStyles = (qty) => {
    if (qty < 20) {
      return 'bg-rose-50 border-rose-200 text-rose-700 font-bold';
    } else if (qty < 50) {
      return 'bg-amber-50 border-amber-250 text-amber-700 font-bold';
    } else {
      return 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold';
    }
  };

  // Expiry check
  const isExpired = (expStr) => {
    const today = new Date();
    const exp = new Date(expStr);
    return exp < today;
  };

  return (
    <div className="space-y-6 text-left relative select-none">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="h-5.5 w-5.5 text-rose-500" /> Pharmacy Medicine Inventory
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Track pharmacy drug catalogs, log supplier shipments, monitor expiry calendars, and review critical low-stock warehouse warnings.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-750 text-white text-xs font-black rounded-xl shadow-md shadow-rose-500/15 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Add Medicine Batch
        </button>
      </div>

      {/* Premium Pharmacy Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-950 rounded-2xl p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Medicine Quantity</span>
            <h3 className="text-2xl font-black mt-1 font-mono">{totalStockItems.toLocaleString()} Units</h3>
            <p className="text-[9px] text-slate-400 font-bold mt-1">Total physical items present in clinic dispensary</p>
          </div>
          <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Low-Stock Batches</span>
            <h3 className="text-2xl font-black mt-1 font-mono text-rose-600">{totalLowStockAlerts} Batches</h3>
            <p className="text-[9px] text-slate-500 font-bold mt-1">Batches with quantities falling short of 50 units</p>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-500">
            <TrendingDown className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Supply Batches</span>
            <h3 className="text-2xl font-black mt-1 font-mono text-slate-900">{totalActiveBatches} Batches</h3>
            <p className="text-[9px] text-slate-500 font-bold mt-1">Number of distinct pharmaceutical lots on catalog</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-500">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Modern Filter Bars */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search medicine name or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
          >
            <option value="All">All Categories</option>
            <option value="Tablet">Tablets</option>
            <option value="Capsule">Capsules</option>
            <option value="Syrup">Syrups / Liquids</option>
            <option value="Injection">Injections / Vials</option>
            <option value="Ointment">Ointments / Creams</option>
            <option value="Other">Other Category</option>
          </select>
        </div>

        {/* Dynamic Count Banner */}
        <div className="flex items-center justify-end px-2 text-slate-500 font-bold text-[11px]">
          📊 {inventory.length} medicine records compiled
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs text-slate-400 font-bold">Auditing pharmaceutical warehouse...</p>
        </div>
      ) : inventory.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 font-bold text-sm italic">
          💊 No pharmacy inventory batches found matching search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
          {inventory.map((batch) => {
            const expired = isExpired(batch.expiry_date);
            return (
              <div 
                key={batch.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden"
              >
                {/* Header: Medicine Name & Category */}
                <div className="flex items-start justify-between gap-3 shrink-0">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 tracking-tight leading-tight">
                      {batch.medicine_name}
                    </h4>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mt-1 font-mono">
                      Category: {batch.category}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-wider ${getStockPillStyles(batch.stock_quantity)}`}>
                    {batch.stock_quantity} Units
                  </span>
                </div>

                {/* Body: Batch details, supplier & expiry */}
                <div className="space-y-3.5 flex-1 font-semibold text-xs leading-none">
                  
                  {/* Batch detail card */}
                  <div className="p-3 bg-slate-50 border rounded-xl space-y-2 text-[10px] text-slate-500">
                    <div className="flex justify-between">
                      <span>Batch Code:</span>
                      <strong className="text-slate-800 font-mono">{batch.batch_number}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Unit Cost:</span>
                      <strong className="text-slate-800 font-mono">${Number(batch.unit_price).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Supplier:</span>
                      <strong className="text-slate-700 truncate max-w-[120px]">{batch.supplier || 'N/A'}</strong>
                    </div>
                  </div>

                  {/* Expiry alerts */}
                  <div className="flex items-center gap-1.5 text-[9px] font-bold">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Expires: {new Date(batch.expiry_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                    {expired ? (
                      <span className="ml-auto px-1 py-0.2 bg-rose-100 text-rose-600 rounded text-[8px] font-black animate-pulse">EXPIRED</span>
                    ) : (
                      isExpired(new Date(batch.expiry_date).setDate(new Date(batch.expiry_date).getDate() - 90)) && (
                        <span className="ml-auto px-1 py-0.2 bg-amber-100 text-amber-700 rounded text-[8px] font-black">EXPIRING</span>
                      )
                    )}
                  </div>

                </div>

                {/* Stock adjustments actions footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 shrink-0">
                  <button
                    onClick={() => openAdjustModal(batch)}
                    disabled={actionLoading === batch.id}
                    className="flex-1 py-1.5 bg-slate-50 border hover:bg-slate-100 rounded-lg text-slate-700 text-[10px] font-bold text-center cursor-pointer transition"
                  >
                    ✏️ Adjust Stock
                  </button>
                  <button
                    onClick={() => handleQuickRestock(batch.id, batch.stock_quantity)}
                    disabled={actionLoading === batch.id}
                    className="flex-1 py-1.5 bg-rose-50 border border-rose-150 hover:bg-rose-100 text-rose-600 text-[10px] font-black rounded-lg text-center cursor-pointer transition"
                  >
                    {actionLoading === batch.id ? 'Restocking...' : '➕ Quick Restock'}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD MEDICINE BATCH MODAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Package className="h-4.5 w-4.5 text-rose-500" />
                  Add Pharmacy Stock Batch
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Register new pharmaceutical shipments, document active chemical categories, and record expiry configurations.
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
              
              {/* Name & Category */}
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    name="medicine_name"
                    value={formData.medicine_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Paracetamol, Amoxicillin"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Category *</label>
                  <select
                    required
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer"
                  >
                    <option value="">-- Choose Category --</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup / Liquid</option>
                    <option value="Injection">Injection / Vial</option>
                    <option value="Ointment">Ointment / Cream</option>
                    <option value="Other">Other Category</option>
                  </select>
                </div>
              </div>

              {/* Batch & Expiry */}
              <div className="grid grid-cols-2 gap-4">
                {/* Batch Code */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Batch Number *</label>
                  <input
                    type="text"
                    required
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    placeholder="e.g. B-9981"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono"
                  />
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition cursor-pointer"
                  />
                </div>
              </div>

              {/* Qty & Price */}
              <div className="grid grid-cols-2 gap-4">
                {/* Stock Qty */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    placeholder="e.g. 150"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Unit Price ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                    placeholder="Unit Sell Price"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono"
                  />
                </div>
              </div>

              {/* Supplier info */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Supplier Details</label>
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  placeholder="e.g. Pfizer Inc, Global Pharma Labs"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
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
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Register Lot Lot
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STOCK ADJUSTMENT MODAL ── */}
      {isAdjustOpen && selectedBatchForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/5 blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  ✏️ Adjust Medicine Stock
                </h3>
                <p className="text-[10px] text-slate-500 font-bold block mt-1">
                  Adjust active stock levels or adjust pricing points for <strong className="text-slate-800">{selectedBatchForAdjust.medicine_name}</strong>.
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
              
              {/* Stock Quantity */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Warehouse Quantity *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Adjust Sell Price ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={adjustPrice}
                  onChange={(e) => setAdjustPrice(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 transition font-mono"
                />
              </div>

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
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {adjustLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Confirm Adjust'
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
