import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  site: 'https://kanatti.github.io',
  integrations: [tailwind(), icon(), mdx()],
  markdown: {
    shikiConfig: {
      theme: "poimandres"
    }
  }
});