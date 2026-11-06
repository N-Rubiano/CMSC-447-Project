import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../components/LoginPage';

// Mock dynamic import of api
vi.mock('../services/api', () => ({
  api: {
    login: vi.fn().mockImplementation((email, password) => {
      if (email === 'uw61778@umbc.edu' && password === 'Thakur@531') {
        return Promise.resolve({
          user: { id: 'usr-admin-1', email: 'uw61778@umbc.edu', role: 'admin', name: 'Satya Thakur' },
          token: 'mock-jwt-token',
        });
      }
      return Promise.reject(new Error('Invalid email or password'));
    }),
  },
}));

describe('LoginPage Component', () => {
  let mockOnLogin;

  beforeEach(() => {
    mockOnLogin = vi.fn();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders headline, welcome card, and login input fields', () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    expect(screen.getByText(/Smarter/i)).toBeInTheDocument();
    expect(screen.getByText(/Stronger/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Welcome!/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your username or email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log In/i })).toBeInTheDocument();
  });

  it('does NOT render "Create an Account" or "Continue with Google"', () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    expect(screen.queryByText(/Create an Account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Continue with Google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Or continue with/i)).not.toBeInTheDocument();
  });

  it('renders "Save password" option and persists credentials on login when checked', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    const savePasswordCheckbox = screen.getByLabelText(/Save password/i);
    expect(savePasswordCheckbox).toBeInTheDocument();
    expect(savePasswordCheckbox.checked).toBe(false);

    fireEvent.click(savePasswordCheckbox);
    expect(savePasswordCheckbox.checked).toBe(true);

    const emailInput = screen.getByPlaceholderText(/Enter your username or email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);

    fireEvent.change(emailInput, { target: { value: 'uw61778@umbc.edu' } });
    fireEvent.change(passwordInput, { target: { value: 'Thakur@531' } });

    const submitBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.submit(submitBtn.closest('form'));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledTimes(1);
    });

    expect(localStorage.getItem('punchlist_save_creds')).toBe('true');
    const saved = JSON.parse(localStorage.getItem('punchlist_saved_creds') || '{}');
    expect(saved.email).toBe('uw61778@umbc.edu');
    expect(saved.password).toBe('Thakur@531');
  });

  it('displays error when submitting with empty email or password', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    const submitBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.submit(submitBtn.closest('form'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Please enter your email and password/i);
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('displays error when credentials are invalid', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    const emailInput = screen.getByPlaceholderText(/Enter your username or email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    const submitBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.submit(submitBtn.closest('form'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Invalid email or password/i);
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('invokes onLogin callback on valid admin submission', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    const emailInput = screen.getByPlaceholderText(/Enter your username or email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);

    fireEvent.change(emailInput, { target: { value: 'uw61778@umbc.edu' } });
    fireEvent.change(passwordInput, { target: { value: 'Thakur@531' } });

    const submitBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.submit(submitBtn.closest('form'));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledTimes(1);
      expect(mockOnLogin).toHaveBeenCalledWith(expect.objectContaining({
        email: 'uw61778@umbc.edu',
        role: 'admin',
      }));
    });
  });
});
