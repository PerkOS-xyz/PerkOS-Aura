import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        heading: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        // Aura Brand Colors
        aura: {
          purple: "#8B5CF6",
          cyan: "#22D3EE",
          "bg-primary": "#0B0E14",
          "bg-secondary": "#111827",
          "bg-surface": "#161B26",
        },
        // CSS Variable-based colors (shadcn/ui compatible)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        // Aura Brand Gradient
        "aura-gradient": "linear-gradient(90deg, #8B5CF6 0%, #22D3EE 100%)",
        "aura-gradient-vertical": "linear-gradient(180deg, #8B5CF6 0%, #22D3EE 100%)",
        "aura-gradient-radial": "radial-gradient(circle, #8B5CF6 0%, #22D3EE 100%)",
      },
      boxShadow: {
        "aura-glow": "0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(34, 211, 238, 0.2)",
        "aura-glow-sm": "0 0 10px rgba(139, 92, 246, 0.2), 0 0 20px rgba(34, 211, 238, 0.1)",
        "aura-glow-lg": "0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(34, 211, 238, 0.3)",
      },
      animation: {
        "gradient-shift": "gradient-shift 3s ease infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
