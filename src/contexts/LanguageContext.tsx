
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
  },
  it: {
    customerView: "Vista Cliente",
    singleSimulation: "Simulazione Singola",
    batchSimulations: "Simulazioni Batch",
    simulationParameters: "Parametri di Simulazione",
    numberOfClients: "Numero di Clienti",
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
    licensesScalingTitle: "Profitti per licenza",
    licensesScalingDescription: "Risultati della simulazione con diverso numero di licenze",
    metrics: "Metriche",
    licenses: "licenze",
    challenges: "Challenge",
    challengeRefunds: "Rimborsi Challenge",
    tradesInReal: "Operazioni Reali",
    payouts: "Pagamenti",
    payoutPercentage: "Percentuale di Pagamento",
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
