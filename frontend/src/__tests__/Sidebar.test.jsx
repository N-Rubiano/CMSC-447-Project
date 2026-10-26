import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Sidebar';

describe('Sidebar Component', () => {
  const mockUser = {
    name: 'Jane Doe',
    email: 'jane@punchlistpro.demo',
    role: 'admin',
    company: 'Apex Construction',
  };

  const defaultProps = {
    activeModule: 'dashboard',
    onNavigate: vi.fn(),
    currentUser: mockUser,
    activeProject: { id: 'p1', name: 'Downtown Medical Center' },
    projects: [{ id: 'p1', name: 'Downtown Medical Center' }],
    onSelectProject: vi.fn(),
    onOpenNewProject: vi.fn(),
    onLogout: vi.fn(),
  };

  it('renders all primary workspace navigation items', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Ongoing Projects')).toBeInTheDocument();
    expect(screen.getByText('Field Report')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('calls onNavigate when a nav item is clicked', () => {
    const onNavigate = vi.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);

    const teamButton = screen.getByText('Team');
    fireEvent.click(teamButton);

    expect(onNavigate).toHaveBeenCalledWith('team');
  });

  it('renders current user details and role label', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Facility Administrator')).toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', () => {
    const onLogout = vi.fn();
    render(<Sidebar {...defaultProps} onLogout={onLogout} />);

    const logoutBtn = screen.getByLabelText('Sign out');
    fireEvent.click(logoutBtn);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
