/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080b12",
        panel: "#111622",
        brand: { 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2" },
        violet: "#8b5cf6",
      },
      boxShadow: { glow: "0 0 40px rgba(34,211,238,.15)" },
      animation: { "slow-pulse": "pulse 2.5s ease-in-out infinite" },
    },
  },
  plugins: [],
};
