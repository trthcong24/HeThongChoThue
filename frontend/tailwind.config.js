export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#f7efe4",
        ink: "#1f2937",
        coral: "#ea580c",
        pine: "#0f766e",
        gold: "#d97706"
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"]
      },
      boxShadow: {
        panel: "0 16px 40px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
