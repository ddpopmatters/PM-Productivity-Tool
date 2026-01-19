import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Check if building the legacy bridge
  const isLegacyBridge = process.env.BUILD_TARGET === 'legacy-bridge'

  if (isLegacyBridge) {
    // Build config for legacy bridge bundle
    // Output to 'lib' folder (not gitignored) for GitHub Pages compatibility
    return {
      plugins: [react()],
      base: '/PM-Productivity-Tool/',
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      build: {
        outDir: 'lib',
        sourcemap: true,
        emptyDir: false,
        lib: {
          entry: resolve(__dirname, 'src/legacy-bridge.js'),
          name: 'MomentumComponents',
          fileName: () => 'legacy-bridge.js',
          formats: ['iife']
        },
        rollupOptions: {
          // React is loaded externally via CDN in legacy.html
          external: ['react', 'react-dom'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM'
            }
          }
        }
      }
    }
  }

  // Default build config for main app
  return {
    plugins: [react()],
    base: '/PM-Productivity-Tool/',
    build: {
      outDir: 'dist',
      sourcemap: true
    },
    server: {
      port: 3000,
      open: true
    }
  }
})
