import React from 'react';
import { Cpu, Server, RefreshCw, Search, ShieldCheck, Globe } from 'lucide-react';
import { getProxyMode, ProxyMode } from '../services/proxy';

export default function Header({
  sessionInfo,
  searchQuery,
  setSearchQuery,
  onOpenLogin,
  onOpenSettings,
  totalChannelsCount,
}) {
  const isProxyActive = getProxyMode() !== ProxyMode.DIRECT;

  return (
    <header
      style={{
        height: '64px',
        background: 'rgba(10, 14, 26, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        gap: '20px',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onOpenLogin}
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
        >
          {sessionInfo?.mode === 'mac' ? (
            <Cpu size={16} color="var(--accent-primary)" />
          ) : (
            <Server size={16} />
          )}
          <span>{sessionInfo?.title || 'Se connecter au portail'}</span>
          <RefreshCw size={14} style={{ marginLeft: '4px', opacity: 0.7 }} />
        </button>

        {sessionInfo && (
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent-green)',
              }}
            />
            <span>{totalChannelsCount} chaînes chargées</span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, maxWidth: '420px', position: 'relative' }}>
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: '14px',
            top: '11px',
            color: 'var(--text-dim)',
          }}
        />
        <input
          type="text"
          className="input-field"
          style={{
            paddingLeft: '42px',
            paddingRight: '16px',
            height: '40px',
            fontSize: '0.88rem',
          }}
          placeholder="Rechercher une chaîne (ex: France 24, BeIN, Canal)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '10px',
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onOpenSettings}
          style={{
            background: isProxyActive
              ? 'rgba(6, 182, 212, 0.15)'
              : 'rgba(255,255,255,0.04)',
            border:
              '1px solid ' +
              (isProxyActive ? 'rgba(6, 182, 212, 0.4)' : 'var(--border-color)'),
            borderRadius: '10px',
            padding: '6px 12px',
            color: isProxyActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isProxyActive ? <ShieldCheck size={16} /> : <Globe size={16} />}
          <span>Proxy CORS : {isProxyActive ? 'ACTIF' : 'DIRECT'}</span>
        </button>
      </div>
    </header>
  );
}
