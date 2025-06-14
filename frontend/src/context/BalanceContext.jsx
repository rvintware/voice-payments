import { createContext, useContext } from 'react';
import useBalanceHook from '../hooks/useBalance.js';

const BalanceContext = createContext({ availableCents: null, pendingCents: null, loading: true });

export function BalanceProvider({ children }) {
  const balance = useBalanceHook();
  return <BalanceContext.Provider value={balance}>{children}</BalanceContext.Provider>;
}

export const useBalance = () => useContext(BalanceContext);

export { BalanceContext }; 