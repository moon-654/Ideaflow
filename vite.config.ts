import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/openproject': {
          target: 'http://192.168.0.200:8085',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openproject/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Dynamic Header Injection
              // We read the raw key sent from client and construct the Basic Auth header here in Node environment
              // This avoids browser-side encoding issues and header stripping
              const customKey = req.headers['x-openproject-auth-key'];
              if (customKey) {
                const authString = 'apikey:' + customKey;
                const authHeader = 'Basic ' + Buffer.from(authString).toString('base64');
                proxyReq.setHeader('Authorization', authHeader);
                proxyReq.removeHeader('x-openproject-auth-key'); // Clean up
                console.log('Proxy: Injected Authorization header. Key Length:', (customKey as string).length);
                console.log('Proxy: Key Preview (first 50):', (customKey as string).substring(0, 50));
              }
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response:', proxyRes.statusCode, req.url);
              // CRITICAL: Strip WWW-Authenticate to prevent browser popup on 401
              if (proxyRes.statusCode === 401) {
                delete proxyRes.headers['www-authenticate'];
                console.log('Proxy: Stripped WWW-Authenticate header to suppress popup');
              }
              console.log('Res Headers:', proxyRes.headers);
            });
          },
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
