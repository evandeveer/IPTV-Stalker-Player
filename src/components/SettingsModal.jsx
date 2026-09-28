import React, { useState } from 'react';
import { Shield, Check } from 'lucide-react';
import {
  ProxyMode,
  getProxyMode,
  getCustomProxy,
  setProxySettings,
} from '../services/proxy';

export default function SettingsModal({ isOpen, onClose }) {
  const [proxyMode, setProxyMode] = useState(getProxyMode());
  const [customProxy, setCustomProxy] = useState(getCustomProxy());
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setProxySettings(proxyMode, customProxy);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 8, 18, 0.85)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="glass-modal"
        style={{
          width: '100%',
          maxWidth: '520px',
          borderRadius: '20px',
          padding: '30px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <Shield size={26} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            Réglages Réseau & Proxy
          </h3>
        </div>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            marginBottom: '20px',
            lineHeight: 1.5,
          }}
        >
          Choisissez le mode de connexion pour les requêtes de portail et le streaming vidéo.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '24px',
          }}
        >
          {/* Option 1: Direct Mode */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              background:
                proxyMode === ProxyMode.DIRECT
                  ? 'rgba(139, 92, 246, 0.15)'
                  : 'rgba(255,255,255,0.03)',
              border:
                '1px solid ' +
                (proxyMode === ProxyMode.DIRECT
                  ? 'var(--accent-primary)'
                  : 'var(--border-color)'),
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="proxy"
              checked={proxyMode === ProxyMode.DIRECT}
              onChange={() => setProxyMode(ProxyMode.DIRECT)}
              style={{ accentColor: 'var(--accent-primary)' }}
            />
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--accent-cyan)',
                }}
              >
                🚀 Connexion Directe (Recommandé si CORS autorisé)
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Connexion directe au serveur IPTV sans intermédiaire.
              </div>
            </div>
          </label>

          {/* Option 2: Local Vite Proxy */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              background:
                proxyMode === ProxyMode.LOCAL
                  ? 'rgba(6, 182, 212, 0.15)'
                  : 'rgba(255,255,255,0.03)',
              border:
                '1px solid ' +
                (proxyMode === ProxyMode.LOCAL
                  ? 'var(--accent-cyan)'
                  : 'var(--border-color)'),
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="proxy"
              checked={proxyMode === ProxyMode.LOCAL}
              onChange={() => setProxyMode(ProxyMode.LOCAL)}
              style={{ accentColor: 'var(--accent-cyan)' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                ⚡ Proxy Local Intégré (Serveur Vite / Node.js)
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Passe par le proxy local Vite. Idéal pour contourner le Mixed Content (HTTPS vers HTTP).
              </div>
            </div>
          </label>

          {/* Option 3: AllOrigins */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              background:
                proxyMode === ProxyMode.ALL_ORIGINS
                  ? 'rgba(139, 92, 246, 0.15)'
                  : 'rgba(255,255,255,0.03)',
              border:
                '1px solid ' +
                (proxyMode === ProxyMode.ALL_ORIGINS
                  ? 'var(--accent-primary)'
                  : 'var(--border-color)'),
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="proxy"
              checked={proxyMode === ProxyMode.ALL_ORIGINS}
              onChange={() => setProxyMode(ProxyMode.ALL_ORIGINS)}
              style={{ accentColor: 'var(--accent-primary)' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                🌐 AllOrigins Proxy (Secours Externe)
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Proxy Web externe alternatif.
              </div>
            </div>
          </label>
        </div>

        {isSaved && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--accent-green)',
              fontSize: '0.85rem',
              marginBottom: '14px',
            }}
          >
            <Check size={16} />
            <span>Réglages enregistrés !</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
          <button onClick={handleSave} className="btn-primary">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
