import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          500: "#16A34A",
          600: "#15803D",
          700: "#166534",
        },
        dark: "#0A1628",
      },
    },
  },
  plugins: [],
} satisfies Config;
