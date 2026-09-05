import React from 'react';
import { Shield, LayoutDashboard, FileSpreadsheet, PlusCircle, History, ScrollText, Settings, Sparkles } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'claims', label: 'Claims', icon: FileSpreadsheet },
    { id: 'new-audit', label: 'New Audit', icon: PlusCircle, highlight: true },
    { id: 'history', label: 'Audit History', icon: History },
    { id: 'payer-rules', label: 'Payer Rules', icon: ScrollText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col justify-between border-r border-slate-800 shrink-0">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-400 p-0.5 shadow-lg shadow-brand-500/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-brand-400" />
              </div>
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-white tracking-wider font-mono">CLAIM-SHIELD</h1>
              <p className="text-[10px] text-slate-400 font-medium">Dental Claim Auditor</p>
            </div>
          </div>
          <div className="mt-3 bg-slate-800/80 rounded-xl p-2 text-[11px] text-slate-300 border border-slate-700/50 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>"Shield every claim before it gets submitted."</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 font-bold'
                    : 'hover:bg-slate-800/80 text-slate-400 hover:text-white'
                } ${item.highlight && !isActive ? 'border border-brand-500/30 text-brand-400 hover:bg-brand-600/10' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : (item.highlight ? 'text-brand-400' : 'text-slate-400')}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Synthetic Demo Notice & User Footer */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="bg-slate-800/50 rounded-xl p-2.5 text-[10px] text-slate-400 border border-slate-700/40 text-center">
          <span className="font-semibold text-slate-300 block">Synthetic demonstration data only.</span>
          Demo rules are not official insurance policies.
        </div>

        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center font-mono">
            DB
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Dental Billing Team</p>
            <p className="text-[10px] text-slate-400 truncate">auditor@claimshield.demo</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
