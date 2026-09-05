import React, { useState, useEffect } from 'react';
import {
  User,
  Stethoscope,
  FileText,
  Upload,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Play,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  ClipboardCheck
} from 'lucide-react';

import { ToothSelector } from '../components/ToothSelector';
import { DocumentUploader } from '../components/DocumentUploader';

import {
  Payer,
  ClaimDocument,
  ExtractedEvidence
} from '../types';

import {
  fetchPayers,
  fetchPayerRules,
  createClaimApi,
  uploadDocumentApi,
  runAuditApi,
  extractClinicalApi
} from '../services/api';

interface NewAuditProps {
  onAuditComplete: (auditResult: any, claimId: string) => void;
  initialCdtCode?: string;
}

interface Requirement {
  id: string;
  type: string;
  label: string;
  description: string;
  documentType?: string;
  required: boolean;
}

export const NewAudit: React.FC<NewAuditProps> = ({
  onAuditComplete,
  initialCdtCode
}) => {
  /*
   * ============================================================
   * WIZARD STATE
   * ============================================================
   *
   * 1 - Patient
   * 2 - Procedure
   * 3 - Clinical Evidence
   * 4 - Requirement Analysis
   * 5 - Documents
   * 6 - Review & Audit
   * 7 - Audit Analysis
   */
  const [step, setStep] = useState(1);

  /*
   * ============================================================
   * PAYERS
   * ============================================================
   */
  const [payers, setPayers] = useState<Payer[]>([]);
  const [selectedPayerId, setSelectedPayerId] = useState('');

  const [payerRules, setPayerRules] = useState<any[]>([]);
  const [isLoadingRequirements, setIsLoadingRequirements] =
    useState(false);

  /*
   * ============================================================
   * STEP 1 - PATIENT
   * ============================================================
   */
  const [patientId, setPatientId] = useState('PT-10284');
  const [patientName, setPatientName] =
    useState('John Mathew');
  const [dob, setDob] = useState('1985-04-12');

  /*
   * ============================================================
   * STEP 2 - PROCEDURE
   * ============================================================
   */
  const [cdtCode, setCdtCode] =
    useState(initialCdtCode || 'D2740');

  const [toothNumber, setToothNumber] =
    useState('14');

  const [dos, setDos] =
    useState('2026-08-28');

  const [claimAmount, setClaimAmount] =
    useState('1250');

  /*
   * ============================================================
   * STEP 3 - CLINICAL EVIDENCE
   * ============================================================
   */
  const [narrative, setNarrative] = useState(
    'Patient presents with recurrent decay under an existing restoration on tooth #14. Tooth structure is severely compromised with broken cusp. Requires full coverage crown restoration.'
  );

  const [extractedEvidence, setExtractedEvidence] =
    useState<ExtractedEvidence | null>(null);

  const [isExtracting, setIsExtracting] =
    useState(false);

  /*
   * ============================================================
   * STEP 4 / 5 - REQUIREMENTS & DOCUMENTS
   * ============================================================
   */
  const [uploadedDocs, setUploadedDocs] =
    useState<Partial<ClaimDocument>[]>([]);

  const [isUploading, setIsUploading] =
    useState(false);

  /*
   * ============================================================
   * STEP 7 - AUDIT ANALYSIS
   * ============================================================
   */
  const [analysisStep, setAnalysisStep] =
    useState(0);

  /*
   * ============================================================
   * INITIAL CDT CODE
   * ============================================================
   */
  useEffect(() => {
    if (initialCdtCode) {
      setCdtCode(initialCdtCode);
    }
  }, [initialCdtCode]);

  /*
   * ============================================================
   * LOAD PAYERS
   * ============================================================
   */
  useEffect(() => {
    fetchPayers()
      .then((res) => {
        setPayers(res);

        if (res.length > 0) {
          setSelectedPayerId(
            prev => prev || res[0].id
          );
        }
      })
      .catch((err) => {
        console.error(
          'Unable to load payers:',
          err
        );
      });
  }, []);

  /*
   * ============================================================
   * LOAD PAYER REQUIREMENTS
   * ============================================================
   */
  useEffect(() => {
    if (
      !selectedPayerId ||
      !cdtCode.trim()
    ) {
      setPayerRules([]);
      return;
    }

    setIsLoadingRequirements(true);

    fetchPayerRules(selectedPayerId)
      .then((rules) => {
        const normalizedCode =
          cdtCode.trim().toUpperCase();

        const filteredRules =
          (rules || []).filter(
            (rule: any) =>
              !rule.cdt_code ||
              rule.cdt_code.toUpperCase() ===
                normalizedCode
          );

        setPayerRules(filteredRules);
      })
      .catch((err) => {
        console.warn(
          'Unable to load payer requirements:',
          err
        );

        setPayerRules([]);
      })
      .finally(() => {
        setIsLoadingRequirements(false);
      });
  }, [selectedPayerId, cdtCode]);

  /*
   * ============================================================
   * LIVE CLINICAL EXTRACTION
   * ============================================================
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        narrative.trim().length > 3 ||
        uploadedDocs.length > 0
      ) {
        setIsExtracting(true);

        const docsForAnalysis =
          uploadedDocs.map(d => ({
            file_name: d.file_name,
            extracted_text:
              d.extracted_text || ''
          }));

        extractClinicalApi({
          narrativeText: narrative,
          documents: docsForAnalysis
        })
          .then(res => {
            setExtractedEvidence(res);
          })
          .catch(err => {
            console.warn(
              'Clinical extraction preview error:',
              err
            );
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

  /*
   * ============================================================
   * DEMO CLINICAL CASES
   * ============================================================
   */
  const loadSampleNote = (
    scenario: 'crown' | 'perio' | 'extraction'
  ) => {
    if (scenario === 'crown') {
      setToothNumber('14');
      setCdtCode('D2740');

      setNarrative(
        'Patient presents with recurrent caries under an existing restoration on tooth #14. Tooth structure is severely compromised with broken disto-lingual cusp extending subgingivally. Requires full coverage porcelain crown.'
      );
    }

    if (scenario === 'perio') {
      setToothNumber('3');
      setCdtCode('D4341');

      setNarrative(
        'Generalized moderate to severe chronic periodontitis. Quadrant 1 exhibits pocket depths of 5-7mm with heavy subgingival calculus and bleeding on probing. Scaling and root planing indicated for 4 or more teeth.'
      );
    }

    if (scenario === 'extraction') {
      setToothNumber('19');
      setCdtCode('D7140');

      setNarrative(
        'Tooth #19 diagnosed as non-restorable due to severe vertical root fracture and extensive coronal breakdown to alveolar crest. Surgical extraction indicated.'
      );
    }
  };

  /*
   * ============================================================
   * REQUIREMENT TYPE MAPPING
   * ============================================================
   */
  const requirementMap: Record<
    string,
    {
      label: string;
      description: string;
      documentType?: string;
    }
  > = {
    XRAY: {
      label: 'X-Ray / Radiograph',
      description:
        'Supporting radiograph demonstrating the treated tooth or clinical condition.',
      documentType:
        'X-Ray / Radiograph'
    },

    TREATMENT_PLAN: {
      label: 'Treatment Plan',
      description:
        'Treatment plan or preparation documentation supporting the proposed procedure.',
      documentType:
        'Treatment Plan'
    },

    CLINICAL_NARRATIVE: {
      label: 'Clinical Notes',
      description:
        'Doctor documentation describing diagnosis, findings, and medical necessity.',
      documentType:
        'Clinical Notes'
    },

    CLINICAL_JUSTIFICATION: {
      label: 'Clinical Justification',
      description:
        'Documentation establishing why the procedure is clinically necessary.',
      documentType:
        'Clinical Notes'
    },

    PERIODONTAL_CHART: {
      label: 'Periodontal Chart',
      description:
        'Periodontal measurements supporting periodontal treatment.',
      documentType:
        'Periodontal Chart'
    },

    INTRAORAL_PHOTO: {
      label: 'Intraoral Photo',
      description:
        'Clinical photographs showing the condition of the treated area.',
      documentType:
        'Intraoral Photo'
    },

    PROCEDURE: {
      label: 'Procedure / CDT Documentation',
      description:
        'Procedure details and CDT code are required as part of the claim.'
    },

    TOOTH: {
      label: 'Tooth / Site Documentation',
      description:
        'The treated tooth or anatomical site must be clearly identified.'
    }
  };

  /*
   * ============================================================
   * BUILD REQUIREMENT LIST
   * ============================================================
   */
  const getRequirements = (): Requirement[] => {
    const rules =
      payerRules.filter(
        (rule: any) =>
          requirementMap[
            rule.requirement_type
          ]
      );

    /*
     * If payer-specific rules exist,
     * use them.
     *
     * Otherwise show sensible defaults.
     */
    if (rules.length > 0) {
      return rules.map(
        (rule: any, index: number) => {
          const meta =
            requirementMap[
              rule.requirement_type
            ];

          return {
            id:
              `${rule.requirement_type}-${index}`,
            type:
              rule.requirement_type,
            label:
              meta.label,
            description:
              rule.requirement_description ||
              meta.description,
            documentType:
              meta.documentType,
            required:
              rule.is_required !== false &&
              rule.required !== false
          };
        }
      );
    }

    return [
      {
        id: 'clinical-notes',
        type: 'CLINICAL_NARRATIVE',
        label: 'Clinical Notes',
        description:
          'Doctor documentation describing diagnosis, clinical findings and medical necessity.',
        documentType:
          'Clinical Notes',
        required: true
      },

      {
        id: 'xray',
        type: 'XRAY',
        label: 'X-Ray / Radiograph',
        description:
          'Radiograph supporting the diagnosis and procedure.',
        documentType:
          'X-Ray / Radiograph',
        required: true
      },

      {
        id: 'treatment-plan',
        type: 'TREATMENT_PLAN',
        label: 'Treatment Plan',
        description:
          'Treatment plan supporting the proposed procedure.',
        documentType:
          'Treatment Plan',
        required: false
      }
    ];
  };

  /*
   * ============================================================
   * DOCUMENT UPLOAD
   * ============================================================
   */
  const handleDocumentUpload = async (
    file: File,
    documentType: string
  ) => {
    setIsUploading(true);

    try {
      const tempDoc: Partial<ClaimDocument> = {
        id:
          `doc-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 6)}`,

        file,

        file_name:
          file.name,

        document_type:
          documentType,

        file_size:
          file.size,

        uploaded_at:
          new Date().toISOString()
      };

      setUploadedDocs(prev => [
        ...prev,
        tempDoc
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  /*
   * ============================================================
   * CHECK WHETHER A DOCUMENT TYPE IS ATTACHED
   * ============================================================
   */
  const isDocumentAttached = (
    documentType?: string
  ) => {
    if (!documentType) {
      return false;
    }

    return uploadedDocs.some(
      doc =>
        doc.document_type ===
        documentType
    );
  };

  /*
   * ============================================================
   * CHECKLIST DOCUMENTS
   * ============================================================
   */
  const getChecklistDocuments = () => {
    const requirements =
      getRequirements();

    /*
     * Add standard optional document types
     * that may not be returned by the payer.
     */
    const standardDocuments = [
      {
        label: 'Clinical Notes',
        type: 'Clinical Notes'
      },
      {
        label: 'X-Ray / Radiograph',
        type: 'X-Ray / Radiograph'
      },
      {
        label: 'Treatment Plan',
        type: 'Treatment Plan'
      },
      {
        label: 'Intraoral Photo',
        type: 'Intraoral Photo'
      },
      {
        label: 'Periodontal Chart',
        type: 'Periodontal Chart'
      }
    ];

    const requiredDocuments =
      requirements
        .filter(req => req.documentType)
        .map(req => ({
          label: req.label,
          type:
            req.documentType as string
        }));

    const combined = [
      ...requiredDocuments,
      ...standardDocuments
    ];

    /*
     * Remove duplicate document types.
     */
    const unique =
      combined.filter(
        (item, index, arr) =>
          arr.findIndex(
            x => x.type === item.type
          ) === index
      );

    return unique;
  };

  /*
   * ============================================================
   * NEXT STEP VALIDATION
   * ============================================================
   */
  const handleNext = () => {
    /*
     * DOCUMENT PAGE:
     *
     * At least one file must be attached.
     */
    if (
      step === 5 &&
      uploadedDocs.length === 0
    ) {
      alert(
        'Please attach at least one document before continuing to the Review & Audit step.'
      );

      return;
    }

    /*
     * PATIENT VALIDATION
     */
    if (
      step === 1 &&
      !patientName.trim()
    ) {
      alert(
        'Please enter the patient full name.'
      );

      return;
    }

    /*
     * PROCEDURE VALIDATION
     */
    if (
      step === 2 &&
      !cdtCode.trim()
    ) {
      alert(
        'Please enter a CDT procedure code.'
      );

      return;
    }

    setStep(
      prev =>
        Math.min(6, prev + 1)
    );
  };

  /*
   * ============================================================
   * RUN AUDIT
   * ============================================================
   */
  const handleRunAudit = async () => {
    if (!patientName.trim()) {
      alert(
        'Please enter patient full name before auditing.'
      );

      setStep(1);
      return;
    }

    /*
     * Safety validation:
     * Never run the audit without evidence.
     */
    if (uploadedDocs.length === 0) {
      alert(
        'At least one document must be attached before running the audit.'
      );

      setStep(5);
      return;
    }

    setStep(7);

    const auditSteps = [
      'Loading payer rules...',
      'Validating CDT procedure code...',
      'Checking tooth location specification...',
      'Inspecting uploaded evidence documents...',
      'Extracting clinical narrative indicators...',
      'Cross-checking evidence consistency...',
      'Calculating final readiness score...'
    ];

    for (
      let i = 0;
      i < auditSteps.length;
      i++
    ) {
      setAnalysisStep(i);

      await new Promise(
        resolve =>
          setTimeout(resolve, 450)
      );
    }

    try {
      const payerIdToUse =
        selectedPayerId ||
        (
          payers.length > 0
            ? payers[0].id
            : 'p-demo-delta'
        );

      /*
       * 1. CREATE CLAIM
       */
      const newClaim =
        await createClaimApi({
          patient_id:
            patientId.trim() ||
            `PT-${Math.floor(
              10000 +
              Math.random() *
              90000
            )}`,

          patient_name:
            patientName.trim(),

          date_of_birth:
            dob || '1985-01-01',

          payer_id:
            payerIdToUse,

          date_of_service:
            dos ||
            new Date()
              .toISOString()
              .split('T')[0],

          claim_amount:
            parseFloat(
              claimAmount
            ) || 1250,

          clinical_narrative:
            narrative,

          procedures: [
            {
              cdt_code:
                cdtCode.trim() ||
                'D2740',

              tooth_number:
                toothNumber.trim() ||
                '14',

              amount:
                parseFloat(
                  claimAmount
                ) || 1250
            }
          ]
        });

      if (
        !newClaim ||
        !newClaim.id
      ) {
        throw new Error(
          'Failed to create claim record.'
        );
      }

      /*
       * 2. UPLOAD DOCUMENTS
       */
      for (
        const doc of uploadedDocs
      ) {
        const fileToUpload =
          doc.file ||
          (
            doc.file_name
              ? new File(
                  [
                    'claim evidence document'
                  ],
                  doc.file_name,
                  {
                    type:
                      'application/pdf'
                  }
                )
              : null
          );

        if (fileToUpload) {
          await uploadDocumentApi(
            newClaim.id,
            fileToUpload,
            doc.document_type ||
              'Clinical Notes'
          );
        }
      }

      /*
       * 3. RUN AUDIT
       */
      const auditResult =
        await runAuditApi(
          newClaim.id
        );

      onAuditComplete(
        auditResult,
        newClaim.id
      );
    } catch (err: any) {
      console.error(
        'Audit execution error:',
        err
      );

      alert(
        'Audit failed: ' +
        (
          err.message ||
          'Unknown error'
        )
      );

      setStep(5);
    }
  };

  /*
   * ============================================================
   * STEP TITLES
   * ============================================================
   */
  const stepTitles = [
    {
      num: 1,
      title: 'Patient',
      icon: User
    },
    {
      num: 2,
      title: 'Procedure',
      icon: Stethoscope
    },
    {
      num: 3,
      title: 'Clinical Evidence',
      icon: FileText
    },
    {
      num: 4,
      title: 'Requirements',
      icon: ClipboardCheck
    },
    {
      num: 5,
      title: 'Documents',
      icon: Upload
    },
    {
      num: 6,
      title: 'Review & Audit',
      icon: CheckCircle
    }
  ];

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">

      {/* ======================================================
          HEADER / STEPPER
      ====================================================== */}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">

        <div className="flex items-center justify-between">

          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              New Claim Pre-Submission Audit
            </h2>

            <p className="text-xs text-slate-500">
              Step {step} of 6: Complete the claim preparation workflow
            </p>
          </div>

          <div className="bg-brand-50 text-brand-700 text-xs font-bold font-mono px-3 py-1 rounded-full border border-brand-200">
            STEP 0{step}
          </div>

        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">

          {stepTitles.map(
            st => {

              const Icon =
                st.icon;

              const isActive =
                step === st.num;

              const isCompleted =
                step > st.num;

              return (
                <div
                  key={st.num}
                  onClick={() =>
                    isCompleted &&
                    setStep(
                      st.num
                    )
                  }
                  className={`
                    flex items-center gap-2
                    p-2.5 rounded-2xl
                    border text-xs
                    transition-all

                    ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-pointer'
                        : isActive
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/30 font-bold'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }
                  `}
                >

                  <div
                    className={`
                      p-1 rounded-lg

                      ${
                        isActive
                          ? 'bg-white/20'
                          : isCompleted
                          ? 'bg-emerald-200/60 text-emerald-800'
                          : 'bg-slate-200 text-slate-500'
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <span className="hidden sm:inline truncate">
                    {st.title}
                  </span>

                </div>
              );
            }
          )}

        </div>
      </div>


      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">


        {/* ====================================================
            STEP 1 - PATIENT
        ==================================================== */}

        {step === 1 && (
          <div className="space-y-6">

            <h3 className="text-base font-bold text-slate-900 border-b pb-3">
              Patient & Insurance Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Patient ID
                </label>

                <input
                  type="text"
                  value={patientId}
                  onChange={e =>
                    setPatientId(
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Patient Full Name
                </label>

                <input
                  type="text"
                  value={patientName}
                  onChange={e =>
                    setPatientName(
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Date of Birth
                </label>

                <input
                  type="date"
                  value={dob}
                  onChange={e =>
                    setDob(
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>


              {/* INSURANCE PROVIDERS */}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Insurance Payer
                </label>

                <select
                  value={selectedPayerId}
                  onChange={e =>
                    setSelectedPayerId(
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >

                  {payers.map(
                    payer => (
                      <option
                        key={
                          payer.id
                        }
                        value={
                          payer.id
                        }
                      >
                        {
                          payer.display_name
                        }
                        {' '}
                        (
                        {
                          payer.name
                        }
                        )
                      </option>
                    )
                  )}

                </select>

                <p className="text-[11px] text-slate-400 mt-1">
                  Payer-specific requirements are loaded automatically.
                </p>

              </div>

            </div>

          </div>
        )}


        {/* ====================================================
            STEP 2 - PROCEDURE
        ==================================================== */}

        {step === 2 && (
          <div className="space-y-6">

            <h3 className="text-base font-bold text-slate-900 border-b pb-3">
              Dental CDT Procedure & Tooth Selection
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Procedure CDT Code
                </label>

                <input
                  type="text"
                  value={cdtCode}
                  onChange={e =>
                    setCdtCode(
                      e.target.value
                    )
                  }
                  placeholder="D2740"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-brand-600 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />

                <p className="text-[11px] text-slate-500 mt-1">
                  D2740: Crown - Porcelain/Ceramic Substrate
                </p>
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Date of Service
                </label>

                <input
                  type="date"
                  value={dos}
                  onChange={e =>
                    setDos(
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Claim Amount
                </label>

                <input
                  type="number"
                  value={claimAmount}
                  onChange={e =>
                    setClaimAmount(
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

            </div>

            <ToothSelector
              selectedTooth={
                toothNumber
              }
              onSelectTooth={
                t =>
                  setToothNumber(t)
              }
            />

          </div>
        )}


        {/* ====================================================
            STEP 3 - CLINICAL EVIDENCE
        ==================================================== */}

        {step === 3 && (
          <div className="space-y-6">

            <h3 className="text-base font-bold text-slate-900 border-b pb-3">
              Clinical Narrative & AI Extraction
            </h3>

            <div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">

                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Clinical Narrative Notes
                </label>

                <div className="flex items-center gap-2 flex-wrap">

                  <span className="text-[10px] text-slate-400 font-medium">
                    Load Demo Case:
                  </span>

                  <button
                    onClick={() =>
                      loadSampleNote(
                        'crown'
                      )
                    }
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200"
                  >
                    Crown (#14)
                  </button>

                  <button
                    onClick={() =>
                      loadSampleNote(
                        'perio'
                      )
                    }
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200"
                  >
                    Perio (D4341)
                  </button>

                  <button
                    onClick={() =>
                      loadSampleNote(
                        'extraction'
                      )
                    }
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200"
                  >
                    Extraction (#19)
                  </button>

                </div>

              </div>

              <textarea
                rows={5}
                value={narrative}
                onChange={e =>
                  setNarrative(
                    e.target.value
                  )
                }
                placeholder="Describe the patient's clinical condition and reason for treatment..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none leading-relaxed"
              />

              <div className="flex justify-between text-[11px] text-slate-400 mt-1">

                <span>
                  Natural language clinical parsing evaluates medical necessity and tooth location.
                </span>

                <span className="font-mono">
                  {narrative.length} chars
                </span>

              </div>

            </div>


            {/* AI EXTRACTION */}

            <div className="bg-slate-900 text-slate-200 p-6 rounded-3xl border border-slate-800 shadow-xl">

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">

                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">

                  <Sparkles className="w-4 h-4" />

                  Real-Time Clinical Extraction

                  {isExtracting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}

                </div>

              </div>

              {extractedEvidence ? (
                <div className="space-y-4 mt-4">

                  <div className="flex flex-wrap gap-2">

                    <span className="text-slate-400 font-semibold">
                      Target Teeth:
                    </span>

                    {extractedEvidence.teeth?.map(
                      tooth => (
                        <button
                          key={tooth}
                          onClick={() =>
                            setToothNumber(
                              tooth
                            )
                          }
                          className="font-mono font-bold px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-brand-300 border border-slate-700"
                        >
                          Tooth #{tooth}
                        </button>
                      )
                    )}

                  </div>

                  {extractedEvidence.suggested_codes?.length >
                    0 && (
                    <div>

                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Suggested CDT Codes
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                        {extractedEvidence.suggested_codes.map(
                          (code, index) => (
                            <div
                              key={
                                index
                              }
                              className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex justify-between"
                            >

                              <div>

                                <span className="font-mono font-bold text-teal-400">
                                  {
                                    code.code ||
                                    code.cdt_code
                                  }
                                </span>

                                <p className="text-[11px] text-slate-300 mt-1">
                                  {
                                    code.description ||
                                    code.procedure_name
                                  }
                                </p>

                              </div>

                              <button
                                onClick={() =>
                                  setCdtCode(
                                    code.code ||
                                      code.cdt_code
                                  )
                                }
                                className="text-[10px] font-bold bg-slate-700 text-white px-2 py-1 rounded-lg"
                              >
                                Use
                              </button>

                            </div>
                          )
                        )}

                      </div>

                    </div>
                  )}

                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Enter clinical notes or load a demo scenario.
                </div>
              )}

            </div>

          </div>
        )}


        {/* ====================================================
            STEP 4 - REQUIREMENT ANALYSIS
        ==================================================== */}

        {step === 4 && (
          <div className="space-y-6">

            <div className="border-b pb-4">

              <div className="flex items-center gap-3">

                <div className="p-3 rounded-2xl bg-brand-50 text-brand-600">
                  <ClipboardCheck className="w-5 h-5" />
                </div>

                <div>

                  <h3 className="text-base font-bold text-slate-900">
                    Requirement Analysis
                  </h3>

                  <p className="text-xs text-slate-500 mt-1">
                    Review the documents and supporting evidence needed for this claim.
                  </p>

                </div>

              </div>

            </div>


            {/* CLAIM CONTEXT */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">

                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Insurance
                </p>

                <p className="text-xs font-bold text-slate-900 mt-1">
                  {
                    payers.find(
                      p =>
                        p.id ===
                        selectedPayerId
                    )?.display_name ||
                    'Selected Payer'
                  }
                </p>

              </div>


              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">

                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Procedure
                </p>

                <p className="text-xs font-bold text-brand-600 font-mono mt-1">
                  {cdtCode}
                </p>

              </div>


              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">

                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Tooth
                </p>

                <p className="text-xs font-bold text-slate-900 mt-1">
                  Tooth #{toothNumber}
                </p>

              </div>

            </div>


            {/* REQUIREMENTS */}

            {isLoadingRequirements ? (

              <div className="py-12 text-center">

                <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600" />

                <p className="text-xs text-slate-500 mt-3">
                  Loading payer requirements...
                </p>

              </div>

            ) : (

              <div className="space-y-3">

                {getRequirements().map(
                  requirement => {

                    const attached =
                      isDocumentAttached(
                        requirement.documentType
                      );

                    return (
                      <div
                        key={
                          requirement.id
                        }
                        className={`
                          p-4 rounded-2xl
                          border
                          flex items-start
                          justify-between
                          gap-4

                          ${
                            attached
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-white border-slate-200'
                          }
                        `}
                      >

                        <div className="flex items-start gap-3">

                          <div
                            className={`
                              w-9 h-9 rounded-xl
                              flex items-center
                              justify-center

                              ${
                                attached
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }
                            `}
                          >
                            {attached ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>


                          <div>

                            <div className="flex items-center gap-2 flex-wrap">

                              <h4 className="text-xs font-bold text-slate-900">
                                {
                                  requirement.label
                                }
                              </h4>

                              <span
                                className={`
                                  text-[9px]
                                  font-bold
                                  px-2 py-0.5
                                  rounded-full

                                  ${
                                    requirement.required
                                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                      : 'bg-slate-100 text-slate-500'
                                  }
                                `}
                              >
                                {requirement.required
                                  ? 'REQUIRED'
                                  : 'RECOMMENDED'}
                              </span>

                            </div>

                            <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">
                              {
                                requirement.description
                              }
                            </p>

                          </div>

                        </div>


                        <div className="shrink-0">

                          {attached ? (

                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">

                              <Check className="w-3 h-3" />

                              Attached

                            </span>

                          ) : (

                            <span className="text-[10px] font-bold text-slate-400">
                              Pending
                            </span>

                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}


            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4">

              <div className="flex items-start gap-3">

                <Sparkles className="w-4 h-4 text-brand-600 mt-0.5" />

                <div>

                  <p className="text-xs font-bold text-brand-900">
                    Next step: attach your evidence
                  </p>

                  <p className="text-[11px] text-brand-700 mt-1">
                    The Documents page will track which supporting documents have been attached.
                  </p>

                </div>

              </div>

            </div>

          </div>
        )}


        {/* ====================================================
            STEP 5 - DOCUMENTS
        ==================================================== */}

        {step === 5 && (
          <div className="space-y-6">

            <div className="border-b pb-4">

              <h3 className="text-base font-bold text-slate-900">
                Evidence Documents
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Attach the supporting documents identified during requirement analysis.
              </p>

            </div>


            {/* ==================================================
                DOCUMENT CHECKLIST
            ================================================== */}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

              <div className="flex items-center justify-between mb-4">

                <div>

                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Document Checklist
                  </h4>

                  <p className="text-[10px] text-slate-500 mt-1">
                    The checklist updates automatically when a document is uploaded.
                  </p>

                </div>

                <div
                  className={`
                    text-[10px]
                    font-bold
                    px-3 py-1.5
                    rounded-full

                    ${
                      uploadedDocs.length > 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }
                  `}
                >
                  {uploadedDocs.length}
                  {' '}
                  attached
                </div>

              </div>


              <div className="space-y-2">

                {getChecklistDocuments().map(
                  item => {

                    const attached =
                      isDocumentAttached(
                        item.type
                      );

                    return (
                      <div
                        key={
                          item.type
                        }
                        className={`
                          flex items-center
                          gap-3
                          p-3
                          rounded-xl
                          border
                          transition-all

                          ${
                            attached
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-white border-slate-200'
                          }
                        `}
                      >

                        {/* CHECKBOX */}

                        <div
                          className={`
                            w-6 h-6
                            rounded-lg
                            flex items-center
                            justify-center
                            border
                            shrink-0

                            ${
                              attached
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-300'
                            }
                          `}
                        >
                          {attached && (
                            <Check className="w-4 h-4" />
                          )}
                        </div>


                        <div className="min-w-0">

                          <p
                            className={`
                              text-xs font-semibold

                              ${
                                attached
                                  ? 'text-emerald-800'
                                  : 'text-slate-700'
                              }
                            `}
                          >
                            {item.label}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {item.type}
                          </p>

                        </div>


                        <div className="ml-auto shrink-0">

                          {attached ? (

                            <span className="text-[10px] font-bold text-emerald-700">
                              Attached
                            </span>

                          ) : (

                            <span className="text-[10px] font-medium text-slate-400">
                              Not attached
                            </span>

                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </div>


            {/* ==================================================
                UPLOADER
            ================================================== */}

            <DocumentUploader
              documents={
                uploadedDocs
              }

              onUploadFile={
                handleDocumentUpload
              }

              onRemoveDoc={
                id =>
                  setUploadedDocs(
                    prev =>
                      prev.filter(
                        d =>
                          d.id !==
                          id
                      )
                  )
              }

              isUploading={
                isUploading
              }
            />


            {/* REQUIRED WARNING */}

            {uploadedDocs.length === 0 && (

              <div className="flex items-center gap-3 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">

                <AlertCircle className="w-4 h-4 shrink-0" />

                <span>
                  At least one document is required before you can continue.
                </span>

              </div>

            )}


            {/* SUCCESS MESSAGE */}

            {uploadedDocs.length > 0 && (

              <div className="flex items-center gap-3 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">

                <CheckCircle className="w-4 h-4 shrink-0" />

                <span>
                  {uploadedDocs.length}
                  {' '}
                  document
                  {uploadedDocs.length !== 1
                    ? 's'
                    : ''}
                  {' '}
                  attached. You can continue to review.
                </span>

              </div>

            )}

          </div>
        )}


        {/* ====================================================
            STEP 6 - REVIEW
        ==================================================== */}

        {step === 6 && (
          <div className="space-y-6">

            <h3 className="text-base font-bold text-slate-900 border-b pb-3">
              Pre-Submission Audit Summary
            </h3>


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">

                <span className="text-[10px] uppercase font-bold text-slate-400">
                  PATIENT
                </span>

                <p className="text-sm font-bold text-slate-900">
                  {patientName}
                </p>

                <p className="font-mono text-slate-500 text-xs">
                  {patientId}
                  {' • '}
                  DOB {dob}
                </p>

              </div>


              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">

                <span className="text-[10px] uppercase font-bold text-slate-400">
                  PROCEDURE
                </span>

                <p className="text-sm font-bold text-slate-900">
                  {cdtCode}
                  {' — '}
                  Tooth #{toothNumber}
                </p>

                <p className="font-mono text-slate-500 text-xs">
                  DOS: {dos}
                  {' • '}
                  Amount: ${claimAmount}
                </p>

              </div>

            </div>


            {/* PAYER */}

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">

              <span className="text-[10px] uppercase font-bold text-slate-400">
                INSURANCE PAYER
              </span>

              <p className="text-sm font-bold text-slate-900 mt-1">
                {
                  payers.find(
                    p =>
                      p.id ===
                      selectedPayerId
                  )?.display_name ||
                  'Selected Payer'
                }
              </p>

            </div>


            {/* NARRATIVE */}

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">

              <span className="text-[10px] uppercase font-bold text-slate-400">
                CLINICAL NARRATIVE
              </span>

              <p className="text-slate-700 italic text-xs mt-2">
                "{narrative}"
              </p>

            </div>


            {/* DOCUMENT SUMMARY */}

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">

              <div className="flex justify-between items-center mb-4">

                <span className="text-xs font-bold text-slate-700">
                  Uploaded Evidence Documents
                </span>

                <span className="font-mono font-bold text-brand-600 text-xs">
                  {uploadedDocs.length}
                  {' '}
                  files attached
                </span>

              </div>


              <div className="space-y-2">

                {uploadedDocs.map(
                  doc => (
                    <div
                      key={
                        doc.id
                      }
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200"
                    >

                      <CheckCircle className="w-4 h-4 text-emerald-600" />

                      <div>

                        <p className="text-xs font-semibold text-slate-800">
                          {
                            doc.file_name
                          }
                        </p>

                        <p className="text-[10px] text-slate-400">
                          {
                            doc.document_type
                          }
                        </p>

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>


            {/* RUN AUDIT */}

            <div className="pt-4 border-t border-slate-100 flex flex-col items-center justify-center space-y-3">

              <p className="text-xs font-semibold text-slate-600">
                Ready to run your pre-submission audit?
              </p>

              <button
                onClick={
                  handleRunAudit
                }
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2 transition-all"
              >

                <Play className="w-5 h-5 fill-white" />

                RUN PRE-SUBMISSION AUDIT

              </button>

            </div>

          </div>
        )}


        {/* ====================================================
            STEP 7 - AUDIT ANALYSIS
        ==================================================== */}

        {step === 7 && (
          <div className="py-16 text-center space-y-6">

            <div className="w-16 h-16 rounded-3xl bg-brand-100 text-brand-600 mx-auto flex items-center justify-center">

              <Loader2 className="w-8 h-8 animate-spin" />

            </div>

            <div>

              <h3 className="text-xl font-extrabold text-slate-900 tracking-wider font-mono">
                CLAIM-SHIELD
              </h3>

              <p className="text-xs text-slate-500 font-semibold mt-2">
                Analyzing dental claim documentation...
              </p>

            </div>


            <div className="max-w-md mx-auto bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 text-xs space-y-2 text-left shadow-xl">

              {[
                'Loading payer rules',
                'Validating procedure',
                'Checking tooth/location',
                'Checking required documents',
                'Inspecting clinical narrative',
                'Extracting clinical evidence',
                'Comparing claim and documentation',
                'Checking evidence consistency',
                'Calculating documentation readiness'
              ].map(
                (text, index) => (

                  <div
                    key={
                      index
                    }
                    className={`
                      flex items-center
                      gap-2
                      font-mono

                      ${
                        index <=
                        analysisStep
                          ? 'text-emerald-400 opacity-100 font-semibold'
                          : 'text-slate-600 opacity-40'
                      }
                    `}
                  >

                    {index <=
                    analysisStep ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-3.5" />
                    )}

                    <span>
                      {text}
                    </span>

                  </div>

                )
              )}

            </div>

          </div>
        )}


        {/* ====================================================
            FOOTER NAVIGATION
        ==================================================== */}

        {step < 6 && (

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">

            {/* PREVIOUS */}

            <button
              type="button"
              onClick={() =>
                setStep(
                  prev =>
                    Math.max(
                      1,
                      prev - 1
                    )
                )
              }
              disabled={
                step === 1
              }
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-30 flex items-center gap-1"
            >

              <ArrowLeft className="w-4 h-4" />

              Previous

            </button>


            {/* NEXT */}

            <button
              type="button"
              onClick={
                handleNext
              }
              className={`
                px-6 py-2.5
                text-white
                text-xs font-bold
                rounded-xl
                shadow-md
                flex items-center
                gap-1.5
                transition-all

                ${
                  step === 5 &&
                  uploadedDocs.length === 0
                    ? 'bg-slate-400 hover:bg-slate-500'
                    : 'bg-brand-600 hover:bg-brand-700'
                }
              `}
            >

              {step === 5 &&
              uploadedDocs.length === 0
                ? 'Attach Document to Continue'
                : 'Next Step'}

              <ArrowRight className="w-4 h-4" />

            </button>

          </div>

        )}

      </div>

    </div>
  );
};

export default NewAudit;