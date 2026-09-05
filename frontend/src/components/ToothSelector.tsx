import React from 'react';

interface ToothSelectorProps {
  selectedTooth: string;
  onSelectTooth: (tooth: string) => void;
}

export const ToothSelector: React.FC<ToothSelectorProps> = ({ selectedTooth, onSelectTooth }) => {
  const upperTeeth = Array.from({ length: 16 }, (_, i) => (i + 1).toString());
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => (32 - i).toString());

  return (
    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">Universal Tooth Chart Selector</h4>
          <p className="text-xs text-slate-400">Select target tooth location for CDT procedure</p>
        </div>
        <div className="bg-brand-600/20 text-brand-400 px-3 py-1 rounded-full border border-brand-500/30 text-xs font-mono font-semibold">
          Selected: Tooth #{selectedTooth || 'None'}
        </div>
      </div>

      {/* Upper Arch */}
      <div className="mb-4">
        <div className="text-[10px] text-slate-400 font-semibold mb-1 text-center uppercase tracking-widest">Upper Arch (Maxillary)</div>
        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 justify-center">
          {upperTeeth.map((tooth) => {
            const isSelected = selectedTooth === tooth;
            return (
              <button
                key={tooth}
                type="button"
                onClick={() => onSelectTooth(tooth)}
                className={`h-10 text-xs font-mono font-bold rounded-lg transition-all flex flex-col items-center justify-center border ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-400 shadow-lg shadow-brand-500/40 ring-2 ring-brand-400'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-[9px] opacity-70">#</span>
                <span>{tooth}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lower Arch */}
      <div>
        <div className="text-[10px] text-slate-400 font-semibold mb-1 text-center uppercase tracking-widest">Lower Arch (Mandibular)</div>
        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 justify-center">
          {lowerTeeth.map((tooth) => {
            const isSelected = selectedTooth === tooth;
            return (
              <button
                key={tooth}
                type="button"
                onClick={() => onSelectTooth(tooth)}
                className={`h-10 text-xs font-mono font-bold rounded-lg transition-all flex flex-col items-center justify-center border ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-400 shadow-lg shadow-brand-500/40 ring-2 ring-brand-400'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="text-[9px] opacity-70">#</span>
                <span>{tooth}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
