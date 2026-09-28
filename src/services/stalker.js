import { applyProxy } from './proxy.js';

export function formatMac(mac) {
  if (!mac) return '';
  const match = mac
    .replace(/[^a-fA-F0-9]/g, '')
    .toUpperCase()
    .match(/.{1,2}/g);
  return match ? match.slice(0, 6).join(':') : mac.toUpperCase();
}

export function normalizeChannelsAndCategories(rawCategories = [], rawChannels = []) {
  const catMap = new Map();

  if (Array.isArray(rawCategories)) {
    rawCategories.forEach((cat) => {
      if (cat && cat.id !== undefined && cat.id !== null) {
        const id = String(cat.id);
        const name =
          cat.name ||
          cat.title ||
          cat.category_name ||
          cat.category_alias ||
          cat.genre_title ||
          cat.genre_name ||
          cat.alias;
        if (id !== 'all' && id !== '*' && id !== '' && name) {
          catMap.set(id, { id, name, count: 0, fromServer: true });
        }
      }
    });
  }

  const channels = rawChannels.map((ch, idx) => {
    const rawCatId =
      ch.categoryId ||
      ch.tv_genre_id ||
      ch.genre_id ||
      ch.category_id ||
      ch.genre ||
      ch.category ||
      'all';
    const catId = String(rawCatId);
    const catName =
      ch.categoryName ||
      ch.category_name ||
      ch.category_alias ||
      ch.genre_name ||
      ch.genre_title ||
      ch.tv_genre_name ||
      ch.category_title ||
      ch.genre ||
      ch.category;

    if (catId !== 'all' && catId !== '*') {
      if (catMap.has(catId)) {
        if (
          catName &&
          typeof catName === 'string' &&
          catMap.get(catId).name.startsWith('Catégorie ')
        ) {
          catMap.get(catId).name = catName;
        }
      } else {
        catMap.set(catId, {
          id: catId,
          name: catName && typeof catName === 'string' ? catName : `Catégorie ${catId}`,
          count: 0,
        });
      }
    }

    if (catMap.has(catId)) {
      catMap.get(catId).count++;
    }

    return {
      ...ch,
      id: ch.id || `ch_${idx}`,
      categoryId: catId,
    };
  });

  // Preserve all official server categories (like FOR ADULTS and RADIO) or any with count > 0
  const categories = Array.from(catMap.values()).filter(
    (c) => c.fromServer || c.count > 0
  );

  return {
    categories: [
      { id: 'all', name: 'All (Toutes les chaînes)', count: channels.length },
      ...categories,
    ],
    channels,
  };
}

export function getCandidateEndpoints(rawUrl) {
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  url = url.replace(/\/+$/, '');
  const endpoints = [];
  if (url.endsWith('/server/load.php') || url.endsWith('/portal.php')) {
    endpoints.push(url);
  }
  const base = url.replace(/\/c\/?$/, '').replace(/\/stalker_portal\/?$/, '');
  endpoints.push(`${base}/c/server/load.php`);
  endpoints.push(`${base}/server/load.php`);
  endpoints.push(`${base}/portal.php`);
  endpoints.push(`${base}/c/portal.php`);
  endpoints.push(`${base}/stalker_portal/server/load.php`);
  return [...new Set(endpoints)];
}

export class StalkerClient {
  constructor(portalUrl, mac) {
    this.portalUrl = portalUrl;
    this.mac = formatMac(mac);
    this.token = '';
    this.workingEndpoint = null;
    this.isAuthenticating = false;
    this.profile = null;
  }

  async requestWithUrl(endpoint, params = {}) {
    const defaultParams = {
      type: 'stb',
      JsHttpRequest: '1-xml',
      mac: this.mac,
      stb_type: 'MAG250',
      sn: this.mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase(),
      device_id: this.mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase(),
      device_id2: this.mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase(),
      auth_second_step: '1',
    };
    if (this.token) {
      defaultParams.token = this.token;
    }
    const query = new URLSearchParams({ ...defaultParams, ...params });
    const fullUrl = `${endpoint}?${query.toString()}`;
    const targetUrl = applyProxy(fullUrl);

    const headers = {
      Accept: '*/*',
      'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) MAG200 stb app',
      'X-User-Agent': 'Model: MAG250; Link: WiFi',
      'X-Mac-Address': this.mac,
      'X-Stalker-Cookie': `mac=${encodeURIComponent(this.mac)}; stb_lang=en; timezone=Europe%2FParis${
        this.token ? `; token=${encodeURIComponent(this.token)}` : ''
      }`,
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(targetUrl, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    if (!text || !text.trim()) {
      return null;
    }
    try {
      const data = JSON.parse(text);
      return data.js !== undefined ? data.js : data;
    } catch {
      return null;
    }
  }

  async rawRequest(params = {}) {
    if (this.workingEndpoint) {
      try {
        const res = await this.requestWithUrl(this.workingEndpoint, params);
        if (res !== null) return res;
      } catch {
        this.workingEndpoint = null;
      }
    }
    const endpoints = getCandidateEndpoints(this.portalUrl);
    let lastError = null;
    for (const ep of endpoints) {
      try {
        const res = await this.requestWithUrl(ep, params);
        if (res !== null) {
          this.workingEndpoint = ep;
          return res;
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error((lastError == null ? void 0 : lastError.message) || 'HTTP 403');
  }

  async request(params = {}) {
    try {
      return await this.rawRequest(params);
    } catch (err) {
      if (
        !this.isAuthenticating &&
        (err.message.includes('403') || err.message.includes('401'))
      ) {
        this.isAuthenticating = true;
        try {
          this.token = '';
          await this.authenticate();
          this.isAuthenticating = false;
          return await this.rawRequest(params);
        } catch {
          this.isAuthenticating = false;
        }
      }
      throw new Error(
        `Erreur réseau Stalker (${err.message}). Vérifiez l'adresse du serveur et votre adresse MAC.`
      );
    }
  }

  async authenticate() {
    try {
      const handshake = await this.rawRequest({ type: 'stb', action: 'handshake' });
      if (handshake && handshake.token) {
        this.token = handshake.token;
      }
      const profile = await this.rawRequest({ type: 'stb', action: 'get_profile' });
      this.profile = profile;
      return { success: true, mac: this.mac, token: this.token, profile };
    } catch {
      return {
        success: true,
        mac: this.mac,
        token: '',
        profile: { mac: this.mac },
      };
    }
  }

  async getExpiryDate() {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      // 1. Account info: get_main_info (standard location where providers put expiration date)
      try {
        const accInfo = await this.rawRequest({
          type: 'account_info',
          action: 'get_main_info',
        });
        const info = accInfo?.data || accInfo || {};
        const phone = (info.phone || '').trim();
        if (
          phone &&
          phone !== '0' &&
          phone !== 'null' &&
          !/^\d{4,10}$/.test(phone)
        ) {
          return phone;
        }
        if (info.expire_date || info.end_date || info.expiry_date) {
          return info.expire_date || info.end_date || info.expiry_date;
        }
      } catch {}

      // 2. Profile checks (get_profile)
      const prof =
        this.profile ||
        (await this.rawRequest({ type: 'stb', action: 'get_profile' }));
      if (prof) {
        const phone = (prof.phone || '').trim();
        if (
          phone &&
          phone !== '0' &&
          phone !== 'null' &&
          !/^\d{4,10}$/.test(phone)
        ) {
          return phone;
        }
        if (
          prof.expire_billing_date &&
          !prof.expire_billing_date.startsWith('0000-00-00')
        ) {
          return prof.expire_billing_date;
        }
        if (
          prof.tariff_expired_date &&
          !prof.tariff_expired_date.startsWith('0000-00-00')
        ) {
          return prof.tariff_expired_date;
        }
        if (prof.end_date) return prof.end_date;
        if (prof.expiration) return prof.expiration;
        if (prof.sub_end_date) return prof.sub_end_date;
      }
    } catch (e) {
      console.warn('Error fetching Stalker expiry date:', e);
    }
    return null;
  }

  async getCategories(type = 'itv') {
    let result = null;
    try {
      result = await this.request({ type, action: 'get_categories' });
    } catch {}

    if (
      !result ||
      (Array.isArray(result) && result.length === 0) ||
      (typeof result === 'object' && Object.keys(result).length === 0)
    ) {
      try {
        result = await this.request({ type, action: 'get_genres' });
      } catch {}
    }

    let list = result;
    if (list && typeof list === 'object') {
      if (Array.isArray(list.data)) list = list.data;
      else if (Array.isArray(list.categories)) list = list.categories;
      else if (Array.isArray(list.genres)) list = list.genres;
      else if (Array.isArray(list.items)) list = list.items;
      else if (Array.isArray(list.list)) list = list.list;
      else if (list.data && typeof list.data === 'object') list = list.data;
    }
    let array = [];
    if (Array.isArray(list)) {
      array = list;
    } else if (list && typeof list === 'object') {
      array = Object.values(list);
    }

    return array
      .map((item) => {
        const id = String(
          item.id ?? item.genre_id ?? item.category_id ?? item.num ?? item.key ?? ''
        );
        const name =
          item.title ||
          item.name ||
          item.category_name ||
          item.category_alias ||
          item.genre_title ||
          item.genre_name ||
          item.alias ||
          item.label ||
          item.value ||
          '';
        return {
          id,
          name,
          censored: item.censored === 1 || item.censored === '1' ? 1 : 0,
        };
      })
      .filter(
        (item) => item.id && item.id !== 'undefined' && item.id !== '*' && item.name
      );
  }

  mapChannels(channels, defaultCatId = '', defaultCatName = '') {
    return channels.map((ch, idx) => {
      // Extract stream URL from cmd if present
      let streamUrl = ch.cmd || '';
      if (streamUrl.includes('http://') || streamUrl.includes('https://')) {
        const match = streamUrl.match(/(https?:\/\/[^\s]+)/);
        if (match) streamUrl = match[1];
      }

      return {
        ...ch,
        id: ch.id || `stalker_${idx}`,
        number: ch.number || idx + 1,
        name: ch.name || ch.title || `Chaîne ${idx + 1}`,
        cmd: ch.cmd || '',
        streamUrl: streamUrl,
        logo: ch.logo
          ? ch.logo.startsWith('http')
            ? ch.logo
            : `${this.portalUrl}/stalker_portal/misc/logos/120/${ch.logo}`
          : '',
        categoryId: String(
          ch.tv_genre_id ||
            ch.genre_id ||
            ch.category_id ||
            ch.genre ||
            ch.category ||
            defaultCatId ||
            'all'
        ),
        categoryName:
          ch.genre_title ||
          ch.category_name ||
          ch.genre_name ||
          ch.category_alias ||
          ch.tv_genre_name ||
          ch.genre ||
          ch.category ||
          defaultCatName ||
          '',
        epgId: ch.xmltv_id || '',
      };
    });
  }

  async getGenreChannels(genreId, genreName = '') {
    try {
      const isRadio =
        String(genreId) === '350' || (genreName && genreName.toUpperCase() === 'RADIO');
      const reqType = isRadio ? 'radio' : 'itv';
      const params = {
        type: reqType,
        action: 'get_ordered_list',
        p: 1,
      };
      if (!isRadio) {
        params.genre = genreId;
      }

      const firstRes = await this.request(params);
      if (!firstRes) return [];
      const total = firstRes.total_items || 0;
      const firstPage = Array.isArray(firstRes.data) ? firstRes.data : [];
      if (total <= firstPage.length || total === 0) {
        return this.mapChannels(firstPage, genreId, genreName);
      }

      const maxPageItems = firstRes.max_page_items || 14;
      const totalPages = Math.min(Math.ceil(total / maxPageItems), 35);
      const pagePromises = [];
      for (let p = 2; p <= totalPages; p++) {
        pagePromises.push(
          this.request({ ...params, p })
            .then((res) => (Array.isArray(res?.data) ? res.data : []))
            .catch(() => [])
        );
      }

      const remainingPages = await Promise.all(pagePromises);
      const allItems = [...firstPage, ...remainingPages.flat()];
      return this.mapChannels(allItems, genreId, genreName);
    } catch (err) {
      console.warn(`Error fetching channels for genre ${genreId}:`, err);
      return [];
    }
  }

  async getChannels(type = 'itv', categories = []) {
    let baseChannels = [];
    try {
      const all = await this.request({
        type,
        action: 'get_all_channels',
        force_ch_link_check: '0',
      });
      const list = Array.isArray(all) ? all : all?.data || [];
      if (list.length > 0) baseChannels = this.mapChannels(list);
    } catch {}

    if (baseChannels.length === 0) {
      try {
        const ordered = await this.request({ type, action: 'get_ordered_channels' });
        const list = Array.isArray(ordered) ? ordered : ordered?.data || [];
        if (list.length > 0) baseChannels = this.mapChannels(list);
      } catch {}
    }

    if (baseChannels.length > 0) {
      // Find adult/censored categories and radio categories that Stalker excludes from get_all_channels
      const extraPromises = [];

      const adultCat = categories.find(
        (c) =>
          String(c.id) === '75' ||
          c.censored === 1 ||
          (c.name && c.name.toUpperCase().includes('ADULT'))
      );
      if (adultCat) {
        extraPromises.push(
          this.getGenreChannels(adultCat.id, adultCat.name || 'FOR ADULTS')
        );
      }

      const radioCat = categories.find(
        (c) =>
          String(c.id) === '350' ||
          (c.name && c.name.toUpperCase() === 'RADIO')
      );
      if (radioCat) {
        extraPromises.push(
          this.getGenreChannels(radioCat.id, radioCat.name || 'RADIO')
        );
      }

      if (extraPromises.length > 0) {
        try {
          const extraResults = await Promise.all(extraPromises);
          extraResults.forEach((extraChs) => {
            if (Array.isArray(extraChs) && extraChs.length > 0) {
              baseChannels.push(...extraChs);
            }
          });
        } catch (err) {
          console.warn('Error fetching extra channels:', err);
        }
      }

      return baseChannels;
    }

    if (Array.isArray(categories) && categories.length > 0) {
      const aggregated = [];
      for (const cat of categories) {
        if (!cat.id || cat.id === 'all' || cat.id === '*') continue;
        try {
          const byGenre = await this.request({
            type,
            action: 'get_ordered_channels',
            genre: cat.id,
          });
          const list = Array.isArray(byGenre) ? byGenre : byGenre?.data || [];
          if (list.length > 0) {
            aggregated.push(...this.mapChannels(list, cat.id, cat.name));
          }
        } catch {}
      }
      if (aggregated.length > 0) return aggregated;
    }

    throw new Error('Aucune chaîne disponible pour ce portail Stalker.');
  }

  async getVodCategories() {
    return this.getCategories('vod');
  }

  resolvePosterUrl(uri) {
    if (!uri || typeof uri !== 'string') return '';
    const clean = uri.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
      return clean;
    }
    const base = (this.portalUrl || '').replace(/\/+$/, '');
    if (!base) return clean;
    return `${base}/${clean.replace(/^\/+/, '')}`;
  }

  async getVodList(categoryId = '*', page = 1) {
    const params = {
      type: 'vod',
      action: 'get_ordered_list',
      p: page,
    };
    if (categoryId && categoryId !== '*' && categoryId !== 'all') {
      params.category = categoryId;
    }
    const res = await this.request(params);
    if (!res) return { total: 0, items: [] };
    const total = res.total_items || (Array.isArray(res.data) ? res.data.length : 0);
    const rawItems = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    return {
      total,
      page: res.cur_page || page,
      maxPageItems: res.max_page_items || 14,
      items: rawItems.map((item, idx) => ({
        id: item.id || `vod_${idx}`,
        name: item.name || item.o_name || 'Film',
        originalName: item.o_name || '',
        description: item.description && item.description !== 'N/A' ? item.description : '',
        poster: this.resolvePosterUrl(
          item.screenshot_uri || item.pic || item.poster || item.cover || item.big_poster || ''
        ),
        rating: item.rating_imdb && item.rating_imdb !== 'N/A' ? item.rating_imdb : (item.rate || ''),
        year: item.year ? String(item.year).substring(0, 4) : '',
        duration: item.time && item.time !== 'N/a' && item.time !== 'N/A' ? Number(item.time) : 0,
        director: item.director && item.director !== 'N/A' ? item.director : '',
        actors: item.actors && item.actors !== 'N/A' ? item.actors : '',
        genre: item.genres_str && item.genres_str !== 'N/A' ? item.genres_str : '',
        age: item.age || '',
        hd: item.hd === 1 || item.high_quality === 1,
        cmd: item.cmd || '',
        categoryId: String(item.category_id || categoryId || 'all'),
        is_movie: true,
      })),
    };
  }

  async getSeriesCategories() {
    return this.getCategories('series');
  }

  async getSeriesList(categoryId = '*', page = 1) {
    const params = {
      type: 'series',
      action: 'get_ordered_list',
      p: page,
    };
    if (categoryId && categoryId !== '*' && categoryId !== 'all') {
      params.category = categoryId;
    }
    const res = await this.request(params);
    if (!res) return { total: 0, items: [] };
    const total = res.total_items || (Array.isArray(res.data) ? res.data.length : 0);
    const rawItems = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    return {
      total,
      page: res.cur_page || page,
      maxPageItems: res.max_page_items || 14,
      items: rawItems.map((item, idx) => ({
        id: item.id || `series_${idx}`,
        seriesId: String(item.id).split(':')[0],
        name: item.name || item.o_name || 'Série',
        originalName: item.o_name || '',
        description: item.description && item.description !== 'N/A' ? item.description : '',
        poster: this.resolvePosterUrl(
          item.screenshot_uri || item.pic || item.poster || item.cover || item.big_poster || ''
        ),
        rating: item.rating_imdb && item.rating_imdb !== 'N/A' ? item.rating_imdb : (item.rate || ''),
        year: item.year ? String(item.year).substring(0, 4) : '',
        director: item.director && item.director !== 'N/A' ? item.director : '',
        actors: item.actors && item.actors !== 'N/A' ? item.actors : '',
        genre: item.genres_str && item.genres_str !== 'N/A' ? item.genres_str : '',
        age: item.age || '',
        hd: item.hd === 1,
        cmd: item.cmd || '',
        categoryId: String(item.category_id || categoryId || 'all'),
        is_series: true,
      })),
    };
  }

  async getSeriesDetails(seriesId) {
    const realId = String(seriesId).split(':')[0];
    const res = await this.request({
      type: 'series',
      action: 'get_ordered_list',
      movie_id: realId,
    });
    const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    return data.map((season) => ({
      id: season.id,
      name: season.name || season.o_name || 'Saison',
      episodes: Array.isArray(season.series) ? season.series : [],
      cmd: season.cmd || '',
    }));
  }

  async getStreamUrl(cmd, channel = null, seriesEpisode = null) {
    if (!cmd) return '';

    // Direct URL extraction from cmd if already http
    let directUrl = '';
    if (cmd.includes('http://') || cmd.includes('https://')) {
      const match = cmd.match(/(https?:\/\/[^\s]+)/);
      if (match) directUrl = match[1];
    }

    // Determine type: vod or itv
    const isVod = channel?.is_movie || channel?.is_vod;
    const isSeries = channel?.is_series || seriesEpisode !== null;
    const reqType = (isVod || isSeries) ? 'vod' : 'itv';

    const params = {
      type: reqType,
      action: 'create_link',
      cmd,
    };
    if (seriesEpisode !== null && seriesEpisode !== undefined) {
      params.series = seriesEpisode;
    }

    try {
      const res = await this.request(params);

      if (res && res.cmd) {
        let streamUrl = res.cmd;
        if (streamUrl.includes('http')) {
          const match = streamUrl.match(/(https?:\/\/[^\s]+)/);
          if (match) {
            streamUrl = match[1];
          }
        }
        // Fix: If server returned empty stream=& parameter, restore streamId
        if (streamUrl.includes('stream=&')) {
          let sId = channel?.id;
          if (!sId && cmd) {
            const m = cmd.match(/stream=([0-9a-zA-Z]+)/);
            if (m) sId = m[1];
          }
          if (sId) {
            streamUrl = streamUrl.replace('stream=&', `stream=${sId}&`);
          }
        }
        return streamUrl;
      }
    } catch (err) {
      console.warn('create_link failed, fallback to direct url:', err);
    }

    return directUrl || cmd;
  }
}

