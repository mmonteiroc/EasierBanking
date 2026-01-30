import { useState, useMemo, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { FileDropZone } from './components/upload/FileDropZone';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { AdvancedAnalytics } from './pages/AdvancedAnalytics';
import { RulesManagerModal } from './components/dashboard/RulesManagerModal';
import { SessionManager } from './components/session/SessionManager';
import { parseBankCSV } from './utils/csvParser';
import { type BankStatement, type Transaction } from './types/banking';
import { useCategoryManager } from './hooks/useCategoryManager';
import { useSession } from './hooks/useSession';
import { useRecurringRulesManager } from './hooks/useRecurringRulesManager';
import { dbService } from './services/db';
import { LogOut } from 'lucide-react';
import './App.css';

function App() {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    sessions,
    activeSession,
    createSession,
    switchSession,
    removeSession
  } = useSession();

  const { reclassifyTransactions, addRule, removeRule, addOverride, toggleInvestmentCategory, rules, investmentCategories } = useCategoryManager();
  const {
    rules: recurringRules,
    addRule: addRecurringRule,
    removeRule: removeRecurringRule,
    toggleRule: toggleRecurringRule
  } = useRecurringRulesManager(activeSession?.id);

  // Load session data when active session changes
  useEffect(() => {
    if (activeSession) {
      setIsLoading(true);
      dbService.loadSessionData(activeSession.id)
        .then(data => {
          setStatements(data);
        })
        .catch(err => console.error("Failed to load session data:", err))
        .finally(() => setIsLoading(false));
    } else {
      setStatements([]);
    }
  }, [activeSession]);

  // Re-classify transactions whenever rules/overrides change
  const processedStatements = useMemo(() => {
    return statements.map(stmt => ({
      ...stmt,
      transactions: reclassifyTransactions(stmt.transactions)
    }));
  }, [statements, reclassifyTransactions]);

  const handleCategoryUpdate = (transaction: Transaction, newCategory: string, applyToSimilar: boolean, isInvestment: boolean) => {
    if (applyToSimilar) {
      addRule(transaction.description, newCategory);
    } else {
      addOverride(transaction.id, newCategory);
    }
    toggleInvestmentCategory(newCategory, isInvestment);
  };

  const handleFilesDropped = async (files: File[]) => {
    if (!activeSession) return;

    setIsLoading(true);
    try {
      const parsedStatements = await Promise.all(files.map(parseBankCSV));

      // Save to DB (this will handle month replacement logic internally)
      await dbService.saveStatements(activeSession.id, parsedStatements);

      // Reload fresh data from DB to ensure state consistency
      const updatedData = await dbService.loadSessionData(activeSession.id);
      setStatements(updatedData);

    } catch (error) {
      console.error("Error parsing files:", error);
      alert("Failed to parse one or more files. Please ensure they are valid CSV bank statements.");
    } finally {
      setIsLoading(false);
    }
  };

  const allTransactions = useMemo(() => {
    return processedStatements.flatMap(s => s.transactions);
  }, [processedStatements]);

  const currentBalance = useMemo(() => {
    return processedStatements[0]?.closingBalance || 0;
  }, [processedStatements]);

  const handleEraseData = async () => {
    if (!activeSession) return;

    try {
      await dbService.deleteSessionData(activeSession.id);
      setStatements([]);
      alert(`All data for "${activeSession.name}" has been erased.`);
    } catch (error) {
      console.error("Error erasing data:", error);
      alert("Failed to erase data. Please try again.");
    }
  };

  if (!activeSession) {
    return (
      <SessionManager
        sessions={sessions}
        activeSession={activeSession}
        onCreateSession={createSession}
        onSwitchSession={switchSession}
        onRemoveSession={(id) => {
          dbService.deleteSessionData(id);
          removeSession(id);
        }}
      />
    );
  }

  return (
    <Router>
      <Layout
        showNavigation={processedStatements.length > 0}
        activeSession={activeSession}
        onSwitchProfile={() => switchSession('')}
        onEraseData={handleEraseData}
        onImportFiles={processedStatements.length > 0 ? () => fileInputRef.current?.click() : undefined}
        onManageRules={processedStatements.length > 0 ? () => setShowRulesModal(true) : undefined}
      >
        {processedStatements.length === 0 ? (
          <div className="upload-container">
            <div className="welcome-header">
              <h2>Welcome, {activeSession.name}</h2>
              <p className="subtitle">Import your bank statements to analyze your finances.</p>
            </div>
            <FileDropZone onFilesDropped={handleFilesDropped} isLoading={isLoading} />

            <div className="session-footer">
              <button onClick={() => switchSession('')} className="btn-link dim">
                <LogOut size={16} /> Switch Profile
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Hidden file input for Import Files functionality */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFilesDropped(Array.from(e.target.files));
                  e.target.value = ''; // Reset
                }
              }}
              hidden
              multiple
              accept=".csv"
            />

            <Routes>
              <Route
                path="/"
                element={
                  <AnalyticsDashboard
                    statements={processedStatements}
                    onCategoryUpdate={handleCategoryUpdate}
                    investmentCategories={investmentCategories}
                  />
                }
              />
              <Route
                path="/advanced-analytics"
                element={
                  <AdvancedAnalytics
                    transactions={allTransactions}
                    currentBalance={currentBalance}
                    recurringRules={recurringRules}
                    onAddRecurringRule={addRecurringRule}
                    onRemoveRecurringRule={removeRecurringRule}
                    onToggleRecurringRule={toggleRecurringRule}
                  />
                }
              />
            </Routes>

            <RulesManagerModal
              isOpen={showRulesModal}
              onClose={() => setShowRulesModal(false)}
              rules={rules}
              onAddRule={(pattern, category, isInvestment) => {
                addRule(pattern, category);
                if (isInvestment) {
                  toggleInvestmentCategory(category, true);
                }
              }}
              onRemoveRule={removeRule}
            />
          </>
        )}
      </Layout>
    </Router>
  );
}

export default App;
