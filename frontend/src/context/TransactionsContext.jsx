import { createContext, useContext } from 'react';
import useTransactions from '../hooks/useTransactions.js';

export const TransactionsContext = createContext(null);

export function TransactionsProvider({ children }) {
  const value = useTransactions();
  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

export const useTransactionsContext = () => useContext(TransactionsContext); 