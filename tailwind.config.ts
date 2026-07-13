import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0e1a",
        surface: "#0f172a",
        border: "#1e293b",
        primary: {
          DEFAULT: "#22c55e",
          foreground: "#0a0e1a",
        },
        secondary: {
          DEFAULT: "#3b82f6",
          foreground: "#f8fafc",
        },
        accent: {
          DEFAULT: "#fbbf24",
          foreground: "#0a0e1a",
        },
        muted: {
          DEFAULT: "#1e293b",
          foreground: "#94a3b8",
        },
        foreground: "#f8fafc",
        "muted-foreground": "#94a3b8",
        card: {
          DEFAULT: "#0f172a",
          foreground: "#f8fafc",
        },
        popover: {
          DEFAULT: "#0f172a",
          foreground: "#f8fafc",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#f8fafc",
        },
        input: "#1e293b",
        ring: "#22c55e",
      },
      fontFamily: {
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
