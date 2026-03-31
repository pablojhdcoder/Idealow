import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Parte `node_modules` en chunks estables para caché y paralelismo.
 * React + react-dom + scheduler van **juntos** para evitar ciclos vendor ↔ react.
 */
function manualChunksFromId(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined

  /** Colección de estilos SVG muy grande: debe ir aparte (carga vía import() en avatar.ts). */
  if (id.includes('@dicebear')) {
    return 'vendor-dicebear'
  }
  if (id.includes('@tiptap') || id.includes('prosemirror')) {
    return 'vendor-editor'
  }
  if (id.includes('framer-motion')) {
    return 'vendor-motion'
  }
  /** Incluye query-core (antes caía en vendor y hinchaba ~1MB+). */
  if (id.includes('@tanstack')) {
    return 'vendor-query'
  }
  if (id.includes('react-router')) {
    return 'vendor-router'
  }
  if (id.includes('lucide-react') || id.includes('react-icons')) {
    return 'vendor-icons'
  }
  if (id.includes('@base-ui')) {
    return 'vendor-base-ui'
  }

  /** Misma isla que React (evita chunks circulares al separar solo react-dom). */
  if (id.includes('node_modules/react-dom')) {
    return 'vendor-react'
  }
  if (id.includes('node_modules/react/') || id.includes('node_modules\\react\\')) {
    return 'vendor-react'
  }
  if (id.includes('node_modules/scheduler') || id.includes('node_modules\\scheduler')) {
    return 'vendor-react'
  }
  if (id.includes('use-sync-external-store')) {
    return 'vendor-react'
  }

  if (id.includes('node_modules/zod') || id.includes('node_modules\\zod')) {
    return 'vendor-zod'
  }
  if (id.includes('react-hook-form') || id.includes('@hookform')) {
    return 'vendor-forms'
  }
  if (id.includes('zustand')) {
    return 'vendor-zustand'
  }
  if (id.includes('sonner')) {
    return 'vendor-sonner'
  }
  if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
    return 'vendor-ui-utils'
  }

  return 'vendor'
}

export default defineConfig(({ mode }) => ({
  build: {
    /** Único chunk >900KB: `vendor-dicebear` (~2MB), lazy vía `avatar.ts`. El `vendor` principal queda ~120KB. */
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: manualChunksFromId,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        /** No precachear chunk lazy de avatares (Dicebear ~2MB); se descarga al usar generateAvatarDataUrl. */
        globIgnores: ['**/node_modules/**/*', '**/vendor-dicebear*.js'],
      },
      manifest: {
        name: 'Idealow',
        short_name: 'Idealow',
        description: 'Captura, refina y valida tus ideas',
        theme_color: '#6366F1',
        background_color: '#FAFAF8',
        display: 'standalone',
        icons: [
          { src: '/logo2.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
    mode === 'analyze' &&
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
        open: false,
      }),
  ].filter(Boolean),
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyRes', (proxyRes, req) => {
            if (req.url?.includes('/validate/stream')) {
              proxyRes.headers['cache-control'] = 'no-cache, no-transform'
              proxyRes.headers['x-accel-buffering'] = 'no'
            }
          })
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    /**
     * Dockploy/Traefik publica hosts dinámicos *.traefik.me.
     * Permitimos el host actual y el wildcard para evitar bloqueos "host not allowed".
     */
    allowedHosts: ['idealow-194-26-100-24.traefik.me', '.traefik.me'],
  },
}))
