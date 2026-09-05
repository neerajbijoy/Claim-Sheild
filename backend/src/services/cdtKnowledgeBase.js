/**
 * Structured CDT Knowledge Base & Candidate Matching Service
 * Maintains procedure definitions, clinical concept rules, required evidence,
 * and identifies candidate CDT codes from extracted clinical documentation.
 */

const CDT_KNOWLEDGE_BASE = [
  {
    cdt_code: 'D2740',
    procedure_name: 'Crown - Porcelain/Ceramic Substrate',
    category: 'RESTORATIVE',
    risk_level: 'HIGH',
    typical_fee_range: '$1,100 - $1,600',
    description: 'Full coverage indirect restoration over severely compromised, decayed, or fractured tooth.',
    clinical_concepts: [
      'recurrent caries',
      'caries into dentin',
      'compromised coronal structure',
      'cusp fracture',
      'insufficient tooth structure',
      'cracked tooth',
      'failing restoration with secondary decay'
    ],
    synonyms: [
      'full coverage crown',
      'porcelain crown',
      'ceramic crown',
      'cap',
      'coronal coverage',
      'indirect full crown'
    ],
    required_evidence: [
      {
        type: 'XRAY',
        description: 'Diagnostic pre-operative periapical or bitewing radiograph demonstrating decay depth into dentin or structural breakdown',
        mandatory: true
      },
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'Narrative detailing diagnosis, tooth prognosis, and reason direct restoration is contraindicated',
        mandatory: true
      },
      {
        type: 'CLINICAL_JUSTIFICATION',
        description: 'Evidence of extensive structural loss (50%+ coronal loss), cusp fracture, or decay extending into dentin',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Pre-op periapical or bitewing radiograph',
      'Clinical chart narrative with remaining tooth structure percentage',
      'Intraoral photo of fractured cusp (recommended by MetLife & Cigna)'
    ],
    payer_specific_requirements: {
      'p-demo-delta': {
        requires_preop_xray: true,
        requires_narrative: true,
        requires_structural_evidence: true,
        min_decay_depth: 'into dentin',
        notes: 'Delta requires pre-op bitewing or PA showing decay into dentin or cusp fracture.'
      },
      'p-demo-cigna': {
        requires_preop_xray: true,
        requires_narrative: true,
        allows_intraoral_photo_alternative: true,
        notes: 'Intraoral photo accepted if fracture line is undetectable on 2D radiograph.'
      },
      'p-demo-metlife': {
        requires_preop_xray: true,
        requires_narrative: true,
        requires_treatment_plan: true,
        notes: 'Requires documented prognosis for entire dentition when multiple units billed.'
      }
    },
    risk_factors: [
      'Missing pre-operative periapical radiograph',
      'Absence of narrative indicating why direct restoration is contraindicated',
      'Inadequate decay depth documented (enamel only)',
      'Tooth has unrestored asymptomatic craze lines rather than true structural failure'
    ],
    audit_tips: [
      'Document the exact tooth surfaces missing or undermined.',
      'State explicitly: "Tooth has >50% coronal structure missing, direct restoration contraindicated."',
      'Ensure pre-op radiograph clearly displays margins and apex.'
    ]
  },
  {
    cdt_code: 'D2750',
    procedure_name: 'Crown - Porcelain Fused to High Noble Metal',
    category: 'RESTORATIVE',
    risk_level: 'HIGH',
    typical_fee_range: '$1,150 - $1,750',
    description: 'Full coverage indirect crown restoration fabricated with porcelain fused to a high noble alloy coping.',
    clinical_concepts: [
      'severely broken down',
      'heavy occlusal force',
      'bruxism with coronal loss',
      'recurrent decay under existing PFM',
      'endodontically treated molar'
    ],
    synonyms: [
      'pfm crown',
      'porcelain fused to metal',
      'pfm',
      'high noble crown'
    ],
    required_evidence: [
      {
        type: 'XRAY',
        description: 'Diagnostic pre-op radiograph demonstrating extensive coronal loss or root canal completion',
        mandatory: true
      },
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'Explanation for choice of high noble substrate (e.g. heavy occlusion, bruxism, high stress site)',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Pre-op periapical radiograph',
      'Lab slip confirming high noble metal alloy composition'
    ],
    payer_specific_requirements: {
      'p-demo-delta': {
        requires_metal_alloy_documentation: true,
        notes: 'Delta may downgrade to D2790 or D2751 if alloy content is unspecified.'
      }
    },
    risk_factors: [
      'Payer downgrade to noble or base metal if lab invoice omitted',
      'Missing radiographic proof of decay depth'
    ],
    audit_tips: [
      'Attach ADA lab certificate verifying noble metal classification.',
      'Document heavy bruxism or clearance limitations necessitating metal support.'
    ]
  },
  {
    cdt_code: 'D2950',
    procedure_name: 'Core Buildup, Including Any Pins',
    category: 'RESTORATIVE',
    risk_level: 'HIGH',
    typical_fee_range: '$260 - $420',
    description: 'Building up of anatomical crown when restorative crown preparation requires foundation retention.',
    clinical_concepts: [
      'core buildup',
      'missing axial walls',
      'foundational retention',
      'insufficient crown retention',
      'loss of 3 or more walls',
      'post and core foundation'
    ],
    synonyms: [
      'buildup',
      'composite core',
      'foundation restoration',
      'core retention'
    ],
    required_evidence: [
      {
        type: 'XRAY',
        description: 'Pre-operative radiograph indicating extensive coronal destruction or post-endodontic tooth',
        mandatory: true
      },
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'Narrative documenting necessity of buildup to retain indirect restoration and number of missing walls',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Pre-op bitewing or periapical radiograph',
      'Clinical notation of missing tooth walls (e.g. missing 3+ walls)'
    ],
    payer_specific_requirements: {
      'p-demo-delta': {
        requires_missing_wall_count: true,
        notes: 'Delta denies D2950 if tooth has sufficient natural walls to retain crown prep.'
      }
    },
    risk_factors: [
      'Billed with crown without documentation of missing coronal walls',
      'Payer bundling D2950 into crown preparation fee as standard filler'
    ],
    audit_tips: [
      'Never call it a "filler" or "base"; payers bundle bases into crown prep.',
      'Specify: "Buildup required due to loss of 3 axial walls to provide retentive form."'
    ]
  },
  {
    cdt_code: 'D2391',
    procedure_name: 'Resin-Based Composite - One Surface, Posterior',
    category: 'RESTORATIVE',
    risk_level: 'LOW',
    typical_fee_range: '$170 - $280',
    description: 'Direct conservative composite resin filling placed on one posterior tooth surface.',
    clinical_concepts: [
      'occlusal caries',
      'incipient decay',
      'localized cavity',
      'conservative restoration',
      'dentin decay'
    ],
    synonyms: [
      'composite filling',
      'resin filling',
      'white filling',
      '1 surface composite'
    ],
    required_evidence: [
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'Tooth surface designation with decay diagnosis',
        mandatory: false
      }
    ],
    commonly_associated_documentation: ['Bitewing radiograph'],
    payer_specific_requirements: {},
    risk_factors: [
      'Billed on same surface within 24-month frequency limitation window',
      'Amalgam downgrade clause applied by certain standard plans'
    ],
    audit_tips: [
      'Check patient plan for posterior composite downgrade to amalgam fee.',
      'Verify 24-month history on the identical surface.'
    ]
  },
  {
    cdt_code: 'D2330',
    procedure_name: 'Resin-Based Composite - One Surface, Anterior',
    category: 'RESTORATIVE',
    risk_level: 'LOW',
    typical_fee_range: '$160 - $260',
    description: 'Direct tooth-colored resin restoration placed on one anterior tooth surface (Mesial, Distal, Facial, Lingual, Incisal).',
    clinical_concepts: [
      'anterior interproximal decay',
      'incisal chip',
      'facial caries',
      'cervical abfraction'
    ],
    synonyms: [
      'anterior composite',
      'front tooth filling',
      'anterior resin'
    ],
    required_evidence: [
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'Tooth number and specific surface treated',
        mandatory: false
      }
    ],
    commonly_associated_documentation: ['Pre-op periapical radiograph'],
    payer_specific_requirements: {},
    risk_factors: [
      'Frequency limitation violations (same tooth/surface within 12-24 months)'
    ],
    audit_tips: [
      'Always verify exact surface code (M, D, F, L, I).'
    ]
  },
  {
    cdt_code: 'D4341',
    procedure_name: 'Periodontal Scaling and Root Planing - Four or More Teeth per Quadrant',
    category: 'PERIODONTICS',
    risk_level: 'HIGH',
    typical_fee_range: '$260 - $380 per quad',
    description: 'Therapeutic instrumentation of crown and root surfaces to remove plaque and calculus in diseased sites with bone loss.',
    clinical_concepts: [
      'periodontitis',
      'pocket depth >= 4mm',
      'pocket depth >= 5mm',
      'subgingival calculus',
      'radiographic bone loss',
      'bleeding on probing',
      'attachment loss'
    ],
    synonyms: [
      'srp',
      'deep cleaning',
      'scaling and root planing',
      'quadrant scaling',
      'periodontal scaling'
    ],
    required_evidence: [
      {
        type: 'PERIODONTAL_CHART',
        description: 'Full-mouth 6-point periodontal charting dated within past 12 months with probe depths >= 4mm',
        mandatory: true
      },
      {
        type: 'XRAY',
        description: 'Full mouth series (FMX) or diagnostic vertical/horizontal bitewings showing bone loss and calculus',
        mandatory: true
      },
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'Description of quadrant treated, severity of periodontitis, and presence of tenacious subgingival calculus',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Periodontal probing depth chart (6 points per tooth)',
      'Bitewing radiographs showing horizontal/vertical bone level',
      'Calculus detection documentation'
    ],
    payer_specific_requirements: {
      'p-demo-delta': {
        min_affected_teeth_per_quadrant: 4,
        min_pocket_depth_mm: 4,
        requires_fmx_or_bitewings: true,
        notes: 'Must show 4+ qualifying teeth with 4mm+ pockets and radiographic bone loss in quadrant.'
      },
      'p-demo-cigna': {
        min_affected_teeth_per_quadrant: 4,
        min_pocket_depth_mm: 4,
        requires_periodontal_chart: true,
        notes: 'Perio chart must be dated within 12 months of service date.'
      },
      'p-demo-metlife': {
        min_affected_teeth_per_quadrant: 4,
        min_pocket_depth_mm: 4,
        max_quads_per_visit: 2,
        notes: 'Limits to maximum 2 quadrants on the same date of service unless narrative explains sedation/special circumstance.'
      }
    },
    risk_factors: [
      'Missing 6-point periodontal probing chart',
      'Probing depths under 4mm without documented radiographic bone loss',
      'Fewer than 4 qualifying diseased teeth in quadrant (must code D4342 instead)',
      'Billing all 4 quadrants on the same day without medical necessity narrative'
    ],
    audit_tips: [
      'Verify count of teeth in quadrant with 4mm+ depths. If only 1-3 teeth qualify, downcode to D4342.',
      'Ensure bitewing radiographs clearly display crestal bone levels.',
      'Bill no more than 2 quads per visit unless conscious sedation was administered.'
    ]
  },
  {
    cdt_code: 'D4342',
    procedure_name: 'Periodontal Scaling and Root Planing - One to Three Teeth per Quadrant',
    category: 'PERIODONTICS',
    risk_level: 'MEDIUM',
    typical_fee_range: '$150 - $220 per quad',
    description: 'Therapeutic instrumentation of crown and root surfaces in a quadrant with 1 to 3 diseased teeth showing attachment loss.',
    clinical_concepts: [
      'localized periodontitis',
      '1 to 3 teeth srp',
      'localized pocketing',
      'focal bone loss'
    ],
    synonyms: [
      'localized srp',
      'localized deep cleaning',
      '1-3 teeth scaling'
    ],
    required_evidence: [
      {
        type: 'PERIODONTAL_CHART',
        description: '6-point charting showing probe depths >= 4mm on the 1 to 3 qualifying teeth',
        mandatory: true
      },
      {
        type: 'XRAY',
        description: 'Radiograph showing bone loss and calculus on the specific affected teeth',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Dated 6-point periodontal chart',
      'Diagnostic bitewings'
    ],
    payer_specific_requirements: {},
    risk_factors: [
      'Billed when quadrant contains 4+ diseased teeth (loss of legitimate revenue for full D4341)'
    ],
    audit_tips: [
      'Clearly list the specific 1 to 3 tooth numbers being treated in claim remark.'
    ]
  },
  {
    cdt_code: 'D4910',
    procedure_name: 'Periodontal Maintenance',
    category: 'PERIODONTICS',
    risk_level: 'MEDIUM',
    typical_fee_range: '$150 - $230',
    description: 'Maintenance following active periodontal therapy (SRP or osseous surgery) for the life of the dentition.',
    clinical_concepts: [
      'perio maintenance',
      'post-srp recall',
      'periodontal history',
      'stable pocket depth',
      'bleeding control'
    ],
    synonyms: [
      'perio recall',
      'post perio cleaning',
      'maintenance cleaning'
    ],
    required_evidence: [
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'History and completion date of active periodontal therapy (D4341/D4342 or D4260)',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Prior SRP treatment date record',
      'Current periodontal probing depths'
    ],
    payer_specific_requirements: {
      'p-demo-delta': {
        notes: 'Delta requires proof of prior active perio therapy before covering D4910 under perio benefits.'
      }
    },
    risk_factors: [
      'First periodontal maintenance billed without prior history of SRP or surgery on file',
      'Downgrade to routine adult prophy D1110'
    ],
    audit_tips: [
      'If SRP was performed at an outside office, record: "Prior SRP completed on [Date] by outside periodontist/general dentist."'
    ]
  },
  {
    cdt_code: 'D4346',
    procedure_name: 'Scaling in Presence of Generalized Moderate or Severe Gingival Inflammation',
    category: 'PERIODONTICS',
    risk_level: 'MEDIUM',
    typical_fee_range: '$140 - $210',
    description: 'Full mouth scaling for generalized severe gingival inflammation (>30% bleeding on probing) in absence of periodontitis.',
    clinical_concepts: [
      'severe gingivitis',
      'generalized inflammation',
      'swollen erythematous gums',
      'bleeding >30% sites',
      'no attachment loss'
    ],
    synonyms: [
      'gingivitis scaling',
      'severe gingivitis cleaning',
      'generalized inflammation scaling'
    ],
    required_evidence: [
      {
        type: 'PERIODONTAL_CHART',
        description: 'Charting showing >30% bleeding on probing (BOP) with absence of attachment loss / bone loss',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Full mouth bleeding on probing chart',
      'Intraoral photos demonstrating gingival inflammation'
    ],
    payer_specific_requirements: {},
    risk_factors: [
      'Denied if charted pockets show radiographic bone loss (must code D4341/D4342 instead)',
      'Billed on same day as D1110 or D4341'
    ],
    audit_tips: [
      'Cannot be billed in conjunction with D1110, D4341, or D4355 on the same date.'
    ]
  },
  {
    cdt_code: 'D7210',
    procedure_name: 'Extraction, Erupted Tooth Requiring Removal of Bone and/or Sectioning of Tooth',
    category: 'ORAL SURGERY',
    risk_level: 'HIGH',
    typical_fee_range: '$300 - $550',
    description: 'Surgical removal of erupted tooth including elevation of mucoperiosteal flap, bone removal, or tooth sectioning.',
    clinical_concepts: [
      'surgical extraction',
      'bone removal',
      'sectioning of tooth',
      'severe root curvature',
      'hypercementosis',
      'non-restorable breakdown',
      'grossly decayed',
      'hopeless tooth'
    ],
    synonyms: [
      'surgical removal',
      'surgical extraction',
      'sectioned tooth removal',
      'bone guttering extraction'
    ],
    required_evidence: [
      {
        type: 'XRAY',
        description: 'Diagnostic pre-operative radiograph clearly displaying complete tooth, apex, and adjacent anatomical structures',
        mandatory: true
      },
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'Operative note detailing specific surgical necessity (e.g. flap elevation, bone removal with bur, sectioning of roots)',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Pre-op periapical or panoramic radiograph showing complete root apex',
      'Surgical operative report detailing incision, bone guttering, or sectioning'
    ],
    payer_specific_requirements: {
      'p-demo-delta': {
        requires_surgical_operative_narrative: true,
        requires_root_visualization_xray: true,
        notes: 'Delta routinely downgrades to simple extraction D7140 without explicit surgical operative notes.'
      },
      'p-demo-cigna': {
        requires_surgical_operative_narrative: true,
        notes: 'Must describe: (1) flap design, (2) bone removal, and/or (3) sectioning method.'
      }
    },
    risk_factors: [
      'Routine extraction billed as surgical extraction without operative surgical details',
      'Incomplete radiograph with root apex cut off',
      'Payer downcoding to D7140 ($150-$200 reimbursement loss per tooth)'
    ],
    audit_tips: [
      'Always include surgical steps in note: "Mucoperiosteal flap reflected, buccal bone guttered with 702 bur, tooth sectioned, roots delivered individually."',
      'Ensure root apices are 100% visible on pre-op radiograph.'
    ]
  },
  {
    cdt_code: 'D7140',
    procedure_name: 'Extraction, Erupted Tooth or Exposed Root',
    category: 'ORAL SURGERY',
    risk_level: 'LOW',
    typical_fee_range: '$160 - $260',
    description: 'Simple extraction of erupted tooth or exposed root without flap reflection, bone removal, or tooth sectioning.',
    clinical_concepts: [
      'simple extraction',
      'non-restorable',
      'severe mobility',
      'hopeless prognosis',
      'routine removal'
    ],
    synonyms: [
      'simple tooth pull',
      'routine extraction',
      'forceps extraction',
      'elevator extraction'
    ],
    required_evidence: [
      {
        type: 'XRAY',
        description: 'Pre-operative radiograph of tooth to be extracted showing root form',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Pre-op periapical radiograph'
    ],
    payer_specific_requirements: {},
    risk_factors: ['Missing pre-operative radiograph'],
    audit_tips: [
      'Make sure pre-op radiograph was taken prior to extraction and attached to claim.'
    ]
  },
  {
    cdt_code: 'D7953',
    procedure_name: 'Bone Replacement Graft for Ridge Preservation - Per Site',
    category: 'ORAL SURGERY',
    risk_level: 'HIGH',
    typical_fee_range: '$400 - $800',
    description: 'Placement of particulate or block osseous graft material into extraction socket to preserve ridge architecture for future implant or pontic.',
    clinical_concepts: [
      'socket preservation',
      'bone graft',
      'ridge preservation',
      'allograft',
      'xenograft',
      'resorbable membrane',
      'socket seal'
    ],
    synonyms: [
      'socket graft',
      'extraction socket bone graft',
      'ridge preservation graft'
    ],
    required_evidence: [
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'Operative note specifying graft material (e.g. freeze-dried bone allograft), quantity in cc, membrane used, and future restorative intent',
        mandatory: true
      },
      {
        type: 'XRAY',
        description: 'Pre-op and post-placement periapical radiographs showing grafted socket',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Operative narrative with brand/lot number of graft material',
      'Pre-op and immediate post-graft periapical radiographs'
    ],
    payer_specific_requirements: {
      'p-demo-delta': {
        notes: 'Many commercial dental plans categorize socket preservation as non-covered elective unless plan has explicit implant rider.'
      }
    },
    risk_factors: [
      'Policy non-coverage clause (cosmetic / elective exclusion)',
      'Missing operative narrative specifying biomaterial used'
    ],
    audit_tips: [
      'Verify whether patient policy carries implant & bone grafting rider before submission.',
      'Always submit narrative specifying type of allograft/xenograft and suture closure.'
    ]
  },
  {
    cdt_code: 'D3330',
    procedure_name: 'Endodontic Therapy, Molar Tooth (Excluding Final Restoration)',
    category: 'ENDODONTICS',
    risk_level: 'HIGH',
    typical_fee_range: '$1,100 - $1,650',
    description: 'Complete root canal therapy on a molar tooth including biomechanical instrumentation, disinfection, and obturation.',
    clinical_concepts: [
      'irreversible pulpitis',
      'pulpal necrosis',
      'symptomatic apical periodontitis',
      'periapical abscess',
      'periapical radiolucency',
      'molar root canal'
    ],
    synonyms: [
      'molar rct',
      'molar root canal',
      'endodontic treatment molar'
    ],
    required_evidence: [
      {
        type: 'XRAY',
        description: 'Pre-operative radiograph showing root anatomy and pathology, plus completed post-obturation radiograph',
        mandatory: true
      },
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'Clinical narrative with pulpal/periapical diagnosis, canal count, and working lengths',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Pre-operative diagnostic PA showing complete root apices',
      'Final post-obturation radiograph demonstrating dense obturation within 1-2mm of apex'
    ],
    payer_specific_requirements: {
      'p-demo-delta': {
        requires_pre_and_post_xray: true,
        notes: 'Delta requires both pre-op diagnostic radiograph and post-obturation radiograph showing all canals filled.'
      },
      'p-demo-cigna': {
        requires_pre_and_post_xray: true,
        notes: 'Canals filled >2mm short of radiographic apex or gross overfill may trigger consultant review.'
      }
    },
    risk_factors: [
      'Missing post-obturation radiograph',
      'Pre-op radiograph missing or cut off at root apices',
      'Unsealed or underfilled canals'
    ],
    audit_tips: [
      'Always attach BOTH pre-op and final obturation radiographs.',
      'State all treated canals explicitly (e.g. MB1, MB2, DB, Palatal).'
    ]
  },
  {
    cdt_code: 'D3320',
    procedure_name: 'Endodontic Therapy, Bicuspid Tooth (Excluding Final Restoration)',
    category: 'ENDODONTICS',
    risk_level: 'MEDIUM',
    typical_fee_range: '$900 - $1,350',
    description: 'Complete root canal therapy on a premolar / bicuspid tooth including instrumentation and obturation.',
    clinical_concepts: [
      'pulpal necrosis premolar',
      'irreversible pulpitis bicuspid',
      'apical periodontitis bicuspid',
      'premolar rct'
    ],
    synonyms: [
      'premolar root canal',
      'bicuspid rct',
      'premolar rct'
    ],
    required_evidence: [
      {
        type: 'XRAY',
        description: 'Pre-operative diagnostic and post-obturation radiographs',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Pre-op and post-op periapical radiographs'
    ],
    payer_specific_requirements: {},
    risk_factors: ['Missing final post-fill radiograph'],
    audit_tips: [
      'Ensure post-op radiograph shows complete seal to radiographic apex.'
    ]
  },
  {
    cdt_code: 'D3310',
    procedure_name: 'Endodontic Therapy, Anterior Tooth (Excluding Final Restoration)',
    category: 'ENDODONTICS',
    risk_level: 'MEDIUM',
    typical_fee_range: '$750 - $1,150',
    description: 'Complete root canal therapy on an anterior tooth (incisor or canine) including instrumentation and obturation.',
    clinical_concepts: [
      'anterior trauma',
      'pulpal necrosis anterior',
      'discolored non-vital tooth',
      'anterior rct'
    ],
    synonyms: [
      'anterior root canal',
      'front tooth rct',
      'incisor root canal'
    ],
    required_evidence: [
      {
        type: 'XRAY',
        description: 'Diagnostic pre-op and completed post-obturation periapical radiographs',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Pre-op and final obturation radiographs'
    ],
    payer_specific_requirements: {},
    risk_factors: ['Missing diagnostic or post-fill radiograph'],
    audit_tips: ['Include trauma etiology or pulp test vitality results in clinical note.']
  },
  {
    cdt_code: 'D6010',
    procedure_name: 'Surgical Placement of Implant Body: Endosteal Implant',
    category: 'IMPLANTOLOGY',
    risk_level: 'HIGH',
    typical_fee_range: '$1,800 - $2,600',
    description: 'Surgical placement of titanium or ceramic endosteal dental implant fixture into mandibular or maxillary bone.',
    clinical_concepts: [
      'endosteal implant',
      'implant fixture',
      'edentulous site',
      'tooth replacement',
      'osseointegration'
    ],
    synonyms: [
      'dental implant placement',
      'implant surgery',
      'endosteal fixture',
      'implant body'
    ],
    required_evidence: [
      {
        type: 'XRAY',
        description: 'Pre-operative radiograph (PA, Pan, or CBCT) of edentulous site, plus post-insertion radiograph showing fixture in bone',
        mandatory: true
      },
      {
        type: 'CLINICAL_NARRATIVE',
        description: 'Operative report detailing site preparation, fixture dimensions (length & diameter), stability (ISQ), and plan',
        mandatory: true
      }
    ],
    commonly_associated_documentation: [
      'Pre-op radiograph demonstrating adequate bone height/width',
      'Post-surgical PA showing implant seated within bone margins',
      'Implant fixture manufacturer, model, diameter, and length'
    ],
    payer_specific_requirements: {
      'p-demo-delta': {
        notes: 'Implant rider required on subscriber contract. Delta will deny if missing pre-op and post-placement films.'
      }
    },
    risk_factors: [
      'Plan lacks major restorative/implant coverage rider (rejection code PR-204)',
      'Missing post-placement radiograph'
    ],
    audit_tips: [
      'Confirm implant benefit rider before treatment.',
      'Record implant dimensions (e.g. 4.3mm x 11.5mm) in clinical narrative.'
    ]
  },
  {
    cdt_code: 'D0120',
    procedure_name: 'Periodic Oral Evaluation - Established Patient',
    category: 'DIAGNOSTIC',
    risk_level: 'LOW',
    typical_fee_range: '$55 - $90',
    description: 'Clinical evaluation performed on an established patient to determine any changes in dental and medical health status.',
    clinical_concepts: [
      'routine exam',
      'checkup',
      'recall evaluation',
      'periodic check'
    ],
    synonyms: [
      'recall exam',
      '6 month checkup',
      'routine dental exam'
    ],
    required_evidence: [],
    commonly_associated_documentation: ['Clinical chart entry with periodontal and restorative status update'],
    payer_specific_requirements: {
      'p-demo-delta': {
        notes: 'Standard limit: two evaluations per calendar or benefit year, spaced 6 months apart.'
      }
    },
    risk_factors: [
      'Frequency limitation: billed before 6 full months have elapsed',
      'Billed on same day as comprehensive exam D0150'
    ],
    audit_tips: [
      'Check date of last preventive exam to avoid 6-month frequency denial.'
    ]
  },
  {
    cdt_code: 'D0150',
    procedure_name: 'Comprehensive Oral Evaluation - New or Established Patient',
    category: 'DIAGNOSTIC',
    risk_level: 'LOW',
    typical_fee_range: '$95 - $150',
    description: 'Thorough evaluation and recording of extraoral/intraoral hard and soft tissues, dental history, periodontal charting, and cancer screening.',
    clinical_concepts: [
      'new patient exam',
      'comprehensive exam',
      'full dental examination',
      'initial workup'
    ],
    synonyms: [
      'initial exam',
      'full mouth exam',
      'new patient evaluation'
    ],
    required_evidence: [],
    commonly_associated_documentation: ['Complete medical history, dental chart, periodontal screening, oral cancer exam record'],
    payer_specific_requirements: {
      'p-demo-cigna': {
        notes: 'Frequency limited to once every 36 or 60 months per provider/practice.'
      }
    },
    risk_factors: [
      'Billed within 3 years of previous D0150 by same provider (will downgrade to D0120)'
    ],
    audit_tips: [
      'If established patient had D0150 within 3 years, bill periodic D0120 instead.'
    ]
  },
  {
    cdt_code: 'D0210',
    procedure_name: 'Intraoral - Comprehensive Series of Radiographic Images (FMX)',
    category: 'DIAGNOSTIC',
    risk_level: 'LOW',
    typical_fee_range: '$140 - $220',
    description: 'Complete radiographic survey of whole dentition consisting of 14-20 periapical and bitewing images.',
    clinical_concepts: [
      'full mouth x-rays',
      'fmx',
      'complete series x-rays',
      'intraoral full series'
    ],
    synonyms: [
      'fmx',
      'full series x-rays',
      'comprehensive x-rays',
      'complete series'
    ],
    required_evidence: [],
    commonly_associated_documentation: ['Diagnostic mount of 14+ films with diagnostic interpretation notes'],
    payer_specific_requirements: {
      'p-demo-delta': {
        notes: 'Covered once every 3 to 5 years. Individual PAs and bitewings taken same day will be bundled into FMX.'
      }
    },
    risk_factors: [
      'Frequency rule: once every 36 or 60 months',
      'Individual PAs billed on same day exceed FMX fee cap and get auto-bundled'
    ],
    audit_tips: [
      'Verify last FMX or Panoramic radiograph date; payers combine FMX and Panorex under one shared frequency window.'
    ]
  },
  {
    cdt_code: 'D0274',
    procedure_name: 'Bitewings - Four Radiographic Images',
    category: 'DIAGNOSTIC',
    risk_level: 'LOW',
    typical_fee_range: '$70 - $110',
    description: 'Four bitewing radiographs visualizing posterior interproximal coronal and crestal bone relationships.',
    clinical_concepts: [
      '4 bitewings',
      'interproximal radiographs',
      'cavity check x-rays',
      'posterior bite-wings'
    ],
    synonyms: [
      '4bw',
      '4 bitewings',
      'cavity check x-rays',
      'checkup x-rays'
    ],
    required_evidence: [],
    commonly_associated_documentation: ['Four diagnostic bitewing films (molar and premolar views bilateral)'],
    payer_specific_requirements: {},
    risk_factors: [
      'Billed more than once every 12 months for adult patients',
      'Billed within 12 months of FMX D0210'
    ],
    audit_tips: [
      'Confirm at least 12 months have passed since prior bitewings or FMX.'
    ]
  },
  {
    cdt_code: 'D1110',
    procedure_name: 'Prophylaxis - Adult',
    category: 'PREVENTIVE',
    risk_level: 'LOW',
    typical_fee_range: '$95 - $150',
    description: 'Removal of plaque, calculus, and stains from tooth structures in permanent and transitional dentition for control of local irritants.',
    clinical_concepts: [
      'adult cleaning',
      'routine cleaning',
      'regular dental cleaning',
      'preventive cleaning'
    ],
    synonyms: [
      'regular cleaning',
      'standard prophy',
      'adult prophy',
      'routine clean'
    ],
    required_evidence: [],
    commonly_associated_documentation: ['Chart entry noting scaling and coronal polish completed'],
    payer_specific_requirements: {},
    risk_factors: [
      'Frequency limitation: more than 2 per 12 months',
      'Patient with active periodontitis billed for routine prophy rather than D4341 or D4910'
    ],
    audit_tips: [
      'Never bill D1110 on patient with active periodontitis and bone loss; use appropriate periodontal codes.'
    ]
  }
];

/**
 * Matches extracted clinical concepts and normalized evidence against the CDT knowledge base
 * to suggest candidate procedure codes.
 */
function identifyCdtCandidates(normalizedEvidence, rawText = '') {
  const combinedText = [
    rawText || '',
    ...(normalizedEvidence.findings || []),
    ...(normalizedEvidence.structural_findings || []),
    ...(normalizedEvidence.treatment_context || []),
    ...(normalizedEvidence.severity || [])
  ].join(' ').toLowerCase();

  const candidates = [];

  CDT_KNOWLEDGE_BASE.forEach(entry => {
    let matchedConcepts = [];
    let score = 0;

    // 1. Synonym matching (strongest signal)
    entry.synonyms.forEach(syn => {
      if (combinedText.includes(syn.toLowerCase())) {
        score += 35;
        matchedConcepts.push(`Procedure mention: "${syn}"`);
      }
    });

    // 2. Clinical concept matching
    entry.clinical_concepts.forEach(concept => {
      const cLower = concept.toLowerCase();
      if (combinedText.includes(cLower)) {
        score += 25;
        matchedConcepts.push(`Clinical indicator: "${concept}"`);
      } else {
        const tokens = cLower.split(' ').filter(t => t.length > 3);
        const matchCount = tokens.filter(t => combinedText.includes(t)).length;
        if (tokens.length > 1 && matchCount === tokens.length) {
          score += 20;
          matchedConcepts.push(`Associated finding: "${concept}"`);
        }
      }
    });

    // 3. Normalization layer specific triggers
    if (entry.cdt_code === 'D2740' || entry.cdt_code === 'D2750') {
      const hasStructure = (normalizedEvidence.structural_findings || []).length > 0;
      const hasCaries = (normalizedEvidence.findings || []).some(f => f.toLowerCase().includes('caries') || f.toLowerCase().includes('decay'));
      if (hasStructure && hasCaries) {
        score += 30;
        matchedConcepts.push('Structural compromise + caries combination');
      }
    }

    if (entry.cdt_code === 'D4341' || entry.cdt_code === 'D4342') {
      const hasPerio = combinedText.includes('pocket') || combinedText.includes('srp') || combinedText.includes('calculus') || combinedText.includes('bone loss');
      if (hasPerio) {
        score += 30;
        matchedConcepts.push('Active periodontal parameters documented');
      }
    }

    if (entry.cdt_code === 'D7210') {
      const hasSurg = combinedText.includes('surgical') || combinedText.includes('sectioning') || combinedText.includes('bone removal');
      if (hasSurg) {
        score += 35;
        matchedConcepts.push('Surgical intervention requirements documented');
      }
    }

    if (entry.cdt_code === 'D3330' || entry.cdt_code === 'D3320' || entry.cdt_code === 'D3310') {
      const hasEndo = combinedText.includes('root canal') || combinedText.includes('rct') || combinedText.includes('pulpitis') || combinedText.includes('obturation');
      if (hasEndo) {
        score += 35;
        matchedConcepts.push('Endodontic indicators identified');
      }
    }

    if (entry.cdt_code === 'D6010') {
      const hasImplant = combinedText.includes('implant') || combinedText.includes('fixture') || combinedText.includes('edentulous');
      if (hasImplant) {
        score += 35;
        matchedConcepts.push('Implant surgery parameters detected');
      }
    }

    if (score >= 35) {
      const confidence = Math.min(0.98, Math.max(0.60, (score / 100)));
      candidates.push({
        cdt_code: entry.cdt_code,
        procedure_name: entry.procedure_name,
        category: entry.category,
        risk_level: entry.risk_level,
        typical_fee_range: entry.typical_fee_range,
        confidence: Math.round(confidence * 100) / 100,
        rationale: `Clinical documentation matches: ${matchedConcepts.slice(0, 3).join('; ')}.`,
        matched_concepts: matchedConcepts,
        required_evidence: entry.required_evidence,
        commonly_associated_documentation: entry.commonly_associated_documentation
      });
    }
  });

  // Sort descending by confidence
  return candidates.sort((a, b) => b.confidence - a.confidence);
}

function getCdtKnowledge(cdtCode) {
  return CDT_KNOWLEDGE_BASE.find(c => c.cdt_code === cdtCode.toUpperCase()) || null;
}

module.exports = {
  CDT_KNOWLEDGE_BASE,
  identifyCdtCandidates,
  getCdtKnowledge
};
