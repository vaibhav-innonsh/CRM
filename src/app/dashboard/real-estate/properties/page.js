'use client';

import { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  MapPin, 
  DollarSign, 
  Maximize, 
  BedDouble, 
  Bath, 
  Eye, 
  Filter,
  Loader2,
  X,
  Sparkles,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Upload
} from 'lucide-react';

export default function PropertiesInventoryPage() {
  // Catalog List States
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Detail Modal States
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Image Input Mode State
  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' | 'url'

  // New Property Form State
  const initialFormState = {
    title: '',
    type: 'Apartment',
    location: '',
    price: '',
    size: '',
    beds: '2',
    baths: '2',
    image: '',
    amenities: [],
    reraId: '',
    facing: 'East',
    furnishing: 'Semi-Furnished'
  };
  const [formData, setFormData] = useState(initialFormState);

  // Available amenities for checklist
  const availableAmenities = [
    'Swimming Pool',
    'Club House',
    'Equipped Gym',
    '24/7 Security',
    'Covered Parking',
    'Power Backup',
    'Kids Play Area',
    'Jogging Track',
    'Landscape Garden'
  ];

  // Fetch properties from dynamic tenant-isolated API
  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (filterType !== 'All') queryParams.append('type', filterType);
      if (filterStatus !== 'All') queryParams.append('status', filterStatus);

      const res = await fetch(`/api/real-estate/properties?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to retrieve properties inventory.');
      }
      
      const data = await res.json();
      if (data.success) {
        setProperties(data.properties || []);
      } else {
        throw new Error(data.error || 'Server returned an error.');
      }
    } catch (err) {
      console.error('Fetch properties failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on filter or search changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProperties();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, filterType, filterStatus]);

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle property image file upload and convert to Base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image file size too large (Max 5MB limit).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        image: event.target.result // Base64 string
      }));
    };
    reader.onerror = () => {
      setFormError('Failed to read selected image file.');
    };
    reader.readAsDataURL(file);
  };

  // Remove selected cover image
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: ''
    }));
  };

  // Checkbox amenities handler
  const handleAmenityToggle = (amenityName) => {
    setFormData(prev => {
      const alreadyChecked = prev.amenities.includes(amenityName);
      return {
        ...prev,
        amenities: alreadyChecked 
          ? prev.amenities.filter(a => a !== amenityName)
          : [...prev.amenities, amenityName]
      };
    });
  };

  // Submit new property handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Basic Validation
    if (!formData.title.trim()) return setFormError('Property title is required.');
    if (!formData.location.trim()) return setFormError('Property exact location is required.');
    if (!formData.price || Number(formData.price) <= 0) return setFormError('Starting price must be a valid positive number.');
    if (!formData.size || Number(formData.size) <= 0) return setFormError('Super Area size must be a valid positive number.');

    try {
      setSubmitting(true);

      const payload = {
        title: formData.title.trim(),
        type: formData.type,
        location: formData.location.trim(),
        price: Number(formData.price),
        size: Number(formData.size),
        beds: Number(formData.beds),
        baths: Number(formData.baths),
        image: formData.image.trim(), // Storing as empty or real base64/url, no database hardcoded fallback
        amenities: formData.amenities,
        customData: {
          reraId: formData.reraId.trim() || 'N/A',
          facing: formData.facing,
          furnishing: formData.furnishing
        }
      };

      const res = await fetch('/api/real-estate/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register property.');
      }

      if (data.success) {
        // Clear form & close modal
        setFormData(initialFormState);
        setShowAddModal(false);
        // Refresh catalog list
        fetchProperties();
      } else {
        throw new Error(data.error || 'Server error occurred.');
      }
    } catch (err) {
      console.error('Submit property failed:', err);
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format currency to Indian Lakhs/Crores
  const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return '₹0';
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(num / 100000).toFixed(2)} Lakh`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-250 font-black';
      case 'Blocked':
        return 'bg-amber-50 text-amber-700 border-amber-250 font-bold animate-pulse';
      case 'Sold':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <Building className="h-5 w-5 text-emerald-500" /> Properties Inventory
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Manage and track your agency's complete property catalog dynamically.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 duration-200"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Add Property
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by title or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 transition text-slate-700 placeholder-slate-400"
          />
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
          >
            <option value="All">All Property Types</option>
            <option value="Apartment">Apartment</option>
            <option value="Villa">Villa</option>
            <option value="Plot">Residential Plot</option>
            <option value="Commercial">Commercial Space</option>
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Available">🟢 Available</option>
            <option value="Blocked">🟡 Blocked</option>
            <option value="Sold">🔴 Sold</option>
          </select>
        </div>
      </div>

      {/* Database Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
          <span>Error loading inventory: {error}. Please refresh or try again.</span>
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-pulse space-y-4 p-5 h-80">
              <div className="h-36 bg-slate-100 rounded-xl w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
              <div className="h-8 bg-slate-50 rounded-xl w-full border border-slate-100 mt-2"></div>
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm space-y-3">
          <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
            <Building className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-black text-slate-800">No properties found</h3>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
            {search || filterType !== 'All' || filterStatus !== 'All' 
              ? "We couldn't find any properties matching your current search or filters. Try adjusting them!"
              : "Your property catalog is currently empty. Get started by adding your first project property details!"}
          </p>
          {(search || filterType !== 'All' || filterStatus !== 'All') && (
            <button 
              onClick={() => { setSearch(''); setFilterType('All'); setFilterStatus('All'); }}
              className="mt-2 text-xs font-bold text-indigo-650 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Properties Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => (
            <div key={prop.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              
              {/* Image & Type Tag */}
              <div className="relative h-44 w-full bg-slate-100 overflow-hidden shrink-0">
                <img 
                  src={prop.image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80'} 
                  alt={prop.title}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80';
                  }}
                  className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-[9px] font-black text-white uppercase tracking-wider">
                  {prop.type}
                </span>
              </div>

              {/* Content Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-black text-slate-800 tracking-tight leading-snug group-hover:text-indigo-650 transition">
                      {prop.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-wider shrink-0 ${getStatusBadgeClass(prop.status)}`}>
                      {prop.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{prop.location}</span>
                  </div>
                </div>

                {/* Grid Specifications */}
                <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 text-[10px] font-bold text-slate-600">
                  <div className="flex items-center gap-1.5 justify-center">
                    <Maximize className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{prop.size} Sq.Ft</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center border-x border-slate-100">
                    <BedDouble className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{prop.beds > 0 ? `${prop.beds} BHK` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Bath className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{prop.baths > 0 ? `${prop.baths} Bath` : 'N/A'}</span>
                  </div>
                </div>

                {/* Pricing & Footer Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Starting Price</span>
                    <span className="text-sm font-black text-slate-800 mt-1 block leading-none">{formatCurrency(prop.price)}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedProperty(prop)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-400 shrink-0" /> View Details
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Dynamic Glassmorphic "Add Property" Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Add Property to Inventory</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Register a new property listing with specifications.</p>
                </div>
              </div>
              <button 
                onClick={() => { setFormData(initialFormState); setShowAddModal(false); }}
                className="h-7 w-7 rounded-lg hover:bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Alert */}
            {formError && (
              <div className="px-5 py-2.5 bg-red-50 border-b border-red-150 text-red-800 text-[10px] font-black flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Fields Scroll Container */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Section 1: Basic Information */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">1. Basic Information</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Property Title / Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g. Innonsh Green Heights"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Property Sector Type <span className="text-red-500">*</span></label>
                    <select 
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                    >
                      <option value="Apartment">Apartment</option>
                      <option value="Villa">Villa</option>
                      <option value="Plot">Residential Plot</option>
                      <option value="Commercial">Commercial Space</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Exact Location <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="location"
                      required
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="e.g. Kharadi, Pune"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500">Catalog Cover Image</label>
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setImageInputMode('upload')}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition cursor-pointer ${
                            imageInputMode === 'upload'
                              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageInputMode('url')}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition cursor-pointer ${
                            imageInputMode === 'url'
                              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          URL
                        </button>
                      </div>
                    </div>

                    {imageInputMode === 'upload' ? (
                      formData.image ? (
                        <div className="relative h-18 w-full border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                          <img 
                            src={formData.image} 
                            alt="Property Cover"
                            className="h-full w-full object-cover"
                          />
                          <button 
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition shadow-md border border-white/10"
                            title="Remove Image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-250 hover:border-slate-350 bg-slate-50 rounded-xl p-3 text-center cursor-pointer transition relative flex flex-col items-center justify-center min-h-[72px]">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="h-4.5 w-4.5 text-slate-400 mb-0.5" />
                          <span className="text-[9px] font-bold text-slate-600">Choose property image file</span>
                          <span className="text-[8px] text-slate-450 font-bold">PNG, JPG, WEBP up to 5MB</span>
                        </div>
                      )
                    ) : (
                      <div className="space-y-2">
                        <input 
                          type="url" 
                          name="image"
                          value={formData.image.startsWith('data:') ? '' : formData.image}
                          onChange={handleInputChange}
                          placeholder="e.g. https://unsplash.com/..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                        />
                        {formData.image && !formData.image.startsWith('data:') && (
                          <div className="relative h-14 w-full border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                            <img 
                              src={formData.image} 
                              alt="Property URL Preview"
                              className="h-full w-full object-cover"
                            />
                            <button 
                              type="button"
                              onClick={handleRemoveImage}
                              className="absolute top-1 right-1 h-4 w-4 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition shadow-md border border-white/10"
                              title="Remove Image"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Technical Specifications */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">2. Technical Specifications</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Price (INR) <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      name="price"
                      required
                      min="0"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="e.g. 8500000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Super Area (Sq.Ft) <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      name="size"
                      required
                      min="0"
                      value={formData.size}
                      onChange={handleInputChange}
                      placeholder="e.g. 1250"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Bedrooms (BHK)</label>
                    <select 
                      name="beds"
                      value={formData.beds}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                    >
                      <option value="0">0 (N/A / Plot)</option>
                      <option value="1">1 BHK</option>
                      <option value="2">2 BHK</option>
                      <option value="3">3 BHK</option>
                      <option value="4">4 BHK</option>
                      <option value="5">5+ BHK</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Bathrooms</label>
                    <select 
                      name="baths"
                      value={formData.baths}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                    >
                      <option value="0">0</option>
                      <option value="1">1 Bath</option>
                      <option value="2">2 Baths</option>
                      <option value="3">3 Baths</option>
                      <option value="4">4 Baths</option>
                      <option value="5">5+ Baths</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Extra Spec & Legal (Real Estate specific customData fields) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">3. Real Estate Metadata & RERA Details</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">RERA Registration ID</label>
                    <input 
                      type="text" 
                      name="reraId"
                      value={formData.reraId}
                      onChange={handleInputChange}
                      placeholder="e.g. PR-411001"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Vastu / Facing</label>
                    <select 
                      name="facing"
                      value={formData.facing}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                    >
                      <option value="East">🌅 East Facing</option>
                      <option value="West">🌇 West Facing</option>
                      <option value="North">⛰️ North Facing</option>
                      <option value="South">🌊 South Facing</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Furnishing Status</label>
                    <select 
                      name="furnishing"
                      value={formData.furnishing}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                    >
                      <option value="Unfurnished">Unfurnished</option>
                      <option value="Semi-Furnished">Semi-Furnished</option>
                      <option value="Fully Furnished">Fully Furnished</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Amenities Checklist */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">4. Amenities & Common Facilities</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {availableAmenities.map((amenity) => {
                    const isChecked = formData.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => handleAmenityToggle(amenity)}
                        className={`px-3 py-2 border rounded-xl text-[10px] font-bold tracking-tight text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isChecked 
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-extrabold shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? '✓' : '+'} {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>

            </form>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button 
                type="button"
                disabled={submitting}
                onClick={() => { setFormData(initialFormState); setShowAddModal(false); }}
                className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 hover:text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={submitting}
                onClick={handleFormSubmit}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Listing...
                  </>
                ) : (
                  <>✓ Add Property</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Glassmorphic "View Details" Read-Only Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Cover Image & Gating Details */}
            <div className="relative h-56 w-full bg-slate-100 shrink-0">
              <img 
                src={selectedProperty.image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'} 
                alt={selectedProperty.title}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80';
                }}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              
              <button 
                onClick={() => setSelectedProperty(null)}
                className="absolute top-4 right-4 h-7 w-7 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center transition cursor-pointer border border-white/20"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute bottom-4 left-5 right-5 text-white">
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-[9px] font-black uppercase tracking-wider inline-block mb-1.5">
                  {selectedProperty.type}
                </span>
                <h3 className="text-base font-black tracking-tight">{selectedProperty.title}</h3>
                <p className="text-[10px] text-slate-200 font-semibold mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {selectedProperty.location}
                </p>
              </div>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Row: Pricing and Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-150">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Starting Price</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">{formatCurrency(selectedProperty.price)}</span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Super Area</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">{selectedProperty.size} Sq.Ft</span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Configuration</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">{selectedProperty.beds > 0 ? `${selectedProperty.beds} BHK` : 'N/A'}</span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-wider mt-1.5 ${getStatusBadgeClass(selectedProperty.status)}`}>
                    {selectedProperty.status}
                  </span>
                </div>
              </div>

              {/* RERA and Metadata */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">RERA & Metadata Specifications</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-slate-700">
                  <div className="px-3.5 py-2.5 rounded-xl border border-slate-150 flex items-center justify-between bg-white">
                    <span className="text-slate-400 font-medium">RERA Registration</span>
                    <span className="font-extrabold">{selectedProperty.customData?.reraId || 'N/A'}</span>
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl border border-slate-150 flex items-center justify-between bg-white">
                    <span className="text-slate-400 font-medium">Facing / Vastu</span>
                    <span className="font-extrabold">{selectedProperty.customData?.facing || 'East'} Facing</span>
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl border border-slate-150 flex items-center justify-between bg-white">
                    <span className="text-slate-400 font-medium">Furnishing</span>
                    <span className="font-extrabold text-indigo-650">{selectedProperty.customData?.furnishing || 'Semi-Furnished'}</span>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Common Facilities & Amenities</h4>
                {selectedProperty.amenities && selectedProperty.amenities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedProperty.amenities.map((amenity) => (
                      <span 
                        key={amenity}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-750 text-[10px] font-black uppercase tracking-tight select-none"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        {amenity}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 font-medium italic">No amenities specified for this property listing.</p>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button 
                onClick={() => setSelectedProperty(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition cursor-pointer shadow"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
