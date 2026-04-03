import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        parchment: "#f5ecdc",
        sand: "#dbc8a4",
        wine: "#7b2134",
        olive: "#5f6c4d",
        ink: "#231815",
        gold: "#d39b32",
      },
      fontFamily: {
        sans: ["Heebo", "sans-serif"],
        display: ["Secular One", "sans-serif"],
      },
      boxShadow: {
        glow: "0 20px 60px rgba(123, 33, 52, 0.18)",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.75), transparent 35%), radial-gradient(circle at 80% 0%, rgba(211,155,50,0.15), transparent 25%), linear-gradient(135deg, rgba(123,33,52,0.06), rgba(95,108,77,0.08))",
      },
    },
  },
  plugins: [],
};

export default config;

