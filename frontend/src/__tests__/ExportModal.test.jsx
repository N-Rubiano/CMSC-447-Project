import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExportModal from '../components/ExportModal';

vi.mock('../services/api', () => ({
  getToken: vi.fn().mockResolvedValue('test-jwt-token'),
}));

describe('ExportModal Component', () => {
  const defaultProps = {
    project: { id: 'proj-1', name: 'UMBC Campus', code: 'UMBC-2026' },
    sheets: [{ id: 'sheet-1', sheet_number: 'A-101', name: 'First Floor' }],
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PDF and Excel export options', () => {
    render(<ExportModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Formal Punch List Summary Report \(\.pdf\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Project & Punch Workbook \(\.xlsx\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Annotated Drawing Set \(\.pdf\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Raw Spreadsheet Data \(\.csv\)/i)).toBeInTheDocument();
  });

  it('switches CTA label when Excel (.xlsx) is selected', () => {
    render(<ExportModal {...defaultProps} />);
    fireEvent.click(screen.getByText(/Project & Punch Workbook \(\.xlsx\)/i));
    expect(screen.getByRole('button', { name: /Download Excel \(\.xlsx\)/i })).toBeInTheDocument();
  });

  it('calls the backend /export/excel endpoint when downloading Excel', async () => {
    const mockBlob = new Blob(['xlsx-bytes']);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    render(<ExportModal {...defaultProps} />);
    fireEvent.click(screen.getByText(/Project & Punch Workbook \(\.xlsx\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Download Excel \(\.xlsx\)/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/proj-1/export/excel',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-jwt-token' },
        })
      );
    });
  });
});
