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
          950: "#0a0612",
          900: "#15101e",
          800: "#1f1730",
          700: "#2b1e3e",
          600: "#352749",
          500: "#4a4e8f"
        },
        accent: {
          DEFAULT: "#a490c2",
          soft: "#c7b8db",
          glow: "#4a4e8f"
        }
      },
      fontFamily: {
        sans: ["FreeSans", "Liberation Sans", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        mono: ["SF Mono", "JetBrains Mono", "Menlo", "monospace"]
      },
      boxShadow: {
        glass: "0 10px 40px -10px rgba(21,16,30,0.7), inset 0 1px 0 rgba(230,230,250,0.06)",
        glow: "0 0 40px -8px rgba(164,144,194,0.55)"
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
