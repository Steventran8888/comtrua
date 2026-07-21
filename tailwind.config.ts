import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#7A1F1F",
          dark: "#5A1515",
          light: "#A8433D",
        },
        gold: "#D4A017",
      },
    },
  },
  plugins: [],
};
export default config;
