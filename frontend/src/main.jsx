import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { BalanceProvider } from './context/BalanceContext.jsx';
import { TransactionsProvider } from './context/TransactionsContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BalanceProvider>
      <TransactionsProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </TransactionsProvider>
    </BalanceProvider>
  </React.StrictMode>
);
