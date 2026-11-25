import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamPage from '../components/TeamPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getTeam: vi.fn(),
    getCompanies: vi.fn(),
    addTeamMember: vi.fn(),
  },
}));

describe('TeamPage Component — 6 Canonical Roles & Onboarding', () => {
  const adminUser = {
    id: 'u-admin',
    name: 'Admin User',
    email: 'admin@punchlistpro.demo',
    role: 'admin',
  };

  const sampleProjects = [
    { id: 'proj-1', name: 'UMBC Engineering', status: 'active' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.getTeam.mockResolvedValue([
      { id: 'u1', name: 'Alice Admin', email: 'alice@test.com', role: 'admin', status: 'active' },
      { id: 'u2', name: 'Bob GC', email: 'bob@test.com', role: 'general_contractor', status: 'active' },
      { id: 'u3', name: 'Cara Arch', email: 'cara@test.com', role: 'architect', status: 'active' },
      { id: 'u4', name: 'Dan Inspector', email: 'dan@test.com', role: 'field_inspector', status: 'active' },
      { id: 'u5', name: 'Eve Sub', email: 'eve@test.com', role: 'sub_contractor', status: 'active', trade: 'EL' },
      { id: 'u6', name: 'Frank Owner', email: 'frank@test.com', role: 'owner', status: 'active' },
    ]);
    api.getCompanies.mockResolvedValue([]);
    api.addTeamMember.mockResolvedValue({
      user: {
        id: 'u7',
        name: 'Grace Architect',
        email: 'grace@design.com',
        role: 'architect',
        status: 'pending_invitation',
      },
      invitation_token: 'tok-arch-123',
    });
  });

  it('renders all 6 canonical role tabs and displays members from every role in the unified directory', async () => {
    render(<TeamPage currentUser={adminUser} projects={sampleProjects} />);

    expect(await screen.findByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob GC')).toBeInTheDocument();
    expect(screen.getByText('Cara Arch')).toBeInTheDocument();
    expect(screen.getByText('Dan Inspector')).toBeInTheDocument();
    expect(screen.getByText('Eve Sub')).toBeInTheDocument();
    expect(screen.getByText('Frank Owner')).toBeInTheDocument();

    expect(document.getElementById('team-container-all')).toBeInTheDocument();
    expect(document.getElementById('team-container-admin')).toBeInTheDocument();
    expect(document.getElementById('team-container-general_contractor')).toBeInTheDocument();
    expect(document.getElementById('team-container-architect')).toBeInTheDocument();
    expect(document.getElementById('team-container-field_inspector')).toBeInTheDocument();
    expect(document.getElementById('team-container-sub_contractor')).toBeInTheDocument();
    expect(document.getElementById('team-container-owner')).toBeInTheDocument();

    // Filtering by Field Inspector isolates Dan Inspector
    fireEvent.click(document.getElementById('team-container-field_inspector'));
    expect(screen.getByText('Dan Inspector')).toBeInTheDocument();
    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
  });

  it('onboards a newly provisioned Architect using the existing invitation flow', async () => {
    render(<TeamPage currentUser={adminUser} projects={sampleProjects} />);

    const archTab = await waitFor(() => document.getElementById('team-container-architect'));
    fireEvent.click(archTab);

    fireEvent.click(screen.getByRole('button', { name: /Provision Architect \/ Engineer/i }));

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Grace Architect' } });
    fireEvent.change(screen.getByLabelText(/Work Email/i), { target: { value: 'grace@design.com' } });

    const roleSelect = screen.getByLabelText(/Role \/ Position Title/i);
    expect(roleSelect.value).toBe('architect');

    fireEvent.submit(roleSelect.closest('form'));

    await waitFor(() => {
      expect(api.addTeamMember).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Grace Architect',
          email: 'grace@design.com',
          role: 'architect',
          teamCategory: 'architect',
        })
      );
    });
  });
});
