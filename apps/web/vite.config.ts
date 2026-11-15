import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { handleParcelRequest } from './src/platform/siri/parcel';

/** /api/parcela in dev and preview, with the same handler as the Pages Function. */
function siriParcelApi(): Plugin {
  const middleware: Connect.NextHandleFunction = async (req, res) => {
    const path = (req as Connect.IncomingMessage).originalUrl ?? req.url ?? '';
    const response = await handleParcelRequest(new Request(`http://localhost${path}`));
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(await response.text());
  };
  return {
    name: 'siri-parcel-api',
    configureServer: (server) => void server.middlewares.use('/api/parcela', middleware),
    configurePreviewServer: (server) => void server.middlewares.use('/api/parcela', middleware),
  };
}

export default defineConfig({
  plugins: [
    react(),
    siriParcelApi(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icons/*.png', 'fonts/*.woff2', 'fonts/LICENSE.txt'],
      manifest: {
        id: '/',
        name: 'Field Farms Challenge',
        short_name: 'Field Farms',
        description: 'El agua se siembra. Fincas y ASADAS, en una misma cuenca.',
        lang: 'es-CR',
        theme_color: '#17617C',
        background_color: '#F3F6F1',
        display: 'standalone',
        start_url: '/guide',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        // Basin layers are not precached (several MB); the ones already opened stay available offline.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/geo/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'geo-data', expiration: { maxEntries: 80 } },
          },
          // NASA/NOAA indicators and the source catalog: fresh when online, last copy offline.
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/data/') && url.pathname.endsWith('.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'indicator-data',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 40 },
            },
          },
        ],
      },
    }),
  ],
});
