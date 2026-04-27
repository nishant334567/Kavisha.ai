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
        /**
         * Spin, then bounces with gravity-like easing: ease-out on the way up (decelerate
         * toward each peak), ease-in on the way down (accelerate toward the ground).
         */
        "widget-launcher-nudge": {
          "0%": {
            transform: "rotate(0deg) translateY(0)",
            "animation-timing-function": "linear",
          },
          "7%": {
            transform: "rotate(360deg) translateY(0)",
            "animation-timing-function":
              "cubic-bezier(0.22, 0.61, 0.36, 1)",
          },
          "9%": {
            transform: "rotate(360deg) translateY(-24px)",
            "animation-timing-function":
              "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
          },
          "11%": {
            transform: "rotate(360deg) translateY(0)",
            "animation-timing-function":
              "cubic-bezier(0.22, 0.61, 0.36, 1)",
          },
          "13%": {
            transform: "rotate(360deg) translateY(-17px)",
            "animation-timing-function":
              "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
          },
          "15%": {
            transform: "rotate(360deg) translateY(0)",
            "animation-timing-function":
              "cubic-bezier(0.22, 0.61, 0.36, 1)",
          },
          "17%": {
            transform: "rotate(360deg) translateY(-11px)",
            "animation-timing-function":
              "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
          },
          "19%": {
            transform: "rotate(360deg) translateY(0)",
            "animation-timing-function": "linear",
          },
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
          "widget-launcher-nudge 8.5s infinite",
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
