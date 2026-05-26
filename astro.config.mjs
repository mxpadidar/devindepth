// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: "https://mxpadidar.github.io",
  base: "/devindepth",
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Ubuntu Mono",
      cssVariable: "--astro-font-ubuntu-mono",
      fallbacks: ["monospace"],
      options: {
        variants: [
          {
            src: ["@fontsource/ubuntu-mono/files/ubuntu-mono-latin-400-normal.woff2"],
            weight: 400,
            style: "normal",
          },
          {
            src: ["@fontsource/ubuntu-mono/files/ubuntu-mono-latin-400-italic.woff2"],
            weight: 400,
            style: "italic",
          },
          {
            src: ["@fontsource/ubuntu-mono/files/ubuntu-mono-latin-700-normal.woff2"],
            weight: 700,
            style: "normal",
          },
          {
            src: ["@fontsource/ubuntu-mono/files/ubuntu-mono-latin-700-italic.woff2"],
            weight: 700,
            style: "italic",
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Alkatra",
      cssVariable: "--astro-font-alkatra",
      fallbacks: ["system-ui"],
      options: {
        variants: [
          {
            src: ["@fontsource/alkatra/files/alkatra-latin-400-normal.woff2"],
            weight: 400,
            style: "normal",
          },
          {
            src: ["@fontsource/alkatra/files/alkatra-latin-700-normal.woff2"],
            weight: 700,
            style: "normal",
          },
        ],
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    shikiConfig: {
      theme: "ayu-dark",
    },
  },

  integrations: [icon()],
});
