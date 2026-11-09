import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingPage from '../components/OnboardingPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    verifyInvitation: vi.fn(),
    completeOnboarding: vi.fn(),
  },
}));

describe('OnboardingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders missing token error when no token is passed', async () => {
    render(<OnboardingPage token={null} />);

    await waitFor(() => {
      expect(screen.getByText(/Missing Invitation Token/i)).toBeInTheDocument();
    });
  });

  it('renders invalid or expired token error when verification fails', async () => {
    api.verifyInvitation.mockRejectedValueOnce(new Error('This invitation link has expired or is invalid'));

    render(<OnboardingPage token="expired-tok-123" />);

    await waitFor(() => {
      expect(screen.getByText(/Invitation Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/This invitation link has expired or is invalid/i)).toBeInTheDocument();
    });
  });

  it('verifies valid token and renders password creation form with requirements', async () => {
    api.verifyInvitation.mockResolvedValueOnce({
      id: 'usr-sub-1',
      name: 'Frank Miller',
      email: 'frank@drywallpro.com',
      role: 'sub_contractor',
      status: 'pending_invitation'
    });

    render(<OnboardingPage token="valid-tok-123" />);

    await waitFor(() => {
      expect(screen.getByText('Frank Miller')).toBeInTheDocument();
      expect(screen.getByText('frank@drywallpro.com')).toBeInTheDocument();
      expect(screen.getByText('Trade Subcontractor')).toBeInTheDocument();
    });

    // Check password rules list
    expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/One uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/One lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/One number \(0-9\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Passwords match/i)).toBeInTheDocument();
  });

  it('validates password requirements as user types and submits successfully', async () => {
    api.verifyInvitation.mockResolvedValueOnce({
      id: 'usr-sub-1',
      name: 'Frank Miller',
      email: 'frank@drywallpro.com',
      role: 'sub_contractor',
      status: 'pending_invitation'
    });

    api.completeOnboarding.mockResolvedValueOnce({
      message: 'Onboarding complete',
      token: 'jwt-session-token',
      user: {
        id: 'usr-sub-1',
        name: 'Frank Miller',
        email: 'frank@drywallpro.com',
        role: 'sub_contractor',
        status: 'active'
      }
    });

    const mockOnComplete = vi.fn();

    render(<OnboardingPage token="valid-tok-123" onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('Frank Miller')).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText(/Enter a secure password/i);
    const confirmInput = screen.getByPlaceholderText(/Re-enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /Activate Account & Access Projects/i });

    expect(submitBtn).toBeDisabled();

    // Type valid password meeting all criteria: >= 8, uppercase, lowercase, digit
    fireEvent.change(passwordInput, { target: { value: 'Secret123' } });
    fireEvent.change(confirmInput, { target: { value: 'Secret123' } });

    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.completeOnboarding).toHaveBeenCalledWith({
        token: 'valid-tok-123',
        password: 'Secret123'
      });
      expect(screen.getByText(/Password Established!/i)).toBeInTheDocument();
    });
  });
});
