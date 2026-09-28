const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

function createServer() {
  const server = http.createServer((req, res) => {
    // Enable CORS for all
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const parsedUrl = new URL(req.url, 'http://localhost:8080');

    // IPTV Proxy endpoint
    if (parsedUrl.pathname === '/iptv-proxy') {
      const target = parsedUrl.searchParams.get('url');
      if (!target) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Missing url parameter');
      }

      console.log('[PROXY] ->', target);

      function fetchUrl(targetUrl, redirectCount = 0) {
        if (redirectCount > 5) {
          res.writeHead(502);
          return res.end('Too many redirects');
        }

        const client = targetUrl.startsWith('https') ? https : http;
        const parsedTarget = new URL(targetUrl);

        const options = {
          hostname: parsedTarget.hostname,
          port: parsedTarget.port || (targetUrl.startsWith('https') ? 443 : 80),
          path: parsedTarget.pathname + parsedTarget.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) MAG200 stb app',
            'X-User-Agent': 'Model: MAG250; Link: WiFi',
            'Accept': '*/*',
            ...(req.headers['range'] ? { 'Range': req.headers['range'] } : {})
          }
        };

        const proxyReq = client.request(options, (proxyRes) => {
          // Handle 301/302 Redirects
          if ((proxyRes.statusCode === 301 || proxyRes.statusCode === 302) && proxyRes.headers.location) {
            let nextUrl = proxyRes.headers.location;
            if (!nextUrl.startsWith('http')) {
              nextUrl = new URL(nextUrl, targetUrl).toString();
            }
            console.log('[PROXY REDIRECT] ->', nextUrl);
            return fetchUrl(nextUrl, redirectCount + 1);
          }

          const headers = { ...proxyRes.headers };
          headers['access-control-allow-origin'] = '*';
          headers['access-control-allow-methods'] = '*';
          headers['access-control-allow-headers'] = '*';

          // If content is an M3U8 manifest, rewrite relative URLs to go through proxy
          const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
          const isM3u8 = (contentType.includes('mpegurl') || 
                          targetUrl.includes('.m3u8') || 
                          targetUrl.includes('extension=m3u8')) &&
                         !contentType.includes('video/mp2t') &&
                         !targetUrl.includes('extension=ts');

          if (isM3u8) {
            let body = '';
            proxyRes.on('data', chunk => body += chunk);
            proxyRes.on('end', () => {
              if (body.includes('#EXTM3U')) {
                // Rewrite lines that are relative or absolute TS chunks
                const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
                const hostBase = parsedTarget.origin;
                
                const lines = body.split('\n').map(line => {
                  const trimmed = line.trim();
                  if (trimmed && !trimmed.startsWith('#')) {
                    let absoluteChunk = trimmed;
                    if (trimmed.startsWith('/')) {
                      absoluteChunk = hostBase + trimmed;
                    } else if (!trimmed.startsWith('http')) {
                      absoluteChunk = baseUrl + trimmed;
                    }
                    return `/iptv-proxy?url=${encodeURIComponent(absoluteChunk)}`;
                  }
                  return line;
                });
                const rewritten = lines.join('\n');
                delete headers['content-length'];
                res.writeHead(proxyRes.statusCode, headers);
                return res.end(rewritten);
              }
              delete headers['content-length'];
              res.writeHead(proxyRes.statusCode, headers);
              res.end(body);
            });
            return;
          }

          // Live TS streams or other media: pipe directly without buffering!
          res.writeHead(proxyRes.statusCode, headers);
          proxyRes.pipe(res);

          req.on('close', () => {
            try {
              proxyReq.destroy();
              proxyRes.destroy();
            } catch {}
          });
        });

        proxyReq.on('error', (err) => {
          console.error('[PROXY ERROR]', err.message);
          if (!res.headersSent) {
            try {
              res.writeHead(502, { 'Content-Type': 'text/plain' });
              res.end(err.message);
            } catch {}
          } else {
            try {
              res.end();
            } catch {}
          }
        });

        proxyReq.end();
      }

      fetchUrl(target);
      return;
    }

    // Static files
    let filePath = path.join(__dirname, 'dist', parsedUrl.pathname);
    if (parsedUrl.pathname === '/' || !fs.existsSync(filePath)) {
      filePath = path.join(__dirname, 'dist', 'index.html');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.json': 'application/json'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return server;
}

const server = createServer();
server.listen(8080, () => {
  console.log('StreamPulse IPTV Standalone Server running at http://localhost:8080');
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION SAFEGUARD]', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION SAFEGUARD]', reason);
});

