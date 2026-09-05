import React from 'react';
import { Shield, ShieldCheck, ArrowRight, Sparkles, FileSearch, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LandingProps {
  onStartAudit: () => void;
  onViewDemo: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onStartAudit, onViewDemo }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-400 p-0.5 shadow-lg shadow-brand-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand-400" />
            </div>
          </div>
          <span className="font-extrabold text-xl tracking-wider font-mono text-white">CLAIM-SHIELD</span>
        </div>

        <button
          onClick={onViewDemo}
          className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl transition-all"
        >
          VIEW DEMO AUDITS
        </button>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 text-center space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 bg-brand-950/80 border border-brand-500/30 text-brand-300 text-xs font-semibold px-4 py-1.5 rounded-full shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>AI-Assisted Dental Claim Pre-Submission Auditor</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Shield every claim before it gets <span className="bg-gradient-to-r from-brand-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">submitted.</span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
          Claim-Shield checks dental claims for documentation completeness, clinical support, evidence consistency, and potential documentation risks before submission.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onStartAudit}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
          >
            <span>START NEW AUDIT</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onViewDemo}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm rounded-2xl border border-slate-800 transition-all"
          >
            EXPLORE DEMO CLAIMS
          </button>
        </div>

        <p className="text-xs text-slate-500 font-mono pt-2">
          Synthetic demonstration data only. Demo rules are for demonstration purposes.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <FileSearch className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Rule Engine Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dynamically evaluates payer rules for procedure codes like D2740 (Porcelain Crown) to verify required X-Rays & notes.
            </p>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Evidence Consistency Graph</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects tooth location mismatches across claim codes, clinical narrative notes, and radiograph images.
            </p>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Fix → Re-Audit Pipeline</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instantly resolve documentation gaps, re-audit in real-time, and watch readiness scores improve from 68% to 100%.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 border-t border-slate-900 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>CLAIM-SHIELD Pre-Submission Audit System</span>
        <span>Healthcare SaaS Demo • Synthetic Data</span>
      </footer>
    </div>
  );
};
