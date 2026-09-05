const express = require('express');
const router = express.Router();
const { CDT_KNOWLEDGE_BASE, getCdtKnowledge, identifyCdtCandidates } = require('../services/cdtKnowledgeBase');

// GET /api/cdt - List all CDT codes with optional category & search filter
router.get('/', (req, res) => {
  try {
    const { category, search, risk } = req.query;
    let results = [...CDT_KNOWLEDGE_BASE];

    if (category && category !== 'ALL') {
      results = results.filter(
        item => item.category.toUpperCase() === category.toUpperCase()
      );
    }

    if (risk && risk !== 'ALL') {
      results = results.filter(
        item => (item.risk_level || 'LOW').toUpperCase() === risk.toUpperCase()
      );
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(item => {
        return (
          item.cdt_code.toLowerCase().includes(q) ||
          item.procedure_name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.synonyms.some(s => s.toLowerCase().includes(q)) ||
          item.clinical_concepts.some(c => c.toLowerCase().includes(q))
        );
      });
    }

    return res.json({
      success: true,
      count: results.length,
      total_in_library: CDT_KNOWLEDGE_BASE.length,
      data: results
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cdt/:code - Get specific CDT code details
router.get('/:code', (req, res) => {
  try {
    const code = req.params.code;
    const item = getCdtKnowledge(code);
    if (!item) {
      return res.status(404).json({ success: false, message: `CDT code ${code} not found in knowledge base.` });
    }
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cdt/match - Match clinical narrative text to candidate CDT codes
router.post('/match', (req, res) => {
  try {
    const { clinical_text, raw_text } = req.body;
    const text = clinical_text || raw_text || '';
    if (!text.trim()) {
      return res.status(400).json({ success: false, message: 'clinical_text is required for matching' });
    }

    const normalized = {
      findings: [],
      structural_findings: [],
      treatment_context: [],
      severity: []
    };

    const candidates = identifyCdtCandidates(normalized, text);
    return res.json({
      success: true,
      text_length: text.length,
      match_count: candidates.length,
      data: candidates
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
