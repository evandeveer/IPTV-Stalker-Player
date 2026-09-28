import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'http';
import https from 'https';

function iptvProxyPlugin() {
  return {
    name: 'iptv-proxy-middleware',
    configureServer(server) {
      server.middlewares.use('/iptv-proxy', (req, res) => {
        try {
          const parsedReq = new URL(req.url, 'http://localhost');
          const targetUrl = parsedReq.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            return res.end('Missing url parameter');
          }

          const targetParsed = new URL(targetUrl);
          const client = targetUrl.startsWith('https') ? https : http;

          const options = {
            hostname: targetParsed.hostname,
            port: targetParsed.port || (targetUrl.startsWith('https') ? 443 : 80),
            path: targetParsed.pathname + targetParsed.search,
            method: req.method,
            headers: {
              ...req.headers,
              host: targetParsed.host,
              'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) MAG200 stb app',
              'X-User-Agent': 'Model: MAG250; Link: WiFi',
              referer: targetParsed.origin,
            },
          };

          const proxyReq = client.request(options, (proxyRes) => {
            // Forward headers and add CORS
            const headers = { ...proxyRes.headers };
            headers['access-control-allow-origin'] = '*';
            headers['access-control-allow-methods'] = '*';
            headers['access-control-allow-headers'] = '*';

            res.writeHead(proxyRes.statusCode, headers);
            proxyRes.pipe(res);
          });

          proxyReq.on('error', (err) => {
            console.error('[IPTV Proxy Error]:', err.message);
            res.statusCode = 502;
            res.end(`Proxy Error: ${err.message}`);
          });

          req.pipe(proxyReq);
        } catch (e) {
          res.statusCode = 500;
          res.end(`Internal Error: ${e.message}`);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), iptvProxyPlugin()],
  server: {
    port: 3000,
    open: true,
  },
});
