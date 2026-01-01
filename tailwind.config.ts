import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // custom breakpoint for layout switch
      screens: {
        'split': '900px',
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      colors: {
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        accent: "var(--accent)",
        border: "var(--border)",
        dim: "var(--text-dim)",
        muted: "var(--text-muted)",
      },
      backgroundColor: {
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        accent: "var(--accent)",
      },
      textColor: {
        accent: "var(--accent)",
        dim: "var(--text-dim)",
        muted: "var(--text-muted)",
      },
      borderColor: {
        default: "var(--border)",
        accent: "var(--accent)",
      },
    },
  },
  plugins: [],
};

export default config;
