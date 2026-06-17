import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        success: "#059669",
        error: "#DC2626",
      },
    },
  },
  plugins: [],
};

export default config;
