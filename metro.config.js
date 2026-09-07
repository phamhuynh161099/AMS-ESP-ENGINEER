const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);

// Add proxy middleware for web development to bypass CORS restrictions
const originalEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    const proxyMiddleware = (req, res, next) => {
      // Allow preflight OPTIONS for all
      if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        });
        res.end();
        return;
      }

      if (req.url.startsWith('/espRecieve')) {
        const targetUrl = new URL(`http://10.101.1.193:8080${req.url}`);

        const proxyReq = http.request(
          {
            hostname: targetUrl.hostname,
            port: targetUrl.port,
            path: targetUrl.pathname + targetUrl.search,
            method: req.method,
            headers: {
              ...req.headers,
              host: `${targetUrl.hostname}:${targetUrl.port}`,
            },
            timeout: 10000,
          },
          (proxyRes) => {
            const headers = { ...proxyRes.headers };
            headers['access-control-allow-origin'] = '*';
            headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            headers['access-control-allow-headers'] = '*';

            res.writeHead(proxyRes.statusCode || 200, headers);
            proxyRes.pipe(res);
          }
        );

        proxyReq.on('error', (err) => {
          console.error('[Metro Proxy Error]:', err.message);
          res.writeHead(502, {
            'Content-Type': 'application/json',
            'access-control-allow-origin': '*',
          });
          res.end(JSON.stringify({ error: `Proxy Error: ${err.message}` }));
        });

        proxyReq.on('timeout', () => {
          proxyReq.destroy();
          res.writeHead(504, {
            'Content-Type': 'application/json',
            'access-control-allow-origin': '*',
          });
          res.end(JSON.stringify({ error: 'Proxy Gateway Timeout' }));
        });

        req.pipe(proxyReq);
        return;
      }

      return metroMiddleware(req, res, next);
    };

    return originalEnhanceMiddleware
      ? originalEnhanceMiddleware(proxyMiddleware, server)
      : proxyMiddleware;
  },
};

module.exports = config;
