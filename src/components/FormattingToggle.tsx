"use client"

import { useFormatting } from "./FormattingProvider"

export default function FormattingToggle() {
  const { formatted, toggleFormatting } = useFormatting()

  return (
    <button
      onClick={toggleFormatting}
      className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors w-full"
      title={formatted ? "Show plain text" : "Show formatted text"}
    >
      <span
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
          formatted ? "bg-blue-600" : "bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
            formatted ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span>Formatting</span>
    </button>
  )
}
