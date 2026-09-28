import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import VideoPlayer from './components/VideoPlayer';
import ChannelGrid from './components/ChannelGrid';
import VodGrid from './components/VodGrid';
import LoginModal from './components/LoginModal';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { getSavedProfiles } from './services/storage';
import { StalkerClient, normalizeChannelsAndCategories } from './services/stalker';
import { demoCategories, demoChannels } from './services/demoData';

export default function App() {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [contentType, setContentType] = useState('itv'); // 'itv', 'vod', 'series'
  const [activeTab, setActiveTab] = useState('channels');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [vodCategories, setVodCategories] = useState([]);
  const [seriesCategories, setSeriesCategories] = useState([]);
  const [selectedVodCategory, setSelectedVodCategory] = useState('*');
  const [selectedSeriesCategory, setSelectedSeriesCategory] = useState('*');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVodMedia, setActiveVodMedia] = useState(null); // When user plays a VOD film or series episode
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('iptv_favorites');
      return saved ? JSON.parse(saved) : ['demo_f24_fr', 'demo_redbull'];
    } catch {
      return [];
    }
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showBottomChannels, setShowBottomChannels] = useState(() => {
    try {
      const saved = localStorage.getItem('iptv_show_bottom_channels');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleBottomChannels = () => {
    setShowBottomChannels((prev) => {
      const next = !prev;
      localStorage.setItem('iptv_show_bottom_channels', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const saved = getSavedProfiles();
    if (saved.length > 0) {
      const first = saved[0];
      if (first.mode === 'mac') {
        const client = new StalkerClient(first.macUrl, first.macAddress);
        client
          .authenticate()
          .then(async () => {
            const rawCats = await client.getCategories();
            const rawChs = await client.getChannels('itv', rawCats);
            const { categories: normCats, channels: normChs } =
              normalizeChannelsAndCategories(rawCats, rawChs);
            setSessionInfo({
              mode: 'mac',
              title: first.name || `Stalker (${first.macAddress})`,
              categories: normCats,
              channels: normChs,
              stalkerClient: client,
            });
            setCategories(normCats);
            setChannels(normChs);
            if (normChs.length > 0) {
              setActiveChannel(normChs[0]);
            }
            // Pre-fetch VOD & Series categories for instant switching
            client.getVodCategories().then((cats) => {
              if (Array.isArray(cats) && cats.length > 0) setVodCategories(cats);
            }).catch(() => {});
            client.getSeriesCategories().then((cats) => {
              if (Array.isArray(cats) && cats.length > 0) setSeriesCategories(cats);
            }).catch(() => {});
          })
          .catch(() => {
            loadDemoMode();
          });
      } else {
        loadDemoMode();
      }
    } else {
      loadDemoMode();
    }
  }, []);

  const loadDemoMode = () => {
    const { categories: normCats, channels: normChs } =
      normalizeChannelsAndCategories(demoCategories, demoChannels);
    setSessionInfo({
      mode: 'demo',
      title: 'Mode Démo Gratuit',
      categories: normCats,
      channels: normChs,
    });
    setCategories(normCats);
    setChannels(normChs);
    if (normChs.length > 0) {
      setActiveChannel(normChs[0]);
    }
  };

  const handleLoginSuccess = (data) => {
    setSessionInfo(data);
    setContentType('itv');
    setActiveVodMedia(null);
    setCategories(data.categories || []);
    setChannels(data.channels || []);
    if (data.channels && data.channels.length > 0) {
      setActiveChannel(data.channels[0]);
    } else {
      setActiveChannel(null);
    }
    setSelectedCategory('all');
    setSearchQuery('');

    if (data.stalkerClient) {
      data.stalkerClient.getVodCategories().then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) setVodCategories(cats);
      }).catch(() => {});
      data.stalkerClient.getSeriesCategories().then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) setSeriesCategories(cats);
      }).catch(() => {});
    }
  };

  // Lazy-load VOD/Series categories when user enters either tab if not loaded yet
  useEffect(() => {
    let isCancelled = false;
    if (!sessionInfo?.stalkerClient) return;

    if (contentType === 'vod' && vodCategories.length === 0) {
      sessionInfo.stalkerClient
        .getVodCategories()
        .then((cats) => {
          if (!isCancelled && Array.isArray(cats) && cats.length > 0) {
            setVodCategories(cats);
          }
        })
        .catch(() => {});
    } else if (contentType === 'series' && seriesCategories.length === 0) {
      sessionInfo.stalkerClient
        .getSeriesCategories()
        .then((cats) => {
          if (!isCancelled && Array.isArray(cats) && cats.length > 0) {
            setSeriesCategories(cats);
          }
        })
        .catch(() => {});
    }

    return () => {
      isCancelled = true;
    };
  }, [contentType, sessionInfo?.stalkerClient, vodCategories.length, seriesCategories.length]);

  const handleSelectContentType = (type) => {
    setContentType(type);
    setActiveVodMedia(null);
  };

  const currentCategories =
    contentType === 'vod'
      ? vodCategories
      : contentType === 'series'
      ? seriesCategories
      : categories;

  const currentSelectedCategory =
    contentType === 'vod'
      ? selectedVodCategory
      : contentType === 'series'
      ? selectedSeriesCategory
      : selectedCategory;

  const handleSelectCategory = (catId) => {
    if (contentType === 'vod') {
      setSelectedVodCategory(catId);
    } else if (contentType === 'series') {
      setSelectedSeriesCategory(catId);
    } else {
      setSelectedCategory(catId);
    }
  };

  const handleToggleFavorite = (id) => {
    setFavorites((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      localStorage.setItem('iptv_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const filteredChannels = channels.filter((ch) => {
    if (activeTab === 'favorites') {
      if (!favorites.includes(ch.id)) return false;
    } else if (
      selectedCategory !== 'all' &&
      String(ch.categoryId) !== String(selectedCategory)
    ) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = ch.name?.toLowerCase().includes(q);
      const matchNumber = ch.number?.toString() === q;
      if (!matchName && !matchNumber) return false;
    }
    return true;
  });

  // Channel Navigation (Next / Previous)
  const handleNextChannel = () => {
    if (!filteredChannels || filteredChannels.length === 0) return;
    const currentIdx = filteredChannels.findIndex(
      (c) => c.id === activeChannel?.id
    );
    const nextIdx =
      currentIdx === -1 ? 0 : (currentIdx + 1) % filteredChannels.length;
    setActiveChannel(filteredChannels[nextIdx]);
  };

  const handlePrevChannel = () => {
    if (!filteredChannels || filteredChannels.length === 0) return;
    const currentIdx = filteredChannels.findIndex(
      (c) => c.id === activeChannel?.id
    );
    const prevIdx =
      currentIdx === -1
        ? 0
        : (currentIdx - 1 + filteredChannels.length) % filteredChannels.length;
    setActiveChannel(filteredChannels[prevIdx]);
  };

  // Keyboard navigation listener (ArrowRight / ArrowLeft)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't hijack if user is typing in an input, textarea or select
      const targetTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) {
        return;
      }

      if (contentType === 'itv') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextChannel();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevChannel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contentType, filteredChannels, activeChannel]);

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-dark)',
      }}
    >
      <Sidebar
        categories={currentCategories}
        selectedCategory={currentSelectedCategory}
        onSelectCategory={handleSelectCategory}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        contentType={contentType}
        onSelectContentType={handleSelectContentType}
        favoritesCount={favorites.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minWidth: 0,
        }}
      >
        <Header
          sessionInfo={sessionInfo}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          totalChannelsCount={channels.length}
        />

        {/* Content View: Live TV vs Netflix VOD / Series */}
        {contentType === 'itv' ? (
          <main
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateRows: showBottomChannels ? '58% 42%' : '1fr',
              gap: showBottomChannels ? '12px' : '0px',
              padding: '16px',
              minHeight: 0,
              position: 'relative',
              transition: 'grid-template-rows 0.3s ease',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                minHeight: 0,
                position: 'relative',
              }}
            >
              <VideoPlayer
                activeChannel={activeChannel}
                stalkerClient={sessionInfo?.stalkerClient}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={
                  activeChannel ? favorites.includes(activeChannel.id) : false
                }
                showBottomChannels={showBottomChannels}
                onToggleBottomChannels={toggleBottomChannels}
                onNextChannel={handleNextChannel}
                onPrevChannel={handlePrevChannel}
              />
            </div>

            {showBottomChannels && (
              <div
                className="glass-panel"
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                <ChannelGrid
                  channels={filteredChannels}
                  activeChannel={activeChannel}
                  onSelectChannel={setActiveChannel}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleHide={toggleBottomChannels}
                />
              </div>
            )}
          </main>
        ) : (
          <main
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <ErrorBoundary onReset={() => setContentType('itv')}>
              {activeVodMedia ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '16px',
                    boxSizing: 'border-box',
                  }}
                >
                  <VideoPlayer
                    activeChannel={activeVodMedia}
                    stalkerClient={sessionInfo?.stalkerClient}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={
                      activeVodMedia ? favorites.includes(activeVodMedia.id) : false
                    }
                    onBackToCatalog={() => setActiveVodMedia(null)}
                  />
                </div>
              ) : (
                <VodGrid
                  contentType={contentType}
                  stalkerClient={sessionInfo?.stalkerClient}
                  categories={contentType === 'vod' ? vodCategories : seriesCategories}
                  selectedCategory={
                    contentType === 'vod' ? selectedVodCategory : selectedSeriesCategory
                  }
                  onSelectCategory={
                    contentType === 'vod'
                      ? setSelectedVodCategory
                      : setSelectedSeriesCategory
                  }
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onPlayMedia={(media) => setActiveVodMedia(media)}
                />
              )}
            </ErrorBoundary>
          </main>
        )}
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
