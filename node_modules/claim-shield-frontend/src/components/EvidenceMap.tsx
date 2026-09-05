import React from 'react';
import { Check, X, ShieldAlert, ArrowDown, FileText, Image, FileCode } from 'lucide-react';
import { EvidenceMapNode } from '../types';

interface EvidenceMapProps {
  cdtCode?: string;
  claimTooth?: string;
  nodes?: EvidenceMapNode[];
  hasMismatch?: boolean;
  mismatchDetails?: {
    claimTooth: string;
    noteTooth: string;
    xrayTooth: string;
    explanation: string;
    recommendedAction: string;
  };
}

export const EvidenceMap: React.FC<EvidenceMapProps> = ({
  cdtCode = 'D2740',
  claimTooth = '14',
  nodes,
  hasMismatch = false,
  mismatchDetails
}) => {
  // Default nodes if none passed
  const displayNodes = nodes || [
    { category: 'CLAIM', label: 'Claim Form', tooth: `#${claimTooth}`, matched: true },
    { category: 'X-RAY', label: 'X-Ray Radiograph', tooth: `#${claimTooth}`, matched: true },
    { category: 'CLINICAL_NOTE', label: 'Clinical Note', tooth: hasMismatch ? '#13' : `#${claimTooth}`, matched: !hasMismatch }
  ];

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Evidence Map</span>
            <span className="bg-brand-500/20 text-brand-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-brand-500/30 uppercase">
              Clinical Graph
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-verifying procedure code, specified location, and clinical evidence sources
          </p>
        </div>
      </div>

      {/* Visual Connected Graph */}
      <div className="flex flex-col items-center justify-center py-4 space-y-3">
        {/* Top Node: CDT Code */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-2.5 rounded-2xl font-mono font-extrabold text-sm shadow-lg text-white border border-brand-400/30">
          CDT {cdtCode} (Porcelain Crown)
        </div>

        <ArrowDown className="w-5 h-5 text-slate-500 animate-bounce" />

        {/* Middle Node: Primary Tooth */}
        <div className="bg-slate-800 px-5 py-2 rounded-xl font-mono font-bold text-sm text-brand-300 border border-slate-700">
          Target Location: Tooth #{claimTooth}
        </div>

        <div className="w-full max-w-lg h-6 relative flex items-center justify-center">
          <div className="w-3/4 h-0.5 bg-slate-700"></div>
        </div>

        {/* Bottom Nodes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {displayNodes.map((node, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center text-center space-y-2 ${
                node.matched
                  ? 'bg-slate-800/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                  : 'bg-red-950/40 border-red-500/60 shadow-lg shadow-red-950/40 animate-pulse'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                {node.category === 'X-RAY' ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400">{node.label}</p>
                <p className="text-base font-mono font-extrabold text-white mt-0.5">{node.tooth}</p>
              </div>

              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  node.matched ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
                }`}
              >
                {node.matched ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inconsistency Warning Callout */}
      {hasMismatch && (
        <div className="bg-red-950/60 border border-red-500/50 rounded-2xl p-4 text-red-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h5 className="font-bold text-red-100 uppercase tracking-wide">DOCUMENTATION INCONSISTENCY DETECTED</h5>
            <p className="text-red-200/90">
              {mismatchDetails?.explanation || `Claim specifies tooth #${claimTooth}, while clinical note references tooth #${mismatchDetails?.noteTooth || '13'}.`}
            </p>
            <p className="text-red-300 font-semibold pt-1">
              Recommended Action: {mismatchDetails?.recommendedAction || 'Verify tooth number in claim and clinical documentation before submission.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
