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
        // Linear / Vercel / Raycast-inspired dark theme palette
        background: {
          DEFAULT: "#08090C",
          secondary: "#0C0E14",
          tertiary: "#11141D",
        },
        surface: {
          DEFAULT: "#11141D",
          card: "#11141D",
          shell: "#0C0E14",
          subtle: "#151924",
          hover: "#1A202E",
          elevated: "#1E2435",
          inset: "#090B10",
        },
        border: {
          DEFAULT: "#1E2330",
          subtle: "#161A24",
          hover: "#2D3447",
          focus: "#6366F1",
        },
        foreground: {
          DEFAULT: "#EDEDEF",
          muted: "#949BA8",
          subtle: "#626B7F",
          dim: "#434B5C",
        },
        accent: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          light: "#818CF8",
          subtle: "rgba(99, 102, 241, 0.12)",
          border: "rgba(99, 102, 241, 0.25)",
        },
        secondary: {
          DEFAULT: "#06B6D4",
          hover: "#0891B2",
          light: "#22D3EE",
          subtle: "rgba(6, 182, 212, 0.12)",
          border: "rgba(6, 182, 212, 0.25)",
        },
        success: {
          DEFAULT: "#10B981",
          hover: "#059669",
          light: "#34D399",
          subtle: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.25)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          light: "#FBBF24",
          subtle: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.25)",
        },
        error: {
          DEFAULT: "#F43F5E",
          hover: "#E11D48",
          light: "#FB7185",
          subtle: "rgba(244, 63, 94, 0.12)",
          border: "rgba(244, 63, 94, 0.25)",
        },
        // Backward compatibility mappings
        primary: {
          DEFAULT: "#6366F1",
          deep: "#4F46E5",
          light: "#818CF8",
          tint: "rgba(99, 102, 241, 0.15)",
        },
        cyan: {
          DEFAULT: "#06B6D4",
          glow: "#06B6D4",
          light: "#22D3EE",
        },
        emerald: {
          DEFAULT: "#10B981",
          glow: "#10B981",
        },
        amber: {
          DEFAULT: "#F59E0B",
        },
        rose: {
          DEFAULT: "#F43F5E",
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
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        subtle: "0 2px 8px 0 rgba(0, 0, 0, 0.35)",
        hover: "0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
        dropdown: "0 12px 32px -4px rgba(0, 0, 0, 0.7), 0 4px 12px -2px rgba(0, 0, 0, 0.5)",
        glow: "0 0 20px -3px rgba(99, 102, 241, 0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-subtle": "pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(99, 102, 241, 0.15)" },
          "50%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.35)" },
        },
      },
    },
  },
  plugins: [],
};
