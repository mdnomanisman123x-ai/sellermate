import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        card: v("card"),
        fg: v("fg"),
        muted: v("muted"),
        line: v("line"),
        brand: { DEFAULT: v("brand"), strong: v("brand-strong"), soft: v("brand-soft") },
        danger: v("danger"),
        warn: v("warn"),
        ok: v("ok"),
        gold: v("gold"),
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { rise: "rise .3s ease-out both" },
    },
  },
  plugins: [],
};

export default config;
