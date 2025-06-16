import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SplitLinksDialog from '../components/SplitLinksDialog.jsx';

const links = [
  { name: 'Alice', amount_cents: 4000, currency: 'usd', url: 'https://example.com/alice' },
  { name: 'Bob', amount_cents: 4000, currency: 'usd', url: 'https://example.com/bob' }
];

describe('SplitLinksDialog', () => {
  it('shows names and amounts', () => {
    render(<SplitLinksDialog links={links} onClose={() => {}} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    const amounts = screen.getAllByText('$40.00');
    expect(amounts).toHaveLength(2); // one per friend
  });

  it('copies link on button click', async () => {
    const writeMock = vi.fn();
    navigator.clipboard = { writeText: writeMock };
    render(<SplitLinksDialog links={links} onClose={() => {}} />);
    fireEvent.click(screen.getAllByText('Copy Link')[0]);
    expect(writeMock).toHaveBeenCalledWith('https://example.com/alice');
  });
}); 