import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        urdu: ["var(--font-urdu)", "serif"]
      },
      colors: {
        brand: {
          50: "#eefcf6",
          100: "#d5f7e8",
          200: "#aeeed4",
          300: "#79e0ba",
          400: "#41cb9c",
          500: "#1ab082",
          600: "#0f9069",
          700: "#0e7357",
          800: "#0f5c47",
          900: "#0d4c3c",
          950: "#052b21"
        },
        ink: {
          900: "#0b1220",
          800: "#121a2b",
          700: "#1b2438"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 4px 16px -4px rgba(16,24,40,.08)",
        lift: "0 4px 8px -2px rgba(16,24,40,.08), 0 12px 32px -8px rgba(16,24,40,.14)",
        glow: "0 0 0 1px rgba(26,176,130,.15), 0 8px 24px -6px rgba(26,176,130,.35)",
        "inner-top": "inset 0 1px 0 rgba(255,255,255,.6)"
      },
      borderRadius: {
        xl2: "1.25rem"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-18px) scale(1.04)" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(.96)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" }
        }
      },
      animation: {
        float: "float 9s ease-in-out infinite",
        "float-slow": "float 14s ease-in-out infinite",
        "fade-in": "fade-in .4s ease-out both",
        "scale-in": "scale-in .35s cubic-bezier(.16,1,.3,1) both",
        shimmer: "shimmer 2.5s linear infinite"
      }
    }
  },
  plugins: []
};
export default config;
