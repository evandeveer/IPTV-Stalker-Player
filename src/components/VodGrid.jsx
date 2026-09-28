import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Info,
  Star,
  Clock,
  Calendar,
  Film,
  Tv,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { demoMovies, demoSeries } from '../services/demoData';

export default function VodGrid({
  contentType = 'vod', // 'vod' or 'series'
  stalkerClient,
  categories: propCategories = [],
  selectedCategory: propSelectedCategory = '*',
  onSelectCategory,
  searchQuery: propSearchQuery = '',
  onSearchChange,
  onPlayMedia,
}) {
  const [internalCategories, setInternalCategories] = useState([]);
  const [internalSelectedCategory, setInternalSelectedCategory] = useState('*');
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery =
    propSearchQuery !== '' ? propSearchQuery : internalSearchQuery;
  const setSearchQuery = onSearchChange || setInternalSearchQuery;
  const [selectedItem, setSelectedItem] = useState(null); // Detail modal
  const [seriesSeasons, setSeriesSeasons] = useState([]);
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [featuredItem, setFeaturedItem] = useState(null);

  const categories =
    propCategories && propCategories.length > 0
      ? propCategories
      : internalCategories;
  const selectedCategory = onSelectCategory
    ? propSelectedCategory
    : internalSelectedCategory;

  const activeCategoryObj = categories.find(
    (c) => String(c.id) === String(selectedCategory)
  );

  const handleCategoryChange = (catId) => {
    setCurrentPage(1);
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      setInternalSelectedCategory(catId);
    }
  };

  // Fallback load categories if not supplied via props
  useEffect(() => {
    let isCancelled = false;

    async function loadCategories() {
      if (propCategories && propCategories.length > 0) return;
      if (!stalkerClient) {
        setInternalCategories([
          { id: '*', name: contentType === 'vod' ? 'Tous les films' : 'Toutes les séries' },
          { id: 'action', name: 'Action & Aventure' },
          { id: 'comedy', name: 'Comédie' },
          { id: 'scifi', name: 'Science-Fiction' },
        ]);
        return;
      }
      try {
        const cats =
          contentType === 'vod'
            ? await stalkerClient.getVodCategories()
            : await stalkerClient.getSeriesCategories();
        if (!isCancelled) {
          setInternalCategories([
            { id: '*', name: contentType === 'vod' ? 'Tous les films' : 'Toutes les séries' },
            ...(Array.isArray(cats) ? cats : []),
          ]);
        }
      } catch (err) {
        console.warn('Error fetching VOD categories:', err);
      }
    }

    loadCategories();
    return () => {
      isCancelled = true;
    };
  }, [contentType, stalkerClient, propCategories?.length]);

  // Reset page when selectedCategory changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Load items when category or page changes
  useEffect(() => {
    let isCancelled = false;

    async function loadItems() {
      setIsLoading(true);

      if (!stalkerClient) {
        const demoList = contentType === 'vod' ? demoMovies : demoSeries;
        const filtered =
          selectedCategory && selectedCategory !== '*' && selectedCategory !== 'all'
            ? demoList.filter((m) => m.categoryId === selectedCategory)
            : demoList;
        if (!isCancelled) {
          setItems(filtered);
          setTotalItems(filtered.length);
          if (filtered.length > 0) setFeaturedItem(filtered[0]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res =
          contentType === 'vod'
            ? await stalkerClient.getVodList(selectedCategory, currentPage)
            : await stalkerClient.getSeriesList(selectedCategory, currentPage);

        if (!isCancelled) {
          setItems(res?.items || []);
          setTotalItems(Number(res?.total) || (res?.items ? res.items.length : 0));

          // Pick a high-quality featured item for hero banner on page 1
          if (currentPage === 1 && res?.items?.length > 0) {
            const withPoster = res.items.find((i) => i.poster && i.description);
            setFeaturedItem(withPoster || res.items[0]);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Error fetching VOD items:', err);
          setIsLoading(false);
        }
      }
    }

    loadItems();
    return () => {
      isCancelled = true;
    };
  }, [contentType, stalkerClient, selectedCategory, currentPage]);

  // Load series details (seasons & episodes) when a series is selected
  useEffect(() => {
    let isCancelled = false;

    async function loadSeriesDetails() {
      if (!selectedItem || !selectedItem.is_series || !stalkerClient) return;
      setIsLoadingSeasons(true);
      try {
        const seasons = await stalkerClient.getSeriesDetails(
          selectedItem.seriesId || selectedItem.id
        );
        if (!isCancelled) {
          setSeriesSeasons(seasons);
          setSelectedSeasonIdx(0);
          setIsLoadingSeasons(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Error loading series seasons:', err);
          setIsLoadingSeasons(false);
        }
      }
    }

    if (selectedItem && selectedItem.is_series) {
      loadSeriesDetails();
    } else {
      setSeriesSeasons([]);
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedItem, stalkerClient]);

  // Client-side search filtering if query provided
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.originalName?.toLowerCase().includes(q) ||
      item.actors?.toLowerCase().includes(q) ||
      item.director?.toLowerCase().includes(q)
    );
  });

  const formatDuration = (mins) => {
    if (!mins || isNaN(mins)) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
  };

  const handlePlayClick = (item) => {
    if (onPlayMedia) {
      onPlayMedia(item);
    }
  };

  const handlePlayEpisode = (season, epNum) => {
    if (onPlayMedia && selectedItem) {
      onPlayMedia({
        ...selectedItem,
        is_series: true,
        seriesName: selectedItem.name,
        seasonName: season.name,
        episodeNum: epNum,
        name: `${selectedItem.name} - ${season.name} Épisode ${epNum}`,
        cmd: season.cmd,
        seriesEpisode: epNum,
      });
      setSelectedItem(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / 14));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'linear-gradient(180deg, #070a13 0%, #0d1222 100%)',
        position: 'relative',
        color: '#fff',
      }}
    >
      {/* Hero Featured Banner (Netflix Style) */}
      {featuredItem && !searchQuery && currentPage === 1 && (
        <div
          style={{
            position: 'relative',
            minHeight: '320px',
            maxHeight: '360px',
            width: '100%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '36px 40px',
            background: `radial-gradient(circle at 80% 30%, rgba(139, 92, 246, 0.25) 0%, transparent 70%), linear-gradient(180deg, rgba(7, 10, 19, 0.3) 0%, #070a13 100%)`,
          }}
        >
          {/* Backdrop Image */}
          {featuredItem.poster && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60%',
                height: '100%',
                backgroundImage: `url(${featuredItem.poster})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
                maskImage:
                  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,1) 100%)',
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 100%)',
                opacity: 0.38,
                filter: 'blur(1px)',
              }}
            />
          )}

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              maxWidth: '640px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, #e50914 0%, #b20710 100%)',
                  color: '#fff',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {contentType === 'vod' ? 'FILM VEDETTE' : 'SÉRIE VEDETTE'}
              </span>
              {featuredItem.hd && (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                  }}
                >
                  4K ULTRA HD
                </span>
              )}
              {featuredItem.rating && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#eab308',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  <Star size={14} fill="#eab308" />
                  {featuredItem.rating} IMDb
                </span>
              )}
            </div>

            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              {featuredItem.name}
            </h1>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 1.45,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '560px',
              }}
            >
              {featuredItem.description ||
                'Plongez dans cette production exceptionnelle avec une qualité sonore et visuelle immersive en haute définition.'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <button
                onClick={() => handlePlayClick(featuredItem)}
                style={{
                  background: '#fff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 22px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, background 0.2s',
                  boxShadow: '0 4px 15px rgba(255,255,255,0.2)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Play size={18} fill="#000" />
                <span>Regarder</span>
              </button>

              <button
                onClick={() => setSelectedItem(featuredItem)}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              >
                <Info size={18} />
                <span>Plus d'infos</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar: Active Category Header + Dropdown & Search Bar */}
      <div
        style={{
          padding: '16px 28px',
          background: 'rgba(10, 14, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Active Category Title & Total count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              {contentType === 'vod' ? <Film size={20} /> : <Tv size={20} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    margin: 0,
                    color: '#fff',
                  }}
                >
                  {activeCategoryObj?.name ||
                    activeCategoryObj?.title ||
                    (selectedCategory === '*'
                      ? contentType === 'vod'
                        ? 'Tous les films'
                        : 'Toutes les séries'
                      : `Catégorie ${selectedCategory}`)}
                </h2>
                <span
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    color: 'var(--accent-cyan)',
                    fontWeight: 700,
                  }}
                >
                  {totalItems.toLocaleString()} titres
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {contentType === 'vod'
                  ? 'Explorez les 250 genres dans la barre latérale ou changez ci-dessous'
                  : 'Explorez les 141 catégories dans la barre latérale ou changez ci-dessous'}
              </span>
            </div>
          </div>

          {/* Right Controls: In-Page Category Dropdown & Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {categories.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '240px',
                  }}
                  title="Sélectionner une catégorie"
                >
                  {categories.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      style={{ background: '#0e1220', color: '#fff' }}
                    >
                      {c.name || c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search bar inside VOD */}
            <div
              style={{
                position: 'relative',
                width: '260px',
                maxWidth: '100%',
              }}
            >
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder={`Rechercher un ${contentType === 'vod' ? 'film' : 'série'}, acteur...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick popular shortcuts pills (Compact 6 items, NO endless horizontal scroll) */}
        {categories.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '2px',
            }}
          >
            {categories.slice(0, 8).map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isSelected
                      ? 'var(--accent-primary)'
                      : 'rgba(255,255,255,0.05)',
                    color: isSelected ? '#fff' : 'var(--text-muted)',
                    border: isSelected
                      ? '1px solid var(--accent-primary)'
                      : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isSelected
                      ? '0 0 10px rgba(139, 92, 246, 0.4)'
                      : 'none',
                  }}
                >
                  {cat.name || cat.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid of Netflix-Style Poster Cards */}
      <div style={{ padding: '24px 28px', flex: 1 }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              gap: '16px',
            }}
          >
            <RefreshCw
              size={36}
              style={{
                color: 'var(--accent-primary)',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Chargement du catalogue Netflix...
            </span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '240px',
              color: 'var(--text-muted)',
            }}
          >
            <Film size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
              Aucun contenu trouvé
            </h3>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              Essayez une autre catégorie ou modifiez votre recherche.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredItems.map((item) => {
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    position: 'relative',
                    aspectRatio: '2/3',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)';
                    e.currentTarget.style.boxShadow =
                      '0 14px 28px rgba(139, 92, 246, 0.35)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    const overlay = e.currentTarget.querySelector('.card-overlay');
                    if (overlay) overlay.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    const overlay = e.currentTarget.querySelector('.card-overlay');
                    if (overlay) overlay.style.opacity = '0';
                  }}
                >
                  {/* Poster Image */}
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.name}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.parentElement.querySelector('.poster-fallback');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}

                  {/* Fallback Graphic if no image or error */}
                  <div
                    className="poster-fallback"
                    style={{
                      display: item.poster ? 'none' : 'flex',
                      width: '100%',
                      height: '100%',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                    }}
                  >
                    <Film size={36} color="var(--accent-primary)" style={{ opacity: 0.6, marginBottom: '8px' }} />
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.9)',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.name}
                    </span>
                  </div>

                  {/* Top Badges (Rating & HD) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      right: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    {item.rating && item.rating !== '0' && (
                      <span
                        style={{
                          background: 'rgba(0,0,0,0.75)',
                          backdropFilter: 'blur(4px)',
                          color: '#eab308',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Star size={11} fill="#eab308" />
                        {item.rating}
                      </span>
                    )}
                    {item.hd && (
                      <span
                        style={{
                          background: 'rgba(139, 92, 246, 0.85)',
                          backdropFilter: 'blur(4px)',
                          color: '#fff',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          marginLeft: 'auto',
                        }}
                      >
                        FHD
                      </span>
                    )}
                  </div>

                  {/* Card Bottom Permanent Info Strip */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '28px 10px 10px 10px',
                      background:
                        'linear-gradient(to top, rgba(5,7,15,0.95) 0%, rgba(5,7,15,0.7) 60%, transparent 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      pointerEvents: 'none',
                    }}
                  >
                    <h4
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#fff',
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </h4>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>{item.year || 'VOD'}</span>
                      {item.duration > 0 && (
                        <span>{formatDuration(item.duration)}</span>
                      )}
                    </div>
                  </div>

                  {/* Hover Overlay with Quick Play Button */}
                  <div
                    className="card-overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(10, 14, 26, 0.65)',
                      backdropFilter: 'blur(3px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      zIndex: 3,
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayClick(item);
                      }}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        border: 'none',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 0 16px rgba(139, 92, 246, 0.6)',
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.12)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      title="Lire immédiatement"
                    >
                      <Play size={22} fill="#fff" style={{ marginLeft: '2px' }} />
                    </button>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#fff',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '4px 10px',
                        borderRadius: '12px',
                      }}
                    >
                      Détails & Lecture
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && totalPages > 1 && !searchQuery && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginTop: '36px',
              paddingBottom: '24px',
            }}
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: currentPage <= 1 ? 0.4 : 1,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={18} />
              <span>Précédent</span>
            </button>

            <span
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Page <strong style={{ color: '#fff' }}>{currentPage}</strong> sur{' '}
              <strong style={{ color: '#fff' }}>{totalPages}</strong>
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: currentPage >= totalPages ? 0.4 : 1,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <span>Suivant</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Netflix Detail Modal */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '840px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0e1220',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(139,92,246,0.2)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.6)')}
            >
              <X size={20} />
            </button>

            {/* Modal Header / Banner */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '24px',
                padding: '32px 32px 24px 32px',
                background: 'linear-gradient(180deg, rgba(20,26,45,0.8) 0%, rgba(14,18,32,0.95) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Big Poster */}
              <div
                style={{
                  width: '180px',
                  aspectRatio: '2/3',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                {selectedItem.poster ? (
                  <img
                    src={selectedItem.poster}
                    alt={selectedItem.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Film size={48} color="var(--accent-primary)" />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <h2
                    style={{
                      fontSize: '1.7rem',
                      fontWeight: 900,
                      lineHeight: 1.2,
                      color: '#fff',
                    }}
                  >
                    {selectedItem.name}
                  </h2>
                  {selectedItem.originalName && selectedItem.originalName !== selectedItem.name && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Titre original : {selectedItem.originalName}
                    </p>
                  )}
                </div>

                {/* Metadata Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {selectedItem.rating && selectedItem.rating !== '0' && (
                    <span
                      style={{
                        background: 'rgba(234, 179, 8, 0.2)',
                        color: '#eab308',
                        border: '1px solid #eab308',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Star size={14} fill="#eab308" />
                      {selectedItem.rating} IMDb
                    </span>
                  )}
                  {selectedItem.year && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Calendar size={14} />
                      {selectedItem.year}
                    </span>
                  )}
                  {selectedItem.duration > 0 && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Clock size={14} />
                      {formatDuration(selectedItem.duration)}
                    </span>
                  )}
                  {selectedItem.age && (
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {selectedItem.age}
                    </span>
                  )}
                  <span
                    style={{
                      background: 'rgba(139, 92, 246, 0.2)',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--accent-primary)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                    }}
                  >
                    {selectedItem.hd ? '1080p FHD' : 'HD'}
                  </span>
                </div>

                {/* Genre Tag */}
                {selectedItem.genre && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedItem.genre.split(',').map((g, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {g.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Big Action Play Button for Movie */}
                {!selectedItem.is_series && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        handlePlayClick(selectedItem);
                        setSelectedItem(null);
                      }}
                      className="btn-primary"
                      style={{
                        padding: '12px 28px',
                        fontSize: '1rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
                      }}
                    >
                      <Play size={20} fill="#fff" />
                      <span>Lancer le film</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Body: Synopsis, Cast, Series Episodes */}
            <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Synopsis */}
              <div>
                <h4
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                  }}
                >
                  Synopsis
                </h4>
                <p
                  style={{
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {selectedItem.description ||
                    'Aucun résumé disponible pour ce titre pour le moment.'}
                </p>
              </div>

              {/* Cast & Director */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {selectedItem.director && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      RÉALISATEUR
                    </span>
                    <p style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, marginTop: '2px' }}>
                      {selectedItem.director}
                    </p>
                  </div>
                )}
                {selectedItem.actors && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      DISTRIBUTION / ACTEURS
                    </span>
                    <p style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1.4, marginTop: '2px' }}>
                      {selectedItem.actors}
                    </p>
                  </div>
                )}
              </div>

              {/* Series Seasons & Episodes Explorer */}
              {selectedItem.is_series && (
                <div style={{ marginTop: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                    }}
                  >
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                      Saisons & Épisodes
                    </h3>
                  </div>

                  {isLoadingSeasons ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '20px 0',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Chargement des saisons et épisodes...</span>
                    </div>
                  ) : seriesSeasons.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Aucun épisode disponible pour cette série.
                    </p>
                  ) : (
                    <div>
                      {/* Seasons Tabs */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          overflowX: 'auto',
                          marginBottom: '16px',
                          paddingBottom: '4px',
                        }}
                      >
                        {seriesSeasons.map((season, sIdx) => {
                          const isCurSeason = selectedSeasonIdx === sIdx;
                          return (
                            <button
                              key={season.id || sIdx}
                              onClick={() => setSelectedSeasonIdx(sIdx)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                border: isCurSeason
                                  ? '1px solid var(--accent-primary)'
                                  : '1px solid rgba(255,255,255,0.1)',
                                background: isCurSeason
                                  ? 'var(--accent-primary)'
                                  : 'rgba(255,255,255,0.05)',
                                color: isCurSeason ? '#fff' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              {season.name} ({season.episodes?.length || 0})
                            </button>
                          );
                        })}
                      </div>

                      {/* Episodes List */}
                      {seriesSeasons[selectedSeasonIdx] && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: '12px',
                            maxHeight: '260px',
                            overflowY: 'auto',
                            paddingRight: '6px',
                          }}
                        >
                          {seriesSeasons[selectedSeasonIdx].episodes.map((epNum) => {
                            const curSeason = seriesSeasons[selectedSeasonIdx];
                            return (
                              <div
                                key={epNum}
                                onClick={() => handlePlayEpisode(curSeason, epNum)}
                                style={{
                                  background: 'rgba(255,255,255,0.04)',
                                  borderRadius: '10px',
                                  padding: '12px 14px',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                }}
                              >
                                <div>
                                  <span
                                    style={{
                                      fontSize: '0.85rem',
                                      fontWeight: 700,
                                      color: '#fff',
                                    }}
                                  >
                                    Épisode {epNum}
                                  </span>
                                  <p
                                    style={{
                                      fontSize: '0.72rem',
                                      color: 'var(--text-muted)',
                                      marginTop: '2px',
                                    }}
                                  >
                                    {curSeason.name}
                                  </p>
                                </div>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Play size={14} fill="#fff" style={{ marginLeft: '2px' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
