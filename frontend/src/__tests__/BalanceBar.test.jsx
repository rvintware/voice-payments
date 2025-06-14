import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BalanceBar from '../components/BalanceBar.jsx';

// mock fetch
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ availableCents: 8400, pendingCents: 21500 }) })
));

describe('BalanceBar', () => {
  it('shows fetched balance', async () => {
    render(<BalanceBar />);
    await waitFor(() => {
      expect(screen.getByText('CA$84.00')).toBeInTheDocument();
      expect(screen.getByText('CA$215.00')).toBeInTheDocument();
    });
  });
}); 