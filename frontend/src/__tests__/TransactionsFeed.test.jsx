import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import TransactionsFeed from '../components/TransactionsFeed.jsx';
import { TransactionsContext } from '../context/TransactionsContext.jsx';

const sampleTx = {
  id: 'pi_test',
  amount: 1234,
  currency: 'usd',
  status: 'succeeded',
  card_brand: 'visa',
  last4: '4242',
  description: 'Unit test',
  customer_email: 'demo@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Stub IntersectionObserver for jsdom
beforeAll(() => {
  global.IntersectionObserver = class {
    // eslint-disable-next-line class-methods-use-this
    observe() {}
    // eslint-disable-next-line class-methods-use-this
    disconnect() {}
  };
});

const MockProvider = ({ children }) => (
  <TransactionsContext.Provider value={{ transactions: [sampleTx], fetchMore: vi.fn(), hasMore: false }}>
    {children}
  </TransactionsContext.Provider>
);

describe('TransactionsFeed', () => {
  it('renders customer email and amount', () => {
    render(
      <MockProvider>
        <TransactionsFeed />
      </MockProvider>
    );
    expect(screen.getByText('demo@example.com')).toBeInTheDocument();
    expect(screen.getByText('$12.34')).toBeInTheDocument();
    expect(screen.getByText('succeeded')).toBeInTheDocument();
  });
}); 