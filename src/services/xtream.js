import { applyProxy } from './proxy.js';

export class XtreamClient {
  constructor(serverUrl, username, password) {
    let url = serverUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    this.serverUrl = url.replace(/\/+$/, '');
    this.username = username.trim();
    this.password = password.trim();
  }

  async authenticate() {
    const url = `${this.serverUrl}/player_api.php?username=${encodeURIComponent(
      this.username
    )}&password=${encodeURIComponent(this.password)}`;
    const proxyUrl = applyProxy(url);
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Connexion Xtream échouée (HTTP ${response.status})`);
    }
    const data = await response.json();
    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Identifiants Xtream Codes invalides');
    }
    return data;
  }

  async getExpiryDate() {
    try {
      const data = await this.authenticate();
      const exp = data?.user_info?.exp_date;
      if (!exp || exp === 'null' || exp === '') return 'Illimité';
      const ts = Number(exp);
      if (!isNaN(ts) && ts > 0) {
        return new Date(ts * 1000).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      return String(exp);
    } catch {
      return null;
    }
  }

  async getCategories() {
    const url = `${this.serverUrl}/player_api.php?username=${encodeURIComponent(
      this.username
    )}&password=${encodeURIComponent(this.password)}&action=get_live_categories`;
    const proxyUrl = applyProxy(url);
    const response = await fetch(proxyUrl);
    if (!response.ok) return [{ id: 'all', name: 'Toutes les chaînes' }];
    const data = await response.json();
    return Array.isArray(data)
      ? data.map((cat) => ({ id: cat.category_id, name: cat.category_name }))
      : [{ id: 'all', name: 'Toutes les chaînes' }];
  }

  async getChannels() {
    const url = `${this.serverUrl}/player_api.php?username=${encodeURIComponent(
      this.username
    )}&password=${encodeURIComponent(this.password)}&action=get_live_streams`;
    const proxyUrl = applyProxy(url);
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Impossible de charger les chaînes Xtream');
    const data = await response.json();
    return Array.isArray(data)
      ? data.map((ch, idx) => ({
          id: ch.stream_id || `xtream_${idx}`,
          number: ch.num || idx + 1,
          name: ch.name,
          logo: ch.stream_icon || '',
          categoryId: ch.category_id || 'all',
          streamUrl: `${this.serverUrl}/live/${this.username}/${this.password}/${ch.stream_id}.m3u8`,
          epgId: ch.epg_channel_id || '',
        }))
      : [];
  }
}
