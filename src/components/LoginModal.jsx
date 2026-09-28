import React, { useState, useEffect } from 'react';
import {
  Tv,
  Bookmark,
  Cpu,
  Key,
  FileText,
  Play,
  AlertCircle,
  Plus,
  Zap,
  Trash2,
  Server,
  CheckCircle2,
  Calendar,
  Clock,
  RefreshCw,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import {
  StalkerClient,
  normalizeChannelsAndCategories,
  formatMac,
} from '../services/stalker';
import { XtreamClient } from '../services/xtream';
import { fetchM3U } from '../services/m3u';
import {
  getSavedProfiles,
  saveProfile,
  deleteProfile,
} from '../services/storage';
import { demoCategories, demoChannels } from '../services/demoData';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [profiles, setProfiles] = useState([]);
  const [activeTab, setActiveTab] = useState('profiles');
  const [expiryLoadingMap, setExpiryLoadingMap] = useState({});
  const [expiryMap, setExpiryMap] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key, e) => {
    if (e) e.stopPropagation();
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedKey(key);
        setTimeout(() => {
          setCopiedKey((curr) => (curr === key ? null : curr));
        }, 2000);
      })
      .catch((err) => {
        console.warn('Clipboard write failed:', err);
      });
  };

  const [macUrl, setMacUrl] = useState(
    localStorage.getItem('iptv_mac_url') || 'http://line.tvdsz.cc'
  );
  const [macAddress, setMacAddress] = useState(
    localStorage.getItem('iptv_mac_addr') || '00:1A:79:39:ED:3D'
  );
  const [profileName, setProfileName] = useState('Mon Abonnement Stalker');

  const [xtreamUrl, setXtreamUrl] = useState(
    localStorage.getItem('iptv_xtream_url') || ''
  );
  const [xtreamUser, setXtreamUser] = useState(
    localStorage.getItem('iptv_xtream_user') || ''
  );
  const [xtreamPass, setXtreamPass] = useState(
    localStorage.getItem('iptv_xtream_pass') || ''
  );

  const [m3uUrl, setM3uUrl] = useState(
    localStorage.getItem('iptv_m3u_url') || ''
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const refreshExpiry = async (prof) => {
    if (!prof || !prof.id) return;
    setExpiryLoadingMap((prev) => ({ ...prev, [prof.id]: true }));
    try {
      let exp = null;
      if (prof.mode === 'mac' && prof.macUrl && prof.macAddress) {
        const client = new StalkerClient(prof.macUrl, prof.macAddress);
        exp = await client.getExpiryDate();
      } else if (prof.mode === 'xtream' && prof.xtreamUrl && prof.xtreamUser) {
        const client = new XtreamClient(prof.xtreamUrl, prof.xtreamUser, prof.xtreamPass);
        exp = await client.getExpiryDate();
      }
      if (exp) {
        saveProfile({ ...prof, expiryDate: exp });
        setExpiryMap((prev) => ({ ...prev, [prof.id]: exp }));
        setProfiles(getSavedProfiles());
      }
    } catch (e) {
      console.warn('Error refreshing expiry:', e);
    } finally {
      setExpiryLoadingMap((prev) => ({ ...prev, [prof.id]: false }));
    }
  };

  useEffect(() => {
    const list = getSavedProfiles();
    setProfiles(list);
    if (list.length === 0) {
      setActiveTab('mac');
    } else {
      const initialMap = {};
      list.forEach((p) => {
        if (p.expiryDate) initialMap[p.id] = p.expiryDate;
      });
      setExpiryMap(initialMap);

      // Auto-fetch expiry in background for profiles that don't have it yet
      list.forEach((prof) => {
        if (!prof.expiryDate && (prof.mode === 'mac' || prof.mode === 'xtream')) {
          refreshExpiry(prof);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectProfile = async (profile) => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      if (profile.mode === 'mac') {
        const client = new StalkerClient(profile.macUrl, profile.macAddress);
        await client.authenticate();
        const cats = await client.getCategories();
        const chs = await client.getChannels('itv', cats);
        const { categories, channels } = normalizeChannelsAndCategories(cats, chs);

        client.getExpiryDate().then((exp) => {
          if (exp) {
            saveProfile({ ...profile, expiryDate: exp });
            setExpiryMap((prev) => ({ ...prev, [profile.id]: exp }));
          }
        }).catch(() => {});

        onLoginSuccess({
          mode: 'mac',
          title: profile.name || `Stalker (${profile.macAddress})`,
          categories,
          channels,
          stalkerClient: client,
        });
        onClose();
      } else if (profile.mode === 'xtream') {
        const client = new XtreamClient(
          profile.xtreamUrl,
          profile.xtreamUser,
          profile.xtreamPass
        );
        await client.authenticate();
        const cats = await client.getCategories();
        const chs = await client.getChannels();
        const { categories, channels } = normalizeChannelsAndCategories(cats, chs);

        client.getExpiryDate().then((exp) => {
          if (exp) {
            saveProfile({ ...profile, expiryDate: exp });
            setExpiryMap((prev) => ({ ...prev, [profile.id]: exp }));
          }
        }).catch(() => {});

        onLoginSuccess({
          mode: 'xtream',
          title: profile.name || `Xtream (${profile.xtreamUser})`,
          categories,
          channels,
        });
        onClose();
      } else if (profile.mode === 'm3u') {
        const { channels: rawChannels, categories: rawCategories } =
          await fetchM3U(profile.m3uUrl);
        const { categories, channels } = normalizeChannelsAndCategories(
          rawCategories,
          rawChannels
        );

        onLoginSuccess({
          mode: 'm3u',
          title: profile.name || 'Playlist M3U',
          categories,
          channels,
        });
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Échec de connexion au profil enregistré.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProfile = (id) => {
    const updated = deleteProfile(id);
    setProfiles(updated);
  };

  const handleConnectMac = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    try {
      const formatted = formatMac(macAddress);
      if (!formatted || formatted.length !== 17) {
        throw new Error(
          'Adresse MAC invalide. Format attendu: 00:1A:79:XX:XX:XX'
        );
      }
      const client = new StalkerClient(macUrl, formatted);
      await client.authenticate();
      const cats = await client.getCategories();
      const chs = await client.getChannels('itv', cats);
      if (!chs || chs.length === 0) {
        throw new Error(
          'Aucune chaîne trouvée sur ce portail Stalker. Vérifiez votre adresse MAC.'
        );
      }
      const { categories, channels } = normalizeChannelsAndCategories(cats, chs);

      const exp = await client.getExpiryDate().catch(() => null);

      localStorage.setItem('iptv_mac_url', macUrl);
      localStorage.setItem('iptv_mac_addr', formatted);
      saveProfile({
        name: profileName || `Stalker (${formatted})`,
        mode: 'mac',
        macUrl,
        macAddress: formatted,
        expiryDate: exp || '',
      });

      onLoginSuccess({
        mode: 'mac',
        title: profileName || `Stalker (${formatted})`,
        categories,
        channels,
        stalkerClient: client,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Échec de connexion au serveur Stalker');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectXtream = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    try {
      const client = new XtreamClient(xtreamUrl, xtreamUser, xtreamPass);
      await client.authenticate();
      const cats = await client.getCategories();
      const chs = await client.getChannels();
      const { categories, channels } = normalizeChannelsAndCategories(cats, chs);

      const exp = await client.getExpiryDate().catch(() => null);

      localStorage.setItem('iptv_xtream_url', xtreamUrl);
      localStorage.setItem('iptv_xtream_user', xtreamUser);
      localStorage.setItem('iptv_xtream_pass', xtreamPass);
      saveProfile({
        name: `Xtream (${xtreamUser})`,
        mode: 'xtream',
        xtreamUrl,
        xtreamUser,
        xtreamPass,
        expiryDate: exp || '',
      });

      onLoginSuccess({
        mode: 'xtream',
        title: `Xtream (${xtreamUser})`,
        categories,
        channels,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Échec de connexion Xtream Codes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectM3U = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    try {
      if (!m3uUrl.trim()) {
        throw new Error('Veuillez saisir une URL M3U valide.');
      }
      const { channels: rawChannels, categories: rawCategories } =
        await fetchM3U(m3uUrl);
      if (!rawChannels.length) {
        throw new Error('Aucune chaîne trouvée dans le fichier M3U.');
      }
      const { categories, channels } = normalizeChannelsAndCategories(
        rawCategories,
        rawChannels
      );

      localStorage.setItem('iptv_m3u_url', m3uUrl);
      saveProfile({
        name: 'Playlist M3U',
        mode: 'm3u',
        m3uUrl,
      });

      onLoginSuccess({
        mode: 'm3u',
        title: 'Playlist M3U',
        categories,
        channels,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Échec de lecture du fichier M3U');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchDemo = () => {
    const { categories, channels } = normalizeChannelsAndCategories(
      demoCategories,
      demoChannels
    );
    onLoginSuccess({
      mode: 'demo',
      title: 'Mode Démo Gratuit',
      categories,
      channels,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
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
          maxWidth: '740px',
          borderRadius: '24px',
          padding: '34px 38px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
            }}
          >
            <Tv size={26} color="#fff" />
          </div>
          <div>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
              }}
            >
              StreamPulse IPTV
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Gérez et connectez vos abonnements IPTV sauvegardés
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '4px',
            background: 'rgba(0,0,0,0.35)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <button
            onClick={() => {
              setActiveTab('profiles');
              setErrorMessage('');
            }}
            style={{
              padding: '10px 2px',
              borderRadius: '8px',
              border: 'none',
              background:
                activeTab === 'profiles' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'profiles' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Bookmark size={16} />
            <span>Profils ({profiles.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('mac');
              setErrorMessage('');
            }}
            style={{
              padding: '10px 2px',
              borderRadius: '8px',
              border: 'none',
              background:
                activeTab === 'mac' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'mac' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Cpu size={16} />
            <span>Portail MAC</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('xtream');
              setErrorMessage('');
            }}
            style={{
              padding: '10px 2px',
              borderRadius: '8px',
              border: 'none',
              background:
                activeTab === 'xtream' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'xtream' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Key size={16} />
            <span>Xtream</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('m3u');
              setErrorMessage('');
            }}
            style={{
              padding: '10px 2px',
              borderRadius: '8px',
              border: 'none',
              background:
                activeTab === 'm3u' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'm3u' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileText size={16} />
            <span>M3U</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('demo');
              setErrorMessage('');
            }}
            style={{
              padding: '10px 2px',
              borderRadius: '8px',
              border: 'none',
              background:
                activeTab === 'demo' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'demo' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Play size={16} />
            <span>Démo</span>
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#f87171',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Saved Profiles */}
        {activeTab === 'profiles' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '440px',
              overflowY: 'auto',
              paddingRight: '6px',
            }}
          >
            {profiles.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 12px',
                  color: 'var(--text-muted)',
                }}
              >
                <Bookmark size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  Aucun profil enregistré
                </p>
                <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  Connectez-vous via l'onglet <b>Portail MAC</b> ou <b>Xtream</b> pour
                  mémoriser vos identifiants en 1 clic.
                </p>
                <button
                  onClick={() => setActiveTab('mac')}
                  className="btn-primary"
                  style={{ marginTop: '18px', fontSize: '0.85rem' }}
                >
                  <Plus size={16} />
                  <span>Ajouter un abonnement MAC</span>
                </button>
              </div>
            ) : (
              profiles.map((prof) => {
                const expiryDate = expiryMap[prof.id] || prof.expiryDate || '';
                const isExpiryLoading = expiryLoadingMap[prof.id];

                return (
                  <div
                    key={prof.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '18px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      transition:
                        'border-color 0.2s, background 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background:
                            prof.mode === 'mac'
                              ? 'rgba(139, 92, 246, 0.2)'
                              : 'rgba(6, 182, 212, 0.2)',
                          border:
                            '1px solid ' +
                            (prof.mode === 'mac'
                              ? 'var(--accent-primary)'
                              : 'var(--accent-cyan)'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          flexShrink: 0,
                          boxShadow:
                            prof.mode === 'mac'
                              ? '0 0 12px rgba(139, 92, 246, 0.25)'
                              : '0 0 12px rgba(6, 182, 212, 0.25)',
                        }}
                      >
                        {prof.mode === 'mac' ? (
                          <Cpu size={22} color="var(--accent-primary)" />
                        ) : (
                          <Key size={22} color="var(--accent-cyan)" />
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <h4
                            style={{
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: '#fff',
                              margin: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {prof.name}
                          </h4>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background:
                                prof.mode === 'mac'
                                  ? 'rgba(139, 92, 246, 0.18)'
                                  : 'rgba(6, 182, 212, 0.18)',
                              color:
                                prof.mode === 'mac'
                                  ? '#c4b5fd'
                                  : '#67e8f9',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {prof.mode === 'mac' ? 'Stalker' : 'Xtream'}
                          </span>
                        </div>

                        {/* Interactive Copyable DNS (Left) & MAC (Right) on the SAME LINE */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            margin: '6px 0 0 0',
                            flexWrap: 'nowrap',
                            width: '100%',
                            minWidth: 0,
                          }}
                        >
                          {/* DNS on the LEFT */}
                          {prof.mode === 'mac' && prof.macUrl && (
                            <button
                              type="button"
                              onClick={(e) =>
                                handleCopy(prof.macUrl, `${prof.id}_dns`, e)
                              }
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background:
                                  copiedKey === `${prof.id}_dns`
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border:
                                  copiedKey === `${prof.id}_dns`
                                    ? '1px solid rgba(16, 185, 129, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                color:
                                  copiedKey === `${prof.id}_dns`
                                    ? '#34d399'
                                    : '#cbd5e1',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                minWidth: 0,
                                flex: '1 1 auto',
                                overflow: 'hidden',
                              }}
                              onMouseEnter={(e) => {
                                if (copiedKey !== `${prof.id}_dns`) {
                                  e.currentTarget.style.background =
                                    'rgba(255, 255, 255, 0.1)';
                                  e.currentTarget.style.borderColor =
                                    'rgba(6, 182, 212, 0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (copiedKey !== `${prof.id}_dns`) {
                                  e.currentTarget.style.background =
                                    'rgba(255, 255, 255, 0.05)';
                                  e.currentTarget.style.borderColor =
                                    'rgba(255, 255, 255, 0.1)';
                                }
                              }}
                              title={`Cliquer pour copier le DNS : ${prof.macUrl}`}
                            >
                              {copiedKey === `${prof.id}_dns` ? (
                                <Check size={12} color="#34d399" style={{ flexShrink: 0 }} />
                              ) : (
                                <Globe size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
                              )}
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  minWidth: 0,
                                }}
                              >
                                {copiedKey === `${prof.id}_dns`
                                  ? 'Lien DNS copié !'
                                  : `DNS: ${prof.macUrl}`}
                              </span>
                            </button>
                          )}

                          {/* MAC on the RIGHT */}
                          {prof.mode === 'mac' && prof.macAddress && (
                            <button
                              type="button"
                              onClick={(e) =>
                                handleCopy(
                                  prof.macAddress,
                                  `${prof.id}_mac`,
                                  e
                                )
                              }
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background:
                                  copiedKey === `${prof.id}_mac`
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border:
                                  copiedKey === `${prof.id}_mac`
                                    ? '1px solid rgba(16, 185, 129, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                color:
                                  copiedKey === `${prof.id}_mac`
                                    ? '#34d399'
                                    : '#e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                              }}
                              onMouseEnter={(e) => {
                                if (copiedKey !== `${prof.id}_mac`) {
                                  e.currentTarget.style.background =
                                    'rgba(255, 255, 255, 0.1)';
                                  e.currentTarget.style.borderColor =
                                    'rgba(139, 92, 246, 0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (copiedKey !== `${prof.id}_mac`) {
                                  e.currentTarget.style.background =
                                    'rgba(255, 255, 255, 0.05)';
                                  e.currentTarget.style.borderColor =
                                    'rgba(255, 255, 255, 0.1)';
                                }
                              }}
                              title={`Cliquer pour copier l'adresse MAC : ${prof.macAddress}`}
                            >
                              {copiedKey === `${prof.id}_mac` ? (
                                <Check size={12} color="#34d399" style={{ flexShrink: 0 }} />
                              ) : (
                                <Copy size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
                              )}
                              <span style={{ whiteSpace: 'nowrap' }}>
                                {copiedKey === `${prof.id}_mac`
                                  ? 'MAC copié !'
                                  : `MAC: ${prof.macAddress}`}
                              </span>
                            </button>
                          )}

                          {/* Xtream mode: DNS (Left) & User (Right) */}
                          {prof.mode === 'xtream' && prof.xtreamUrl && (
                            <button
                              type="button"
                              onClick={(e) =>
                                handleCopy(
                                  prof.xtreamUrl,
                                  `${prof.id}_dns`,
                                  e
                                )
                              }
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background:
                                  copiedKey === `${prof.id}_dns`
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border:
                                  copiedKey === `${prof.id}_dns`
                                    ? '1px solid rgba(16, 185, 129, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                color:
                                  copiedKey === `${prof.id}_dns`
                                    ? '#34d399'
                                    : '#cbd5e1',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                minWidth: 0,
                                flex: '1 1 auto',
                                overflow: 'hidden',
                              }}
                              title={`Cliquer pour copier : ${prof.xtreamUrl}`}
                            >
                              {copiedKey === `${prof.id}_dns` ? (
                                <Check size={12} color="#34d399" style={{ flexShrink: 0 }} />
                              ) : (
                                <Globe size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
                              )}
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  minWidth: 0,
                                }}
                              >
                                {copiedKey === `${prof.id}_dns`
                                  ? 'Serveur copié !'
                                  : `DNS: ${prof.xtreamUrl}`}
                              </span>
                            </button>
                          )}

                          {prof.mode === 'xtream' && prof.xtreamUser && (
                            <button
                              type="button"
                              onClick={(e) =>
                                handleCopy(
                                  prof.xtreamUser,
                                  `${prof.id}_user`,
                                  e
                                )
                              }
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background:
                                  copiedKey === `${prof.id}_user`
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border:
                                  copiedKey === `${prof.id}_user`
                                    ? '1px solid rgba(16, 185, 129, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                color:
                                  copiedKey === `${prof.id}_user`
                                    ? '#34d399'
                                    : '#e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                              }}
                              title={`Cliquer pour copier l'utilisateur : ${prof.xtreamUser}`}
                            >
                              {copiedKey === `${prof.id}_user` ? (
                                <Check size={12} color="#34d399" style={{ flexShrink: 0 }} />
                              ) : (
                                <Copy size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
                              )}
                              <span style={{ whiteSpace: 'nowrap' }}>
                                {copiedKey === `${prof.id}_user`
                                  ? 'Copié !'
                                  : `User: ${prof.xtreamUser}`}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Account Expiry Date Badge */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 10px',
                              borderRadius: '8px',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              background: expiryDate
                                ? 'rgba(16, 185, 129, 0.12)'
                                : isExpiryLoading
                                ? 'rgba(139, 92, 246, 0.12)'
                                : 'rgba(255, 255, 255, 0.05)',
                              border: expiryDate
                                ? '1px solid rgba(16, 185, 129, 0.35)'
                                : isExpiryLoading
                                ? '1px solid rgba(139, 92, 246, 0.35)'
                                : '1px solid rgba(255, 255, 255, 0.1)',
                              color: expiryDate
                                ? '#34d399'
                                : isExpiryLoading
                                ? 'var(--accent-primary)'
                                : 'var(--text-muted)',
                            }}
                          >
                            <Calendar size={13} style={{ flexShrink: 0 }} />
                            <span>
                              {isExpiryLoading ? (
                                'Vérification expiration...'
                              ) : expiryDate ? (
                                <>
                                  Expiration : <b>{expiryDate}</b>
                                </>
                              ) : (
                                'Expiration non disponible'
                              )}
                            </span>
                          </div>

                          {/* Manual refresh button for expiry */}
                          {(prof.mode === 'mac' || prof.mode === 'xtream') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                refreshExpiry(prof);
                              }}
                              disabled={isExpiryLoading}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: isExpiryLoading ? 'default' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                transition: 'color 0.2s',
                              }}
                              title="Actualiser la date d'expiration"
                            >
                              <RefreshCw
                                size={12}
                                style={{
                                  animation: isExpiryLoading
                                    ? 'spin 1s linear infinite'
                                    : 'none',
                                }}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => handleConnectProfile(prof)}
                        className="btn-primary"
                        disabled={isLoading}
                        style={{
                          padding: '10px 18px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderRadius: '10px',
                        }}
                      >
                        <Zap size={15} />
                        <span>{isLoading ? 'Connexion...' : 'Connexion'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(prof.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '10px',
                          padding: '10px',
                          color: 'var(--accent-red)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.2s',
                        }}
                        title="Supprimer ce profil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Stalker MAC */}
        {activeTab === 'mac' && (
          <form
            onSubmit={handleConnectMac}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                Nom du Profil (pour le retrouver facilement)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Mon Abonnement Stalker"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                URL du Portail Stalker (DNS)
              </label>
              <div style={{ position: 'relative' }}>
                <Server
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '14px',
                    color: 'var(--text-dim)',
                  }}
                />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '42px', paddingRight: '80px' }}
                  placeholder="http://dragan-lukac-pusi-kurac.streamtv.to:8080"
                  value={macUrl}
                  onChange={(e) => setMacUrl(e.target.value)}
                  required
                />
                {macUrl && (
                  <button
                    type="button"
                    onClick={(e) => handleCopy(macUrl, 'input_mac_url', e)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background:
                        copiedKey === 'input_mac_url'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(255, 255, 255, 0.08)',
                      border:
                        copiedKey === 'input_mac_url'
                          ? '1px solid rgba(16, 185, 129, 0.5)'
                          : '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '5px 9px',
                      color:
                        copiedKey === 'input_mac_url'
                          ? '#34d399'
                          : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    }}
                    title="Copier l'URL DNS"
                  >
                    {copiedKey === 'input_mac_url' ? (
                      <Check size={12} color="#34d399" />
                    ) : (
                      <Copy size={12} />
                    )}
                    <span>
                      {copiedKey === 'input_mac_url' ? 'Copié' : 'Copier'}
                    </span>
                  </button>
                )}
              </div>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                Adresse MAC (Stalker / MAG Device)
              </label>
              <div style={{ position: 'relative' }}>
                <Cpu
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '14px',
                    color: 'var(--text-dim)',
                  }}
                />
                <input
                  type="text"
                  className="input-field"
                  style={{
                    paddingLeft: '42px',
                    paddingRight: '80px',
                    fontFamily: 'var(--font-mono)',
                  }}
                  placeholder="00:1A:79:BF:45:24"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  required
                />
                {macAddress && (
                  <button
                    type="button"
                    onClick={(e) => handleCopy(macAddress, 'input_mac_addr', e)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background:
                        copiedKey === 'input_mac_addr'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(255, 255, 255, 0.08)',
                      border:
                        copiedKey === 'input_mac_addr'
                          ? '1px solid rgba(16, 185, 129, 0.5)'
                          : '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '5px 9px',
                      color:
                        copiedKey === 'input_mac_addr'
                          ? '#34d399'
                          : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    }}
                    title="Copier l'adresse MAC"
                  >
                    {copiedKey === 'input_mac_addr' ? (
                      <Check size={12} color="#34d399" />
                    ) : (
                      <Copy size={12} />
                    )}
                    <span>
                      {copiedKey === 'input_mac_addr' ? 'Copié' : 'Copier'}
                    </span>
                  </button>
                )}
              </div>
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: '8px',
              }}
            >
              {isLoading
                ? 'Connexion & Enregistrement...'
                : '⚡ Se connecter et Enregistrer le profil'}
            </button>
          </form>
        )}

        {/* Tab 3: Xtream Codes */}
        {activeTab === 'xtream' && (
          <form
            onSubmit={handleConnectXtream}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                URL du Serveur
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="http://xtream-server.com:8080"
                value={xtreamUrl}
                onChange={(e) => setXtreamUrl(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                Nom d'utilisateur
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Identifiant"
                value={xtreamUser}
                onChange={(e) => setXtreamUser(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                Mot de passe
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={xtreamPass}
                onChange={(e) => setXtreamPass(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: '8px',
              }}
            >
              {isLoading ? 'Connexion...' : '⚡ Se connecter et Enregistrer'}
            </button>
          </form>
        )}

        {/* Tab 4: M3U Playlist */}
        {activeTab === 'm3u' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <form
              onSubmit={handleConnectM3U}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginBottom: '6px',
                  }}
                >
                  URL du fichier M3U / M3U8
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://example.com/playlist.m3u"
                  value={m3uUrl}
                  onChange={(e) => setM3uUrl(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !m3uUrl}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isLoading ? 'Chargement M3U...' : 'Charger et Enregistrer'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Demo Mode */}
        {activeTab === 'demo' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <CheckCircle2
                size={36}
                color="var(--accent-cyan)"
                style={{ marginBottom: '10px' }}
              />
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  marginBottom: '6px',
                }}
              >
                Mode Démo Gratuit
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Chaînes TV directes gratuites pré-chargées pour tester sans
                abonnement.
              </p>
            </div>
            <button
              onClick={handleLaunchDemo}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
            >
              <Play size={20} />
              <span>Lancer le mode Démo</span>
            </button>
          </div>
        )}

        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
