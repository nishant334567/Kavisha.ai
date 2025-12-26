/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        zen: ["var(--font-zen-dots)"],
        akshar: ["var(--font-akshar)"],
        baloo: ["var(--font-baloo)"],
        commissioner: ["var(--font-commissioner)"],
        fredoka: ["var(--font-fredoka)"],
      },
    },
  },
  plugins: [],
};
