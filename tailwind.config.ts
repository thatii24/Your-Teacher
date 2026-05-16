import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#eeeef1",
          200: "#d9dae0",
          300: "#b9bbc6",
          400: "#8e91a2",
          500: "#6b6e80",
          600: "#525567",
          700: "#3f4253",
          800: "#2a2c39",
          900: "#181a23",
          950: "#0c0d13",
        },
      },
    },
  },
  plugins: [],
};

export default config;
