import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: {
    paper: "#F7F5EF", mist: "#ECEBE6", graphite: "#2B2D2A",
    mint: "#A8D5BA", olive: "#4F6B4A",
  } } },
  plugins: [],
} satisfies Config;
