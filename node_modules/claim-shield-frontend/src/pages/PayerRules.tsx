import React, { useEffect, useState } from 'react';
import { ScrollText, ShieldAlert, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { PayerRule, Payer } from '../types';
import { fetchPayers, fetchPayerRules } from '../services/api';

export const PayerRules: React.FC = () => {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [selectedPayer, setSelectedPayer] = useState<string>('');
  const [rules, setRules] = useState<PayerRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayers().then((pList) => {
      setPayers(pList);
      if (pList.length > 0) {
        setSelectedPayer(pList[0].id);
        loadRules(pList[0].id);
      }
    });
  }, []);

  const loadRules = async (payerId: string) => {
    setLoading(true);
    try {
      const data = await fetchPayerRules(payerId);
      setRules(data);
    } catch (err) {
      console.error('Error fetching payer rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayerChange = (id: string) => {
    setSelectedPayer(id);
    loadRules(id);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payer Rules Engine</h2>
          <p className="text-xs text-slate-500">Configured rule sets evaluated during pre-submission audits</p>
        </div>

        {/* Payer Selector */}
        <select
          value={selectedPayer}
          onChange={(e) => handlePayerChange(e.target.value)}
          className="bg-white border border-slate-300 text-xs font-bold text-slate-800 px-4 py-2.5 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
        >
          {payers.map(p => (
            <option key={p.id} value={p.id}>{p.display_name} ({p.name})</option>
          ))}
        </select>
      </div>

      {/* Synthetic Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-900 text-xs shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <span className="font-extrabold block uppercase tracking-wide">Synthetic Demonstration Rules</span>
          <p className="text-amber-800">
            Rules shown below are synthetic demonstration rules configured for testing and hackathon evaluation. They do not represent official payer requirements.
          </p>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading payer rules...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Payer</th>
                  <th className="py-3.5 px-4">CDT Code</th>
                  <th className="py-3.5 px-4">Requirement</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Effective Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {rules.map((rule) => {
                  const payerObj = payers.find(p => p.id === selectedPayer);
                  return (
                    <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {payerObj ? payerObj.display_name : 'Demo Dental Insurance'}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-brand-600">{rule.cdt_code}</td>
                      <td className="py-4 px-4 font-mono text-slate-800 font-semibold">{rule.requirement_type}</td>
                      <td className="py-4 px-4">
                        {rule.is_required ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                            <XCircle className="w-3 h-3 text-red-600" /> Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                            <CheckCircle2 className="w-3 h-3 text-slate-400" /> Optional
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500">{rule.effective_date || '2026-01-01'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
