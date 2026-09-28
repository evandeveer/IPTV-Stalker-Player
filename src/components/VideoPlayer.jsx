import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Scaling,
  PictureInPicture,
  Maximize,
  RefreshCw,
  AlertTriangle,
  Tv,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Film,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { applyProxy } from '../services/proxy';

class CustomHlsLoader extends Hls.DefaultConfig.loader {
  load(context, config, callbacks) {
    if (context.url && !context.url.startsWith('/iptv-proxy')) {
      context.url = applyProxy(context.url);
    }
    super.load(context, config, callbacks);
  }
}

export default function VideoPlayer({
  activeChannel,
  stalkerClient,
  onToggleFavorite,
  isFavorite,
  showBottomChannels = true,
  onToggleBottomChannels,
  onNextChannel,
  onPrevChannel,
  onBackToCatalog,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('contain');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [streamUrlDisplay, setStreamUrlDisplay] = useState('');
  const [videoResolution, setVideoResolution] = useState('');

  // VOD Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const hideControlsTimer = useRef(null);
  const hlsInstance = useRef(null);
  const mpegtsInstance = useRef(null);

  const isVodMedia = Boolean(
    activeChannel?.is_movie ||
      activeChannel?.is_series ||
      activeChannel?.is_vod ||
      activeChannel?.streamUrl?.includes('movie.php') ||
      activeChannel?.streamUrl?.includes('.mp4') ||
      activeChannel?.streamUrl?.includes('.mkv')
  );

  const cleanupPlayers = () => {
    if (hlsInstance.current) {
      try {
        hlsInstance.current.destroy();
      } catch {}
      hlsInstance.current = null;
    }
    if (mpegtsInstance.current) {
      try {
        mpegtsInstance.current.destroy();
      } catch {}
      mpegtsInstance.current = null;
    }
  };

  const loadStream = async () => {
    if (!activeChannel) return;

    setErrorMessage(null);
    setIsLoading(true);
    setStreamUrlDisplay('');
    setVideoResolution('');
    setCurrentTime(0);
    setDuration(0);
    cleanupPlayers();

    try {
      let url = activeChannel.streamUrl;
      if (stalkerClient && activeChannel.cmd) {
        try {
          const resolved = await stalkerClient.getStreamUrl(
            activeChannel.cmd,
            activeChannel,
            activeChannel.seriesEpisode !== undefined ? activeChannel.seriesEpisode : null
          );
          if (resolved) url = resolved;
        } catch (err) {
          console.warn('Stalker link resolve fallback to cmd:', err);
        }
      }

      if (!url) {
        throw new Error('URL de flux vidéo introuvable.');
      }

      if (url.includes('http://') || url.includes('https://')) {
        const match = url.match(/(https?:\/\/[^\s]+)/);
        if (match) url = match[1];
      }

      setStreamUrlDisplay(url);

      const videoEl = videoRef.current;
      if (!videoEl) return;

      const mac = stalkerClient?.mac || '00:1A:79:39:ED:3D';
      const macParam = url.includes('?')
        ? `&mac=${encodeURIComponent(mac)}`
        : `?mac=${encodeURIComponent(mac)}`;
      const finalMediaUrl = applyProxy(url.includes('mac=') ? url : url + macParam);

      // 1. VOD / Movie Playback (MP4 or MKV)
      if (isVodMedia || url.includes('.mp4') || url.includes('.mkv') || url.includes('movie.php')) {
        videoEl.src = finalMediaUrl;
        const playPromise = videoEl.play();
        if (playPromise) {
          playPromise
            .then(() => {
              setIsLoading(false);
              setIsPlaying(true);
            })
            .catch((err) => {
              console.warn('[VOD Autoplay blocked]:', err);
              setIsLoading(false);
            });
        }
        return;
      }

      // 2. Live HLS segmented streaming (converts extension=ts to extension=m3u8)
      let hlsCandidateUrl = url;
      if (hlsCandidateUrl.includes('extension=ts')) {
        hlsCandidateUrl = hlsCandidateUrl.replace('extension=ts', 'extension=m3u8');
      } else if (hlsCandidateUrl.endsWith('.ts')) {
        hlsCandidateUrl = hlsCandidateUrl.replace(/\.ts$/, '.m3u8');
      }
      const finalHlsUrl = applyProxy(
        hlsCandidateUrl.includes('mac=')
          ? hlsCandidateUrl
          : hlsCandidateUrl + macParam
      );

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          capLevelToPlayerSize: false,
          startLevel: -1,
          autoLevelCapping: -1,
          backBufferLength: 60,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 120 * 1000 * 1000,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 6,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 3,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 5,
          loader: CustomHlsLoader,
        });
        hlsInstance.current = hls;
        hls.loadSource(finalHlsUrl);
        hls.attachMedia(videoEl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          videoEl
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const lvl = hls.levels[data.level];
          if (lvl && lvl.width && lvl.height) {
            setVideoResolution(`${lvl.width}x${lvl.height}`);
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.warn('[HLS failed, falling back to MPEG-TS]:', data);
            cleanupPlayers();
            playWithMpegtsOrNative(videoEl, finalMediaUrl);
          }
        });
      } else if (mpegts.isSupported()) {
        playWithMpegtsOrNative(videoEl, finalMediaUrl);
      } else {
        playNative(videoEl, finalMediaUrl);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Impossible de lancer le flux vidéo.');
      setIsLoading(false);
    }
  };

  const playWithMpegtsOrNative = (videoEl, url) => {
    if (mpegts.isSupported()) {
      try {
        const player = mpegts.createPlayer(
          {
            type: 'mpegts',
            isLive: true,
            url,
            cors: true,
          },
          {
            enableWorker: true,
            enableStashBuffer: true,
            stashInitialSize: 512 * 1024,
            liveBufferLatencyChasing: false,
            autoCleanupSourceBuffer: true,
            autoCleanupMaxBackwardDuration: 60,
            autoCleanupMinBackwardDuration: 30,
            lazyLoad: false,
          }
        );
        mpegtsInstance.current = player;
        player.attachMediaElement(videoEl);
        player.load();

        player.on(mpegts.Events.ERROR, (type, detail, info) => {
          console.warn('[MPEG-TS Error]:', type, detail, info);
          cleanupPlayers();
          playNative(videoEl, url);
        });

        const playPromise = player.play();
        if (playPromise) {
          playPromise
            .then(() => {
              setIsLoading(false);
              setIsPlaying(true);
            })
            .catch(() => {
              setIsLoading(false);
              setIsPlaying(false);
            });
        } else {
          setIsLoading(false);
        }
        return;
      } catch (err) {
        console.error('[MPEG-TS Setup Failed]:', err);
      }
    }
    playNative(videoEl, url);
  };

  const playNative = (videoEl, url) => {
    videoEl.src = url;
    const playPromise = videoEl.play();
    if (playPromise) {
      playPromise
        .then(() => {
          setIsLoading(false);
          setIsPlaying(true);
        })
        .catch(() => {
          setErrorMessage(
            'Le serveur IPTV ne répond pas ou le flux est temporairement indisponible.'
          );
          setIsLoading(false);
        });
    }
  };

  useEffect(() => {
    loadStream();
    return () => {
      cleanupPlayers();
    };
  }, [activeChannel, stalkerClient]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    videoRef.current.muted = newMute;
  };

  const getAspectStyle = () => {
    if (aspectRatio === 'cover') return { objectFit: 'cover' };
    if (aspectRatio === '16:9') return { objectFit: 'fill', aspectRatio: '16/9' };
    if (aspectRatio === '4:3') return { objectFit: 'fill', aspectRatio: '4/3' };
    return { objectFit: 'contain' };
  };

  const cycleAspectRatio = () => {
    const ratios = ['contain', 'cover', '16:9', '4:3'];
    const nextIdx = (ratios.indexOf(aspectRatio) + 1) % ratios.length;
    setAspectRatio(ratios[nextIdx]);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3500);
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleSkip = (seconds) => {
    if (!videoRef.current) return;
    const newTime = Math.min(
      Math.max(0, videoRef.current.currentTime + seconds),
      duration || 999999
    );
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!activeChannel) {
    return (
      <div
        className="video-container"
        style={{ borderRadius: '16px', background: 'rgba(10, 14, 26, 0.9)' }}
      >
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Tv size={56} style={{ marginBottom: '16px', opacity: 0.4 }} />
          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--text-main)',
            }}
          >
            Aucune chaîne sélectionnée
          </h3>
          <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
            Sélectionnez une chaîne ou naviguez avec les flèches ◄ / ► de votre clavier.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="video-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
      style={{
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        className="video-element"
        style={getAspectStyle()}
        onClick={togglePlay}
        playsInline
        onTimeUpdate={() => {
          if (!isSeeking && videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
              setDuration(videoRef.current.duration);
            }
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
              setDuration(videoRef.current.duration);
            }
            if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
              setVideoResolution(
                `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`
              );
            }
          }
        }}
      />

      {isLoading && (
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            color: '#fff',
            zIndex: 10,
            background: 'rgba(5,8,18,0.7)',
            padding: '20px 30px',
            borderRadius: '16px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {isVodMedia ? 'Chargement du film...' : 'Chargement du flux en direct...'}
          </span>
        </div>
      )}

      {errorMessage && !isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(9, 12, 22, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            zIndex: 20,
          }}
        >
          <AlertTriangle
            size={48}
            color="var(--accent-red)"
            style={{ marginBottom: '12px' }}
          />
          <h4
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              marginBottom: '8px',
            }}
          >
            Flux temporairement indisponible
          </h4>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              maxWidth: '480px',
              marginBottom: '16px',
              lineHeight: 1.5,
            }}
          >
            {errorMessage ||
              'Impossible de lire ce flux vidéo. Cliquez sur Réessayer ou sélectionnez une autre chaîne.'}
          </p>
          <button onClick={loadStream} className="btn-primary">
            <RefreshCw size={16} />
            <span>Réessayer</span>
          </button>
        </div>
      )}

      {/* Top Overlay Controls */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '20px',
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: controlsVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: controlsVisible ? 'all' : 'none',
          zIndex: 15,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Back to VOD Catalog Button if viewing a movie */}
          {isVodMedia && onBackToCatalog && (
            <button
              onClick={onBackToCatalog}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
              <span>Retour Catalogue</span>
            </button>
          )}

          {activeChannel.logo || activeChannel.poster ? (
            <img
              src={activeChannel.logo || activeChannel.poster}
              alt={activeChannel.name}
              style={{
                width: '40px',
                height: '40px',
                objectFit: 'contain',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '4px',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              {isVodMedia ? <Film size={20} /> : activeChannel.number || 'TV'}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {activeChannel.name}
              </h3>
              {isVodMedia ? (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #e50914 0%, #b20710 100%)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                  }}
                >
                  {activeChannel.is_series ? 'SÉRIE VOD' : 'FILM VOD'}
                </span>
              ) : (
                <div className="pulse-badge">
                  <div className="pulse-dot" />
                  <span>DIRECT</span>
                </div>
              )}

              {videoResolution && (
                <span
                  style={{
                    background:
                      videoResolution.includes('1080') ||
                      videoResolution.includes('1920')
                        ? 'rgba(139, 92, 246, 0.25)'
                        : videoResolution.includes('2160') ||
                          videoResolution.includes('3840')
                        ? 'rgba(234, 179, 8, 0.25)'
                        : 'rgba(6, 182, 212, 0.2)',
                    color:
                      videoResolution.includes('1080') ||
                      videoResolution.includes('1920')
                        ? 'var(--accent-primary)'
                        : videoResolution.includes('2160') ||
                          videoResolution.includes('3840')
                        ? '#eab308'
                        : 'var(--accent-cyan)',
                    border: '1px solid currentColor',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                >
                  {videoResolution.includes('2160') ||
                  videoResolution.includes('3840')
                    ? '4K UHD'
                    : videoResolution.includes('1080') ||
                      videoResolution.includes('1920')
                    ? '1080p FHD'
                    : videoResolution.includes('720') ||
                      videoResolution.includes('1280')
                    ? '720p HD'
                    : videoResolution}
                </span>
              )}
            </div>

            {activeChannel.epgCurrent && (
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--accent-cyan)',
                  marginTop: '2px',
                }}
              >
                ► {activeChannel.epgCurrent}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => onToggleFavorite && onToggleFavorite(activeChannel.id)}
          style={{
            background: isFavorite
              ? 'rgba(234, 179, 8, 0.2)'
              : 'rgba(255,255,255,0.1)',
            border:
              '1px solid ' +
              (isFavorite ? '#eab308' : 'rgba(255,255,255,0.2)'),
            color: isFavorite ? '#eab308' : '#fff',
            borderRadius: '10px',
            padding: '8px 14px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}
        >
          {isFavorite ? '★ Favori' : '☆ Ajouter aux favoris'}
        </button>
      </div>

      {/* Bottom Overlay Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background:
            'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          opacity: controlsVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: controlsVisible ? 'all' : 'none',
          zIndex: 15,
        }}
      >
        {/* VOD Timeline Scrub Bar */}
        {isVodMedia && duration > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              width: '100%',
            }}
          >
            <span
              style={{
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                minWidth: '55px',
              }}
            >
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min="0"
              max={duration || 100}
              step="1"
              value={currentTime}
              onChange={handleSeek}
              onMouseDown={() => setIsSeeking(true)}
              onMouseUp={() => setIsSeeking(false)}
              style={{
                flex: 1,
                accentColor: 'var(--accent-primary)',
                height: '6px',
                cursor: 'pointer',
              }}
            />

            <span
              style={{
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                minWidth: '55px',
                textAlign: 'right',
              }}
            >
              {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Buttons Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Previous Channel (ArrowLeft) Button */}
            {!isVodMedia && onPrevChannel && (
              <button
                onClick={onPrevChannel}
                title="Chaîne précédente (Flèche Gauche ◄)"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')
                }
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* VOD Skip -10s */}
            {isVodMedia && (
              <button
                onClick={() => handleSkip(-10)}
                title="Reculer de 10 secondes"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={18} />
              </button>
            )}

            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              style={{
                background: 'var(--accent-primary)',
                border: 'none',
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)',
              }}
            >
              {isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} style={{ marginLeft: '2px' }} />
              )}
            </button>

            {/* VOD Skip +10s */}
            {isVodMedia && (
              <button
                onClick={() => handleSkip(10)}
                title="Avancer de 10 secondes"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <RotateCw size={18} />
              </button>
            )}

            {/* Next Channel (ArrowRight) Button */}
            {!isVodMedia && onNextChannel && (
              <button
                onClick={onNextChannel}
                title="Chaîne suivante (Flèche Droite ►)"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')
                }
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Volume Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={toggleMute}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={20} />
                ) : (
                  <Volume2 size={20} />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  width: '80px',
                  accentColor: 'var(--accent-primary)',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onToggleBottomChannels && !isVodMedia && (
              <button
                onClick={onToggleBottomChannels}
                className="btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: showBottomChannels
                    ? 'rgba(255,255,255,0.08)'
                    : 'var(--accent-primary)',
                  border:
                    '1px solid ' +
                    (showBottomChannels
                      ? 'var(--border-color)'
                      : 'var(--accent-primary)'),
                  color: '#fff',
                  boxShadow: showBottomChannels
                    ? 'none'
                    : '0 0 14px rgba(139, 92, 246, 0.5)',
                  cursor: 'pointer',
                }}
                title={
                  showBottomChannels
                    ? 'Masquer le rectangle des chaînes (Mode Plein Écran)'
                    : 'Afficher la grille des chaînes'
                }
              >
                {showBottomChannels ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                <span>
                  {showBottomChannels ? 'Masquer chaînes' : 'Afficher chaînes'}
                </span>
              </button>
            )}

            <button
              onClick={cycleAspectRatio}
              className="btn-secondary"
              title="Changer le ratio d'image"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <Scaling size={16} />
              <span style={{ textTransform: 'uppercase' }}>{aspectRatio}</span>
            </button>

            <button
              onClick={togglePiP}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
              title="Mode Picture-in-Picture"
            >
              <PictureInPicture size={20} />
            </button>

            <button
              onClick={toggleFullscreen}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
              title="Plein écran"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
