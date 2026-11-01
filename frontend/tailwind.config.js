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
        // Luxury Teal and Midnight Dark cohesive palette
        background: {
          DEFAULT: "#0B0F14",
          secondary: "#10161D",
          tertiary: "#19222C",
          light: "#F7F6F1",
          'light-secondary': "#F0F3EF",
        },
        surface: {
          DEFAULT: "#10161D",
          card: "#10161D",
          shell: "#0B0F14",
          subtle: "#19222C",
          hover: "#222E3C",
          elevated: "#19222C",
          inset: "#080C10",
        },
        border: {
          DEFAULT: "#1E293B",
          subtle: "#16202E",
          hover: "#2C3E55",
          focus: "#12615D",
          light: "#E2E8E3",
        },
        foreground: {
          DEFAULT: "#F1F5F9",
          muted: "#94A3B8",
          subtle: "#64748B",
          dim: "#475569",
          ink: "#172A29",
          'ink-secondary': "#667875",
        },
        ink: {
          DEFAULT: "#172A29",
          secondary: "#667875",
          border: "#E2E8E3",
        },
        accent: {
          DEFAULT: "#12615D",
          hover: "#0B4947",
          light: "#397F86",
          subtle: "rgba(18, 97, 93, 0.12)",
          border: "rgba(18, 97, 93, 0.25)",
        },
        secondary: {
          DEFAULT: "#397F86",
          hover: "#2D686E",
          light: "#4A99A1",
          subtle: "rgba(57, 127, 134, 0.12)",
          border: "rgba(57, 127, 134, 0.25)",
        },
        champagne: {
          DEFAULT: "#C5A46D",
          light: "#D8BA84",
          soft: "#FDFBF7",
          subtle: "rgba(197, 164, 109, 0.15)",
        },
        petrol: {
          DEFAULT: "#397F86",
          light: "#4A99A1",
        },
        teal: {
          DEFAULT: "#12615D",
          deep: "#0B4947",
          light: "#14918E",
          soft: "#E6F4F1",
        },
        success: {
          DEFAULT: "#25865E",
          hover: "#1D6A4B",
          light: "#34D399",
          soft: "#EAF5EE",
          subtle: "rgba(37, 134, 94, 0.12)",
          border: "rgba(37, 134, 94, 0.25)",
        },
        warning: {
          DEFAULT: "#B98232",
          hover: "#976523",
          light: "#D69E2E",
          soft: "#FDF5E8",
          subtle: "rgba(185, 130, 50, 0.12)",
          border: "rgba(185, 130, 50, 0.25)",
        },
        error: {
          DEFAULT: "#B65A56",
          hover: "#944541",
          light: "#F87171",
          soft: "#FDF0EE",
          subtle: "rgba(182, 90, 86, 0.12)",
          border: "rgba(182, 90, 86, 0.25)",
        },
        // Backward compatibility mappings
        primary: {
          DEFAULT: "#12615D",
          deep: "#0B4947",
          light: "#14918E",
          tint: "rgba(18, 97, 93, 0.15)",
        },
        cyan: {
          DEFAULT: "#67C9C5",
          glow: "#14918E",
          light: "#22D3EE",
        },
        emerald: {
          DEFAULT: "#25865E",
          glow: "#34D399",
          soft: "#EAF5EE",
        },
        amber: {
          DEFAULT: "#B98232",
          soft: "#FDF5E8",
        },
        rose: {
          DEFAULT: "#B65A56",
          soft: "#FDF0EE",
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
