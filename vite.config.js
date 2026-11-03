import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { loadTires } from './src/tireData.js'

// Turns `import tires from '../data/tires.csv'` into a validated array of
// tire records at build time. A bad row fails the build with its line number.
function tireCsv() {
  return {
    name: 'tire-csv',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.csv')) return null
      try {
        return { code: `export default ${JSON.stringify(loadTires(code))}`, map: null }
      } catch (err) {
        this.error(`${id}\n${err.message}`)
      }
    },
  }
}

export default defineConfig({
  plugins: [tireCsv(), vue()],
  // Relative asset paths, so the build works from any GitHub Pages folder.
  base: './',
})
