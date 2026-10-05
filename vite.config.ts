import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

/**
 * Только для дев-сервера: страница /dev/og рисует картинку-превью ссылки и присылает её сюда,
 * а сервер кладёт её в public/og.png. В сборку и на прод это не попадает.
 */
function saveOgImage(): Plugin {
  return {
    name: 'save-og-image',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-og', (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405
          return response.end()
        }
        const parts: Buffer[] = []
        request.on('data', (part: Buffer) => parts.push(part))
        request.on('end', () => {
          writeFileSync(resolve(import.meta.dirname, 'public/og.png'), Buffer.concat(parts))
          response.end('ok')
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), saveOgImage()],
  build: {
    rolldownOptions: {
      output: {
        // Библиотеки лежат отдельными кусками от кода трекера. Код трекера меняется с каждой
        // выкладкой, библиотеки редко: браузер держит их в кеше и после обновления заново
        // скачивает только маленький кусок с самим трекером.
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules\/(react|react-dom|scheduler|react-router)\// },
            { name: 'supabase', test: /node_modules\/@supabase\// },
            { name: 'vendor', test: /node_modules\// },
          ],
        },
      },
    },
  },
})
