import React, { useState, useEffect } from 'react';
import { Tv, LayoutGrid, List, Star, Play, Plus, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 60;

function getQualityBadge(name = '') {
  const upper = name.toUpperCase();
  if (upper.includes('4K') || upper.includes('UHD')) {
    return { label: '4K', bg: 'rgba(234, 179, 8, 0.25)', color: '#eab308' };
  }
  if (upper.includes('FHD') || upper.includes('1080')) {
    return { label: 'FHD', bg: 'rgba(139, 92, 246, 0.25)', color: 'var(--accent-primary)' };
  }
  if (upper.includes('HD') && !upper.includes('FHD')) {
    return { label: 'HD', bg: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' };
  }
  if (upper.includes('HEVC') || upper.includes('H.265')) {
    return { label: 'HEVC', bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' };
  }
  return null;
}

export default function ChannelGrid({
  channels = [],
  activeChannel,
  onSelectChannel,
  favorites = [],
  onToggleFavorite,
  onToggleHide,
}) {
  const [viewMode, setViewMode] = useState('grid');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Reset pagination when channel list changes (category or search filter)
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [channels.length]);

  if (!channels || channels.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)',
          padding: '40px',
        }}
      >
        <Tv size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>
          Aucune chaîne disponible dans cette catégorie
        </h4>
        <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          Essayez de modifier votre recherche ou de changer de catégorie.
        </p>
      </div>
    );
  }

  const visibleChannels = channels.slice(0, displayCount);
  const hasMore = displayCount < channels.length;

  const loadMore = () => {
    setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, channels.length));
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200 && hasMore) {
      loadMore();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(15, 20, 35, 0.4)',
        }}
      >
        <span
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
          }}
        >
          {channels.length} chaînes trouvées
          {hasMore && ` (affichage de ${visibleChannels.length})`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(0,0,0,0.3)',
              padding: '2px',
              borderRadius: '8px',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#fff',
                cursor: 'pointer',
              }}
              title="Vue Grille"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#fff',
                cursor: 'pointer',
              }}
              title="Vue Liste"
            >
              <List size={16} />
            </button>
          </div>

          {onToggleHide && (
            <button
              onClick={onToggleHide}
              title="Masquer le rectangle des chaînes pour agrandir la vidéo"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              <ChevronDown size={16} />
              <span>Masquer</span>
            </button>
          )}
        </div>
      </div>


      <div
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '16px' }}
      >
        {viewMode === 'grid' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '14px',
            }}
          >
            {visibleChannels.map((channel) => {
              const isActive = activeChannel?.id === channel.id;
              const isFav = favorites.includes(channel.id);
              const qBadge = getQualityBadge(channel.name);
              return (
                <div
                  key={channel.id}
                  className={`channel-card ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectChannel(channel)}
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '140px',
                    textAlign: 'center',
                    position: 'relative',
                  }}
                >
                  {qBadge && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: qBadge.bg,
                        color: qBadge.color,
                        border: `1px solid ${qBadge.color}`,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                        zIndex: 5,
                      }}
                    >
                      {qBadge.label}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(channel.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: isFav ? '#eab308' : 'rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      zIndex: 5,
                    }}
                  >
                    <Star size={18} fill={isFav ? '#eab308' : 'none'} />
                  </button>

                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          padding: '4px',
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color: 'var(--accent-cyan)',
                        }}
                      >
                        {channel.number || 'TV'}
                      </span>
                    )}
                  </div>

                  <div style={{ width: '100%' }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {channel.name}
                    </div>
                    {channel.epgCurrent && (
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-dim)',
                          marginTop: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {channel.epgCurrent}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {visibleChannels.map((channel) => {
              const isActive = activeChannel?.id === channel.id;
              const isFav = favorites.includes(channel.id);
              const qBadge = getQualityBadge(channel.name);
              const epg = channel.epg || generateFallbackEpg(channel.name);
              return (
                <div
                  key={channel.id}
                  className={`channel-card ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectChannel(channel)}
                  style={{
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-dim)',
                        width: '32px',
                      }}
                    >
                      #{channel.number || '0'}
                    </span>
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        style={{
                          width: '32px',
                          height: '32px',
                          objectFit: 'contain',
                          borderRadius: '6px',
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Tv size={20} color="var(--accent-primary)" />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {channel.name}
                        </span>
                        {qBadge && (
                          <span
                            style={{
                              background: qBadge.bg,
                              color: qBadge.color,
                              border: `1px solid ${qBadge.color}`,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {qBadge.label}
                          </span>
                        )}
                      </div>
                      {channel.epgCurrent && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-dim)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {channel.epgCurrent}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(channel.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isFav ? '#eab308' : 'rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                      }}
                    >
                      <Star size={18} fill={isFav ? '#eab308' : 'none'} />
                    </button>
                    <Play
                      size={16}
                      color={isActive ? 'var(--accent-cyan)' : 'var(--text-dim)'}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '10px' }}>
            <button
              onClick={loadMore}
              className="btn-secondary"
              style={{ padding: '8px 24px', fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>Charger plus de chaînes ({channels.length - displayCount} restantes)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
