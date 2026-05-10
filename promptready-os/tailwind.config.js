/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // Tokens are sourced from src/design/tokens.css via CSS custom properties.
      // This keeps Tailwind utility names while centralising the values.
      colors: {
        graphite: {
          50: "var(--pr-color-graphite-50)",
          100: "var(--pr-color-graphite-100)",
          200: "var(--pr-color-graphite-200)",
          300: "var(--pr-color-graphite-300)",
          400: "var(--pr-color-graphite-400)",
          500: "var(--pr-color-graphite-500)",
          600: "var(--pr-color-graphite-600)",
          700: "var(--pr-color-graphite-700)",
          800: "var(--pr-color-graphite-800)",
          900: "var(--pr-color-graphite-900)",
          950: "var(--pr-color-graphite-950)"
        },
        accent: {
          DEFAULT: "var(--pr-color-accent)",
          soft: "var(--pr-color-accent-soft)",
          glow: "var(--pr-color-accent-glow)"
        },
        emerald: { DEFAULT: "var(--pr-color-emerald)" },
        amber: { DEFAULT: "var(--pr-color-amber)" },
        rose: { DEFAULT: "var(--pr-color-rose)" }
      },
      fontFamily: {
        sans: [
          "InterVariable",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Inter",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "Berkeley Mono",
          "JetBrains Mono",
          "SF Mono",
          "Menlo",
          "monospace"
        ]
      },
      boxShadow: {
        glass: "0 24px 60px -24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
        glow: "0 0 40px -8px rgba(124,155,255,0.45)"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite"
      }
    }
  },
  plugins: []
};
