import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
