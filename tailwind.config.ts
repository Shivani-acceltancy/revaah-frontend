/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FAF6F0",
        paper: "#F4EDE2",
        wine: "#5C1A2B",
        "wine-dark": "#3D0E1B",
        gold: "#B8893A",
        "gold-soft": "#D6B97A",
        terracotta: "#C97B5A",
        blush: "#E8C8B8",
        ink: "#2A2017",
        mute: "#847868",
        line: "#E6DDD0",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
