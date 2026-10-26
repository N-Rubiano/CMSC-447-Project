import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../components/LoginPage';

// Mock dynamic import of api
vi.mock('../services/api', () => ({
  api: {
    login: vi.fn().mockResolvedValue({
      user: { id: 'usr-1', email: 'admin@punchlistpro.demo', role: 'admin' },
      token: 'mock-jwt-token',
    }),
  },
}));

describe('LoginPage Component', () => {
  let mockOnLogin;

  beforeEach(() => {
    mockOnLogin = vi.fn();
    vi.clearAllMocks();
  });

  it('renders headline and welcome card', () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    expect(screen.getByText(/Smarter/i)).toBeInTheDocument();
    expect(screen.getByText(/Stronger/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Welcome!/i })).toBeInTheDocument();
  });

  it('renders all 6 role demo account quick-select buttons', () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    expect(screen.getByLabelText(/Select demo account: Admin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select demo account: Contractor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select demo account: Subcontractor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select demo account: Architect/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select demo account: Owner Rep/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select demo account: Field Inspector/i)).toBeInTheDocument();
  });

  it('updates email and password when selecting a different demo account', () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    const subButton = screen.getByLabelText(/Select demo account: Subcontractor/i);
    fireEvent.click(subButton);

    const emailInput = screen.getByPlaceholderText(/Enter your username or email/i);
    expect(emailInput.value).toBe('sub@punchlistpro.demo');
    expect(subButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('displays error when submitting with empty email or password', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    const emailInput = screen.getByPlaceholderText(/Enter your username or email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);

    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.submit(submitBtn.closest('form'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Please enter your email and password/i);
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('invokes onLogin callback on valid submission', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    const submitBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledTimes(1);
    });
  });
});
