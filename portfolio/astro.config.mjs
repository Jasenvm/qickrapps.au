import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://qickrapps.au',
  compressHTML: true,
  build: {
    // Inline small assets rather than emitting separate files
    inlineStylesheets: 'auto',
  },
});

