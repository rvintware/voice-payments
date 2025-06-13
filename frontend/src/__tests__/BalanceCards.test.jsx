import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BalanceCards from '../components/BalanceCards.jsx';

vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ availableCents: 8400, pendingCents: 21500 }) })
));

describe('BalanceCards', () => {
  it('renders available and pending amounts', async () => {
    render(<BalanceCards />);
    await waitFor(() => {
      expect(screen.getByText('CA$84.00')).toBeInTheDocument();
      expect(screen.getByText('CA$215.00')).toBeInTheDocument();
    });
  });
}); 