import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BalanceBar from '../components/BalanceBar.jsx';
import { BalanceContext } from '../context/BalanceContext.jsx';

// mock fetch
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ availableCents: 8400, pendingCents: 21500 }) })
));

// Provide static balance data so component renders immediately
const MockProvider = ({ children }) => (
  <BalanceContext.Provider value={{ availableCents: 8400, pendingCents: 21500, loading: false }}>
    {children}
  </BalanceContext.Provider>
);

describe('BalanceBar', () => {
  it('shows fetched balance', async () => {
    render(
      <MockProvider>
        <BalanceBar />
      </MockProvider>
    );
    expect(screen.getByText('CA$84.00')).toBeInTheDocument();
    expect(screen.getByText('CA$215.00')).toBeInTheDocument();
  });
}); 