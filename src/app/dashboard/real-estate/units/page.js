'use client';

import { useState, useEffect } from 'react';
import { 
  Lock, 
  Plus, 
  MapPin, 
  Building, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  Search,
  Filter,
  DollarSign,
  Compass,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function UnitInventoryPage() {
  const [units, setUnits] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal Control States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingUnit, setSubmittingUnit] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const initialFormState = {
    projectId: '',
    unitNumber: '',
    tower: '',
    floor: '',
    propertyType: 'Apartment',
    area: '',
    price: '',
    facing: '',
    status: 'Available',
    description: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Units and Projects directories
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch units directory
      const unitsRes = await fetch('/api/real-estate/units');
      if (!unitsRes.ok) throw new Error('Could not retrieve unit inventory directory.');
      const unitsData = await unitsRes.json();

      // Fetch projects catalog for dropdown mapping
      const projectsRes = await fetch('/api/real-estate/projects');
      let projectsList = [];
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        if (projectsData.success) {
          projectsList = projectsData.projects || [];
        }
      }

      setProjects(projectsList);

      if (unitsData.success) {
        setUnits(unitsData.units || []);
      } else {
        throw new Error(unitsData.error || 'Server error.');
      }
    } catch (err) {
      console.error('Fetch units failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.unitNumber.trim()) return setModalError('Unit Number is required.');

    try {
      setSubmittingUnit(true);

      const payload = {
        projectId: formData.projectId || null,
        unitNumber: formData.unitNumber.trim(),
        tower: formData.tower.trim(),
        floor: formData.floor.trim(),
        propertyType: formData.propertyType,
        area: formData.area ? Number(formData.area) : 0,
        price: formData.price ? Number(formData.price) : 0,
        facing: formData.facing.trim(),
        status: formData.status,
        description: formData.description.trim()
      };

      const res = await fetch('/api/real-estate/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register inventory unit.');

      if (data.success) {
        setFormData(initialFormState);
        setShowAddModal(false);
        triggerToast('New Inventory Unit registered successfully!');
        fetchData();
      }
    } catch (err) {
      console.error('Create unit failed:', err);
      setModalError(err.message);
    } finally {
      setSubmittingUnit(false);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Math Statistics Aggregates
  const totalUnits = units.length;
  const availableUnits = units.filter(u => u.status === 'Available').length;
  const blockedUnits = units.filter(u => u.status === 'Blocked').length;
  const soldOrBookedUnits = units.filter(u => u.status === 'Sold' || u.status === 'Booked').length;

  // Filter Logic
  const filteredUnits = units.filter(unit => {
    const matchesSearch = 
      unit.unitNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.tower?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.floor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.facing?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = selectedProject === 'All' || unit.projectId === selectedProject;
    const matchesType = selectedType === 'All' || unit.propertyType === selectedType;
    const matchesStatus = selectedStatus === 'All' || unit.status === selectedStatus;

    return matchesSearch && matchesProject && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <Lock className="h-5 w-5 text-emerald-500" /> Unit Inventory Suite
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Manage society units, tower allocations, floor levels, pricing and real-time occupancy status.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 duration-200"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Register Unit
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
          <span>Error loading unit directory: {error}. Please refresh.</span>
        </div>
      )}

      {/* Statistics widgets cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Units</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{totalUnits}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-550 shrink-0 mt-0.5">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Available</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{availableUnits}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Blocked Units</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{blockedUnits}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-550 shrink-0 mt-0.5">
            <Building className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Booked / Sold</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{soldOrBookedUnits}</span>
          </div>
        </div>
      </div>

      {/* Glassmorphic Search & Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          
          {/* Search bar */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[2]" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Unit Number, Tower, Floor, Facing..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 placeholder-slate-400 transition"
            />
          </div>

          {/* Project filter */}
          <div className="relative">
            <select 
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 transition cursor-pointer appearance-none"
            >
              <option value="All">🏢 All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectName}</option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter className="h-3 w-3 stroke-[2.5]" />
            </div>
          </div>

          {/* Status filter */}
          <div className="relative">
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 transition cursor-pointer appearance-none"
            >
              <option value="All">🚦 All Statuses</option>
              <option value="Available">Available</option>
              <option value="Blocked">Blocked</option>
              <option value="Booked">Booked</option>
              <option value="Sold">Sold</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter className="h-3 w-3 stroke-[2.5]" />
            </div>
          </div>

        </div>
      </div>

      {/* Grid catalogue container */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="h-48 bg-white border rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-300 rounded-2xl bg-white space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-550 mx-auto">
            <Lock className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">No Inventory Units Found</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto font-semibold">
              Create and manage society units or change filters to discover listing items.
            </p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-250 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-black transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" /> Register First Unit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => {
            const statusColors = {
              'Available': 'bg-emerald-50 border-emerald-200 text-emerald-700',
              'Blocked': 'bg-amber-50 border-amber-200 text-amber-700',
              'Booked': 'bg-indigo-50 border-indigo-200 text-indigo-700',
              'Sold': 'bg-slate-100 border-slate-255 text-slate-600'
            };
            const currentBadge = statusColors[unit.status] || 'bg-slate-100 border-slate-200 text-slate-500';

            return (
              <div key={unit.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-350 hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden text-xs">
                
                {/* Status indicator line on the top */}
                <div className={`absolute top-0 left-0 h-1.5 w-full ${
                  unit.status === 'Available' ? 'bg-emerald-500' :
                  unit.status === 'Blocked' ? 'bg-amber-500' :
                  unit.status === 'Booked' ? 'bg-indigo-500' : 'bg-slate-500'
                }`}></div>

                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight">Unit {unit.unitNumber}</h4>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                        {unit.projectName ? `Project: ${unit.projectName}` : 'Standalone Property'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${currentBadge}`}>
                      {unit.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {unit.description || 'No additional specifications provided.'}
                  </p>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{unit.tower || 'TBA'} / {unit.floor || 'TBA'} Floor</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Compass className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Facing: {unit.facing || 'TBA'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Area: {unit.area ? `${unit.area} Sq.Ft` : 'TBA'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-800 font-black">₹{unit.price ? unit.price.toLocaleString('en-IN') : '0'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold font-mono text-slate-400 uppercase">
                  <span>Type: {unit.propertyType}</span>
                  <span className="text-emerald-555 flex items-center gap-0.5 hover:underline cursor-pointer">
                    View Details <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* DYNAMIC "REGISTER UNIT" MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-550 shrink-0">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Register Inventory Unit</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Add property items nested under active builders.</p>
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
            <form onSubmit={handleAddUnit} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Project Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Builder Project Parent</label>
                <select 
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="">-- Select Project (Or keep standalone) --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projectName} (by {p.builderName})</option>
                  ))}
                </select>
              </div>

              {/* Unit Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Unit Number <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="unitNumber"
                  required
                  value={formData.unitNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. Flat-405, Plot-12, A-202"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Tower */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Tower / Block</label>
                  <input 
                    type="text" 
                    name="tower"
                    value={formData.tower}
                    onChange={handleInputChange}
                    placeholder="e.g. Tower B, Wing A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                  />
                </div>

                {/* Floor */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Floor Level</label>
                  <input 
                    type="text" 
                    name="floor"
                    value={formData.floor}
                    onChange={handleInputChange}
                    placeholder="e.g. 4th Floor, Ground"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Property Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Property Type</label>
                  <select 
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Plot">Plot</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Office">Office</option>
                    <option value="Shop">Shop</option>
                    <option value="Warehouse">Warehouse</option>
                  </select>
                </div>

                {/* Facing direction */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Facing Direction</label>
                  <input 
                    type="text" 
                    name="facing"
                    value={formData.facing}
                    onChange={handleInputChange}
                    placeholder="e.g. East, North-East"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Area size */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Area size (Sq.Ft.)</label>
                  <input 
                    type="number" 
                    name="area"
                    min="0"
                    value={formData.area}
                    onChange={handleInputChange}
                    placeholder="e.g. 1250"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Price (INR ₹)</label>
                  <input 
                    type="number" 
                    name="price"
                    min="0"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g. 7500000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Status select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Inventory Status</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="Available">Available</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Booked">Booked</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Unit Specifications</label>
                <textarea 
                  name="description"
                  rows="2"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe number of bedrooms, balconies, premium park views..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700 transition resize-none leading-relaxed"
                />
              </div>

            </form>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 text-xs font-bold">
              <button 
                type="button"
                disabled={submittingUnit}
                onClick={() => { setModalError(null); setShowAddModal(false); }}
                className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={submittingUnit}
                onClick={handleAddUnit}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition"
              >
                {submittingUnit ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Registering...
                  </>
                ) : (
                  <>✓ Register Unit</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
