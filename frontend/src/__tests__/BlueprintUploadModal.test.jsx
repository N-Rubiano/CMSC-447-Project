import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BlueprintUploadModal from '../components/BlueprintUploadModal';

describe('BlueprintUploadModal Component', () => {
  it('renders upload dropzone, building metadata fields, and pinned actions', () => {
    render(
      <BlueprintUploadModal
        projectId="proj-1"
        projectName="UMBC Campus"
        initialBuildingName="Administration Building"
        initialFloorLevel="1st Floor"
        onClose={vi.fn()}
        onUploaded={vi.fn()}
      />
    );

    expect(screen.getByText('Upload Building Blueprint')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Administration Building')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1st Floor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingest Blueprint/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('switches to Latest Version (Revision) mode and auto-suggests next revision', () => {
    render(
      <BlueprintUploadModal
        projectId="proj-1"
        projectName="UMBC Campus"
        existingSheets={[{ id: 's1', sheet_number: 'A-101', name: 'First Floor Plan', version: 'Rev 1' }]}
        onClose={vi.fn()}
        onUploaded={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /Upload Latest Version/i }));
    expect(screen.getByText('Upload Latest Blueprint Version')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rev 2')).toBeInTheDocument();
  });
});
