
import React, { createContext, useState, useContext, ReactNode } from "react";

type Language = "en" | "it";

type Translations = {
  [key in Language]: {
    [key: string]: string;
  }
};

// All translations used in the app
const translations: Translations = {
  en: {
    customerView: "Customer View",
    singleSimulation: "Single Simulation",
    batchSimulations: "Batch Simulations",
    simulationParameters: "Simulation Parameters",
    numberOfClients: "Number of Clients",
    clientsNumber: "Number of Clients",
    tradesPerClient: "Trades per Client",
    challengeCost: "Challenge Cost (€)",
    tpGainChallenge: "TP Gain Challenge (€)",
    slLossChallenge: "SL Loss Challenge (€)",
    tpGainReal: "TP Gain Real (€)",
    slLossReal: "SL Loss Real (€)",
    propPayout: "Prop Payout (€)",
    runSimulation: "Run Simulation",
    runningSimulation: "Running Simulation...",
    simulationComplete: "Simulation Complete",
    netProfit: "Net Profit",
    simulationFailed: "Simulation Failed",
    simulationError: "An error occurred while running the simulation.",
    resultsCleared: "Results Cleared",
    allResultsCleared: "All simulation results have been cleared.",
    english: "English",
    italian: "Italian",
    licensesScalingTitle: "Profits by license",
    licensesScalingDescription: "Simulation results with different number of licenses",
    metrics: "Metrics",
    licenses: "licenses",
    challenges: "Challenges",
    challengeRefunds: "Challenge Refunds",
    tradesInReal: "Trades In Real",
    payouts: "Payouts",
    payoutPercentage: "Payout Percentage",
    simulationResults: "Simulation Results",
    simulationResultsDescription: "Historical results from all simulation runs",
    customerSimulationResults: "Simulation Results",
    customerSimulationResultsDescription: "Customer perspective simulation results",
    timestamp: "Timestamp",
    netProfitEuro: "Net Profit (€)",
    challengesBought: "Challenges",
    challengeCostEuro: "Challenge Cost (€)",
    challengeRefundsEuro: "Challenge Refunds (€)",
    propWithdrawEuro: "Prop Withdraw (€)",
    brokerWithdrawEuro: "Broker Withdraw (€)",
    tradesInRealColumn: "Trades in Real",
    payoutsColumn: "Payouts",
    payoutPercentageColumn: "Payout %",
    average: "Average",
    clearResults: "Clear Results",
  },
  it: {
    customerView: "Vista Cliente",
    singleSimulation: "Simulazione Singola",
    batchSimulations: "Simulazioni in Lotto",
    simulationParameters: "Parametri di Simulazione",
    numberOfClients: "Numero di Clienti",
    clientsNumber: "Numero di Clienti",
    tradesPerClient: "Operazioni per Cliente",
    challengeCost: "Costo Challenge (€)",
    tpGainChallenge: "Guadagno TP Challenge (€)",
    slLossChallenge: "Perdita SL Challenge (€)",
    tpGainReal: "Guadagno TP Reale (€)",
    slLossReal: "Perdita SL Reale (€)",
    propPayout: "Payout Prop (€)",
    runSimulation: "Esegui Simulazione",
    runningSimulation: "Simulazione in Corso...",
    simulationComplete: "Simulazione Completata",
    netProfit: "Profitto Netto",
    simulationFailed: "Simulazione Fallita",
    simulationError: "Si è verificato un errore durante l'esecuzione della simulazione.",
    resultsCleared: "Risultati Cancellati",
    allResultsCleared: "Tutti i risultati della simulazione sono stati cancellati.",
    english: "Inglese",
    italian: "Italiano",
    licensesScalingTitle: "Profitti per Licenza",
    licensesScalingDescription: "Risultati della simulazione con diverso numero di licenze",
    metrics: "Metriche",
    licenses: "licenze",
    challenges: "Challenge",
    challengeRefunds: "Rimborsi Challenge",
    tradesInReal: "Operazioni Reali",
    payouts: "Pagamenti",
    payoutPercentage: "Percentuale di Pagamento",
    simulationResults: "Risultati Simulazione",
    simulationResultsDescription: "Risultati storici di tutte le simulazioni effettuate",
    customerSimulationResults: "Risultati Simulazione Cliente",
    customerSimulationResultsDescription: "Risultati dalla prospettiva del cliente",
    timestamp: "Data e Ora",
    netProfitEuro: "Profitto Netto (€)",
    challengesBought: "Challenge Acquistate",
    challengeCostEuro: "Costo Challenge (€)",
    challengeRefundsEuro: "Rimborsi Challenge (€)",
    propWithdrawEuro: "Prelievo Prop (€)",
    brokerWithdrawEuro: "Prelievo Broker (€)",
    tradesInRealColumn: "Operazioni Reali",
    payoutsColumn: "Pagamenti",
    payoutPercentageColumn: "Percentuale %",
    average: "Media",
    clearResults: "Cancella Risultati",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
