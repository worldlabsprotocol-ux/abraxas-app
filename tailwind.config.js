/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Depth layers
        void: "#03040a",
        deep: "#070a12",
        mid: "#0d1220",
        surface: "#121826",
        raise: "#19202e",
        float: "#20293b",
        // Aliases for backward compat
        bg: {
          DEFAULT: "#03040a",
          2: "#0d1220",
          3: "#121826",
          4: "#19202e",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.06)",
          2: "rgba(255,255,255,0.12)",
        },
        gold: {
          DEFAULT: "#c8a96e",
          bright: "#e8c98e",
          dim: "rgba(200,169,110,0.08)",
        },
        nebula: {
          DEFAULT: "#6b8cff",
          dim: "rgba(107,140,255,0.08)",
        },
        abraxas: {
          text: "#e8ecf4",
          muted: "#7a8499",
          subtle: "#3d4556",
          green: "#3dd68c",
          "green-dim": "rgba(61,214,140,0.08)",
          red: "#f26b6b",
          blue: "#6b8cff",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"],
        serif: ["Instrument Serif", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "14px",
        btn: "8px",
      },
      backgroundImage: {
        "grad-gold": "linear-gradient(135deg, #c8a96e, #e8c98e)",
        "grad-nebula": "linear-gradient(135deg, #6b8cff, #a78bfa)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
        "twinkle": "twinkle 3s ease-in-out infinite",
        "scan": "scan 8s linear infinite",
      },
    },
  },
  plugins: [],
};
