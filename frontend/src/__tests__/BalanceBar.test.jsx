import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BalanceBar from '../components/BalanceBar.jsx';

// mock fetch
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ amountCents: 12300 }) })
));

describe('BalanceBar', () => {
  it('shows fetched balance', async () => {
    render(<BalanceBar />);
    await waitFor(() => expect(screen.getByText('$123.00')).toBeInTheDocument());
  });
}); 