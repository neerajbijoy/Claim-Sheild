import React, { useState, useEffect } from 'react';
import { User, Stethoscope, FileText, Upload, CheckCircle, ArrowRight, ArrowLeft, Play, Sparkles, Loader2, Tag, Check, AlertCircle } from 'lucide-react';
import { ToothSelector } from '../components/ToothSelector';
import { DocumentUploader } from '../components/DocumentUploader';
import { Payer, ClaimDocument, ExtractedEvidence } from '../types';
import { fetchPayers, createClaimApi, uploadDocumentApi, runAuditApi, extractClinicalApi } from '../services/api';

interface NewAuditProps {
  onAuditComplete: (auditResult: any, claimId: string) => void;
  initialCdtCode?: string;
}

export const NewAudit: React.FC<NewAuditProps> = ({ onAuditComplete, initialCdtCode }) => {
  const [step, setStep] = useState(1);
  const [payers, setPayers] = useState<Payer[]>([]);

  // Step 1: Patient
  const [patientId, setPatientId] = useState('PT-10284');
  const [patientName, setPatientName] = useState('John Mathew');
  const [dob, setDob] = useState('1985-04-12');
  const [selectedPayerId, setSelectedPayerId] = useState('');

  // Step 2: Procedure
  const [cdtCode, setCdtCode] = useState(initialCdtCode || 'D2740');

  useEffect(() => {
    if (initialCdtCode) {
      setCdtCode(initialCdtCode);
    }
  }, [initialCdtCode]);
  const [toothNumber, setToothNumber] = useState('14');
  const [dos, setDos] = useState('2026-08-28');
  const [claimAmount, setClaimAmount] = useState('1250');

  // Step 3: Narrative & Dynamic Clinical Extraction
  const [narrative, setNarrative] = useState(
    'Patient presents with recurrent decay under an existing restoration on tooth #14. Tooth structure is severely compromised with broken cusp. Requires full coverage crown restoration.'
  );
  const [extractedEvidence, setExtractedEvidence] = useState<ExtractedEvidence | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Step 4: Documents
  const [uploadedDocs, setUploadedDocs] = useState<Partial<ClaimDocument>[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Step 6: Analysis animation steps
  const [analysisStep, setAnalysisStep] = useState(0);

  // Dynamic live extraction effect on narrative or document updates
  useEffect(() => {
    const timer = setTimeout(() => {
      if (narrative.trim().length > 3 || uploadedDocs.length > 0) {
        setIsExtracting(true);
        const docsForAnalysis = uploadedDocs.map(d => ({
          file_name: d.file_name,
          extracted_text: d.extracted_text || ''
        }));
        extractClinicalApi({ narrativeText: narrative, documents: docsForAnalysis })
          .then(res => {
            setExtractedEvidence(res);
          })
          .catch(err => {
            console.warn('Clinical extraction preview error:', err);
          })
          .finally(() => {
            setIsExtracting(false);
          });
      } else {
        setExtractedEvidence(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [narrative, uploadedDocs]);

  const loadSampleNote = (scenario: 'crown' | 'perio' | 'extraction') => {
    if (scenario === 'crown') {
      setToothNumber('14');
      setCdtCode('D2740');
      setNarrative('Patient presents with recurrent caries under an existing restoration on tooth #14. Tooth structure is severely compromised with broken disto-lingual cusp extending subgingivally. Requires full coverage porcelain crown.');
    } else if (scenario === 'perio') {
      setToothNumber('3');
      setCdtCode('D4341');
      setNarrative('Generalized moderate to severe chronic periodontitis. Quadrant 1 exhibits pocket depths of 5-7mm with heavy subgingival calculus and bleeding on probing. Scaling and root planing indicated for 4 or more teeth.');
    } else if (scenario === 'extraction') {
      setToothNumber('19');
      setCdtCode('D7140');
      setNarrative('Tooth #19 diagnosed as non-restorable due to severe vertical root fracture and extensive coronal breakdown to alveolar crest. Surgical extraction indicated.');
    }
  };

  useEffect(() => {
    fetchPayers().then((res) => {
      setPayers(res);
      if (res.length > 0) {
        setSelectedPayerId(prev => prev || res[0].id);
      }
    });
  }, []);

  const handleDocumentUpload = async (file: File, documentType: string) => {
    setIsUploading(true);
    try {
      // Store actual File reference along with metadata preview
      const tempDoc: Partial<ClaimDocument> = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        file: file,
        file_name: file.name,
        document_type: documentType,
        file_size: file.size,
        uploaded_at: new Date().toISOString()
      };
      setUploadedDocs(prev => [...prev, tempDoc]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunAudit = async () => {
    if (!patientName.trim()) {
      alert('Please enter patient full name before auditing.');
      setStep(1);
      return;
    }

    setStep(6); // Go to animated analysis screen

    const auditSteps = [
      'Loading payer rules...',
      'Validating CDT procedure code...',
      'Checking tooth location specification...',
      'Inspecting uploaded evidence documents...',
      'Extracting clinical narrative indicators...',
      'Cross-checking evidence consistency...',
      'Calculating final readiness score...'
    ];

    for (let i = 0; i < auditSteps.length; i++) {
      setAnalysisStep(i);
      await new Promise(r => setTimeout(r, 450));
    }

    try {
      const payerIdToUse = selectedPayerId || (payers.length > 0 ? payers[0].id : 'p-demo-delta');

      // 1. Create claim in backend
      const newClaim = await createClaimApi({
        patient_id: patientId.trim() || `PT-${Math.floor(10000 + Math.random() * 90000)}`,
        patient_name: patientName.trim(),
        date_of_birth: dob || '1985-01-01',
        payer_id: payerIdToUse,
        date_of_service: dos || new Date().toISOString().split('T')[0],
        claim_amount: parseFloat(claimAmount) || 1250,
        clinical_narrative: narrative,
        procedures: [
          { cdt_code: cdtCode.trim() || 'D2740', tooth_number: toothNumber.trim() || '14', amount: parseFloat(claimAmount) || 1250 }
        ]
      });

      if (!newClaim || !newClaim.id) {
        throw new Error('Failed to create claim record.');
      }

      // 2. Upload actual binary documents to backend/Supabase Storage
      for (const doc of uploadedDocs) {
        const fileToUpload = doc.file || (doc.file_name ? new File(['claim evidence document'], doc.file_name, { type: 'application/pdf' }) : null);
        if (fileToUpload) {
          await uploadDocumentApi(newClaim.id, fileToUpload, doc.document_type || 'Clinical Notes');
        }
      }

      // 3. Trigger backend audit execution (POST /api/claims/:id/audit)
      const auditResult = await runAuditApi(newClaim.id);

      onAuditComplete(auditResult, newClaim.id);
    } catch (err: any) {
      console.error('Audit execution error:', err);
      alert('Audit failed: ' + (err.message || 'Unknown error'));
      setStep(5);
    }
  };

  const stepTitles = [
    { num: 1, title: 'Patient', icon: User },
    { num: 2, title: 'Procedure', icon: Stethoscope },
    { num: 3, title: 'Clinical Evidence', icon: FileText },
    { num: 4, title: 'Documents', icon: Upload },
    { num: 5, title: 'Review & Audit', icon: CheckCircle }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Wizard Header Progress Indicator */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">New Claim Pre-Submission Audit</h2>
            <p className="text-xs text-slate-500">Step {step} of 5: Fill parameters to execute live audit</p>
          </div>
          <div className="bg-brand-50 text-brand-700 text-xs font-bold font-mono px-3 py-1 rounded-full border border-brand-200">
            STEP 0{step}
          </div>
        </div>

        {/* Stepper Bar */}
        <div className="grid grid-cols-5 gap-2 pt-2">
          {stepTitles.map((st) => {
            const Icon = st.icon;
            const isActive = step === st.num;
            const isCompleted = step > st.num;
            return (
              <div
                key={st.num}
                onClick={() => isCompleted && setStep(st.num)}
                className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs transition-all ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-pointer'
                    : (isActive
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/30 font-bold'
                        : 'bg-slate-50 text-slate-400 border-slate-200')
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-white/20' : (isCompleted ? 'bg-emerald-200/60 text-emerald-800' : 'bg-slate-200 text-slate-500')}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="hidden sm:inline truncate">{st.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        {/* STEP 01 — PATIENT */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-slate-900 border-b pb-3">Patient & Insurance Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Patient ID</label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Patient Full Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Insurance Payer</label>
                <select
                  value={selectedPayerId}
                  onChange={(e) => setSelectedPayerId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {payers.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name} ({p.name})</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Rule engine dynamically queries rules for selected payer.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 02 — PROCEDURE */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-slate-900 border-b pb-3">Dental CDT Procedure & Tooth Selection</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Procedure CDT Code</label>
                <input
                  type="text"
                  value={cdtCode}
                  onChange={(e) => setCdtCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-brand-600 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="D2740"
                />
                <p className="text-[11px] text-slate-500 mt-1">D2740: Crown - Porcelain/Ceramic Substrate</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Date of Service</label>
                <input
                  type="date"
                  value={dos}
                  onChange={(e) => setDos(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Claim Amount</label>
                <input
                  type="number"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Interactive Tooth Chart Selector */}
            <ToothSelector selectedTooth={toothNumber} onSelectTooth={(t) => setToothNumber(t)} />
          </div>
        )}

        {/* STEP 03 — CLINICAL EVIDENCE */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-slate-900 border-b pb-3">Clinical Narrative & AI Extraction</h3>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Clinical Narrative Notes
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">Load Demo Case:</span>
                  <button
                    type="button"
                    onClick={() => loadSampleNote('crown')}
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                  >
                    Crown (#14)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleNote('perio')}
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                  >
                    Perio (D4341)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleNote('extraction')}
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                  >
                    Extraction (#19)
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="Describe the patient's clinical condition and reason for treatment..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-sans focus:ring-2 focus:ring-brand-500 focus:outline-none leading-relaxed"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                <span>Natural language clinical parsing evaluates medical necessity and tooth location.</span>
                <span className="font-mono">{narrative.length} chars</span>
              </div>
            </div>

            {/* Dynamic Real-time Clinical Extraction Preview */}
            <div className="bg-slate-900 text-slate-200 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>Real-Time Clinical Extraction</span>
                  {isExtracting && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400 ml-1" />}
                </div>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-700">
                  {extractedEvidence?.source || 'LIVE_NLP_ANALYZER'}
                </span>
              </div>

              {extractedEvidence ? (
                <div className="space-y-3.5 text-xs">
                  {/* Extracted Teeth */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 font-semibold min-w-[120px]">Target Teeth:</span>
                    {extractedEvidence.teeth.length > 0 ? (
                      extractedEvidence.teeth.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setToothNumber(t)}
                          title="Click to apply tooth location to procedure"
                          className={`font-mono font-bold px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1 ${
                            toothNumber === t
                              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                              : 'bg-slate-800 text-brand-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          Tooth #{t} {toothNumber === t && <Check className="w-3 h-3 ml-0.5" />}
                        </button>
                      ))
                    ) : (
                      <span className="text-amber-400 font-mono text-[11px] bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60">
                        No tooth location specified in note
                      </span>
                    )}
                  </div>

                  {/* Detected Conditions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 font-semibold min-w-[120px]">Clinical Conditions:</span>
                    {extractedEvidence.conditions.length > 0 ? (
                      extractedEvidence.conditions.map((cond, i) => (
                        <span
                          key={i}
                          className="bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 px-2.5 py-1 rounded-lg font-medium text-[11px] capitalize"
                        >
                          {cond}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">No specific clinical conditions detected</span>
                    )}
                  </div>

                  {/* Clinical Justification Status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 font-semibold min-w-[120px]">Medical Justification:</span>
                    {extractedEvidence.clinical_justification_detected ? (
                      <span className="bg-teal-950/60 text-teal-300 border border-teal-700/60 px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-teal-400" />
                        Confirmed ({Math.round(extractedEvidence.confidence * 100)}% Confidence)
                      </span>
                    ) : (
                      <span className="bg-amber-950/60 text-amber-300 border border-amber-700/60 px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        Weak or Incomplete Clinical Justification
                      </span>
                    )}
                  </div>

                  {/* Candidate CDT Procedures */}
                  {extractedEvidence.suggested_codes && extractedEvidence.suggested_codes.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Suggested CDT Codes from Clinical Findings:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {extractedEvidence.suggested_codes.map((sc, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-teal-400 text-xs">{sc.code || sc.cdt_code}</span>
                                <span className="text-[11px] font-semibold text-white truncate">{sc.description || sc.procedure_name}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{sc.rationale}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCdtCode(sc.code || sc.cdt_code)}
                              className={`shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                                cdtCode === (sc.code || sc.cdt_code)
                                  ? 'bg-emerald-600 text-white border-emerald-500'
                                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
                              }`}
                            >
                              {cdtCode === (sc.code || sc.cdt_code) ? 'Selected' : 'Use Code'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs space-y-1">
                  <p>Type doctor's clinical notes above or load a sample scenario to extract clinical evidence.</p>
                  <p className="text-[10px] text-slate-600">The extraction engine parses tooth numbering, diagnostic conditions, and CDT codes.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 04 — DOCUMENTS */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-slate-900 border-b pb-3">Evidence Document Upload</h3>

            <DocumentUploader
              documents={uploadedDocs}
              onUploadFile={handleDocumentUpload}
              onRemoveDoc={(id) => setUploadedDocs(prev => prev.filter(d => d.id !== id))}
              isUploading={isUploading}
            />
          </div>
        )}

        {/* STEP 05 — REVIEW */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-slate-900 border-b pb-3">Pre-Submission Audit Summary</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">PATIENT</span>
                <p className="text-sm font-bold text-slate-900">{patientName}</p>
                <p className="font-mono text-slate-500">{patientId} • DOB {dob}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">PROCEDURE</span>
                <p className="text-sm font-bold text-slate-900">{cdtCode} — Tooth #{toothNumber}</p>
                <p className="font-mono text-slate-500">DOS: {dos} • Amount: ${claimAmount}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">CLINICAL NARRATIVE</span>
              <p className="text-slate-700 italic">"{narrative}"</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex justify-between items-center">
              <span className="font-bold text-slate-700">Uploaded Evidence Documents</span>
              <span className="font-mono font-bold text-brand-600">{uploadedDocs.length} files attached</span>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col items-center justify-center space-y-3">
              <p className="text-xs font-semibold text-slate-600">Ready to run your pre-submission audit?</p>
              <button
                onClick={handleRunAudit}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>RUN PRE-SUBMISSION AUDIT</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 06 — AUDIT ANALYSIS ANIMATION */}
        {step === 6 && (
          <div className="py-16 text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-3xl bg-brand-100 text-brand-600 mx-auto flex items-center justify-center animate-bounce">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-wider font-mono">CLAIM-SHIELD</h3>
              <p className="text-xs text-slate-500 font-semibold">Analyzing dental claim documentation...</p>
            </div>

            <div className="max-w-md mx-auto bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 text-xs space-y-2 text-left shadow-xl">
              {[
                '✓ Loading payer rules',
                '✓ Validating procedure',
                '✓ Checking tooth/location',
                '✓ Checking required documents',
                '✓ Inspecting clinical narrative',
                '✓ Extracting clinical evidence',
                '✓ Comparing claim and documentation',
                '✓ Checking evidence consistency',
                '✓ Calculating documentation readiness'
              ].map((st, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 transition-all font-mono ${
                    i <= analysisStep ? 'text-emerald-400 opacity-100 font-semibold' : 'text-slate-600 opacity-40'
                  }`}
                >
                  <span>{st}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Footer Navigation Buttons */}
        {step < 5 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(prev => Math.max(1, prev - 1))}
              disabled={step === 1}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-30 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>

            <button
              type="button"
              onClick={() => setStep(prev => Math.min(5, prev + 1))}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/30 flex items-center gap-1.5 transition-all"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewAudit;
