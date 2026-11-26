import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppShell from '../components/AppShell';

describe('AppShell Component', () => {
  const mockUser = {
    name: 'Jane Doe',
    email: 'jane@punchlistpro.demo',
    role: 'admin',
  };

  const defaultProps = {
    activeModule: 'dashboard',
    onNavigate: vi.fn(),
    selectedBuildingId: 'eng',
    selectedFloorId: 'Floor 1',
    onSelectUmbcBuilding: vi.fn(),
    onSelectUmbcFloor: vi.fn(),
    currentUser: mockUser,
    openPunchCount: 4,
    syncState: 'synced',
    onToggleSyncState: vi.fn(),
    onOpenQuickSearch: vi.fn(),
    onNewPunch: vi.fn(),
    onLogout: vi.fn(),
  };

  it('renders full-width topbar with search pill and collapsed icon rail by default', () => {
    render(
      <AppShell {...defaultProps}>
        <div>Workspace Content</div>
      </AppShell>
    );

    expect(screen.getByText('Search pins, sheets…')).toBeInTheDocument();
    expect(screen.getByLabelText('New Punch Item')).toBeInTheDocument();
    expect(screen.queryByText('New Punch')).not.toBeInTheDocument();
    expect(screen.getByText('Workspace Content')).toBeInTheDocument();
  });

  it('expands the left rail when the topbar hamburger button is clicked', () => {
    render(<AppShell {...defaultProps} />);

    const menuBtn = screen.getByLabelText('Expand main menu');
    fireEvent.click(menuBtn);

    expect(screen.getByLabelText('Collapse main menu')).toBeInTheDocument();
    expect(screen.getByText('New Punch')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();
  });

  it('triggers onNewPunch and onOpenQuickSearch from shell controls', () => {
    const onNewPunch = vi.fn();
    const onOpenQuickSearch = vi.fn();
    render(
      <AppShell
        {...defaultProps}
        onNewPunch={onNewPunch}
        onOpenQuickSearch={onOpenQuickSearch}
      />
    );

    fireEvent.click(screen.getByLabelText('New Punch Item'));
    expect(onNewPunch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Search pins, sheets, and punch items'));
    expect(onOpenQuickSearch).toHaveBeenCalledTimes(1);
  });

  it('opens user account menu and triggers sign out', () => {
    const onLogout = vi.fn();
    render(<AppShell {...defaultProps} onLogout={onLogout} />);

    fireEvent.click(screen.getByLabelText('Account menu for Jane Doe'));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Facility Administrator')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: /Sign out/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('hides New Punch compose button when onNewPunch is omitted (sub_contractor / owner)', () => {
    render(<AppShell {...defaultProps} onNewPunch={undefined} />);
    expect(screen.queryByLabelText('New Punch Item')).not.toBeInTheDocument();
  });

  it('filters buildings, selects via Enter, and picks a floor in BuildingFloorSelector', () => {
    const onSelectUmbcBuilding = vi.fn();
    const onSelectUmbcFloor = vi.fn();
    render(
      <AppShell
        {...defaultProps}
        selectedBuildingId={null}
        selectedFloorId={null}
        onSelectUmbcBuilding={onSelectUmbcBuilding}
        onSelectUmbcFloor={onSelectUmbcFloor}
      />
    );

    fireEvent.click(screen.getByTitle('Select building'));
    const searchInput = screen.getByLabelText('Search buildings');
    fireEvent.change(searchInput, { target: { value: 'Academic IV' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onSelectUmbcBuilding).toHaveBeenCalledWith('academic-iv');

    fireEvent.click(screen.getByText('Ground Floor'));
    expect(onSelectUmbcFloor).toHaveBeenCalledWith('Ground Floor', 'academic-iv');
  });

  it('clears selected building and floor via the Clear action', () => {
    const onSelectUmbcBuilding = vi.fn();
    render(
      <AppShell
        {...defaultProps}
        selectedBuildingId="academic-iv"
        selectedFloorId="Ground Floor"
        onSelectUmbcBuilding={onSelectUmbcBuilding}
      />
    );

    fireEvent.click(screen.getByTitle('Select building'));
    fireEvent.click(screen.getByLabelText('Clear selected building and level'));
    expect(onSelectUmbcBuilding).toHaveBeenCalledWith(null);
  });
});
