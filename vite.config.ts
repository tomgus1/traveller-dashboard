import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/traveller-dashboard/',
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit since ExcelJS is legitimately large but lazy-loaded
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate ExcelJS into its own chunk
          'excel': ['exceljs'],
          // Separate React into its own chunk
          'vendor': ['react', 'react-dom'],
          // Separate Lucide icons
          'icons': ['lucide-react']
        }
      }
    }
  }
});
