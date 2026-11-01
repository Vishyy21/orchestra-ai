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
          focus: "#0E5B59",
        },
        foreground: {
          DEFAULT: "#EDEDEF",
          muted: "#949BA8",
          subtle: "#626B7F",
          dim: "#434B5C",
        },
        accent: {
          DEFAULT: "#0E5B59",
          hover: "#0A4543",
          light: "#286D78",
          subtle: "rgba(14, 91, 89, 0.12)",
          border: "rgba(14, 91, 89, 0.25)",
        },
        secondary: {
          DEFAULT: "#286D78",
          hover: "#1D545D",
          light: "#388B97",
          subtle: "rgba(40, 109, 120, 0.12)",
          border: "rgba(40, 109, 120, 0.25)",
        },
        champagne: {
          DEFAULT: "#C5A46D",
          light: "#D8BA84",
          subtle: "rgba(197, 164, 109, 0.15)",
        },
        petrol: {
          DEFAULT: "#286D78",
          light: "#388B97",
        },
        teal: {
          DEFAULT: "#0E5B59",
          deep: "#0A4543",
          light: "#14918E",
          soft: "#E6F4F1",
        },
        success: {
          DEFAULT: "#21845A",
          hover: "#196947",
          light: "#2BB67D",
          subtle: "rgba(33, 132, 90, 0.12)",
          border: "rgba(33, 132, 90, 0.25)",
        },
        warning: {
          DEFAULT: "#B7791F",
          hover: "#975A16",
          light: "#D69E2E",
          subtle: "rgba(183, 121, 31, 0.12)",
          border: "rgba(183, 121, 31, 0.25)",
        },
        error: {
          DEFAULT: "#B94A48",
          hover: "#9B3836",
          light: "#E53E3E",
          subtle: "rgba(185, 74, 72, 0.12)",
          border: "rgba(185, 74, 72, 0.25)",
        },
        // Backward compatibility mappings
        primary: {
          DEFAULT: "#0E5B59",
          deep: "#0A4543",
          light: "#14918E",
          tint: "rgba(14, 91, 89, 0.15)",
        },
        cyan: {
          DEFAULT: "#0E5B59",
          glow: "#14918E",
          light: "#22D3EE",
        },
        emerald: {
          DEFAULT: "#21845A",
          glow: "#2BB67D",
        },
        amber: {
          DEFAULT: "#B7791F",
        },
        rose: {
          DEFAULT: "#B94A48",
        },
      },
      fontFamily: {
        serif: [
          '"DM Serif Display"',
          'Georgia',
          'Cambria',
          'serif',
        ],
        sans: [
          'Manrope',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"IBM Plex Mono"',
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
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
        glow: "0 0 20px -3px rgba(14, 91, 89, 0.35)",
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
          "0%, 100%": { boxShadow: "0 0 10px rgba(14, 91, 89, 0.2)" },
          "50%": { boxShadow: "0 0 20px rgba(14, 91, 89, 0.45)" },
        },
      },
    },
  },
  plugins: [],
};
