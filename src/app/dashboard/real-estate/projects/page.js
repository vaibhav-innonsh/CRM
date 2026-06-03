'use client';

import { useState, useEffect } from 'react';
import { 
  Folder, 
  Plus, 
  MapPin, 
  Calendar, 
  Building, 
  PieChart, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  Loader2, 
  X, 
  CheckCircle2, 
  FileText
} from 'lucide-react';

export default function ProjectsSuitePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal Control States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const initialFormState = {
    projectName: '',
    builderName: '',
    location: '',
    launchDate: '',
    possessionDate: '',
    status: 'Under Construction',
    totalUnits: '',
    description: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Projects Catalog
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/real-estate/projects');
      if (!res.ok) throw new Error('Could not retrieve builder projects directory.');
      
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects || []);
      } else {
        throw new Error(data.error || 'Server error.');
      }
    } catch (err) {
      console.error('Fetch projects failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.projectName.trim()) return setModalError('Project Name is required.');
    if (!formData.builderName.trim()) return setModalError('Builder Name is required.');
    if (!formData.location.trim()) return setModalError('Location is required.');

    try {
      setSubmittingProject(true);

      const payload = {
        projectName: formData.projectName.trim(),
        builderName: formData.builderName.trim(),
        location: formData.location.trim(),
        launchDate: formData.launchDate || null,
        possessionDate: formData.possessionDate || null,
        status: formData.status,
        totalUnits: formData.totalUnits ? Number(formData.totalUnits) : 0,
        description: formData.description.trim()
      };

      const res = await fetch('/api/real-estate/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register builder project.');

      if (data.success) {
        setFormData(initialFormState);
        setShowAddModal(false);
        triggerToast('New Builder Project registered successfully!');
        fetchProjects();
      }
    } catch (err) {
      console.error('Create project failed:', err);
      setModalError(err.message);
    } finally {
      setSubmittingProject(false);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBA';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Math Statistics Aggregates
  const totalProjects = projects.length;
  const underConstruction = projects.filter(p => p.status === 'Under Construction').length;
  const readyToMove = projects.filter(p => p.status === 'Ready To Move').length;
  const totalUnitsSum = projects.reduce((sum, p) => sum + (Number(p.totalUnits) || 0), 0);

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <Folder className="h-5 w-5 text-emerald-500" /> Builder Projects Suite
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Track flagship housing schemes, construction lifecycles, and layout specifications.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95 duration-200"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Register Project
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
          <span>Error loading builder projects: {error}. Please refresh.</span>
        </div>
      )}

      {/* Statistics widgets cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5">
            <Folder className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Projects</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{totalProjects}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Under Construction</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{underConstruction}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-550 shrink-0 mt-0.5">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Ready To Move</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{readyToMove}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-550 shrink-0 mt-0.5">
            <Building className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Units capacity</span>
            <span className="font-extrabold text-slate-800 text-lg block leading-tight">{totalUnitsSum}</span>
          </div>
        </div>
      </div>

      {/* Projects Grid Container */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="h-44 bg-white border rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-300 rounded-2xl bg-white space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-550 mx-auto">
            <Folder className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">No Projects Registered</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto font-semibold">
              Add your flagship builder societies, locations, and schedules to start mapping inventory.
            </p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-250 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-black transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" /> Register First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const statusColors = {
              'Upcoming': 'bg-indigo-50 border-indigo-200 text-indigo-700',
              'Under Construction': 'bg-amber-50 border-amber-200 text-amber-700',
              'Ready To Move': 'bg-emerald-50 border-emerald-200 text-emerald-700',
              'Completed': 'bg-slate-100 border-slate-250 text-slate-600'
            };
            const currentBadge = statusColors[proj.status] || 'bg-slate-100 border-slate-200 text-slate-500';

            return (
              <div key={proj.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-350 hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden text-xs">
                
                {/* Glow Accent */}
                <div className="absolute top-0 left-0 h-1.5 w-full bg-emerald-500"></div>

                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight line-clamp-1">{proj.projectName}</h4>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">By {proj.builderName}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${currentBadge}`}>
                      {proj.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {proj.description || 'No description provided.'}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{proj.location}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Capacity: {proj.totalUnits} Units</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold font-mono text-slate-450 uppercase">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    Launch: {formatDate(proj.launchDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-slate-400" />
                    Possession: {formatDate(proj.possessionDate)}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* DYNAMIC "REGISTER PROJECT" MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-550 shrink-0">
                  <Folder className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Register Builder Project</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Register a flagship housing society catalog.</p>
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
            <form onSubmit={handleAddProject} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Project Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Project Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="projectName"
                  required
                  value={formData.projectName}
                  onChange={handleInputChange}
                  placeholder="e.g. Innonsh Green Heights"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                />
              </div>

              {/* Builder Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Builder Company Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="builderName"
                  required
                  value={formData.builderName}
                  onChange={handleInputChange}
                  placeholder="e.g. Innonsh Construction Group"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                />
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Exact Location Address <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g. Baner, Pune"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Launch Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Launch Date</label>
                  <input 
                    type="date" 
                    name="launchDate"
                    value={formData.launchDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700 transition"
                  />
                </div>

                {/* Possession Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Possession Date</label>
                  <input 
                    type="date" 
                    name="possessionDate"
                    value={formData.possessionDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Project Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Project Status</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Under Construction">Under Construction</option>
                    <option value="Ready To Move">Ready To Move</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Total Units */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Total Units capacity</label>
                  <input 
                    type="number" 
                    name="totalUnits"
                    min="0"
                    value={formData.totalUnits}
                    onChange={handleInputChange}
                    placeholder="e.g. 120"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-750 transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Project Description</label>
                <textarea 
                  name="description"
                  rows="2"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide project overview, highlight amenities..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700 transition resize-none leading-relaxed"
                />
              </div>

            </form>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 text-xs font-bold">
              <button 
                type="button"
                disabled={submittingProject}
                onClick={() => { setModalError(null); setShowAddModal(false); }}
                className="px-3.5 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={submittingProject}
                onClick={handleAddProject}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition"
              >
                {submittingProject ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Registering...
                  </>
                ) : (
                  <>✓ Register Project</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
