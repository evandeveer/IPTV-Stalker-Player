import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('IPTV Player UI Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            textAlign: 'center',
            color: '#fff',
            background: 'var(--bg-dark, #070a13)',
            height: '100%',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
            Une erreur d'affichage est survenue
          </h2>
          <p
            style={{
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.9rem',
              maxWidth: '500px',
              marginBottom: '20px',
              lineHeight: 1.5,
            }}
          >
            {this.state.error?.message || 'Erreur inconnue dans ce module.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--accent-primary, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={16} />
            <span>Revenir au direct</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
