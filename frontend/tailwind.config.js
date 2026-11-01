/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Linear / Vercel-inspired dark theme palette
        background: {
          DEFAULT: "#0B0D12",
          secondary: "#11141B",
          tertiary: "#151922",
        },
        surface: {
          DEFAULT: "#151922",
          card: "#151922",
          shell: "#11141B",
          subtle: "#181D27",
          hover: "#1E2430",
          elevated: "#212735",
        },
        border: {
          DEFAULT: "#252B36",
          subtle: "#1D222B",
          hover: "#343C4B",
          focus: "#8B7CFF",
        },
        foreground: {
          DEFAULT: "#E5E7EB",
          muted: "#9CA3AF",
          subtle: "#6B7280",
          dim: "#4B5563",
        },
        accent: {
          DEFAULT: "#8B7CFF",
          hover: "#7A69FA",
          subtle: "rgba(139, 124, 255, 0.12)",
          border: "rgba(139, 124, 255, 0.25)",
        },
        secondary: {
          DEFAULT: "#55C7D9",
          subtle: "rgba(85, 199, 217, 0.12)",
          border: "rgba(85, 199, 217, 0.25)",
        },
        success: {
          DEFAULT: "#36B98A",
          subtle: "rgba(54, 185, 138, 0.12)",
          border: "rgba(54, 185, 138, 0.25)",
        },
        warning: {
          DEFAULT: "#E6AA57",
          subtle: "rgba(230, 170, 87, 0.12)",
          border: "rgba(230, 170, 87, 0.25)",
        },
        error: {
          DEFAULT: "#E16D78",
          subtle: "rgba(225, 109, 120, 0.12)",
          border: "rgba(225, 109, 120, 0.25)",
        },
        // Backward compatibility mappings
        primary: {
          DEFAULT: "#8B7CFF",
          deep: "#7A69FA",
          light: "#A499FF",
          tint: "rgba(139, 124, 255, 0.15)",
        },
        cyan: {
          DEFAULT: "#55C7D9",
          glow: "#55C7D9",
          light: "#7CE0EF",
        },
        emerald: {
          DEFAULT: "#36B98A",
          glow: "#36B98A",
        },
        amber: {
          DEFAULT: "#E6AA57",
        },
        rose: {
          DEFAULT: "#E16D78",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.35)",
        subtle: "0 2px 8px 0 rgba(0, 0, 0, 0.25)",
        hover: "0 4px 14px 0 rgba(0, 0, 0, 0.35)",
        dropdown: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "pulse-subtle": "pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};
