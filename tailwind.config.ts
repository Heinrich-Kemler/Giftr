import type { Config } from "tailwindcss";

// Brand palette + semantic aliases. Raw values come from the Giftr Brand Kit
// (Brandguide/Giftr_Brand_Kit/06-tokens/tailwind-colors.js). Semantic aliases let
// components reference intent (brand, ink, surface, line, success...) instead of
// raw hex. All values are flat hex strings so Tailwind opacity (e.g. bg-success/12)
// works.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: "#14B8A6", // primary teal — trust / actions
        "brand-soft": "#E6FAF5", // soft mint surface
        "brand-accent": "#FF7A00", // tangerine — primary CTAs / energy
        "brand-accent-soft": "#FFA24D",
        // Text
        ink: "#0F172A", // navy — primary text
        "ink-soft": "#334155", // slate-700 — secondary text
        muted: "#64748B", // slate-500 — tertiary / meta
        // Surfaces & lines
        surface: "#FFFFFF",
        "surface-subtle": "#F1F5F9", // slate-100
        "surface-mint": "#E6FAF5",
        line: "#E2E8F0", // slate-200 — borders
        // Status (repointed to brand hexes; old success/error were unused)
        success: "#22C55E",
        pending: "#F59E0B",
        error: "#EF4444",
        // Extra brand accents
        aqua: "#06B6D4",
        "sky-blue": "#168DE2",
        periwinkle: "#6366F1",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "Sora", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)",
        "card-hover": "0 2px 4px rgba(15,23,42,0.06), 0 12px 28px rgba(15,23,42,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
