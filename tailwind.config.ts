export default {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#20A9E3",
          foreground: "#ffffff",
          50: "#E5F6FD",
          100: "#CCEEF9",
          200: "#99DDF3",
          300: "#66CCED",
          400: "#33BCE7",
          500: "#20A9E3",
          600: "#1A89B8",
          700: "#13698D",
          800: "#0D4862",
          900: "#072837",
        },
      },
      boxShadow: { soft: "0 10px 30px rgba(32, 169, 227, 0.15)" },
      borderRadius: { xl: "1rem", "2xl": "1.5rem" },
    },
  },
  darkMode: "class",
};
