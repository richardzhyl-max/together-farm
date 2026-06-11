import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#fffaf0",
        leaf: "#2f7d4a",
        soil: "#8b5e3c",
        sun: "#f6c453",
        rose: "#e9828f",
      },
      boxShadow: {
        soft: "0 14px 40px rgba(61, 91, 66, 0.14)",
      },
    },
  },
  plugins: [],
} satisfies Config;
