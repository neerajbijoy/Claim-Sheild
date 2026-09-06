const db = require('../config/supabase');

const {
  getPayerRulesForProcedure,
} = require('./ruleEngine');

const {
  extractClinicalEvidence,
  analyzeInsuranceRequirements,
  compareInsuranceRequirements,
  suggestDocumentationImprovements,
} = require('./aiService');

const {
  verifyRequiredDocuments,
} = require('./fileVerifier');

const {
  inspectClinicalText,
} = require('./textInspector');

const {
  checkEvidenceConsistency,
} = require('./consistencyChecker');

const {
  calculateReadinessScore,
} = require('./scoreCalculator');

const {
  calculateProcedureRiskPriority,
  sortProceduresByRisk,
} = require('./riskPrioritizer');

const {
  getHistoricalClaimSignal,
} = require('./historicalSignal');


/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Safely find the insurance-company URL from the claim/payer.
 *
 * We support multiple possible field names so the audit engine
 * does not break if your database/API uses a slightly different
 * naming convention.
 */
function getInsuranceUrl(claim) {
  return (
    claim.insurance_url ||
    claim.insuranceUrl ||
    claim.payer?.insurance_url ||
    claim.payer?.insuranceUrl ||
    claim.payer?.website ||
    claim.payer?.website_url ||
    claim.payer?.url ||
    ''
  ).trim();
}


/**
 * Safely obtain a readable payer name.
 */
function getPayerName(claim) {
  return (
    claim.payer?.display_name ||
    claim.payer?.name ||
    claim.payer_name ||
    'Selected Payer'
  );
}


/**
 * Convert Gemini requirement comparison results into normal
 * audit findings that your existing score/risk system can use.
 */
function convertGeminiComparisonToFindings(
  comparison,
  procedure
) {
  const findings = [];

  if (!comparison) {
    return findings;
  }

  const requirements =
    Array.isArray(comparison.requirements)
      ? comparison.requirements
      : [];

  for (const requirement of requirements) {
    const status = String(
      requirement.status || ''
    ).toUpperCase();

    if (
      status !== 'MISSING' &&
      status !== 'PARTIAL' &&
      status !== 'UNCLEAR'
    ) {
      continue;
    }

    let severity = 'MEDIUM';

    if (status === 'MISSING') {
      severity = 'HIGH';
    }

    if (status === 'UNCLEAR') {
      severity = 'MEDIUM';
    }

    findings.push({
      severity,

      finding_type:
        status === 'MISSING'
          ? 'INSURANCE_REQUIREMENT_MISSING'
          : status === 'PARTIAL'
            ? 'INSURANCE_REQUIREMENT_PARTIAL'
            : 'INSURANCE_REQUIREMENT_UNCLEAR',

      title:
        status === 'MISSING'
          ? `Missing Insurance Requirement: ${requirement.requirement ||
          'Required documentation'
          }`
          : status === 'PARTIAL'
            ? `Incomplete Insurance Requirement: ${requirement.requirement ||
            'Documentation'
            }`
            : `Insurance Requirement Requires Review: ${requirement.requirement ||
            'Documentation'
            }`,

      explanation:
        requirement.reason ||
        `The insurance requirement "${requirement.requirement ||
        'Required documentation'
        }" could not be fully verified from the submitted evidence.`,

      evidence:
        requirement.evidence ||
        'No sufficient supporting evidence identified.',

      confidence:
        Number(
          requirement.confidence || 0.75
        ),

      recommended_action:
        requirement.recommended_action ||
        'Review the insurance requirement and add the missing supporting documentation if clinically applicable.',

      procedure_id:
        procedure.id,

      cdt_code:
        procedure.cdt_code || '',

      tooth_number:
        procedure.tooth_number || '',
    });
  }


  /*
   * Gemini may identify contradictions that are not caught by
   * the existing deterministic consistency checker.
   */
  const contradictions =
    Array.isArray(comparison.contradictions)
      ? comparison.contradictions
      : [];

  for (const contradiction of contradictions) {
    const description =
      typeof contradiction === 'string'
        ? contradiction
        : contradiction.description ||
        contradiction.reason ||
        contradiction.explanation ||
        'Conflicting information was detected across the submitted evidence.';

    findings.push({
      severity: 'HIGH',

      finding_type:
        'AI_EVIDENCE_CONTRADICTION',

      title:
        'Clinical Evidence Contradiction',

      explanation:
        description,

      evidence:
        typeof contradiction === 'string'
          ? contradiction
          : contradiction.evidence ||
          description,

      confidence:
        typeof contradiction === 'object'
          ? Number(
            contradiction.confidence || 0.85
          )
          : 0.85,

      recommended_action:
        typeof contradiction === 'object'
          ? contradiction.recommended_action ||
          'Review the conflicting documents and correct the documentation before submission.'
          : 'Review the conflicting documents and correct the documentation before submission.',

      procedure_id:
        procedure.id,

      cdt_code:
        procedure.cdt_code || '',

      tooth_number:
        procedure.tooth_number || '',
    });
  }

  return findings;
}


/**
 * Convert Gemini requirement comparison results into checks.
 */
function convertGeminiComparisonToChecks(
  comparison
) {
  const checks = [];

  if (!comparison) {
    return checks;
  }

  const requirements =
    Array.isArray(comparison.requirements)
      ? comparison.requirements
      : [];

  for (const requirement of requirements) {
    const status =
      String(
        requirement.status || ''
      ).toUpperCase();

    let checkStatus = 'WARNING';

    if (status === 'PRESENT') {
      checkStatus = 'PASSED';
    }

    if (status === 'MISSING') {
      checkStatus = 'FAILED';
    }

    if (
      status === 'PARTIAL' ||
      status === 'UNCLEAR'
    ) {
      checkStatus = 'WARNING';
    }

    checks.push({
      type:
        'INSURANCE_REQUIREMENT',

      status:
        checkStatus,

      title:
        `${requirement.requirement || 'Insurance Requirement'}: ${status || 'UNCLEAR'}`,

      message:
        requirement.reason ||
        requirement.evidence ||
        `Insurance requirement evaluated as ${status || 'UNCLEAR'}.`,
    });
  }

  return checks;
}


/* ============================================================
   MAIN AUDIT FUNCTION
   ============================================================ */

async function runClaimAudit(claimId) {
  /* ----------------------------------------------------------
     1. Load claim
     ---------------------------------------------------------- */

  const claim =
    await db.getClaimById(claimId);

  if (!claim) {
    throw new Error(
      `Claim not found: ${claimId}`
    );
  }


  /* ----------------------------------------------------------
     2. Resolve procedures
     ---------------------------------------------------------- */

  const procedures =
    claim.procedures &&
      claim.procedures.length > 0
      ? claim.procedures
      : [
        {
          id: 'default-proc-1',
          cdt_code: 'D2740',
          tooth_number: '14',
          description:
            'Crown - Porcelain/Ceramic Substrate',
        },
      ];


  /* ----------------------------------------------------------
     3. Extract clinical evidence
     ---------------------------------------------------------- */

  const extractedEvidence =
    await extractClinicalEvidence(
      claim.clinical_narrative || '',
      claim.documents || []
    );


  /* ----------------------------------------------------------
     4. Get insurance URL
     ---------------------------------------------------------- */

  const insuranceUrl =
    getInsuranceUrl(claim);

  const payerName =
    getPayerName(claim);


  /*
   * Insurance requirement analysis is done once per claim,
   * rather than once per procedure, whenever possible.
   */
  let insuranceAnalysis = null;


  /* ----------------------------------------------------------
     5. Containers for final audit
     ---------------------------------------------------------- */

  const procedureAudits = [];

  const aggregatedChecks = [];

  const aggregatedFindings = [];


  /* ==========================================================
     6. AUDIT EVERY PROCEDURE
     ========================================================== */

  for (const proc of procedures) {
    const cdtCode =
      (
        proc.cdt_code ||
        'D2740'
      ).toUpperCase();

    const toothNum =
      proc.tooth_number
        ? proc.tooth_number.toString()
        : '';


    /* --------------------------------------------------------
       A. Get payer rules
       -------------------------------------------------------- */

    const payerRules =
      await getPayerRulesForProcedure(
        claim.payer_id,
        cdtCode
      );


    /* --------------------------------------------------------
       B. Base procedure + tooth checks
       -------------------------------------------------------- */

    const procBaseChecks = [
      {
        type: 'PROCEDURE',

        status: 'PASSED',

        title:
          `CDT ${cdtCode} Identified`,

        message:
          `Verified procedure ${cdtCode} (${proc.description || 'Dental Procedure'}).`,
      },

      {
        type: 'TOOTH',

        status:
          toothNum
            ? 'PASSED'
            : (
              cdtCode === 'D4341' ||
              cdtCode === 'D1110'
            )
              ? 'PASSED'
              : 'FAILED',

        title:
          toothNum
            ? `Tooth #${toothNum} Specified`
            : (
              cdtCode === 'D4341'
                ? 'Quadrant Procedure'
                : 'Tooth Location Missing'
            ),

        message:
          toothNum
            ? `Tooth location assigned to Tooth #${toothNum}.`
            : (
              cdtCode === 'D4341'
                ? 'Quadrant procedure location.'
                : `Procedure ${cdtCode} requires target tooth location.`
            ),
      },
    ];


    /* --------------------------------------------------------
       C. Required document verification
       -------------------------------------------------------- */

    const fileResult =
      verifyRequiredDocuments(
        payerRules,
        claim.documents || [],
        claim.clinical_narrative,
        cdtCode
      );


    /* --------------------------------------------------------
       D. Clinical narrative inspection
       -------------------------------------------------------- */

    const textResult =
      inspectClinicalText(
        payerRules,
        claim.clinical_narrative,
        extractedEvidence
      );


    /* --------------------------------------------------------
       E. Deterministic consistency checking
       -------------------------------------------------------- */

    const consistencyResult =
      checkEvidenceConsistency(
        toothNum,
        extractedEvidence.teeth,
        claim.documents || []
      );


    /* ========================================================
       F. GEMINI INSURANCE ANALYSIS
       ======================================================== */

    let geminiComparison = null;

    let geminiChecks = [];

    let geminiFindings = [];

    let documentationSuggestions = null;


    /*
     * Only use Gemini insurance comparison if an insurance URL
     * has actually been supplied.
     *
     * This prevents the system from pretending it has read an
     * insurance policy when no source URL exists.
     */
    if (insuranceUrl) {
      try {

        /*
         * Analyze the insurance requirements.
         *
         * We only need to do this once for the claim/procedure
         * combination. For multiple procedures, the first
         * procedure's requirements are used initially.
         *
         * If you later have different insurance pages per CDT
         * code, this can be expanded to cache by CDT code.
         */
        if (!insuranceAnalysis) {
          insuranceAnalysis =
            await analyzeInsuranceRequirements(
              insuranceUrl,
              cdtCode,
              proc.description || ''
            );
        }


        /*
         * Compare requirements against the actual uploaded
         * documents and extracted clinical evidence.
         */
        geminiComparison =
          await compareInsuranceRequirements(
            insuranceAnalysis.requirements || [],
            extractedEvidence,
            claim.documents || [],
            {
              patient_name:
                claim.patient_name || '',

              cdt_code:
                cdtCode,

              tooth_number:
                toothNum,

              clinical_narrative:
                claim.clinical_narrative || '',
            }
          );


        /*
         * Convert Gemini results into the same structure used
         * by your existing audit engine.
         */
        geminiChecks =
          convertGeminiComparisonToChecks(
            geminiComparison
          );

        geminiFindings =
          convertGeminiComparisonToFindings(
            geminiComparison,
            {
              ...proc,
              cdt_code: cdtCode,
              tooth_number: toothNum,
            }
          );


        /*
         * Generate documentation suggestions only when there
         * are missing/partial requirements.
         */
        const missingOrPartial = [
          ...(geminiComparison.missing_requirements || []),
          ...(geminiComparison.partial_requirements || []),
        ];

        if (
          missingOrPartial.length > 0
        ) {
          try {
            documentationSuggestions =
              await suggestDocumentationImprovements(
                claim.clinical_narrative || '',
                missingOrPartial,
                extractedEvidence
              );
          } catch (suggestionError) {
            console.warn(
              `[Audit Engine] Documentation suggestion failed: ${suggestionError.message}`
            );

            documentationSuggestions =
              null;
          }
        }

      } catch (geminiError) {

        /*
         * IMPORTANT:
         *
         * A Gemini failure must NOT cause the entire claim audit
         * to fail.
         *
         * The existing deterministic audit system continues.
         */
        console.warn(
          `[Audit Engine] Gemini insurance analysis failed: ${geminiError.message}`
        );

        insuranceAnalysis = {
          success: false,

          source_url:
            insuranceUrl,

          error:
            geminiError.message,

          requirements: [],
        };

        geminiComparison = null;

        geminiChecks = [];

        geminiFindings = [];
      }
    }


    /* --------------------------------------------------------
       G. Combine checks
       -------------------------------------------------------- */

    const procChecks = [
      ...procBaseChecks,

      ...fileResult.checks,

      ...textResult.checks,

      ...consistencyResult.checks,

      ...geminiChecks,
    ];


    /* --------------------------------------------------------
       H. Combine findings
       -------------------------------------------------------- */

    const procFindings = [
      ...fileResult.findings,

      ...textResult.findings,

      ...consistencyResult.findings,

      ...geminiFindings,
    ].map((f) => ({
      ...f,

      procedure_id:
        f.procedure_id ||
        proc.id,

      cdt_code:
        f.cdt_code ||
        cdtCode,

      tooth_number:
        f.tooth_number ||
        toothNum,
    }));


    /* --------------------------------------------------------
       I. Historical signal
       -------------------------------------------------------- */

    const historicalSignal =
      await getHistoricalClaimSignal(
        claim.payer_id,
        cdtCode,
        procFindings.map(
          (f) => f.finding_type
        )
      );


    /* --------------------------------------------------------
       J. Risk prioritization
       -------------------------------------------------------- */

    const riskAssessment =
      calculateProcedureRiskPriority(
        proc,
        procChecks,
        procFindings,
        historicalSignal,
        payerName
      );


    /* --------------------------------------------------------
       K. Store procedure audit
       -------------------------------------------------------- */

    procedureAudits.push({
      procedure_id:
        proc.id,

      cdt_code:
        cdtCode,

      tooth_number:
        toothNum,

      description:
        proc.description || '',

      amount:
        proc.amount || 0,

      priority:
        riskAssessment.priority,

      risk_score:
        riskAssessment.risk_score,

      explanation:
        riskAssessment.explanation,

      risk_factors:
        riskAssessment.risk_factors,

      historical_signal:
        historicalSignal,

      checks:
        procChecks,

      findings:
        procFindings,

      evidence_map:
        consistencyResult.evidenceMap,

      /*
       * New Gemini information.
       */
      insurance_analysis:
        insuranceAnalysis,

      insurance_comparison:
        geminiComparison,

      documentation_suggestions:
        documentationSuggestions,
    });


    /* --------------------------------------------------------
       L. Aggregate
       -------------------------------------------------------- */

    procChecks.forEach(
      (check) =>
        aggregatedChecks.push(check)
    );

    procFindings.forEach(
      (finding) =>
        aggregatedFindings.push(finding)
    );
  }


  /* ==========================================================
     7. SORT PROCEDURES
     ========================================================== */

  const sortedProcedureAudits =
    sortProceduresByRisk(
      procedureAudits
    );


  /* ==========================================================
     8. CALCULATE FINAL SCORE
     ========================================================== */

  /*
   * IMPORTANT:
   *
   * Gemini does NOT calculate this score.
   *
   * Your existing scoreCalculator.js remains responsible.
   */
  const scoreResult =
    calculateReadinessScore(
      aggregatedChecks,
      aggregatedFindings
    );


  /* ==========================================================
     9. DETERMINE STATUS
     ========================================================== */

  const highestPriority =
    sortedProcedureAudits[0]?.priority ||
    'LOW';

  let overallStatus =
    scoreResult.status;


  if (
    highestPriority === 'HIGH'
  ) {
    overallStatus =
      'BLOCKED';
  } else if (
    highestPriority === 'MEDIUM' &&
    overallStatus === 'READY'
  ) {
    overallStatus =
      'REVIEW';
  }


  /* ==========================================================
     10. CHECK COUNTS
     ========================================================== */

  const passedCount =
    aggregatedChecks.filter(
      (c) => c.status === 'PASSED'
    ).length;

  const warningCount =
    aggregatedChecks.filter(
      (c) => c.status === 'WARNING'
    ).length;

  const failedCount =
    aggregatedChecks.filter(
      (c) => c.status === 'FAILED'
    ).length;


  /* ==========================================================
     11. BUILD AUDIT PAYLOAD
     ========================================================== */

  const auditPayload = {
    claim_id:
      claim.id,

    readiness_score:
      scoreResult.readiness_score,

    status:
      overallStatus,

    risk_priority:
      highestPriority,

    risk_breakdown:
      scoreResult.riskBreakdown,

    summary: {
      total_procedures:
        procedureAudits.length,

      high_risk_procedures:
        procedureAudits.filter(
          (p) => p.priority === 'HIGH'
        ).length,

      medium_risk_procedures:
        procedureAudits.filter(
          (p) => p.priority === 'MEDIUM'
        ).length,

      low_risk_procedures:
        procedureAudits.filter(
          (p) => p.priority === 'LOW'
        ).length,

      total_checks:
        aggregatedChecks.length,

      passed:
        passedCount,

      warnings:
        warningCount,

      failed:
        failedCount,
    },

    procedure_audits:
      sortedProcedureAudits,

    candidate_cdt_suggestions:
      extractedEvidence.suggested_codes || [],

    checks:
      aggregatedChecks,

    findings:
      aggregatedFindings,

    evidence_map:
      sortedProcedureAudits[0]
        ?.evidence_map || [],

    extracted_evidence:
      extractedEvidence,


    /* ========================================================
       NEW GEMINI SECTION
       ======================================================== */

    insurance_analysis: insuranceAnalysis,

    insurance_source_url:
      insuranceUrl || null,

    insurance_company:
      payerName,

    ai_summary: insuranceAnalysis
      ? {
        requirements_found:
          insuranceAnalysis.requirements
            ?.length || 0,

        source_url:
          insuranceAnalysis.source_url ||
          insuranceUrl,

        warnings:
          insuranceAnalysis.warnings ||
          [],
      }
      : null,
  };


  /* ==========================================================
     12. SAVE TO SUPABASE
     ========================================================== */

  const saved =
    await db.saveAuditResult(
      auditPayload,
      aggregatedFindings
    );


  /* ==========================================================
     13. RETURN FINAL RESULT
     ========================================================== */

  return {
    ...auditPayload,

    audit_id:
      saved.auditRecord.id,

    created_at:
      saved.auditRecord.created_at,
  };
}


/* ============================================================
   EXPORT
   ============================================================ */

module.exports = {
  runClaimAudit,
};