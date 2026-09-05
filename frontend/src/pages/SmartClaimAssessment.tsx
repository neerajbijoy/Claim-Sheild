import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Save,
  Trash2,
  ExternalLink,
  Layers,
  Clock,
  DollarSign,
  ChevronRight,
  Search,
  Check,
  Edit2,
  Key,
  Cpu,
  Zap,
  TrendingUp
} from 'lucide-react';
import {
  extractAssessmentDocumentsApi,
  verifyPayerUrlApi,
  fetchAssessmentHistoricalApi,
  runSmartAssessmentApi,
  saveSmartAssessmentApi,
  fetchGeminiStatusApi,
  saveGeminiApiKeyApi
} from '../services/api';

// Document categories available for upload
const DOCUMENT_TYPES = [
  { value: 'CLINICAL_NOTE', label: "Doctor's Clinical Note" },
  { value: 'XRAY', label: 'X-Ray / Radiograph' },
  { value: 'TREATMENT_PLAN', label: 'Treatment Preparation / Plan' },
  { value: 'PRESCRIPTION', label: 'Prescription' },
  { value: 'EXISTING_CLAIM', label: 'Existing Claim Document' },
  { value: 'PREVIOUS_AUDIT', label: 'Previous Audit Report' },
  { value: 'REJECTION_REPORT', label: 'Previous Denial / Rejection Notice' }
];

interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  doc_type: string;
  status: 'PENDING' | 'EXTRACTED' | 'ERROR';
  extracted_text?: string;
  word_count?: number;
  ocr_required?: boolean;
}

export const SmartClaimAssessment: React.FC = () => {
  // LEFT COLUMN — SECTION A: Patient Details
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientDos, setPatientDos] = useState('');
  const [patientContact, setPatientContact] = useState('');

  // LEFT COLUMN — SECTION B: Insurance
  const [payerName, setPayerName] = useState('');
  const [payerPolicyUrl, setPayerPolicyUrl] = useState('');
  const [memberId, setMemberId] = useState('');
  const [planName, setPlanName] = useState('');
  const [verifiedPolicy, setVerifiedPolicy] = useState<any>(null);
  const [verifyingPayer, setVerifyingPayer] = useState(false);
  const [payerUrlError, setPayerUrlError] = useState<string | null>(null);

  // LEFT COLUMN — SECTION C: Procedure
  const [procedureName, setProcedureName] = useState('');
  const [cdtCode, setCdtCode] = useState('');
  const [toothNumber, setToothNumber] = useState('');
  const [treatmentDate, setTreatmentDate] = useState('');
  const [amountCharged, setAmountCharged] = useState('');

  // Manual clinical text note
  const [clinicalNarrative, setClinicalNarrative] = useState('');

  // LEFT COLUMN — SECTION D: Documents
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RIGHT COLUMN — ASSESSMENT STATE
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isCheckingPayer, setIsCheckingPayer] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [suggestedCandidates, setSuggestedCandidates] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sourceProvenance, setSourceProvenance] = useState<{ [key: string]: 'Extracted' | 'Suggested' | 'User provided' }>({});

  // Google Gemini AI Integration State
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [aiEngineUsed, setAiEngineUsed] = useState<string | null>(null);

  useEffect(() => {
    fetchGeminiStatusApi()
      .then(res => {
        setGeminiConfigured(res.configured);
        setGeminiModel(res.model);
      })
      .catch(() => {});
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    try {
      const res = await saveGeminiApiKeyApi(apiKeyInput.trim());
      if (res.success) {
        setGeminiConfigured(true);
        setShowKeyModal(false);
        setApiKeyInput('');
        setSaveStatus('Google Gemini API key configured successfully. AI link & dental analysis enabled.');
      }
    } catch (err: any) {
      setErrorMessage(`Failed to save Gemini key: ${err.message}`);
    } finally {
      setSavingKey(false);
    }
  };

  // Document Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    const newItems: UploadedFileItem[] = files.map(f => {
      // Default guess doc type based on name
      let guessedType = 'CLINICAL_NOTE';
      const lower = f.name.toLowerCase();
      if (lower.includes('xray') || lower.includes('x-ray') || lower.includes('radiograph')) guessedType = 'XRAY';
      else if (lower.includes('rx') || lower.includes('prescript')) guessedType = 'PRESCRIPTION';
      else if (lower.includes('rejection') || lower.includes('denial')) guessedType = 'REJECTION_REPORT';
      else if (lower.includes('audit')) guessedType = 'PREVIOUS_AUDIT';
      else if (lower.includes('plan')) guessedType = 'TREATMENT_PLAN';

      return {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        doc_type: guessedType,
        status: 'PENDING'
      };
    });
    setUploadedFiles(prev => [...prev, ...newItems]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileDocType = (id: string, newType: string) => {
    setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, doc_type: newType } : f));
  };

  // 1. OPERATION: Extract Information from Uploaded Documents
  const handleExtractInformation = async () => {
    if (uploadedFiles.length === 0 && !clinicalNarrative.trim()) {
      setErrorMessage('Please upload at least one document or enter clinical notes to extract information.');
      return;
    }

    setErrorMessage(null);
    setIsExtracting(true);

    try {
      const docTypeMap: Record<string, string> = {};
      uploadedFiles.forEach(f => {
        docTypeMap[f.name] = f.doc_type;
      });

      const res: any = await extractAssessmentDocumentsApi(
        uploadedFiles.map(f => f.file),
        clinicalNarrative,
        docTypeMap
      );

      setExtractedData(res.extracted_info);
      setSuggestedCandidates(res.cdt_candidates || []);
      if (res.ai_engine) {
        setAiEngineUsed(res.ai_engine);
      }

      // Populate empty form fields with authentically extracted values
      const info = res.extracted_info;
      const newProvenance: { [key: string]: 'Extracted' | 'Suggested' | 'User provided' } = { ...sourceProvenance };

      if (info.patient_name !== 'Not found' && !patientName) {
        setPatientName(info.patient_name);
        newProvenance['patientName'] = 'Extracted';
      }
      if (info.patient_id !== 'Not found' && !patientId) {
        setPatientId(info.patient_id);
        newProvenance['patientId'] = 'Extracted';
      }
      if (info.patient_age !== 'Not found' && !patientAge) {
        setPatientAge(String(info.patient_age));
        newProvenance['patientAge'] = 'Extracted';
      }
      if (info.treatment_date !== 'Not found' && !patientDos) {
        setPatientDos(info.treatment_date);
        setTreatmentDate(info.treatment_date);
        newProvenance['treatmentDate'] = 'Extracted';
      }
      if (info.teeth !== 'Not found' && Array.isArray(info.teeth) && info.teeth.length > 0 && !toothNumber) {
        setToothNumber(info.teeth[0]);
        newProvenance['toothNumber'] = 'Extracted';
      }
      if (info.cdt_code !== 'Not found' && !cdtCode) {
        setCdtCode(info.cdt_code);
        newProvenance['cdtCode'] = 'Extracted';
      }

      setSourceProvenance(newProvenance);

      // Update file statuses
      setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'EXTRACTED' })));
    } catch (err: any) {
      setErrorMessage(`Document extraction error: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // 2. OPERATION: Check Payer Requirements & Analyze Chances via Gemini AI
  const handleVerifyPayerUrl = async () => {
    if (!payerPolicyUrl.trim()) {
      setPayerUrlError('Please enter a policy URL starting with http:// or https://');
      return;
    }

    setPayerUrlError(null);
    setVerifyingPayer(true);

    try {
      const res = await verifyPayerUrlApi(payerPolicyUrl.trim(), payerName.trim(), {
        procedure: {
          cdt_code: cdtCode,
          tooth_number: toothNumber,
          procedure_name: procedureName,
          amount_charged: amountCharged
        },
        clinical_evidence: extractedData || {}
      });

      if (res.verified) {
        setVerifiedPolicy(res);
        setPayerUrlError(null);
      } else {
        setVerifiedPolicy(res);
        setPayerUrlError(res.error_message || 'Payer policy could not be verified from the provided URL.');
      }
    } catch (err: any) {
      setPayerUrlError(`Failed accessing payer URL: ${err.message}`);
    } finally {
      setVerifyingPayer(false);
    }
  };

  // 3. OPERATION: Check Historical Claim Signals
  const handleCheckHistorical = async (codeToCheck?: string, payerToCheck?: string) => {
    const code = codeToCheck || cdtCode;
    const payer = payerToCheck || payerName;

    try {
      const res = await fetchAssessmentHistoricalApi({
        payer_name: payer,
        cdt_code: code
      });
      setHistoricalData(res);
    } catch (err) {
      setHistoricalData({
        has_history: false,
        message: 'Could not query historical database.'
      });
    }
  };

  // 4. OPERATION: Run Full Assessment
  const handleRunAssessment = async () => {
    setIsAuditing(true);
    setErrorMessage(null);
    setSaveStatus(null);

    try {
      // 1. Check historical signals in parallel
      await handleCheckHistorical(cdtCode, payerName);

      // 2. Prepare payload
      const payload = {
        patient: {
          name: patientName.trim(),
          id: patientId.trim(),
          age: patientAge.trim(),
          treatment_date: patientDos.trim(),
          contact: patientContact.trim()
        },
        insurance: {
          provider_name: payerName.trim(),
          policy_url: payerPolicyUrl.trim(),
          member_id: memberId.trim(),
          plan_name: planName.trim()
        },
        procedure: {
          procedure_name: procedureName.trim(),
          cdt_code: cdtCode.trim(),
          tooth_number: toothNumber.trim(),
          treatment_date: treatmentDate.trim() || patientDos.trim(),
          amount_charged: amountCharged.trim()
        },
        documents: uploadedFiles.map(f => ({
          file_name: f.name,
          document_type: f.doc_type,
          extracted_text: f.extracted_text || ''
        })),
        clinical_text: clinicalNarrative,
        verified_policy: verifiedPolicy,
        previous_audit: extractedData?.previous_rejection || null
      };

      const auditData = await runSmartAssessmentApi(payload);
      setAssessmentResult(auditData);
    } catch (err: any) {
      setErrorMessage(`Assessment calculation error: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  // 5. OPERATION: Recalculate Risk
  const handleRecalculateRisk = async () => {
    handleRunAssessment();
  };

  // 6. OPERATION: Save Assessment
  const handleSaveAssessment = async () => {
    if (!assessmentResult) {
      setErrorMessage('No assessment has been run yet to save.');
      return;
    }

    try {
      setSaveStatus('Saving assessment to database...');
      const res = await saveSmartAssessmentApi({
        assessment_data: assessmentResult,
        claim_info: {
          patient: { name: patientName, id: patientId },
          insurance: { provider_name: payerName },
          procedure: { cdt_code: cdtCode, tooth_number: toothNumber }
        }
      });
      if (res.success) {
        setSavedSessionId(res.session_id);
        setSaveStatus(`Saved successfully. Reference: ${res.session_id}`);
      }
    } catch (err: any) {
      setSaveStatus(null);
      setErrorMessage(`Failed to save assessment: ${err.message}`);
    }
  };

  // 7. OPERATION: Clear Workspace
  const handleClearAssessment = () => {
    if (confirm('Clear current workspace and reset all fields?')) {
      setPatientName('');
      setPatientId('');
      setPatientAge('');
      setPatientDos('');
      setPatientContact('');
      setPayerName('');
      setPayerPolicyUrl('');
      setMemberId('');
      setPlanName('');
      setVerifiedPolicy(null);
      setPayerUrlError(null);
      setProcedureName('');
      setCdtCode('');
      setToothNumber('');
      setTreatmentDate('');
      setAmountCharged('');
      setClinicalNarrative('');
      setUploadedFiles([]);
      setExtractedData(null);
      setSuggestedCandidates([]);
      setHistoricalData(null);
      setAssessmentResult(null);
      setSavedSessionId(null);
      setSaveStatus(null);
      setErrorMessage(null);
      setSourceProvenance({});
    }
  };

  // Helper to apply suggested CDT
  const handleApplySuggestedCdt = (code: string, desc: string) => {
    setCdtCode(code);
    if (!procedureName) setProcedureName(desc);
    setSourceProvenance(prev => ({ ...prev, cdtCode: 'Suggested' }));
  };

  // Helper to render Provenance Badge
  const renderProvenanceBadge = (fieldKey: string, value: string) => {
    if (!value) return null;
    const source = sourceProvenance[fieldKey] || 'User provided';
    const colorClass =
      source === 'Extracted'
        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
        : source === 'Suggested'
        ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
        : 'bg-slate-800 text-slate-400 border-slate-700';

    return (
      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${colorClass}`}>
        {source}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-8 space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-widest">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>Pre-Submission Decision Support</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            ClaimShield Smart Claim Assessment
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Assess claim readiness and rejection risk before submission using clinical evidence, payer requirements and historical claim patterns.
          </p>
        </div>

        {/* Global Real Actions & Gemini AI Status */}
        <div className="flex items-center flex-wrap gap-2">
          {geminiConfigured ? (
            <div className="px-3 py-2 bg-emerald-950/70 border border-emerald-700/80 rounded-xl text-[11px] text-emerald-300 font-mono flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gemini AI Active ({geminiModel})</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowKeyModal(prev => !prev)}
              className="px-3 py-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 rounded-xl text-[11px] text-indigo-200 font-semibold flex items-center gap-1.5 transition-all shadow-sm group"
              title="Click to configure Google Gemini API key"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform" />
              <span>Configure Gemini API Key</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRunAssessment}
            disabled={isAuditing}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Assessing Claim...' : 'Run Assessment'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAssessment}
            disabled={!assessmentResult}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5 text-slate-300" />
            <span>Save Assessment</span>
          </button>

          <button
            type="button"
            onClick={handleClearAssessment}
            className="px-3 py-2 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 text-xs font-medium rounded-xl border border-slate-800 transition-all flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Gemini API Key Configuration Panel */}
      {showKeyModal && (
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-600/50 rounded-2xl space-y-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Connect Google Gemini AI Engine</span>
            </div>
            <button
              type="button"
              onClick={() => setShowKeyModal(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-slate-800 transition-all"
            >
              &times;
            </button>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Google Gemini powers automated reading of insurance website policy documents, pre-submission approval chance analysis, and deep dental clinical chart understanding.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
            <input
              type="password"
              placeholder="Paste your Gemini API key (e.g. AIzaSy...)"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              disabled={savingKey || !apiKeyInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 disabled:opacity-40"
            >
              {savingKey ? 'Saving...' : 'Save & Enable AI'}
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Keys are saved locally in your project's <code className="text-indigo-300 font-mono">backend/.env</code> file.
          </p>
        </div>
      )}

      {/* Global Notifications */}
      {errorMessage && (
        <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-2xl text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveStatus && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* TWO-COLUMN WORKSPACE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* =========================================================================
            LEFT SIDE: CLAIM INFORMATION
           ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Claim Information
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">INTAKE PANEL</span>
          </div>

          {/* SECTION A: Patient Details */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                A. Patient Details
              </span>
              {renderProvenanceBadge('patientName', patientName)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Patient Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Mathew"
                  value={patientName}
                  onChange={e => {
                    setPatientName(e.target.value);
                    setSourceProvenance(p => ({ ...p, patientName: 'User provided' }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Patient ID / Chart #</label>
                <input
                  type="text"
                  placeholder="e.g. PT-10284"
                  value={patientId}
                  onChange={e => {
                    setPatientId(e.target.value);
                    setSourceProvenance(p => ({ ...p, patientId: 'User provided' }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Patient Age</label>
                <input
                  type="number"
                  placeholder="e.g. 42"
                  value={patientAge}
                  onChange={e => {
                    setPatientAge(e.target.value);
                    setSourceProvenance(p => ({ ...p, patientAge: 'User provided' }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Date of Treatment</label>
                <input
                  type="date"
                  value={patientDos}
                  onChange={e => {
                    setPatientDos(e.target.value);
                    setSourceProvenance(p => ({ ...p, patientDos: 'User provided' }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">Optional Contact Information</label>
              <input
                type="text"
                placeholder="Phone or patient email"
                value={patientContact}
                onChange={e => setPatientContact(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* SECTION B: Insurance */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                B. Insurance
              </span>
              {verifiedPolicy?.verified && (
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Policy Verified
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Insurance Provider Name</label>
                <input
                  type="text"
                  placeholder="e.g. Delta Dental PPO"
                  value={payerName}
                  onChange={e => setPayerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Member / Policy ID</label>
                <input
                  type="text"
                  placeholder="e.g. D10029348"
                  value={memberId}
                  onChange={e => setMemberId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">Optional Plan Name</label>
              <input
                type="text"
                placeholder="e.g. Premier Comprehensive Dental Option"
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Insurance Provider Website / Policy URL */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                  Insurance Provider Website / Policy URL
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Public Verification</span>
              </label>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example-dental.com/policies/crowns"
                  value={payerPolicyUrl}
                  onChange={e => setPayerPolicyUrl(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={handleVerifyPayerUrl}
                  disabled={verifyingPayer || !payerPolicyUrl.trim()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-semibold rounded-xl border border-slate-700 shrink-0 flex items-center gap-1 disabled:opacity-40"
                >
                  <Search className={`w-3 h-3 ${verifyingPayer ? 'animate-spin' : ''}`} />
                  <span>{verifyingPayer ? 'Checking...' : 'Check Policy'}</span>
                </button>
              </div>

              {payerUrlError && (
                <p className="text-[10px] text-amber-400 bg-amber-950/40 p-2 rounded-lg border border-amber-900/60">
                  {payerUrlError}
                </p>
              )}

              {verifiedPolicy?.verified && (
                <div className="text-[11px] text-emerald-300 bg-emerald-950/30 p-3 rounded-xl border border-emerald-900/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Policy Active & Parsed
                    </span>
                    {verifiedPolicy.chance_analysis?.approval_chance_pct !== undefined && (
                      <span className="font-mono font-bold text-teal-300 bg-teal-950 px-2 py-0.5 rounded border border-teal-800 text-[10px]">
                        {verifiedPolicy.chance_analysis.approval_chance_pct}% Approval Chance
                      </span>
                    )}
                  </div>
                  <p className="font-mono truncate text-slate-400 text-[10px]">{verifiedPolicy.source_url}</p>
                  <div className="flex items-center justify-between text-[9px] text-slate-500">
                    <span>Retrieved: {new Date(verifiedPolicy.retrieved_at).toLocaleTimeString()}</span>
                    <span className="text-teal-400">Detailed breakdown on right &rarr;</span>
                  </div>
                  {verifiedPolicy.maximum_allowable && (
                    <p className="font-bold text-teal-300 text-[10px]">
                      Known maximum allowable fee found in document: ${verifiedPolicy.maximum_allowable}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION C: Procedure */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                C. Procedure Information
              </span>
              {renderProvenanceBadge('cdtCode', cdtCode)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Procedure Name</label>
                <input
                  type="text"
                  placeholder="e.g. Crown - Porcelain/Ceramic"
                  value={procedureName}
                  onChange={e => setProcedureName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                  CDT Code <span className="text-slate-500">(if known)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. D2740"
                  value={cdtCode}
                  onChange={e => {
                    setCdtCode(e.target.value.toUpperCase());
                    setSourceProvenance(p => ({ ...p, cdtCode: 'User provided' }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                  Tooth Number <span className="text-slate-500">(1-32)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14"
                  value={toothNumber}
                  onChange={e => {
                    setToothNumber(e.target.value);
                    setSourceProvenance(p => ({ ...p, toothNumber: 'User provided' }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                  Amount Charged <span className="text-slate-500">($)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1250"
                  value={amountCharged}
                  onChange={e => setAmountCharged(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
            </div>

            {/* Doctor Narrative Text input */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                Doctor's Clinical Notes / Treatment Preparation
              </label>
              <textarea
                rows={3}
                placeholder="Enter doctor's clinical notes, diagnostic observations, remaining tooth structure..."
                value={clinicalNarrative}
                onChange={e => setClinicalNarrative(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>
          </div>

          {/* SECTION D: Documents Upload */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-brand-400" />
                D. Supporting Documents
              </span>
              <span className="text-[10px] text-slate-500 font-mono">PDF, TXT, Images</span>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-teal-400 bg-teal-950/20'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInput}
                accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.csv"
              />
              <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-300">
                Drag and drop files here, or <span className="text-teal-400 underline">browse</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Clinical notes, prescriptions, treatment plans, radiographs, existing claims, previous audit/rejection reports
              </p>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Uploaded Documents ({uploadedFiles.length})
                </div>
                {uploadedFiles.map(f => (
                  <div
                    key={f.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate text-xs">{f.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {(f.size / 1024).toFixed(1)} KB &bull; Status: {f.status}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Document Type Selector */}
                      <select
                        value={f.doc_type}
                        onChange={e => updateFileDocType(f.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none"
                      >
                        {DOCUMENT_TYPES.map(t => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="p-1 hover:text-red-400 text-slate-500 transition-all"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Document Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExtractInformation}
                disabled={isExtracting || (uploadedFiles.length === 0 && !clinicalNarrative.trim())}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
                <span>{isExtracting ? 'Extracting Text...' : 'Analyze Documents & Extract'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT SIDE: CLAIM ASSESSMENT
           ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Claim Assessment
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">INTELLIGENCE AUDIT</span>
          </div>

          {/* INITIAL EMPTY STATE (when no extraction, policy verification, or audit has run) */}
          {!extractedData && !assessmentResult && !verifiedPolicy && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                <FileText className="w-7 h-7 text-slate-400" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-white">
                  Provide claim information, policy URL, or documents to begin assessment.
                </h3>
                <p className="text-xs text-slate-400">
                  Enter an insurance policy URL to read payer guidelines and forecast approval chances with Gemini AI, or upload clinical notes to extract dental criteria.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExtractInformation}
                disabled={uploadedFiles.length === 0 && !clinicalNarrative.trim()}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/30 transition-all disabled:opacity-40 inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Extract Information</span>
              </button>
            </div>
          )}

          {/* GEMINI POLICY READING & APPROVAL CHANCE ANALYSIS */}
          {verifiedPolicy && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-brand-950 border border-brand-800 text-brand-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <span>Payer Policy Reading & Approval Chances</span>
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {verifiedPolicy.payer_name || 'Insurance Payer'} &bull; {verifiedPolicy.policy_title || 'Clinical Guidelines'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-700/70 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>{verifiedPolicy.ai_engine || 'Gemini 2.5 Flash'}</span>
                  </span>
                </div>
              </div>

              {/* Source Link & Document Stats */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2 min-w-0 max-w-lg">
                  <span className="text-slate-400 text-[11px]">Source URL:</span>
                  <a
                    href={verifiedPolicy.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-400 hover:text-teal-300 underline font-mono text-[11px] truncate flex items-center gap-1"
                  >
                    <span>{verifiedPolicy.source_url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                  {verifiedPolicy.word_count && <span>{verifiedPolicy.word_count} words parsed</span>}
                  {verifiedPolicy.retrieved_at && (
                    <span>Scraped: {new Date(verifiedPolicy.retrieved_at).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>

              {/* Policy Summary */}
              {verifiedPolicy.policy_summary && (
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Policy Scope & Documentation Summary
                  </span>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {verifiedPolicy.policy_summary}
                  </p>
                </div>
              )}

              {/* Approval Chances Gauge Box */}
              {verifiedPolicy.chance_analysis && (
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800/90 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                        Pre-Submission Adjudication Forecast
                      </div>
                      <div className="flex items-center gap-2.5 mt-1">
                        <span
                          className={`text-xs font-extrabold px-3 py-1 rounded-xl uppercase tracking-wider font-mono ${
                            verifiedPolicy.chance_analysis.chance_level === 'VERY HIGH' || verifiedPolicy.chance_analysis.chance_level === 'HIGH'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : verifiedPolicy.chance_analysis.chance_level === 'MODERATE'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : 'bg-red-950 text-red-300 border border-red-700'
                          }`}
                        >
                          {verifiedPolicy.chance_analysis.chance_level} APPROVAL CHANCE
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center sm:text-right">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Approval Chance</div>
                        <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-0.5">
                          {verifiedPolicy.chance_analysis.approval_chance_pct}%
                        </div>
                      </div>
                      <div className="text-center sm:text-right">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Rejection Risk</div>
                        <div className="text-3xl font-extrabold font-mono text-rose-400 mt-0.5">
                          {verifiedPolicy.chance_analysis.rejection_risk_pct}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Chance Ratio Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-500"
                        style={{ width: `${verifiedPolicy.chance_analysis.approval_chance_pct}%` }}
                      />
                      <div
                        className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-500"
                        style={{ width: `${verifiedPolicy.chance_analysis.rejection_risk_pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>Approval: {verifiedPolicy.chance_analysis.approval_chance_pct}%</span>
                      <span>Rejection Risk: {verifiedPolicy.chance_analysis.rejection_risk_pct}%</span>
                    </div>
                  </div>

                  {/* Gemini Rationale Quote */}
                  {verifiedPolicy.chance_analysis.detailed_rationale && (
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Gemini Clinical Compliance Rationale</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed text-xs">
                        {verifiedPolicy.chance_analysis.detailed_rationale}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Clause Compliance Breakdown with Direct Policy Quotes */}
              {verifiedPolicy.chance_analysis?.compliance_clauses && verifiedPolicy.chance_analysis.compliance_clauses.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Policy Clause Compliance Breakdown</span>
                    <span className="text-[10px] font-mono text-slate-500">Extracted directly from website text</span>
                  </div>

                  <div className="space-y-2">
                    {verifiedPolicy.chance_analysis.compliance_clauses.map((clause: any, idx: number) => {
                      const isSat = clause.status === 'SATISFIED';
                      const isDef = clause.status === 'DEFICIENT';
                      const isPart = clause.status === 'PARTIAL';
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                            isSat
                              ? 'bg-slate-950/70 border-slate-800'
                              : isDef
                              ? 'bg-red-950/20 border-red-800/50'
                              : 'bg-amber-950/20 border-amber-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white text-xs">{clause.clause}</span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase shrink-0 ${
                                isSat
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : isDef
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : isPart
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {clause.status}
                            </span>
                          </div>

                          {clause.policy_quote && (
                            <div className="pl-3 border-l-2 border-indigo-500/70 text-[11px] text-slate-300 italic font-mono bg-slate-950/60 p-2 rounded-r">
                              "{clause.policy_quote}"
                            </div>
                          )}

                          <p className="text-slate-300 text-[11px]">{clause.rationale}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Requirements Met & Missing */}
              {verifiedPolicy.chance_analysis && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {verifiedPolicy.chance_analysis.requirements_met?.length > 0 && (
                    <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Requirements Met ({verifiedPolicy.chance_analysis.requirements_met.length})
                      </span>
                      <ul className="space-y-1 text-emerald-200 text-[11px]">
                        {verifiedPolicy.chance_analysis.requirements_met.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">&bull;</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {verifiedPolicy.chance_analysis.requirements_missing?.length > 0 && (
                    <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Requirements Missing / Deficient ({verifiedPolicy.chance_analysis.requirements_missing.length})
                      </span>
                      <ul className="space-y-1 text-amber-200 text-[11px]">
                        {verifiedPolicy.chance_analysis.requirements_missing.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold">&bull;</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Scraped Policy Requirements list */}
              {verifiedPolicy.requirements && verifiedPolicy.requirements.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Documentary Pre-Requisites Extracted from Policy
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    {verifiedPolicy.requirements.map((req: any, i: number) => (
                      <div key={i} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-teal-400 uppercase">{req.type}</span>
                        <p className="text-slate-300 font-sans text-[11px]">{req.rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gemini Recommendations for Approval */}
              {verifiedPolicy.recommendations_for_approval && verifiedPolicy.recommendations_for_approval.length > 0 && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>Gemini Policy Adjudication Strategy</span>
                  </div>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    {verifiedPolicy.recommendations_for_approval.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-teal-400 font-bold">{i + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Financial Max Allowable & Exclusions */}
              {(verifiedPolicy.maximum_allowable !== null || (verifiedPolicy.exclusions && verifiedPolicy.exclusions.length > 0)) && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-xs">
                  {verifiedPolicy.maximum_allowable !== null && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-400">Payer Maximum Allowable Fee:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ${verifiedPolicy.maximum_allowable}
                      </span>
                    </div>
                  )}
                  {verifiedPolicy.exclusions && verifiedPolicy.exclusions.length > 0 && (
                    <div className="text-[10px] text-slate-400">
                      <span className="font-semibold text-rose-400">Exclusions: </span>
                      <span>{verifiedPolicy.exclusions.slice(0, 2).join('; ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 1. EXTRACTED CLINICAL INFORMATION TABLE */}
          {extractedData && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>1. Extracted Clinical & Dental Information</span>
                </div>
                <span className="text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  {aiEngineUsed || 'Dental Clinical Specialist'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Patient Name</span>
                  <span className={extractedData.patient_name === 'Not found' ? 'text-slate-500 italic' : 'text-white font-bold'}>
                    {extractedData.patient_name}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Patient ID</span>
                  <span className={extractedData.patient_id === 'Not found' ? 'text-slate-500 italic' : 'text-white font-mono font-bold'}>
                    {extractedData.patient_id}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tooth Numbers</span>
                  <span className={extractedData.teeth === 'Not found' ? 'text-slate-500 italic' : 'text-teal-300 font-mono font-bold'}>
                    {Array.isArray(extractedData.teeth) ? extractedData.teeth.map((t: string) => `#${t}`).join(', ') : extractedData.teeth}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Dental Surfaces & Location</span>
                  <span className={extractedData.surfaces === 'Not found' && extractedData.quadrant === 'Not found' ? 'text-slate-500 italic' : 'text-cyan-300 font-mono font-bold'}>
                    {[
                      extractedData.surfaces && extractedData.surfaces !== 'Not found'
                        ? `Surfaces: ${Array.isArray(extractedData.surfaces) ? extractedData.surfaces.join(', ') : extractedData.surfaces}`
                        : null,
                      extractedData.quadrant && extractedData.quadrant !== 'Not found'
                        ? `Quadrant: ${extractedData.quadrant}`
                        : null
                    ].filter(Boolean).join(' | ') || 'Not specified'}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sound Tooth Structure Remaining</span>
                  <span className={extractedData.remaining_structure_percentage === 'Not specified' ? 'text-slate-500 italic' : 'text-amber-300 font-mono font-bold'}>
                    {extractedData.remaining_structure_percentage}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pulpal & Periapical Status</span>
                  <span className={extractedData.pulpal_periapical_status === 'Not found' ? 'text-slate-500 italic' : 'text-emerald-300 font-medium'}>
                    {extractedData.pulpal_periapical_status}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 sm:col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Doctor / Provider</span>
                  <span className={extractedData.doctor_name === 'Not found' ? 'text-slate-500 italic' : 'text-white font-bold'}>
                    {extractedData.doctor_name}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 sm:col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Diagnoses & Conditions Detected</span>
                  <span className={extractedData.diagnoses === 'Not found' ? 'text-slate-500 italic' : 'text-emerald-300 font-medium'}>
                    {Array.isArray(extractedData.diagnoses) ? extractedData.diagnoses.join(', ') : extractedData.diagnoses}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 sm:col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Structural Findings & Clinical Breakdown</span>
                  <span className={extractedData.structural_findings === 'Not found' ? 'text-slate-500 italic' : 'text-amber-300 font-medium'}>
                    {Array.isArray(extractedData.structural_findings) ? extractedData.structural_findings.join(', ') : extractedData.structural_findings}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 sm:col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Clinical Justification Summary</span>
                  <p className={extractedData.clinical_justification === 'Not found' ? 'text-slate-500 italic' : 'text-slate-200'}>
                    {extractedData.clinical_justification}
                  </p>
                </div>

                {/* Gemini Dental Medical Necessity Assessment */}
                {extractedData.dental_readiness_assessment && (
                  <div className="p-4 bg-gradient-to-br from-slate-950 to-indigo-950/50 rounded-xl border border-indigo-900/60 sm:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Gemini Dental Medical Necessity Evaluation</span>
                      </div>
                      {extractedData.dental_readiness_assessment.medical_necessity_score !== undefined && (
                        <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                          Score: {extractedData.dental_readiness_assessment.medical_necessity_score} / 100
                        </span>
                      )}
                    </div>

                    {extractedData.dental_readiness_assessment.strengths?.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-emerald-400 uppercase">Clinical Strengths:</span>
                        <ul className="list-disc list-inside text-emerald-200 text-[11px] space-y-0.5">
                          {extractedData.dental_readiness_assessment.strengths.map((s: string, idx: number) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {extractedData.dental_readiness_assessment.weaknesses?.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-amber-400 uppercase">Documentation Gaps:</span>
                        <ul className="list-disc list-inside text-amber-200 text-[11px] space-y-0.5">
                          {extractedData.dental_readiness_assessment.weaknesses.map((w: string, idx: number) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {extractedData.dental_readiness_assessment.recommended_clinical_phrasing && (
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] space-y-1">
                        <span className="text-[10px] font-bold text-teal-400 uppercase">Recommended Doctor Phrasing:</span>
                        <p className="text-slate-300 italic font-mono">
                          "{extractedData.dental_readiness_assessment.recommended_clinical_phrasing}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {extractedData.measurements !== 'Not found' && Array.isArray(extractedData.measurements) && extractedData.measurements.length > 0 && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 sm:col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Relevant Measurements</span>
                    <span className="text-teal-300 font-mono text-[11px]">
                      {extractedData.measurements.join(' &bull; ')}
                    </span>
                  </div>
                )}

                {extractedData.materials !== 'Not found' && Array.isArray(extractedData.materials) && extractedData.materials.length > 0 && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 sm:col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Mentioned Materials</span>
                    <span className="text-indigo-300 font-medium">
                      {extractedData.materials.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. CDT IDENTIFICATION & CANDIDATES */}
          {suggestedCandidates.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>2. CDT Identification (Suggested Candidates)</span>
                </div>
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full">
                  Suggested CDT &bull; Not Confirmed
                </span>
              </div>

              <div className="space-y-2.5">
                {suggestedCandidates.map((c, i) => {
                  const isSelected = cdtCode === c.cdt_code;
                  return (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-600/80 shadow-md'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-teal-400 text-sm">{c.cdt_code}</span>
                          <span className="text-white font-semibold truncate">{c.procedure_name}</span>
                          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                            {Math.round(c.confidence * 100)}% match
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{c.rationale}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplySuggestedCdt(c.cdt_code, c.procedure_name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isSelected ? 'Confirmed' : 'Select / Confirm'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. CLAIM READINESS & REJECTION RISK REPORT (When Assessment is Run) */}
          {assessmentResult && (
            <div className="space-y-6">
              {/* READINESS & REJECTION RISK SUMMARY BANNER */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Claim Readiness Status</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className={`text-lg font-extrabold px-3 py-1 rounded-xl uppercase tracking-wider font-mono ${
                          assessmentResult.readiness === 'READY'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : assessmentResult.readiness === 'REVIEW REQUIRED'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : assessmentResult.readiness === 'HIGH RISK'
                            ? 'bg-red-950 text-red-300 border border-red-700'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {assessmentResult.readiness}
                      </span>
                    </div>
                  </div>

                  {/* Explainable Rejection Risk Score */}
                  <div className="text-right">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Estimated Rejection Risk</div>
                    {assessmentResult.rejection_risk?.score_pct !== null ? (
                      <div className="text-3xl font-extrabold font-mono text-white mt-0.5">
                        {assessmentResult.rejection_risk.score_pct}%
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-amber-400 mt-1">
                        Cannot be reliably estimated yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Issue Highlight */}
                {assessmentResult.top_issue && (
                  <div className="p-4 bg-red-950/30 border border-red-800/60 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>TOP ISSUE PRIORITIZED</span>
                    </div>
                    <p className="text-xs font-semibold text-white">
                      {assessmentResult.top_issue.requirement}
                    </p>
                    <p className="text-xs text-slate-300">
                      {assessmentResult.top_issue.evidence}
                    </p>
                  </div>
                )}

                {/* Rejection Risk Factors Breakdown (Explainable Formula) */}
                {assessmentResult.rejection_risk?.factors && assessmentResult.rejection_risk.factors.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Explainable Rejection Risk Factor Breakdown
                    </div>
                    <div className="space-y-1.5 font-mono text-xs">
                      {assessmentResult.rejection_risk.factors.map((f: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-950/70 rounded-xl border border-slate-800/60">
                          <div className="text-slate-300">
                            <span className="font-bold text-white mr-2">{f.factor}:</span>
                            <span className="text-slate-400 text-[11px]">{f.reason}</span>
                          </div>
                          <span className={`font-bold ml-3 shrink-0 ${f.points.startsWith('-') ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {f.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 italic mt-1">
                      {assessmentResult.rejection_risk.disclaimer}
                    </p>
                  </div>
                )}

                {/* Reimbursement & Allowable Comparison */}
                {assessmentResult.reimbursement && (
                  <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Reimbursement / Fee Analysis
                    </div>
                    {assessmentResult.reimbursement.available ? (
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                        <div>Charged: <span className="font-bold text-white">${assessmentResult.reimbursement.charged}</span></div>
                        <div>Known Allowable: <span className="font-bold text-emerald-400">${assessmentResult.reimbursement.known_allowable}</span></div>
                        {assessmentResult.reimbursement.difference !== null && (
                          <div>Difference: <span className="font-bold text-amber-300">${assessmentResult.reimbursement.difference}</span></div>
                        )}
                        <span className="text-[9px] text-slate-500 font-sans">Source: {assessmentResult.reimbursement.source}</span>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">
                        {assessmentResult.reimbursement.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Previous Audit / Rejection Reconciliation */}
                {assessmentResult.previous_rejection_reconciliation && (
                  <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/60 rounded-xl text-xs space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Previous Audit / Rejection Reconciliation
                    </div>
                    <p className="text-slate-200">
                      <span className="font-semibold text-white">Original Denial Reason:</span> "{assessmentResult.previous_rejection_reconciliation.original_reason}"
                    </p>
                    <p className={assessmentResult.previous_rejection_reconciliation.resolved ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                      Status: {assessmentResult.previous_rejection_reconciliation.explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* STRUCTURED PAYER REQUIREMENTS AUDIT CHECKS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-400" />
                    <span>Payer Requirements & Documentation Checks</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {assessmentResult.checks?.length || 0} Total Checks
                  </span>
                </div>

                <div className="space-y-3">
                  {assessmentResult.checks?.map((chk: any, i: number) => {
                    const isPass = chk.result === 'PASS';
                    const isWarning = chk.result === 'WARNING';
                    const isFail = chk.result === 'FAIL';

                    return (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          isPass
                            ? 'bg-slate-950/80 border-slate-800'
                            : isWarning
                            ? 'bg-amber-950/20 border-amber-800/60'
                            : 'bg-red-950/30 border-red-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                                isPass
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : isWarning
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-red-950 text-red-300 border border-red-800'
                              }`}
                            >
                              {chk.result}
                            </span>
                            <span className="font-bold text-white truncate">{chk.requirement}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">
                            {chk.source}
                          </span>
                        </div>

                        <p className="text-slate-300 text-[11px] pl-1">
                          {chk.evidence}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* HISTORICAL CLAIM SIGNALS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span>Historical Claim Analysis</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">SUPABASE HISTORICAL AUDIT</span>
                </div>

                {historicalData && historicalData.has_history ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-4 text-slate-300 font-mono">
                      <div>Sample Size: <span className="font-bold text-white">{historicalData.sample_size}</span> claims</div>
                      <div>Blocked Rate: <span className="font-bold text-amber-400">{historicalData.rejection_rate_pct}%</span></div>
                    </div>
                    {historicalData.top_defects && historicalData.top_defects.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Frequent Historical Failures:</span>
                        <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5">
                          {historicalData.top_defects.map((d: any, idx: number) => (
                            <li key={idx}>
                              {d.defect} ({d.occurrence_count} occurrences)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs">
                    {historicalData?.message || 'Insufficient historical claims for reliable historical risk analysis.'}
                  </p>
                )}
              </div>

              {/* ACTIONABLE RECOMMENDATIONS */}
              {assessmentResult.recommendations && assessmentResult.recommendations.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>Top Recommendations Before Submission</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
                    {assessmentResult.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="leading-relaxed">
                        {rec}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* PRE-SUBMISSION DECISION SUPPORT DISCLAIMER */}
              <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-[11px] text-slate-400 text-center">
                <span className="font-bold text-slate-300">IMPORTANT:</span> This is a pre-submission decision-support assessment and does not guarantee claim approval.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartClaimAssessment;
