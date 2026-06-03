'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Users, 
  Building, 
  Check, 
  TrendingUp,
  MapPin,
  Maximize,
  DollarSign,
  Loader2,
  Sliders,
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function PropertyMatchingPage() {
  // Global Lists States
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  
  // Scoring States
  const [recommendations, setRecommendations] = useState([]);
  const [requirements, setRequirements] = useState({
    type: 'Apartment',
    budgetMax: '10000000',
    location: '',
    beds: '2'
  });
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [savingRequirements, setSavingRequirements] = useState(false);
  
  // Alert Statuses
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('success'); // success or error

  // Follow-up Task States
  const [pitchingPropertyId, setPitchingPropertyId] = useState(null);

  // Fetch all leads on mount
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoadingLeads(true);
        const res = await fetch('/api/leads');
        if (res.ok) {
          const data = await res.json();
          const activeLeads = data.leads || [];
          setLeads(activeLeads);
          if (activeLeads.length > 0) {
            setSelectedLeadId(activeLeads[0].id || activeLeads[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load leads list:', err);
      } finally {
        setLoadingLeads(false);
      }
    };
    fetchLeads();
  }, []);

  // Fetch matched recommendations whenever the selected lead changes
  const fetchMatches = async (leadId) => {
    if (!leadId) return;
    try {
      setLoadingMatches(true);
      const res = await fetch(`/api/real-estate/matching?leadId=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRecommendations(data.recommendations || []);
          if (data.requirements) {
            setRequirements({
              type: data.requirements.type || 'Apartment',
              budgetMax: String(data.requirements.budgetMax || 10000000),
              location: data.requirements.location || '',
              beds: String(data.requirements.beds || 2)
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load scored property matches:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (selectedLeadId) {
      fetchMatches(selectedLeadId);
    }
  }, [selectedLeadId]);

  // Form handlers
  const handleRequirementChange = (e) => {
    const { name, value } = e.target;
    setRequirements(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save requirements to database
  const saveLeadRequirements = async (e) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    try {
      setSavingRequirements(true);
      setAlertMessage(null);

      const payload = {
        leadId: selectedLeadId,
        requirements: {
          type: requirements.type,
          budgetMax: Number(requirements.budgetMax) || 10000000,
          location: requirements.location.trim(),
          beds: Number(requirements.beds) || 0
        }
      };

      const res = await fetch('/api/real-estate/matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRecommendations(data.recommendations || []);
        setAlertType('success');
        setAlertMessage('Client requirements updated! Match scores successfully re-calculated.');
        
        // Clear alert after 4 seconds
        setTimeout(() => setAlertMessage(null), 4000);
      } else {
        throw new Error(data.error || 'Failed to update requirements.');
      }
    } catch (err) {
      console.error('Save requirements failed:', err);
      setAlertType('error');
      setAlertMessage(err.message);
    } finally {
      setSavingRequirements(false);
    }
  };

  // Pitch action: Dynamically creates a high-priority follow-up task
  const pitchPropertyToClient = async (property) => {
    if (!selectedLeadId) return;
    const activeLead = leads.find(l => (l.id || l._id) === selectedLeadId);
    if (!activeLead) return;

    try {
      setPitchingPropertyId(property.id);
      setAlertMessage(null);

      const leadName = `${activeLead.firstName} ${activeLead.lastName || ''}`.trim();
      const subject = `Pitch ${property.title} to ${leadName}`;
      
      // Calculate due date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const payload = {
        subject,
        dueDate: tomorrow.toISOString(),
        priority: 'High',
        status: 'Pending',
        notes: `Automated real estate match pitched!\n\nProperty: ${property.title}\nLocation: ${property.location}\nPrice: ₹${Number(property.price).toLocaleString('en-IN')}\nMatch Score: ${property.matchScore}%\n\nObjective: Contact lead to present property details and gauge interest.`,
        leadId: selectedLeadId
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setAlertType('success');
        setAlertMessage(`Success! A follow-up task has been scheduled on your timeline for pitching "${property.title}" to ${leadName}.`);
        
        // Scroll to top to see alert
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(data.error || 'Failed to record follow-up task.');
      }
    } catch (err) {
      console.error('Pitch creation failed:', err);
      setAlertType('error');
      setAlertMessage(err.message);
    } finally {
      setPitchingPropertyId(null);
    }
  };

  const getScoreColorClass = (score) => {
    if (score >= 80) return 'bg-emerald-500 text-white shadow-emerald-500/10 border-emerald-500';
    if (score >= 50) return 'bg-amber-500 text-slate-900 shadow-amber-500/10 border-amber-500';
    return 'bg-slate-500 text-white shadow-slate-500/10 border-slate-500';
  };

  const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return '₹0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    return `₹${(num / 100000).toFixed(2)} Lakh`;
  };

  const activeLead = leads.find(l => (l.id || l._id) === selectedLeadId);

  return (
    <div className="space-y-6 text-left select-none font-sans">
      
      {/* Header Row */}
      <div>
        <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
          <Search className="h-5 w-5 text-emerald-500" /> Smart Property Matcher
        </h2>
        <p className="text-[11px] text-slate-500 font-semibold mt-1">
          Automatically match prospect leads requirements with your live properties database using logical weighting.
        </p>
      </div>

      {/* Global Toast Alert */}
      {alertMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-2.5 animate-in slide-in-from-top duration-300 ${
          alertType === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {alertType === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="text-xs font-bold leading-relaxed">{alertMessage}</span>
        </div>
      )}

      {/* Master Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Select Active Prospect Lead</label>
          {loadingLeads ? (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-450 py-1">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> Loading leads directory...
            </div>
          ) : leads.length === 0 ? (
            <p className="text-xs font-semibold text-slate-500 italic">No leads found in your account directory. Create leads first to start matching.</p>
          ) : (
            <select 
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full sm:w-96 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              {leads.map(l => (
                <option key={l.id || l._id} value={l.id || l._id}>
                  👤 {l.firstName} {l.lastName || ''} ({l.company || 'Individual'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Split Interface */}
      {selectedLeadId && activeLead && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT COLUMN: Requirements Configuration Panel */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-slate-550" /> Requirements Setup
              </h3>
              {savingRequirements && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
            </div>

            <form onSubmit={saveLeadRequirements} className="space-y-4">
              
              {/* Type Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Property Sector Type</label>
                <select 
                  name="type"
                  value={requirements.type}
                  onChange={handleRequirementChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-700 transition cursor-pointer"
                >
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Plot">Residential Plot</option>
                  <option value="Commercial">Commercial Space</option>
                </select>
              </div>

              {/* Budget Limit */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Maximum Budget Limit (INR)</label>
                <input 
                  type="number" 
                  name="budgetMax"
                  min="0"
                  value={requirements.budgetMax}
                  onChange={handleRequirementChange}
                  placeholder="e.g. 10000000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                />
                <span className="text-[9px] text-slate-400 font-bold block text-right pt-0.5">
                  Currently: {formatCurrency(requirements.budgetMax)}
                </span>
              </div>

              {/* Preferred Location */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Preferred Location Keyword</label>
                <input 
                  type="text" 
                  name="location"
                  value={requirements.location}
                  onChange={handleRequirementChange}
                  placeholder="e.g. Kharadi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-700 transition"
                />
              </div>

              {/* BHK Configuration */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Required Bedrooms (BHK)</label>
                <select 
                  name="beds"
                  value={requirements.beds}
                  onChange={handleRequirementChange}
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

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={savingRequirements}
                className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 duration-200 disabled:opacity-50"
              >
                {savingRequirements ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Save Requirements
                  </>
                )}
              </button>

            </form>
          </div>

          {/* RIGHT COLUMN: Matching Results List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" /> Recommendation Results
            </h3>

            {loadingMatches ? (
              /* Matches Loading Skeleton */
              <div className="space-y-4">
                {[1, 2].map((s) => (
                  <div key={s} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-pulse flex flex-col gap-3">
                    <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                    <div className="h-3 bg-slate-55 rounded w-1/3"></div>
                    <div className="h-8 bg-slate-50 rounded-xl border border-slate-100 mt-2"></div>
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              /* Empty Recommendations State */
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm space-y-3">
                <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                  <Building className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-black text-slate-800">No properties matched</h4>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  No properties in your inventory scored a recommendation match based on the lead's current requirements. Try lowering the budget limits or locations!
                </p>
              </div>
            ) : (
              /* Scored Recommendation list */
              <div className="space-y-4">
                {recommendations.map((match) => (
                  <div 
                    key={match.id} 
                    className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition duration-200 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    {/* Visual match score percentage left border or indicator */}
                    <div className="flex items-center gap-4 flex-1">
                      
                      {/* Round Match Score Circle */}
                      <div className={`h-14 w-14 rounded-full border-2 flex flex-col items-center justify-center shrink-0 shadow-sm ${getScoreColorClass(match.matchScore)}`}>
                        <span className="text-xs font-black leading-none">{match.matchScore}%</span>
                        <span className="text-[7px] font-bold uppercase tracking-widest leading-none mt-0.5">Match</span>
                      </div>

                      {/* Content text */}
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                            {match.type}
                          </span>
                          <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider flex items-center gap-0.5">
                            <Check className="h-3 w-3 stroke-[3]" /> Matched
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-800 block leading-tight">
                          {match.title}
                        </h4>
                        
                        {/* Specifications list snippet */}
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3 text-slate-400" /> {match.location}
                          </span>
                          <span className="h-3 w-px bg-slate-200"></span>
                          <span className="flex items-center gap-0.5">
                            <Maximize className="h-3 w-3 text-slate-400" /> {match.size} Sq.Ft
                          </span>
                          <span className="h-3 w-px bg-slate-200"></span>
                          <span className="flex items-center gap-0.5">
                            <Building className="h-3 w-3 text-slate-400" /> {match.beds > 0 ? `${match.beds} BHK` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price and Action right aligned */}
                    <div className="sm:border-l sm:border-slate-150 sm:pl-5 text-left sm:text-right shrink-0 flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Price Value</span>
                        <span className="text-xs font-black text-slate-850 mt-0.5 block">{formatCurrency(match.price)}</span>
                      </div>
                      
                      <button 
                        onClick={() => pitchPropertyToClient(match)}
                        disabled={pitchingPropertyId !== null}
                        className="mt-2.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-indigo-650 hover:shadow-indigo-500/10 text-white text-[10px] font-black transition cursor-pointer active:scale-95 shadow flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {pitchingPropertyId === match.id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" /> Pitching...
                          </>
                        ) : (
                          <>⚡ Pitch to Client</>
                        )}
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
