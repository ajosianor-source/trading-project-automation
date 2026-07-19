import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        muted: "hsl(var(--muted))",
        primary: "hsl(var(--primary))",
        danger: "hsl(var(--danger))",
        warning: "hsl(var(--warning))",
      },
      borderRadius: { xl: "var(--radius)" },
      boxShadow: {
        panel: "0 1px 2px rgb(2 8 23 / .04), 0 18px 48px rgb(2 8 23 / .06)",
        glow: "0 0 40px hsl(var(--primary) / .15)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

