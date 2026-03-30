import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "#09090b",
          1: "#0f0f12",
          2: "#141418",
          3: "#1c1c22",
          4: "#26262e",
        },
        accent: {
          violet: "#7c3aed",
          "violet-light": "#a78bfa",
          cyan: "#06b6d4",
          "cyan-light": "#67e8f9",
          emerald: "#10b981",
          rose: "#f43f5e",
          amber: "#f59e0b",
        },
        border: {
          subtle: "rgba(255,255,255,0.06)",
          DEFAULT: "rgba(255,255,255,0.10)",
          strong: "rgba(255,255,255,0.18)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glow-violet":
          "radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%)",
        "glow-cyan":
          "radial-gradient(ellipse at center, rgba(6,182,212,0.12) 0%, transparent 70%)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        "fade-up": "fadeUp 0.4s ease forwards",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "glow-violet": "0 0 30px rgba(124,58,237,0.3)",
        "glow-cyan": "0 0 30px rgba(6,182,212,0.25)",
        "glow-sm": "0 0 12px rgba(124,58,237,0.2)",
        glass: "0 8px 32px rgba(0,0,0,0.4)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
export default config;
