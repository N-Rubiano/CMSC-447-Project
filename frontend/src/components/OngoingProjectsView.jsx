import React, { useState } from 'react';
import {
  FolderKanban,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  MapPin,
  Check,
  Layers,
  ChevronRight,
  Shield,
  ArrowUpRight
} from 'lucide-react';
import './DashboardView.css';

export default function OngoingProjectsView({
  projects = [],
  activeProject,
  onSelectProject,
  onOpenNewProject,
  onNavigateToPlan,
  currentUser
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'planning'

  const filteredProjects = projects.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.assigned_gc || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && p.status !== 'completed';
    if (statusFilter === 'planning') return matchesSearch && (p.status === 'planning' || p.status === 'draft');
    return matchesSearch;
  });

  const canCreate = currentUser?.role === 'admin' || currentUser?.role === 'general_contractor';

  return (
    <div className="ongoing-projects-container">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706' }}>
                <FolderKanban size={22} />
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-main, #18181B)' }}>
                Ongoing Projects
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #78716C)' }}>
              Manage and select active campus construction and renovation projects.
            </p>
          </div>

          {canCreate && (
            <button
              onClick={onOpenNewProject}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)'
              }}
            >
              <Plus size={16} />
              <span>Create New Project</span>
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          backgroundColor: 'var(--bg-surface-1, #FFFFFF)',
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid var(--border-default, #DCD5C8)',
          marginBottom: 20,
          flexWrap: 'wrap'
        }}>
          {/* Search box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--bg-surface-2, #F7F5F0)',
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid var(--border-default, #DCD5C8)',
            flex: '1 1 260px',
            maxWidth: 400
          }}>
            <Search size={15} color="#78716C" />
            <input
              type="text"
              placeholder="Search ongoing projects by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: 13,
                color: 'var(--text-main, #18181B)'
              }}
            />
          </div>

          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid',
                borderColor: statusFilter === 'all' ? '#D97706' : 'var(--border-default, #DCD5C8)',
                backgroundColor: statusFilter === 'all' ? '#FEF3C7' : 'transparent',
                color: statusFilter === 'all' ? '#92400E' : 'var(--text-muted, #78716C)',
                cursor: 'pointer'
              }}
            >
              All Projects ({projects.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid',
                borderColor: statusFilter === 'active' ? '#D97706' : 'var(--border-default, #DCD5C8)',
                backgroundColor: statusFilter === 'active' ? '#FEF3C7' : 'transparent',
                color: statusFilter === 'active' ? '#92400E' : 'var(--text-muted, #78716C)',
                cursor: 'pointer'
              }}
            >
              Active ({projects.filter(p => p.status !== 'completed').length})
            </button>
          </div>
        </div>

        {/* Projects Cards Grid */}
        {filteredProjects.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'var(--bg-surface-1, #FFFFFF)',
            borderRadius: 12,
            border: '1px dashed var(--border-default, #DCD5C8)',
            color: 'var(--text-muted, #78716C)'
          }}>
            <Building2 size={36} style={{ marginBottom: 12, color: '#A8A29E' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700 }}>No Ongoing Projects Found</h3>
            <p style={{ margin: 0, fontSize: 13 }}>Try adjusting your search criteria or create a new project.</p>
          </div>
        ) : (
          <div className="ongoing-projects-grid">
            {filteredProjects.map(project => {
              const isActive = project.id === activeProject?.id;
              return (
                <div
                  key={project.id}
                  style={{
                    backgroundColor: 'var(--bg-surface-1, #FFFFFF)',
                    borderRadius: 12,
                    border: isActive ? '2px solid #D97706' : '1px solid var(--border-default, #DCD5C8)',
                    boxShadow: isActive ? '0 4px 20px rgba(217, 119, 6, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Top Header */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontFamily: 'var(--font-mono, monospace)',
                        letterSpacing: '0.04em'
                      }}>
                        {project.code || `PRJ-${project.id}`}
                      </span>

                      {isActive ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 800,
                          backgroundColor: '#D97706',
                          color: '#FFFFFF',
                          padding: '3px 10px',
                          borderRadius: 20
                        }}>
                          <Check size={12} /> Active
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#166534',
                          backgroundColor: '#DCFCE7',
                          padding: '3px 8px',
                          borderRadius: 6
                        }}>
                          Ongoing
                        </span>
                      )}
                    </div>

                    <h3 style={{
                      margin: '0 0 8px 0',
                      fontSize: 16,
                      fontWeight: 800,
                      color: 'var(--text-main, #18181B)',
                      lineHeight: 1.3
                    }}>
                      {project.name}
                    </h3>

                    {project.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted, #78716C)', marginBottom: 12 }}>
                        <MapPin size={13} color="#92400E" />
                        <span>{project.address}</span>
                      </div>
                    )}

                    {/* Metadata Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      backgroundColor: 'var(--bg-surface-2, #F7F5F0)',
                      padding: '10px 12px',
                      borderRadius: 8,
                      marginBottom: 16,
                      fontSize: 11.5
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Contractor</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{project.assigned_gc || 'Apex Construction'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Target Date</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{project.target_completion || '2026-12-15'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button
                      onClick={() => {
                        if (!isActive) onSelectProject(project);
                      }}
                      disabled={isActive}
                      style={{
                        flex: 1,
                        padding: '9px 14px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 12.5,
                        border: isActive ? '1px solid #FCD34D' : '1px solid #D97706',
                        backgroundColor: isActive ? '#FEF3C7' : '#D97706',
                        color: isActive ? '#92400E' : '#FFFFFF',
                        cursor: isActive ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 size={14} /> Currently Selected
                        </>
                      ) : (
                        <>
                          <span>Select Project</span>
                        </>
                      )}
                    </button>

                    {onNavigateToPlan && (
                      <button
                        onClick={() => {
                          if (!isActive) onSelectProject(project);
                          onNavigateToPlan();
                        }}
                        style={{
                          padding: '9px 12px',
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 12,
                          border: '1px solid var(--border-default, #DCD5C8)',
                          backgroundColor: 'var(--bg-surface-1, #FFFFFF)',
                          color: 'var(--text-main, #18181B)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title="Open Plan Canvas"
                      >
                        <Layers size={14} color="#D97706" />
                        <span>Plan</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
