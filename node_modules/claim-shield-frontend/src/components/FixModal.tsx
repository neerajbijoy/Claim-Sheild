import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { Claim } from '../types';

interface FixModalProps {
  claim: Claim;
  isOpen: boolean;
  onClose: () => void;
  onReAudit: (updatedTooth: string, updatedNarrative: string) => Promise<void>;
  isReAuditing: boolean;
}

export const FixModal: React.FC<FixModalProps> = ({
  claim,
  isOpen,
  onClose,
  onReAudit,
  isReAuditing
}) => {
  if (!isOpen) return null;

  const currentTooth = claim.procedures && claim.procedures.length > 0 ? claim.procedures[0].tooth_number : '14';
  const [tooth, setTooth] = useState<string>(currentTooth || '14');
  const [narrative, setNarrative] = useState<string>(claim.clinical_narrative || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onReAudit(tooth, narrative);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-100 text-brand-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Resolve Documentation & Re-Audit</h3>
              <p className="text-xs text-slate-500">Correct documentation parameters and trigger a fresh audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tooth Number selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tooth Number (Claim vs Documentation)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={tooth}
                onChange={(e) => setTooth(e.target.value)}
                className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder="14"
              />
              <div className="flex gap-2">
                {['13', '14', '15', '30'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTooth(t)}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border ${
                      tooth === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Selecting Tooth #14 aligns the claim with uploaded X-Ray and clinical notes.
            </p>
          </div>

          {/* Clinical Narrative Editor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Clinical Narrative
            </label>
            <textarea
              rows={4}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-sans text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              placeholder="Describe clinical condition and medical necessity..."
            />
          </div>

          <div className="p-3 bg-brand-50 rounded-2xl border border-brand-200 flex items-start gap-2.5 text-xs text-brand-900">
            <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <p>
              Submitting updates will re-verify claim documentation against CDT library rules in real time.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReAuditing}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/30 flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isReAuditing ? 'animate-spin' : ''}`} />
              {isReAuditing ? 'Re-Auditing Claim...' : 'RE-AUDIT CLAIM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
