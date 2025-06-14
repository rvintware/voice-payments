import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConfirmationDialog from '../components/ConfirmationDialog.jsx';

// Mock useTTS to avoid actual network/audio
vi.mock('../hooks/useTTS.js', () => {
  return {
    default: () => ({ loading: false }),
  };
});

describe('ConfirmationDialog', () => {
  it('renders amount and name', () => {
    render(
      <ConfirmationDialog
        amountCents={2000}
        recipientEmail="teja@gmail.com"
        onPaymentLink={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText(/Send \$20.00 to teja/)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
}); 