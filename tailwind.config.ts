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
        background: "var(--background)",
        surface: "var(--surface)",
        border: "var(--border)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "#0a0e1a",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "#f8fafc",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "#0a0e1a",
        },
        muted: {
          DEFAULT: "var(--border)",
          foreground: "var(--muted-foreground)",
        },
        foreground: "var(--foreground)",
        "muted-foreground": "var(--muted-foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--foreground)",
        },
        popover: {
          DEFAULT: "var(--card)",
          foreground: "var(--foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "#f8fafc",
        },
        input: "var(--input)",
        ring: "var(--ring)",
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
