import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths, so the build works whether it's served from a
  // domain root or from a GitHub Pages subpath like /daily-brief/ —
  // without having to hardcode the repo name here.
  base: "./",
  plugins: [react()],
});
