import { render, screen } from '@testing-library/react';
import App from '../App.jsx';
import { TransactionsContext } from '../context/TransactionsContext.jsx';
import { BalanceContext } from '../context/BalanceContext.jsx';

// Minimal stub contexts so the component tree renders without network.
const txStub = {
  transactions: [
    {
      id: 'test',
      amount: 1234,
      currency: 'usd',
      status: 'succeeded',
      created_at: new Date().toISOString()
    }
  ],
  fetchMore: () => {},
  hasMore: false
};
const balStub = { pendingCents: 0, availableCents: 0 };

test('App renders Transaction History section', () => {
  render(
    <BalanceContext.Provider value={balStub}>
      <TransactionsContext.Provider value={txStub}>
        <App />
      </TransactionsContext.Provider>
    </BalanceContext.Provider>
  );
  expect(screen.getByText(/Transaction History/i)).toBeInTheDocument();
}); 