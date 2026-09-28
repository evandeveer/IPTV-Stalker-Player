export const ProxyMode = {
  DIRECT: 'direct',
  LOCAL: 'local',
  ALL_ORIGINS: 'allorigins',
};

export function getProxyMode() {
  const saved = localStorage.getItem('iptv_proxy_mode');
  if (saved) return saved;
  // If running locally on localhost or 127.0.0.1, use the local proxy server
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return ProxyMode.LOCAL;
  }
  return ProxyMode.DIRECT;
}

export function getCustomProxy() {
  return localStorage.getItem('iptv_custom_proxy') || '';
}

export function setProxySettings(mode, custom = '') {
  localStorage.setItem('iptv_proxy_mode', mode);
  if (custom) {
    localStorage.setItem('iptv_custom_proxy', custom);
  }
}

export function applyProxy(url) {
  if (!url) return '';
  const mode = getProxyMode();

  // In DIRECT mode: return the exact URL without wrapping in any proxy
  if (mode === ProxyMode.DIRECT) {
    return url;
  }

  // In LOCAL mode: route through the Vite local dev proxy server
  if (mode === ProxyMode.LOCAL) {
    if (url.startsWith('/iptv-proxy') || url.startsWith('/api/iptv-proxy')) {
      return url;
    }
    return `/iptv-proxy?url=${encodeURIComponent(url)}`;
  }

  // AllOrigins fallback
  if (mode === ProxyMode.ALL_ORIGINS) {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  }

  return url;
}
