import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../src/streamlit_merge_tables/streamlit_component/frontend",
    emptyOutDir: true
  }
})
