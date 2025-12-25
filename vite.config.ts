import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { openProjectLoginPlugin } from './plugins/openProjectLogin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // IdeaFlow Backend API
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('API proxy error', err);
            });
          },
        },
        // OpenProject API (different path)
        '/openproject': {
          target: 'http://192.168.0.200:8085',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/openproject/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Handle API Key authentication (for sync operations)
              const customKey = req.headers['x-openproject-auth-key'];
              if (customKey) {
                const authString = 'apikey:' + customKey;
                const authHeader = 'Basic ' + Buffer.from(authString).toString('base64');
                proxyReq.setHeader('Authorization', authHeader);
                proxyReq.removeHeader('x-openproject-auth-key');
                console.log('Proxy: Injected API Key Authorization. Key Length:', (customKey as string).length);
              }

              // Forward existing Authorization header (for user login)
              const authHeader = req.headers['authorization'];
              if (authHeader && !customKey) {
                proxyReq.setHeader('Authorization', authHeader as string);
                console.log('Proxy: Forwarding user Authorization header');
              }
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response:', proxyRes.statusCode, req.url);
              // CRITICAL: Strip WWW-Authenticate to prevent browser popup on 401
              if (proxyRes.statusCode === 401) {
                delete proxyRes.headers['www-authenticate'];
                console.log('Proxy: Stripped WWW-Authenticate header to suppress popup');
              }
            });
          },
        }
      }
    },
    plugins: [react(), openProjectLoginPlugin()],
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
