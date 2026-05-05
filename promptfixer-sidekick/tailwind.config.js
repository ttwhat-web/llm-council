/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07080b",
          900: "#0b0d12",
          800: "#11141b",
          700: "#181c25",
          600: "#222633",
          500: "#2c3140"
        },
        accent: {
          DEFAULT: "#7c9bff",
          soft: "#b3c4ff",
          glow: "#5d7dff"
        }
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Inter", "system-ui", "sans-serif"],
        mono: ["SF Mono", "JetBrains Mono", "Menlo", "monospace"]
      },
      boxShadow: {
        glass: "0 10px 40px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        glow: "0 0 40px -8px rgba(124,155,255,0.45)"
      },
      backdropBlur: {
        xs: "2px"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        "fade-up": "fade-up 220ms ease-out"
      }
    }
  },
  plugins: []
};
