import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LandingPage from '../components/LandingPage';

describe('LandingPage Component', () => {
  it('renders hero headline, subheadline, and primary CTA', () => {
    const handleLaunch = vi.fn();
    const handleOpenLogin = vi.fn();
    const handleLegalPage = vi.fn();

    render(
      <LandingPage
        onLaunchWorkspace={handleLaunch}
        onOpenLogin={handleOpenLogin}
        onLegalPage={handleLegalPage}
      />
    );

    // Verify main headline
    expect(
      screen.getByText(/Defect tracking anchored to architectural drawings/i)
    ).toBeInTheDocument();

    // Verify CTA buttons
    const launchButtons = screen.getAllByRole('button', { name: /Launch Field Workspace/i });
    expect(launchButtons.length).toBeGreaterThanOrEqual(1);

    // Verify Sign In action
    const signInButtons = screen.getAllByRole('button', { name: /Sign In/i });
    expect(signInButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('triggers onLaunchWorkspace when Launch button is clicked', () => {
    const handleLaunch = vi.fn();

    render(
      <LandingPage
        onLaunchWorkspace={handleLaunch}
        onOpenLogin={vi.fn()}
        onLegalPage={vi.fn()}
      />
    );

    const launchButton = screen.getAllByRole('button', { name: /Launch Field Workspace/i })[0];
    fireEvent.click(launchButton);
    expect(handleLaunch).toHaveBeenCalledTimes(1);
  });

  it('triggers onOpenLogin when Sign In button is clicked', () => {
    const handleOpenLogin = vi.fn();

    render(
      <LandingPage
        onLaunchWorkspace={vi.fn()}
        onOpenLogin={handleOpenLogin}
        onLegalPage={vi.fn()}
      />
    );

    const signInButton = screen.getAllByRole('button', { name: /Sign In/i })[0];
    fireEvent.click(signInButton);
    expect(handleOpenLogin).toHaveBeenCalledTimes(1);
  });

  it('renders FAQ section and toggles accordion items', () => {
    render(
      <LandingPage
        onLaunchWorkspace={vi.fn()}
        onOpenLogin={vi.fn()}
        onLegalPage={vi.fn()}
      />
    );

    const firstFaqTrigger = screen.getByText(/How does PunchList Pro handle offline work/i);
    expect(firstFaqTrigger).toBeInTheDocument();

    // Click to open another FAQ
    const secondFaq = screen.getByText(/What prevents subcontractors from prematurely closing/i);
    fireEvent.click(secondFaq);
    expect(
      screen.getByText(/The platform enforces strict role based state transitions/i)
    ).toBeInTheDocument();
  });
});

