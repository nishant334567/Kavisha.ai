import {
  Zen_Dots,
  Akshar,
  Baloo_2,
  Commissioner,
  Fredoka,
  Figtree,
  Dosis,
  Assistant,
  Noto_Serif,
} from "next/font/google";

// Serif fonts
export const notoSans = Noto_Serif({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif",
});

// Display/Decorative fonts
export const zenDots = Zen_Dots({
  subsets: ["latin"],
  weight: "400", // Zen Dots has only one weight
  variable: "--font-zen-dots",
});

export const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});

// Sans-serif fonts
export const assistant = Assistant({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-assistant",
});

export const dosis = Dosis({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-dosis",
});

export const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-figtree",
});

export const akshar = Akshar({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-akshar",
});

export const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-baloo",
});

export const commissioner = Commissioner({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-commissioner",
});

// Export all font variables as a single string for className
export const fontVariables = [
  zenDots.variable,
  akshar.variable,
  baloo.variable,
  commissioner.variable,
  fredoka.variable,
  figtree.variable,
  dosis.variable,
  assistant.variable,
  notoSans.variable,
].join(" ");
