import React, { useState } from 'react';
import { Tv, Film, MonitorPlay, Star, Settings, Search, X, Sparkles } from 'lucide-react';

export default function Sidebar({
  categories = [],
  selectedCategory,
  onSelectCategory,
  activeTab,
  setActiveTab,
  contentType = 'itv',
  onSelectContentType,
  favoritesCount = 0,
  onOpenSettings,
}) {
  const [filterText, setFilterText] = useState('');

  const filteredCategories = categories.filter((cat) => {
    if (!filterText.trim()) return true;
    const name = (cat.name || cat.title || '').toLowerCase();
    return name.includes(filterText.toLowerCase());
  });

  const getHeaderTitle = () => {
    if (contentType === 'vod') return `Genres Films (${categories.length})`;
    if (contentType === 'series') return `Genres Séries (${categories.length})`;
    return `Catégories TV (${categories.length})`;
  };

  const isAllSelected =
    String(selectedCategory) === 'all' || String(selectedCategory) === '*';

  return (
    <aside
      style={{
        width: '280px',
        height: '100%',
        background: 'rgba(10, 14, 26, 0.96)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 6px 16px 6px',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
          }}
        >
          <Tv size={22} color="#fff" />
        </div>
        <div>
          <h1
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#fff',
              margin: 0,
            }}
          >
            StreamPulse
          </h1>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--accent-cyan)',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            IPTV PLAYER PRO
          </span>
        </div>
      </div>

      {/* Tabs: Live, Vod, Series */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px',
          background: 'rgba(0,0,0,0.4)',
          padding: '3px',
          borderRadius: '10px',
          marginBottom: '14px',
          border: '1px solid var(--border-color)',
        }}
      >
        <button
          onClick={() => {
            setFilterText('');
            onSelectContentType && onSelectContentType('itv');
          }}
          style={{
            padding: '8px 0',
            borderRadius: '7px',
            border: 'none',
            background: contentType === 'itv' ? 'var(--accent-primary)' : 'transparent',
            color: contentType === 'itv' ? '#fff' : 'var(--text-muted)',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
          }}
        >
          <Tv size={14} />
          <span>Live</span>
        </button>
        <button
          onClick={() => {
            setFilterText('');
            onSelectContentType && onSelectContentType('vod');
          }}
          style={{
            padding: '8px 0',
            borderRadius: '7px',
            border: 'none',
            background: contentType === 'vod' ? 'var(--accent-primary)' : 'transparent',
            color: contentType === 'vod' ? '#fff' : 'var(--text-muted)',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
          }}
        >
          <Film size={14} />
          <span>Vod</span>
        </button>
        <button
          onClick={() => {
            setFilterText('');
            onSelectContentType && onSelectContentType('series');
          }}
          style={{
            padding: '8px 0',
            borderRadius: '7px',
            border: 'none',
            background: contentType === 'series' ? 'var(--accent-primary)' : 'transparent',
            color: contentType === 'series' ? '#fff' : 'var(--text-muted)',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
          }}
        >
          <MonitorPlay size={14} />
          <span>Series</span>
        </button>
      </div>

      {/* Main Mode Top Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          marginBottom: '12px',
        }}
      >
        <button
          onClick={() => {
            if (contentType === 'itv' && setActiveTab) setActiveTab('channels');
            onSelectCategory(contentType === 'itv' ? 'all' : '*');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: 'none',
            background:
              (contentType !== 'itv' && isAllSelected) ||
              (contentType === 'itv' && activeTab === 'channels' && isAllSelected)
                ? 'var(--accent-primary)'
                : 'transparent',
            color:
              (contentType !== 'itv' && isAllSelected) ||
              (contentType === 'itv' && activeTab === 'channels' && isAllSelected)
                ? '#fff'
                : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          {contentType === 'vod' ? (
            <Film size={17} />
          ) : contentType === 'series' ? (
            <MonitorPlay size={17} />
          ) : (
            <Tv size={17} />
          )}
          <span>
            {contentType === 'vod'
              ? 'Tous les films'
              : contentType === 'series'
              ? 'Toutes les séries'
              : 'Toutes les chaînes'}
          </span>
        </button>

        {contentType === 'itv' && (
          <button
            onClick={() => setActiveTab && setActiveTab('favorites')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background:
                activeTab === 'favorites' ? 'rgba(234, 179, 8, 0.2)' : 'transparent',
              color: activeTab === 'favorites' ? '#eab308' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Star
                size={17}
                color={activeTab === 'favorites' ? '#eab308' : 'currentColor'}
              />
              <span>Chaînes Favoris</span>
            </div>
            {favoritesCount > 0 && (
              <span
                style={{
                  background: '#eab308',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  padding: '1px 7px',
                  borderRadius: '10px',
                }}
              >
                {favoritesCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Categories Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px 6px 6px',
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {getHeaderTitle()}
        </span>
      </div>

      {/* Quick Search Filter Input inside Sidebar */}
      <div
        style={{
          position: 'relative',
          marginBottom: '8px',
          padding: '0 4px',
        }}
      >
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }}
        />
        <input
          type="text"
          placeholder="Filtrer les catégories..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 28px 7px 32px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.8rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {filterText && (
          <button
            onClick={() => setFilterText('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Scrollable Categories List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          paddingRight: '4px',
          scrollbarWidth: 'thin',
        }}
      >
        {filteredCategories.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
            }}
          >
            Aucune catégorie correspondante
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const isActive =
              (contentType === 'itv'
                ? activeTab === 'channels'
                : true) && String(selectedCategory) === String(cat.id);

            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (contentType === 'itv' && setActiveTab) {
                    setActiveTab('channels');
                  }
                  onSelectCategory(cat.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  borderLeft: isActive
                    ? '3px solid var(--accent-primary)'
                    : '3px solid transparent',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={cat.name || cat.title}
                >
                  {cat.name || cat.title}
                </span>
                {cat.count !== undefined && cat.count > 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: isActive ? 'var(--accent-cyan)' : 'var(--text-dim)',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      marginLeft: '6px',
                      flexShrink: 0,
                    }}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Settings Bottom Button */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <button
          onClick={onOpenSettings}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.03)',
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        >
          <Settings size={17} />
          <span>Réglages & Paramètres</span>
        </button>
      </div>
    </aside>
  );
}
