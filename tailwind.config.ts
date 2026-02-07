import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      screens: {
        "3xl": "1700px",
        "4xl": "1921px",
      },
      borderWidth: {
        "10": "10px",
        "12": "12px",
        "14": "14px",
        "16": "16px",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
}

export default config
