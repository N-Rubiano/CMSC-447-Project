import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Search,
  Download,
  Eye,
  Folder,
  Layers,
  FileSpreadsheet,
  FileCheck,
  Clock,
  HardHat,
  Filter,
  Upload,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';

export default function DocumentsPage({ onNavigateBlueprintWithSheet, onUploadBlueprint }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeFolder, setActiveFolder] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Drawing Sets');

  const fileInputRef = useRef(null);

  const folders = ['All', 'Drawing Sets', 'RFIs', 'Submittals', 'Specifications', 'Closeout', 'General'];

  // Load documents from PostgreSQL database
  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load documents from backend database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setDocName(file.name.replace(/\.[^.]+$/, ''));
    setIsUploadModalOpen(true);
    e.target.value = '';
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', docName.trim() || selectedFile.name);
      formData.append('category', docCategory);

      const created = await api.uploadDocument(formData);
      setDocuments(prev => [created, ...prev]);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocName('');
    } catch (err) {
      setUploadError(err.message || 'Failed to upload document to database');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to remove this document from the database?')) return;
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      alert(`Error deleting document: ${err.message}`);
    }
  };

  const filteredDocs = documents.filter(doc => {
    if (activeFolder !== 'All' && doc.category !== activeFolder) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (doc.name || '').toLowerCase().includes(q) ||
        (doc.file_name || '').toLowerCase().includes(q) ||
        (doc.uploaded_by || '').toLowerCase().includes(q) ||
        (doc.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate stats
  const totalDocsCount = documents.length;
  const pendingRFIsCount = documents.filter(d => d.category === 'RFIs').length;
  const approvedSubmittalsCount = documents.filter(d => d.category === 'Submittals').length;
  const drawingSetsCount = documents.filter(d => d.category === 'Drawing Sets').length;

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '24px 28px',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }}>
      {/* Hidden file picker */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* Header & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--timber)', marginBottom: 4 }}>
            Field Documentation & Compliance
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>
            Project Documents & Sets
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary"
            style={{ height: 40 }}
          >
            <Upload size={17} strokeWidth={2.4} />
            <span>Upload Document</span>
          </button>
          {onUploadBlueprint && (
            <button
              onClick={onUploadBlueprint}
              className="btn btn-ghost"
              style={{ height: 40, border: '1px solid var(--border)' }}
            >
              <Layers size={17} color="var(--amber)" />
              <span>Upload Drawing Set</span>
            </button>
          )}
        </div>
      </div>

      {/* Small Stat Cards Up Top */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16
      }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{totalDocsCount}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Total Documents (DB)</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: 'var(--status-review-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-review)' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{pendingRFIsCount}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Active RFIs</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: 'var(--status-resolved-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-resolved)' }}>
            <FileCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{approvedSubmittalsCount}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Approved Submittals</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{drawingSetsCount}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Drawing Sets</div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="card" style={{ padding: '20px 24px', overflow: 'hidden' }}>
        {/* Controls Bar: Folder Pills & Search */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 16
        }}>
          {/* Folder Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {folders.map(folder => {
              const isActive = activeFolder === folder;
              return (
                <button
                  key={folder}
                  onClick={() => setActiveFolder(folder)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: isActive ? 'var(--amber)' : 'var(--surface-muted)',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--amber)' : 'var(--border)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease'
                  }}
                >
                  {folder}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: 260 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="text"
              placeholder="Search documents by title or uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                paddingLeft: 38,
                paddingRight: 12,
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--border)',
                fontSize: 13,
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Documents Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{
                borderBottom: '1.5px solid var(--border)',
                color: 'var(--text-muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <th style={{ padding: '10px' }}>Document Name</th>
                <th style={{ padding: '10px' }}>Category</th>
                <th style={{ padding: '10px' }}>Uploader</th>
                <th style={{ padding: '10px' }}>Date Uploaded</th>
                <th style={{ padding: '10px' }}>Size</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr
                  key={doc.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 120ms ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={18} color="var(--amber)" />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{doc.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{doc.file_name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span className="chip-mono" style={{ fontSize: 11 }}>
                      {doc.category || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {doc.uploaded_by || 'Field User'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span className="date-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {doc.sizeFormatted || `${Math.round((doc.file_size_bytes || 0) / 1024)} KB`}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon"
                          style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Open Document"
                        >
                          <Eye size={16} />
                        </a>
                      )}
                      {doc.url && (
                        <a
                          href={doc.url}
                          download={doc.file_name || doc.name}
                          className="btn-icon"
                          style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Download Document"
                        >
                          <Download size={16} />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="btn-icon"
                        style={{ width: 32, height: 32, color: 'var(--crimson)' }}
                        title="Delete Document"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDocs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <FileText size={36} color="var(--border)" />
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                        {searchQuery ? `No documents found matching "${searchQuery}"` : 'No documents stored in the database yet'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 360 }}>
                        {searchQuery
                          ? 'Try adjusting your search query or folder filter.'
                          : 'Upload contract specifications, RFIs, submittals, or drawing sheets to store them securely in the PostgreSQL database.'}
                      </div>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn btn-primary"
                          style={{ marginTop: 6, fontSize: 13, padding: '7px 16px' }}
                        >
                          <Upload size={15} /> Upload First Document
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {isLoading && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Loading documents from database...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Confirmation Modal */}
      {isUploadModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 450,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
              Save Document to Database
            </h3>

            {uploadError && (
              <div style={{ padding: 10, backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Document Title
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Life Safety Spec 08-2026"
                  required
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Category
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Drawing Sets">Drawing Sets</option>
                  <option value="RFIs">RFIs</option>
                  <option value="Submittals">Submittals</option>
                  <option value="Specifications">Specifications</option>
                  <option value="Closeout">Closeout</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', backgroundColor: 'var(--surface-muted)', padding: 10, borderRadius: 6 }}>
                File: <strong>{selectedFile?.name}</strong> ({(selectedFile?.size / 1024).toFixed(1)} KB)
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }}
                  className="btn btn-ghost"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  <span>{isUploading ? 'Uploading to DB...' : 'Save to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
