import React, { useEffect, useState } from 'react';
import { Search, Filter, Plus, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Claim, Payer } from '../types';
import { fetchClaims, fetchPayers } from '../services/api';

interface ClaimsProps {
  onSelectClaim: (claimId: string) => void;
  onNewAudit: () => void;
}

export const Claims: React.FC<ClaimsProps> = ({ onSelectClaim, onNewAudit }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [payerFilter, setPayerFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter, payerFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [claimData, payerData] = await Promise.all([
        fetchClaims({ status: statusFilter, payer_id: payerFilter, search }),
        fetchPayers()
      ]);
      setClaims(claimData);
      setPayers(payerData);
    } catch (err) {
      console.error('Error fetching claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Claims Management</h2>
          <p className="text-xs text-slate-500">Filter, search, and review pre-submission audit statuses</p>
        </div>

        <button
          onClick={onNewAudit}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/30 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> START NEW AUDIT
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Claim #, Patient..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-4 h-4" />
            <span>Status:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="READY">READY</option>
            <option value="REVIEW">REVIEW</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="DRAFT">DRAFT</option>
          </select>

          <select
            value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Payers</option>
            {payers.map(p => (
              <option key={p.id} value={p.id}>{p.display_name}</option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Claims List Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading claims data...</div>
        ) : claims.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700 text-sm">No claims match criteria.</p>
            <p>Try resetting filters or start a new claim audit.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Claim #</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Procedure</th>
                  <th className="py-3.5 px-4">Tooth #</th>
                  <th className="py-3.5 px-4">Payer</th>
                  <th className="py-3.5 px-4">Readiness</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Audited</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {claims.map((c) => {
                  const proc = c.procedures && c.procedures.length > 0 ? c.procedures[0] : { cdt_code: 'D2740', tooth_number: '14' };
                  const payer = payers.find(p => p.id === c.payer_id)?.display_name || 'Demo Dental Insurance';

                  let statusBadge = (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                      READY
                    </span>
                  );
                  if (c.status === 'BLOCKED') {
                    statusBadge = (
                      <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                        BLOCKED
                      </span>
                    );
                  } else if (c.status === 'REVIEW') {
                    statusBadge = (
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                        REVIEW
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectClaim(c.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-4 font-mono font-bold text-brand-600">{c.claim_number}</td>
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {c.patient_name}
                        <span className="block text-[10px] text-slate-400 font-mono">{c.patient_id}</span>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-700">{proc.cdt_code}</td>
                      <td className="py-4 px-4 font-mono text-slate-700">#{proc.tooth_number}</td>
                      <td className="py-4 px-4 text-slate-600">{payer}</td>
                      <td className="py-4 px-4 font-mono font-extrabold text-slate-900">{c.readiness_score}%</td>
                      <td className="py-4 px-4">{statusBadge}</td>
                      <td className="py-4 px-4 text-[11px] text-slate-500 font-mono">
                        {new Date(c.updated_at || c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="text-brand-600 hover:text-brand-800 font-semibold text-xs inline-flex items-center gap-1">
                          Open <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
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
