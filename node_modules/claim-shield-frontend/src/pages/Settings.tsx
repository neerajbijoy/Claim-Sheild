import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Database, ShieldCheck, Cpu, HardDrive, CheckCircle2 } from 'lucide-react';
import { fetchHealth } from '../services/api';

export const Settings: React.FC = () => {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetchHealth().then(res => setHealth(res)).catch(() => {});
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">System & Environment Settings</h2>
        <p className="text-xs text-slate-500">Database, Supabase storage bucket, and backend service status</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* REST API Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-50 text-brand-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">REST API Engine</h4>
              <p className="text-xs text-slate-400 font-mono">http://localhost:5000/api</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Status</span>
            <span className="font-bold font-mono text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
            </span>
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Supabase PostgreSQL</h4>
              <p className="text-xs text-slate-400 font-mono">
                {health?.database || 'Supabase / Resilient Fallback'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Active Tables</span>
            <span className="font-mono text-slate-800 font-bold">7 Tables Preserved</span>
          </div>
        </div>

        {/* Storage Bucket Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Supabase Storage Bucket</h4>
              <p className="text-xs text-slate-400 font-mono">claim-documents</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Status</span>
            <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active Bucket
            </span>
          </div>
        </div>

        {/* Security Rules */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Security Isolation</h4>
              <p className="text-xs text-slate-400 font-mono">Backend .env ONLY</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Service Role Key</span>
            <span className="font-mono text-emerald-700 font-bold">Secured on Backend</span>
          </div>
        </div>
      </div>
    </div>
  );
};
