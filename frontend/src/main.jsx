import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'Inter, system-ui, sans-serif',
          backgroundColor: '#F8F7F4',
          color: '#18181B'
        }}>
          <div style={{
            maxWidth: 500,
            padding: 32,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #DCD5C8',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#DC2626' }}>
              Field Ops Notice
            </h2>
            <p style={{ fontSize: 14, color: '#52525B', marginBottom: 20 }}>
              An unexpected issue occurred while rendering the workspace.
            </p>
            <pre style={{
              fontSize: 12,
              backgroundColor: '#F4F4F5',
              padding: 12,
              borderRadius: 6,
              overflowX: 'auto',
              textAlign: 'left',
              color: '#7F1D1D',
              marginBottom: 20
            }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
