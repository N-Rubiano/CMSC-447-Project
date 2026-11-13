import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../components/SettingsPage';

// Mock dynamic import of api
vi.mock('../services/api', () => ({
  api: {
    updateProfile: vi.fn().mockResolvedValue({
      user: { id: 'usr-admin-1', name: 'Satya Thakur', avatar_url: 'https://example.com/new-avatar.jpg' }
    }),
  },
}));

describe('SettingsPage Component — Avatar & Profile', () => {
  let mockOnUpdateUser;
  let mockOnSaveProject;
  const mockCurrentUser = {
    id: 'usr-admin-1',
    name: 'Satya Thakur',
    email: 'uw61778@umbc.edu',
    role: 'admin',
    company: 'UMBC Facility Operations',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    phone: '+1 (410) 455-1000'
  };

  beforeEach(() => {
    mockOnUpdateUser = vi.fn();
    mockOnSaveProject = vi.fn();
    vi.clearAllMocks();
  });

  it('renders profile and avatar customization tab by default', () => {
    render(
      <SettingsPage
        currentUser={mockCurrentUser}
        onUpdateUser={mockOnUpdateUser}
        onSaveProject={mockOnSaveProject}
      />
    );

    expect(screen.getByText(/Profile & Avatar Customization/i)).toBeInTheDocument();
    expect(screen.getByText('Satya Thakur')).toBeInTheDocument();
    expect(screen.getByText('uw61778@umbc.edu')).toBeInTheDocument();
    expect(screen.getByText(/Upload Image/i)).toBeInTheDocument();
  });

  it('allows picking a preset avatar from the gallery', () => {
    render(
      <SettingsPage
        currentUser={mockCurrentUser}
        onUpdateUser={mockOnUpdateUser}
        onSaveProject={mockOnSaveProject}
      />
    );

    const suptButton = screen.getByRole('button', { name: /Superintendent/i });
    fireEvent.click(suptButton);

    const mainPreview = screen.getByAltText('Satya Thakur');
    expect(mainPreview.src).toContain('photo-1507003211169-0a1dd7228f2d');
  });

  it('allows switching to generated initials avatar', () => {
    render(
      <SettingsPage
        currentUser={mockCurrentUser}
        onUpdateUser={mockOnUpdateUser}
        onSaveProject={mockOnSaveProject}
      />
    );

    const initialsBtn = screen.getByRole('button', { name: /Use Initials/i });
    fireEvent.click(initialsBtn);

    const mainPreview = screen.getByAltText('Satya Thakur');
    expect(mainPreview.src).toContain('ui-avatars.com');
  });

  it('saves updated avatar and triggers onUpdateUser callback', async () => {
    render(
      <SettingsPage
        currentUser={mockCurrentUser}
        onUpdateUser={mockOnUpdateUser}
        onSaveProject={mockOnSaveProject}
      />
    );

    const suptButton = screen.getByRole('button', { name: /Superintendent/i });
    fireEvent.click(suptButton);

    const saveBtn = screen.getByRole('button', { name: /Save Profile & Avatar/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnUpdateUser).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateUser).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Satya Thakur',
        avatar: expect.stringContaining('photo-1507003211169-0a1dd7228f2d'),
        avatar_url: expect.stringContaining('photo-1507003211169-0a1dd7228f2d'),
      }));
    });

    expect(await screen.findByText(/Avatar and profile details saved successfully!/i)).toBeInTheDocument();
  });

  it('allows navigating to other settings tabs like Project Info', () => {
    render(
      <SettingsPage
        currentUser={mockCurrentUser}
        onUpdateUser={mockOnUpdateUser}
        onSaveProject={mockOnSaveProject}
      />
    );

    const projectTabBtn = screen.getByRole('button', { name: /Project Info/i });
    fireEvent.click(projectTabBtn);

    expect(screen.getByText(/Project Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Project Name/i)).toBeInTheDocument();
  });

  it('shows Role Permissions tab and RBAC matrix when logged in as admin', () => {
    render(
      <SettingsPage
        currentUser={mockCurrentUser} // role: 'admin'
        onUpdateUser={mockOnUpdateUser}
        onSaveProject={mockOnSaveProject}
      />
    );

    const permissionsTabBtn = screen.getByRole('button', { name: /Role Permissions/i });
    expect(permissionsTabBtn).toBeInTheDocument();

    fireEvent.click(permissionsTabBtn);
    expect(screen.getByText(/Role-Based Access Control \(RBAC\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Project Role/i)).toBeInTheDocument();
  });

  it('hides Role Permissions tab and RBAC matrix when logged in as non-admin', () => {
    const nonAdminUser = {
      ...mockCurrentUser,
      role: 'sub_contractor'
    };

    render(
      <SettingsPage
        currentUser={nonAdminUser}
        onUpdateUser={mockOnUpdateUser}
        onSaveProject={mockOnSaveProject}
      />
    );

    expect(screen.queryByRole('button', { name: /Role Permissions/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Role-Based Access Control \(RBAC\)/i)).not.toBeInTheDocument();
  });
});

