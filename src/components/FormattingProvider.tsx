"use client"

import { createContext, useContext, useState } from "react"

const FormattingContext = createContext({
  formatted: true,
  toggleFormatting: () => {},
})

export const useFormatting = () => useContext(FormattingContext)

export function FormattingProvider({ children }: { children: React.ReactNode }) {
  const [formatted, setFormatted] = useState(true)

  return (
    <FormattingContext.Provider
      value={{ formatted, toggleFormatting: () => setFormatted((f) => !f) }}
    >
      {children}
    </FormattingContext.Provider>
  )
}
