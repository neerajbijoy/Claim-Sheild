import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FileText,
  DollarSign,
  ChevronRight,
  Stethoscope,
  Layers,
  ArrowUpRight,
  Copy,
  Check,
  Building2,
  Info,
  ShieldCheck,
  Send,
  HelpCircle,
  Clock,
  Filter
} from 'lucide-react';
import { CdtKnowledgeEntry } from '../types';
import { fetchCdtLibrary, matchCdtCodesApi } from '../services/api';

interface CdtLibraryProps {
  onStartAuditWithCode?: (code: string) => void;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Specialties' },
  { id: 'RESTORATIVE', label: 'Restorative' },
  { id: 'PERIODONTICS', label: 'Periodontics' },
  { id: 'ORAL SURGERY', label: 'Oral Surgery' },
  { id: 'ENDODONTICS', label: 'Endodontics' },
  { id: 'IMPLANTOLOGY', label: 'Implantology' },
  { id: 'DIAGNOSTIC', label: 'Diagnostic' },
  { id: 'PREVENTIVE', label: 'Preventive' }
];

export const CdtLibrary: React.FC<CdtLibraryProps> = ({ onStartAuditWithCode }) => {
  const [codes, setCodes] = useState<CdtKnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [expandedCode, setExpandedCode] = useState<string | null>('D2740');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Interactive Clinical Matcher state
  const [matcherOpen, setMatcherOpen] = useState(false);
  const [matcherInput, setMatcherInput] = useState(
    'Patient has severe recurrent decay extending under porcelain restoration on tooth #19 with broken lingual cusp. Over 60% coronal structure lost. Recommend full crown.'
  );
  const [matchingCandidates, setMatchingCandidates] = useState<any[]>([]);
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    loadCdtLibrary();
  }, [selectedCategory, selectedRisk]);

  const loadCdtLibrary = async () => {
    setLoading(true);
    try {
      const data = await fetchCdtLibrary({
        category: selectedCategory,
        risk: selectedRisk
      });
      setCodes(data);
    } catch (err) {
      console.error('Failed to load CDT library:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRunMatcher = async () => {
    if (!matcherInput.trim()) return;
    setIsMatching(true);
    try {
      const results = await matchCdtCodesApi(matcherInput);
      setMatchingCandidates(results);
    } catch (err) {
      console.error('Matcher failed:', err);
    } finally {
      setIsMatching(false);
    }
  };

  // Filtered list based on search query
  const filteredCodes = useMemo(() => {
    if (!searchQuery.trim()) return codes;
    const q = searchQuery.toLowerCase().trim();
    return codes.filter(item => {
      return (
        item.cdt_code.toLowerCase().includes(q) ||
        item.procedure_name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.synonyms.some(s => s.toLowerCase().includes(q)) ||
        item.clinical_concepts.some(c => c.toLowerCase().includes(q))
      );
    });
  }, [codes, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const highRisk = codes.filter(c => c.risk_level === 'HIGH').length;
    const medRisk = codes.filter(c => c.risk_level === 'MEDIUM').length;
    const totalEvidenceRules = codes.reduce((acc, c) => acc + (c.required_evidence?.length || 0), 0);
    return {
      total: codes.length,
      highRisk,
      medRisk,
      totalEvidenceRules
    };
  }, [codes]);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            High Denial Risk
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Moderate Scrutiny
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Standard Adjudication
          </span>
        );
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'RESTORATIVE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PERIODONTICS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ORAL SURGERY':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ENDODONTICS':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'IMPLANTOLOGY':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DIAGNOSTIC':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'PREVENTIVE':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 p-8 text-white shadow-xl border border-slate-700/50">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/30">
              <BookOpen className="w-3.5 h-3.5" />
              <span>CDT Clinical Guidelines & Rules Library</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white font-sans">
              Dental Procedure Codes & Denial Shield
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Explore ADA CDT procedural definitions, mandatory pre-operative radiograph rules,
              periodontal charting requirements, payer submission guidelines, and pre-submission audit tips.
            </p>
          </div>

          {/* Quick Action Button to Open Clinical Matcher */}
          <button
            onClick={() => {
              setMatcherOpen(!matcherOpen);
              if (!matchingCandidates.length) handleRunMatcher();
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg ${
              matcherOpen
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-brand-200" />
            <span>{matcherOpen ? 'Hide Concept Matcher' : 'Test Narrative in Live Matcher'}</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 pt-6 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
            <div className="text-[10px] uppercase font-bold text-slate-400">Indexed CDT Codes</div>
            <div className="text-2xl font-black text-white font-mono mt-1">{stats.total} Procedures</div>
            <div className="text-[10px] text-teal-400 font-medium mt-0.5">Updated for current CDT release</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
            <div className="text-[10px] uppercase font-bold text-slate-400">High Denial Risk Codes</div>
            <div className="text-2xl font-black text-rose-400 font-mono mt-1">{stats.highRisk} Guarded</div>
            <div className="text-[10px] text-rose-300/80 font-medium mt-0.5">Strict radiograph/perio scrutiny</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
            <div className="text-[10px] uppercase font-bold text-slate-400">Clinical Evidence Rules</div>
            <div className="text-2xl font-black text-brand-300 font-mono mt-1">{stats.totalEvidenceRules} Mandatory</div>
            <div className="text-[10px] text-brand-200/80 font-medium mt-0.5">X-rays, Narratives & Charts</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
            <div className="text-[10px] uppercase font-bold text-slate-400">Major Payer Profiles</div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">4 Commercial</div>
            <div className="text-[10px] text-emerald-300/80 font-medium mt-0.5">Delta, Cigna, MetLife, Aetna</div>
          </div>
        </div>
      </div>

      {/* Interactive Clinical Concept Matcher Drawer (collapsible) */}
      {matcherOpen && (
        <div className="bg-gradient-to-b from-brand-900/10 to-teal-900/5 rounded-3xl border-2 border-brand-500/30 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Clinical Concept & Narrative Tester
                </h3>
                <p className="text-xs text-slate-500">
                  Paste clinical documentation or operative notes to see which CDT codes match and review instant evidence checklists.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-brand-50 text-brand-700 border border-brand-200">
              AI & Rule Matrix Enabled
            </span>
          </div>

          <div className="space-y-3">
            <textarea
              rows={3}
              value={matcherInput}
              onChange={e => setMatcherInput(e.target.value)}
              placeholder="Enter clinical chart notes, operative report, or symptoms..."
              className="w-full text-xs font-mono p-4 rounded-2xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Example: Try entering "deep cleaning 4 quads bone loss" or "bone removal tooth sectioned".
              </span>
              <button
                onClick={handleRunMatcher}
                disabled={isMatching || !matcherInput.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-brand-600/20"
              >
                {isMatching ? (
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Evaluate Text</span>
              </button>
            </div>
          </div>

          {/* Matcher Results */}
          {matchingCandidates.length > 0 && (
            <div className="mt-4 pt-4 border-t border-brand-200/50 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>Matched Procedure Recommendations:</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {matchingCandidates.length} Detected
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matchingCandidates.map((candidate, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-2 hover:border-brand-400 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono font-black text-sm text-brand-600">
                          {candidate.cdt_code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                          {candidate.procedure_name}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {Math.round(candidate.confidence * 100)}% Match
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {candidate.rationale}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSearchQuery(candidate.cdt_code);
                          setExpandedCode(candidate.cdt_code);
                        }}
                        className="text-[11px] text-brand-600 hover:text-brand-800 font-bold flex items-center gap-1"
                      >
                        <span>View Evidence Guidelines</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>

                      {onStartAuditWithCode && (
                        <button
                          onClick={() => onStartAuditWithCode(candidate.cdt_code)}
                          className="px-3 py-1 rounded-xl bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 text-[11px] font-bold transition-all border border-brand-200"
                        >
                          Audit This Code
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search & Specialty Filter Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by CDT code (e.g. D2740), procedure title, symptom, or keyword..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Risk Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(risk => (
              <button
                key={risk}
                onClick={() => setSelectedRisk(risk)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedRisk === risk
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {risk === 'ALL' ? 'All Risks' : `${risk} Risk`}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Specialty:
          </span>
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Procedure Cards Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-slate-400">Loading CDT clinical rules knowledge base...</p>
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No CDT codes found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No procedure codes matched your filter criteria "{searchQuery}". Try selecting "All Specialties" or broadening your search terms.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedRisk('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredCodes.map(entry => {
            const isExpanded = expandedCode === entry.cdt_code;
            const hasPayerRules = entry.payer_specific_requirements && Object.keys(entry.payer_specific_requirements).length > 0;

            return (
              <div
                key={entry.cdt_code}
                className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                  isExpanded
                    ? 'border-brand-400 ring-2 ring-brand-100 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Main Card Header */}
                <div
                  onClick={() => setExpandedCode(isExpanded ? null : entry.cdt_code)}
                  className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Code Badge */}
                    <div className="flex flex-col items-center">
                      <div className="relative group">
                        <span className="px-3.5 py-2 rounded-2xl bg-slate-900 text-white font-mono font-black text-sm tracking-wider shadow-sm flex items-center gap-1.5">
                          {entry.cdt_code}
                          <button
                            onClick={e => handleCopy(entry.cdt_code, e)}
                            title="Copy code"
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedCode === entry.cdt_code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </span>
                      </div>
                      {entry.typical_fee_range && (
                        <span className="text-[10px] font-mono text-slate-500 font-semibold mt-1">
                          {entry.typical_fee_range}
                        </span>
                      )}
                    </div>

                    {/* Title & Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(
                            entry.category
                          )}`}
                        >
                          {entry.category}
                        </span>
                        {getRiskBadge(entry.risk_level)}
                      </div>
                      <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                        {entry.procedure_name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 max-w-3xl">
                        {entry.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Expand Chevron */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {onStartAuditWithCode && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onStartAuditWithCode(entry.cdt_code);
                        }}
                        className="px-4 py-2 rounded-2xl bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 text-xs font-bold transition-all border border-brand-200 flex items-center gap-1.5 shadow-sm group"
                      >
                        <span>Audit This Code</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-brand-600 group-hover:text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>
                    )}

                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? 'rotate-90 text-brand-600' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-6 bg-slate-50/40">
                    {/* Full Procedure Description & Synonyms */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3">
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Clinical Definition & Indications
                        </h4>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {entry.description}
                        </p>
                      </div>

                      {entry.synonyms && entry.synonyms.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-400">Accepted Synonyms:</span>
                          {entry.synonyms.map((syn, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-mono"
                            >
                              "{syn}"
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Evidence Requirements Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Mandatory Evidence Checklist */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Mandatory Clinical Evidence Requirements</span>
                        </div>

                        {entry.required_evidence && entry.required_evidence.length > 0 ? (
                          <div className="space-y-2.5">
                            {entry.required_evidence.map((ev, eIdx) => (
                              <div
                                key={eIdx}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-slate-800 text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200">
                                    {ev.type}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      ev.mandatory ? 'text-rose-600' : 'text-slate-400'
                                    }`}
                                  >
                                    {ev.mandatory ? 'MANDATORY' : 'RECOMMENDED'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  {ev.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>No mandatory attachments required for standard clean claim submission.</span>
                          </div>
                        )}

                        {entry.commonly_associated_documentation && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Associated Attachments Checklist:
                            </span>
                            <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                              {entry.commonly_associated_documentation.map((doc, dIdx) => (
                                <li key={dIdx}>{doc}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Top Denial Triggers & Audit Guidance */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <span>Payer Denial Triggers & Scrutiny Areas</span>
                          </div>

                          {entry.risk_factors && entry.risk_factors.length > 0 ? (
                            <div className="space-y-2">
                              {entry.risk_factors.map((rf, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200/80 text-[11px] text-rose-800 flex items-start gap-2"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                  <span>{rf}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-slate-50 text-slate-500 text-xs">
                              Standard low-denial procedure code under typical benefit parameters.
                            </div>
                          )}

                          {entry.audit_tips && entry.audit_tips.length > 0 && (
                            <div className="pt-3 border-t border-slate-100 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Pre-Submission Defense Strategies:</span>
                              </div>
                              <ul className="space-y-1">
                                {entry.audit_tips.map((tip, tIdx) => (
                                  <li
                                    key={tIdx}
                                    className="text-[11px] text-slate-700 bg-emerald-50/40 p-2 rounded-lg border border-emerald-100 flex items-start gap-1.5"
                                  >
                                    <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payer Nuances Panel */}
                    {hasPayerRules && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                          <Building2 className="w-4 h-4 text-brand-600" />
                          <span>Payer-Specific Adjudication Policies</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {Object.entries(entry.payer_specific_requirements || {}).map(
                            ([payerKey, ruleObj]: [string, any], pIdx) => {
                              const ruleText = typeof ruleObj === 'string' ? ruleObj : ruleObj.notes || JSON.stringify(ruleObj);
                              return (
                                <div
                                  key={pIdx}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                                >
                                  <span className="font-bold text-slate-800 text-[11px] block">
                                    {payerKey.replace('p-demo-', '').toUpperCase()}
                                  </span>
                                  <p className="text-[11px] text-slate-600 leading-relaxed">
                                    {ruleText}
                                  </p>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
