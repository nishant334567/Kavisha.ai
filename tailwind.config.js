/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
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
        /** One full spin, then a 4-step gravity-like bounce decay, then idle. */
        "widget-launcher-nudge": {
          "0%": { transform: "rotate(0deg) translateY(0)" },
          "10%": { transform: "rotate(360deg) translateY(0)" },
          "17%": { transform: "rotate(360deg) translateY(-20px)" },
          "20%": { transform: "rotate(360deg) translateY(0)" },
          "24%": { transform: "rotate(360deg) translateY(-10px)" },
          "27%": { transform: "rotate(360deg) translateY(0)" },
          "30%": { transform: "rotate(360deg) translateY(-4px)" },
          "32%": { transform: "rotate(360deg) translateY(0)" },
          "34%": { transform: "rotate(360deg) translateY(-1px)" },
          "35%": { transform: "rotate(360deg) translateY(0)" },
          "100%": { transform: "rotate(360deg) translateY(0)" },
        },
        "widget-welcome-bubble-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "loading-dots": "loading-dots 1.4s ease-in-out infinite both",
        "widget-launcher-nudge":
          "widget-launcher-nudge 5s cubic-bezier(0.22, 0.61, 0.36, 1) infinite",
        "widget-welcome-bubble-in":
          "widget-welcome-bubble-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
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
        highlight: "var(--highlight)",
        accent: "var(--accent)",
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
  plugins: [require("@tailwindcss/typography")],
};
