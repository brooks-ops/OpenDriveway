import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#082512",
        moss: "#006b22",
        leaf: "#00a832",
        curb: "#eef8e8",
        asphalt: "#04200d",
        cream: "#eff7df",
        glow: "#33ff6f",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(0, 84, 28, 0.18)",
        glow: "0 0 0 1px rgba(51, 255, 111, 0.28), 0 20px 55px rgba(0, 96, 31, 0.26)",
      },
    },
  },
  plugins: [],
} satisfies Config;
