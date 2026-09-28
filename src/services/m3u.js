import { applyProxy } from './proxy.js';

export function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  const catMap = new Map();
  let currentChannel = null;
  let count = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      count++;
      const nameMatch = line.match(/tvg-name="([^"]+)"/i);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const idMatch = line.match(/tvg-id="([^"]+)"/i);
      const commaIdx = line.lastIndexOf(',');
      const rawName = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : `Chaîne ${count}`;
      const categoryName = groupMatch ? groupMatch[1] : 'Général';

      if (!catMap.has(categoryName)) {
        catMap.set(categoryName, { id: `cat_${catMap.size}`, name: categoryName });
      }
      const category = catMap.get(categoryName);
      currentChannel = {
        id: `m3u_${count}`,
        number: count,
        name: nameMatch ? nameMatch[1] : rawName,
        logo: logoMatch ? logoMatch[1] : '',
        categoryId: category.id,
        categoryName: categoryName,
        epgId: idMatch ? idMatch[1] : '',
      };
    } else if (line && !line.startsWith('#') && currentChannel) {
      currentChannel.streamUrl = line;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }

  const categories = Array.from(catMap.values());
  if (categories.length === 0) {
    categories.push({ id: 'all', name: 'Toutes les chaînes' });
  }

  return { channels, categories };
}

export async function fetchM3U(url) {
  const proxyUrl = applyProxy(url);
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    throw new Error(`Impossible de télécharger la playlist M3U (HTTP ${res.status})`);
  }
  const text = await res.text();
  return parseM3U(text);
}
