import { describe, it, expect, beforeEach } from 'vitest';
import { hasCapability, saveRolePermissions, ROLE_PERMISSIONS } from '../data/rbac';

describe('RBAC Capability Enforcement — All 6 Roles', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('denies dropPins and editDocs to sub_contractor and owner', () => {
    expect(hasCapability('sub_contractor', 'dropPins')).toBe(false);
    expect(hasCapability('sub_contractor', 'editDocs')).toBe(false);
    expect(hasCapability('sub_contractor', 'approvePunches')).toBe(false);
    expect(hasCapability('sub_contractor', 'adminSettings')).toBe(false);

    expect(hasCapability('owner', 'dropPins')).toBe(false);
    expect(hasCapability('owner', 'editDocs')).toBe(false);
    expect(hasCapability('owner', 'approvePunches')).toBe(false);
    expect(hasCapability('owner', 'adminSettings')).toBe(false);
  });

  it('grants dropPins to admin, general_contractor, architect, and field_inspector', () => {
    expect(hasCapability('admin', 'dropPins')).toBe(true);
    expect(hasCapability('general_contractor', 'dropPins')).toBe(true);
    expect(hasCapability('architect', 'dropPins')).toBe(true);
    expect(hasCapability('field_inspector', 'dropPins')).toBe(true);
  });

  it('persists SettingsPage RBAC matrix overrides immediately', () => {
    const updated = ROLE_PERMISSIONS.map((r) =>
      r.role === 'field_inspector' ? { ...r, dropPins: false } : { ...r }
    );
    saveRolePermissions(updated);

    expect(hasCapability('field_inspector', 'dropPins')).toBe(false);
    expect(hasCapability('sub_contractor', 'dropPins')).toBe(false);
  });
});
