import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PaymentResult from '../components/PaymentResult.jsx';

describe('PaymentResult component', () => {
  it('does not render when url is null', () => {
    const { container } = render(<PaymentResult url={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows link and copy button when url provided', () => {
    render(<PaymentResult url="https://example.com" />);
    expect(screen.getByText(/Payment Ready/)).toBeInTheDocument();
    expect(screen.getByText('Copy Link ↗')).toBeInTheDocument();
  });
}); 