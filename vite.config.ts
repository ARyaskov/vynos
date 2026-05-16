import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import path from "node:path"

export default defineConfig(({ mode }) => {
  const isProd = mode === "production"

  return {
    plugins: [react()],
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env.EMBED_ADDRESS": JSON.stringify(isProd ? "https://iohtee.toivo.tech/vynos.js" : "http://localhost:5173/vynos.js"),
      "process.env.QR_TAB": JSON.stringify(false)
    },
    build: {
      sourcemap: true,
      outDir: "dist",
      rollupOptions: {
        input: {
          frame: path.resolve(__dirname, "vynos/frame/frame.html"),
          harness: path.resolve(__dirname, "harness/index.html"),
          worker: path.resolve(__dirname, "vynos/worker.ts"),
          vynos: path.resolve(__dirname, "vynos/vynos.ts"),
          index: path.resolve(__dirname, "vynos/index.ts")
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]"
        }
      }
    },
    worker: {
      format: "es"
    }
  }
})
