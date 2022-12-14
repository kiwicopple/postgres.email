const colors = require("tailwindcss/colors")

module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    borderColor: (theme) => ({
      ...theme("colors"),
      DEFAULT: theme("colors.gray.800", "currentColor"),
    }),
    extend: {
      screens: {
        "3xl": "1700px",
        "4xl": "1921px",
      },
      borderWidth: {
        10: "10px",
        12: "12px",
        14: "14px",
        16: "16px",
      },
      colors: {
        gray: colors.neutral,
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
}
