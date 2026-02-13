/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "loading-dots": {
          "0%, 80%, 100%": { opacity: "0.4" },
          "40%": { opacity: "1" },
        },
      },
      animation: {
        "loading-dots": "loading-dots 1.4s ease-in-out infinite both",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "muted-bg": "var(--muted-bg)",
        border: "var(--border)",
        card: "var(--card)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      fontFamily: {
        zen: ["var(--font-zen-dots)"],
        akshar: ["var(--font-akshar)"],
        baloo: ["var(--font-baloo)"],
        commissioner: ["var(--font-commissioner)"],
        fredoka: ["var(--font-fredoka)"],
        figtree: ["var(--font-figtree)"],
        dosis: ["var(--font-dosis)"],
        assistant: ["var(--font-assistant)"],
        notoSans: ["var(--font-noto-serif)"],
      },
    },
  },
  plugins: [],
};
