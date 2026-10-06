import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

// Regenerate with `pnpm --filter web generate-pwa-assets`; commit logo.svg, this config and the generated images together.
// The background is the light theme's `--brand`. The manifest and HTML theme color match the dark `--background`
// token in packages/ui/src/styles/globals.css.
// logo.svg is full-bleed and keeps the glyph inside the maskable safe zone, so no asset needs padding.
const fullBleed = { padding: 0, resizeOptions: { background: "#2563eb" } };

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    transparent: { ...minimal2023Preset.transparent, ...fullBleed },
    maskable: { ...minimal2023Preset.maskable, ...fullBleed },
    apple: { ...minimal2023Preset.apple, ...fullBleed },
  },
  images: ["public/logo.svg"],
});
