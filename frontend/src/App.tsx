import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Claims } from './pages/Claims';
import { NewAudit } from './pages/NewAudit';
import { AuditReport } from './pages/AuditReport';
import { AuditHistory } from './pages/AuditHistory';
import { PayerRules } from './pages/PayerRules';
import { Settings } from './pages/Settings';
import { fetchHealth } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [selectedClaimId, setSelectedClaimId] = useState<string>('CLM-1001');
  const [latestAuditResult, setLatestAuditResult] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<string>('Local Database');

  useEffect(() => {
    fetchHealth()
      .then((res) => {
        if (res && res.database) {
          setDbStatus(res.database);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectClaim = (claimId: string) => {
    setSelectedClaimId(claimId);
    setLatestAuditResult(null);
    setActiveTab('report');
  };

  const handleAuditComplete = (auditResult: any, claimId: string) => {
    setLatestAuditResult(auditResult);
    setSelectedClaimId(claimId);
    setActiveTab('report');
  };

  // If active tab is landing, render full landing hero view
  if (activeTab === 'landing') {
    return (
      <Landing
        onStartAudit={() => setActiveTab('new-audit')}
        onViewDemo={() => setActiveTab('dashboard')}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar */}
        <TopBar
          onStartAudit={() => setActiveTab('new-audit')}
          dbStatus={dbStatus}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              onSelectClaim={handleSelectClaim}
              onNewAudit={() => setActiveTab('new-audit')}
            />
          )}

          {activeTab === 'claims' && (
            <Claims
              onSelectClaim={handleSelectClaim}
              onNewAudit={() => setActiveTab('new-audit')}
            />
          )}

          {activeTab === 'new-audit' && (
            <NewAudit onAuditComplete={handleAuditComplete} />
          )}

          {activeTab === 'report' && (
            <AuditReport
              claimId={selectedClaimId}
              initialAudit={latestAuditResult}
              onBack={() => setActiveTab('claims')}
              onViewHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'history' && (
            <AuditHistory onSelectClaim={handleSelectClaim} />
          )}

          {activeTab === 'payer-rules' && <PayerRules />}

          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

export default App;
