import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardCheck, Send } from 'lucide-react';
import { Claim } from '../types';
import { fetchClaims, recordClaimOutcome } from '../services/api';

export const Settings: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState('');
  const [outcome, setOutcome] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionText, setRejectionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims()
      .then((data) => {
        setClaims(data);
        if (data.length > 0) setSelectedClaimId(data[0].id);
      })
      .catch(() => setError('Unable to load claims from the database.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedClaim = claims.find(claim => claim.id === selectedClaimId);
  const procedure = selectedClaim?.procedures?.[0];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClaim || !procedure) {
      setError('Select a claim with a procedure before recording an outcome.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    if (outcome === 'REJECTED' && !rejectionReason.trim() && !rejectionText.trim()) {
      setError('Add the denial reason or paste the payer response before saving.');
      setSubmitting(false);
      return;
    }

    try {
      await recordClaimOutcome({
        claim_id: selectedClaim.id,
        payer_id: selectedClaim.payer_id,
        cdt_code: procedure.cdt_code,
        outcome,
        rejection_reason: outcome === 'REJECTED' ? rejectionReason : undefined,
        rejection_text: outcome === 'REJECTED' ? rejectionText : undefined
      });
      setMessage(`Actual ${outcome.toLowerCase()} response recorded for ${selectedClaim.claim_number}.`);
      setRejectionReason('');
      setRejectionText('');
    } catch {
      setError('The claim outcome could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Record Claim Outcome</h2>
        <p className="text-xs text-slate-500">Capture the payer's actual adjudication so future rejection predictions can learn from it.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 rounded-2xl bg-brand-50 text-brand-600">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Payer adjudication feedback</h3>
            <p className="text-xs text-slate-500">Record what actually happened after submission.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400">Loading claims...</p>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Claim</label>
              <select value={selectedClaimId} onChange={event => setSelectedClaimId(event.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none">
                {claims.map(claim => (
                  <option key={claim.id} value={claim.id}>{claim.claim_number} - {claim.patient_name}</option>
                ))}
              </select>
              {selectedClaim && procedure && (
                <p className="text-xs text-slate-400 mt-2">Payer: {selectedClaim.payer_id} · CDT {procedure.cdt_code} · Tooth #{procedure.tooth_number}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Actual response</label>
              <div className="grid grid-cols-2 gap-3">
                {(['APPROVED', 'REJECTED'] as const).map(value => (
                  <button key={value} type="button" onClick={() => setOutcome(value)} className={`px-4 py-3 rounded-2xl border text-sm font-bold transition-colors ${outcome === value ? (value === 'APPROVED' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600') : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {outcome === 'REJECTED' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Rejection reason</label>
                  <input value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} placeholder="Example: Missing X-ray" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Payer response</label>
                  <textarea value={rejectionText} onChange={event => setRejectionText(event.target.value)} rows={4} placeholder="Paste the payer's rejection message or explanation." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none" />
                </div>
              </div>
            )}

            {message && <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"><CheckCircle2 className="w-4 h-4" />{message}</div>}
            {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"><AlertCircle className="w-4 h-4" />{error}</div>}

            <button type="submit" disabled={submitting || !selectedClaim} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" />
              {submitting ? 'Recording...' : 'Record actual response'}
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export const PayerRules = Settings;
export default Settings;
